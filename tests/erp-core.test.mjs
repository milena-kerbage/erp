import test, { before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closeDatabases } from '../src/lib/database.ts';
import { workspaceSnapshot, updatePreferences, createFunnel, updateFunnel, deleteFunnel, reorderFunnels, createLead, updateLead, archiveLead, leadsSnapshot, addNote, erpDB, createRecord, updateRecord, archiveRecord, listRecords, reports, ERPError, getLead, getRecord, getFunnel, pageFromURL, archiveFilterFromURL, reportPeriodFromURL } from '../src/lib/erp/core.ts';

let directory;
let engine, socket;
const postgres = process.env.ERP_TEST_POSTGRES === '1';
const actor = {id:'admin-1',name:'Gestora',email:'manager@example.test',permission:'admin'};
const leadInput = {name:'Cliente real de teste',phone:'85999999999',budget:2500,funnelId:'vendas',stage:'novo',tags:[]};
before(async () => {
 if (!postgres) return;
 const {PGlite}=await import('@electric-sql/pglite');const {PGLiteSocketServer}=await import('@electric-sql/pglite-socket');
 engine=await PGlite.create();const port=Number(process.env.ERP_POSTGRES_TEST_PORT || 55442);
 socket=new PGLiteSocketServer({db:engine,host:'127.0.0.1',port});await engine.exec('CREATE ROLE anon; CREATE ROLE authenticated;');await socket.start();
 process.env.NODE_ENV='test';process.env.DATABASE_URL=`postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;process.env.DATABASE_SSL_MODE='disable';
});
beforeEach(async () => {
 directory=await mkdtemp(join(tmpdir(),'erp-core-'));process.env.ERP_DB_PATH=join(directory,'erp.sqlite');delete process.env.VERCEL;
 if (!postgres) delete process.env.DATABASE_URL;
 else { await engine.exec('DROP SCHEMA IF EXISTS erp_core CASCADE;');await engine.exec(await readFile(new URL('../supabase/migrations/006_erp.sql',import.meta.url),'utf8')); }
});
afterEach(async () => { await closeDatabases(); await rm(directory,{recursive:true,force:true}); });
after(async () => { await closeDatabases();if(socket)await socket.stop();if(engine)await engine.close(); });
const rejects = (operation,code) => assert.rejects(operation,error=>error instanceof ERPError && error.code===code);
const lead = async () => (await createLead({lead:leadInput},actor)).lead;
const material = async () => (await createRecord('materiais',{record:{name:'Linho',sku:'LIN-01',unit:'m',minQuantity:2,unitCost:18.90}},actor)).record;
const movement = async (id,direction,quantity) => (await createRecord('movimentacoes',{record:{materialId:id,direction,quantity,unitCost:18.90,date:'2026-10-12',notes:'Contagem física e documento de teste'}},actor)).record;

test('bootstrap fornece empresa confirmada e funis; não cria clientes, vendas ou mensagens fictícias',async()=>{
 const first=await workspaceSnapshot(); const second=await workspaceSnapshot();
 assert.equal(first.preferences.businessEmail,'milenakerbageatelie@gmail.com');assert.equal(first.preferences.city,'Fortaleza, CE');assert.equal(first.preferences.businessPhone,'');
 assert.equal(first.funnels.length,3);assert.deepEqual(first,second);assert.equal(first.funnels[0].icon,'Vendas');
 assert.deepEqual(await leadsSnapshot(),{leads:[],details:{},messages:{},statuses:{}});
 for(const resource of ['agenda','orcamentos','pedidos','catalogo','producao','materiais','movimentacoes','financeiro']) assert.equal((await listRecords(resource)).records.length,0);
});
test('preferências persistem, rejeitam campos desconhecidos e atualização perdida',async()=>{
 const initial=await workspaceSnapshot();const saved=await updatePreferences({revision:initial.revision,preferences:{city:'Fortaleza, Ceará',notifyNewLead:false}},actor);
 assert.equal((await workspaceSnapshot()).preferences.city,'Fortaleza, Ceará');assert.equal(saved.revision,2);
 await rejects(()=>updatePreferences({revision:1,preferences:{city:'Sobral'}},actor),'REVISION_CONFLICT');
 await rejects(()=>updatePreferences({revision:2,preferences:{admin:true}},actor),'UNKNOWN_FIELD');
 await rejects(()=>updatePreferences({revision:2,preferences:{openingTime:'20:00',closingTime:'10:00'}},actor),'INVALID_INPUT');
 await rejects(()=>updatePreferences({revision:2,preferences:{businessEmail:'email-invalido'}},actor),'INVALID_EMAIL');
});
test('funis e etapas validam ordem e referências de leads ativos e arquivados',async()=>{
 const created=await createFunnel({funnel:{name:'Pós-venda',icon:'Retorno',tone:'teal'}},actor);
 assert.equal(created.funnel.stages.length,3);let workspace=await workspaceSnapshot();
 const ordered=await reorderFunnels({revision:workspace.revision,ids:workspace.funnels.map(item=>item.id).reverse()},actor);
 assert.equal(ordered.funnels[0].id,created.funnel.id);
 await rejects(()=>reorderFunnels({revision:ordered.revision,ids:['vendas','vendas']},actor),'INVALID_ORDER');
 const contact=await lead();let vendas=(await workspaceSnapshot()).funnels.find(item=>item.id==='vendas');
 await rejects(()=>updateFunnel('vendas',{revision:vendas.revision,funnel:{stages:vendas.stages.filter(stage=>stage.id!=='novo')}},actor),'STAGE_IN_USE');
 await archiveLead(contact.id,contact.revision,actor);
 await rejects(()=>deleteFunnel('vendas',vendas.revision,actor),'FUNNEL_IN_USE');
 await updateLead(contact.id,{revision:2,restore:true,lead:{funnelId:created.funnel.id,stage:'novo'}},actor);
 await deleteFunnel('vendas',vendas.revision,actor);assert.equal((await workspaceSnapshot()).funnels.some(item=>item.id==='vendas'),false);
});
test('CRM grava alterações e histórico atribuído ao ator; concorrência rejeita um escritor obsoleto',async()=>{
 const created=await createLead({lead:leadInput,details:{email:'cliente@example.test',source:'Feira presencial',eventDate:'2026-11-20'}},actor);
 const results=await Promise.allSettled([updateLead(created.lead.id,{revision:1,lead:{stage:'contato'}},actor),updateLead(created.lead.id,{revision:1,lead:{stage:'fechado'}},actor)]);
 assert.equal(results.filter(item=>item.status==='fulfilled').length,1);assert.equal(results.filter(item=>item.status==='rejected' && item.reason.code==='REVISION_CONFLICT').length,1);
 let snapshot=await leadsSnapshot();assert.equal(snapshot.leads[0].revision,2);assert.equal(snapshot.details[created.lead.id].history.length,2);assert.equal(snapshot.details[created.lead.id].history[1].by,actor.name);
 await updateLead(created.lead.id,{revision:2,status:'resolved'},actor);snapshot=await leadsSnapshot();assert.equal(snapshot.statuses[created.lead.id],'resolved');assert.equal(snapshot.details[created.lead.id].history[2].type,'status');
 await rejects(()=>updateLead(created.lead.id,{revision:3,details:{history:[]}},actor),'UNKNOWN_FIELD');
 await rejects(()=>updateLead(created.lead.id,{revision:3,lead:{stage:'etapa-inexistente'}},actor),'INVALID_STAGE');
 await rejects(()=>createLead({lead:{...leadInput,budget:1.001}},actor),'INVALID_NUMBER');
});
test('notas internas e anexos reais persistem sem simular envio de mensagem externa',async()=>{
 const contact=await lead();await erpDB().prepare('INSERT INTO lead_attachments VALUES (?, ?, ?, ?, ?, ?, NULL, ?)').run('anexo-1',contact.id,'medidas.txt',4,'text/plain',Date.now(),Buffer.from('1234'));
 const note=await addNote(contact.id,{text:'Medidas conferidas',attachmentIds:['anexo-1']},actor);
 assert.equal(note.message.kind,'note');assert.equal(note.message.status,undefined);
 const snapshot=await leadsSnapshot();assert.equal(snapshot.messages[contact.id][0].text,'Medidas conferidas');assert.equal(snapshot.messages[contact.id][0].attachments[0].name,'medidas.txt');assert.equal(snapshot.details[contact.id].attachments[0].url,`/api/erp/leads/${contact.id}/attachments/anexo-1`);
 await rejects(()=>addNote(contact.id,{text:'nota',attachmentIds:['anexo-de-outra-ficha']},actor),'INVALID_ATTACHMENT');
 await rejects(()=>addNote(contact.id,{text:'   '},actor),'EMPTY_NOTE');
});
test('estoque aplica entradas e saídas atomicamente, bloqueia saldo negativo e reversão inconsistente',async()=>{
 const item=await material();await movement(item.id,'in',10);const out=await movement(item.id,'out',8);
 assert.equal((await listRecords('materiais')).records[0].quantity,2);
 await rejects(()=>movement(item.id,'out',3),'INSUFFICIENT_STOCK');assert.equal((await listRecords('movimentacoes')).records.length,2);
 await rejects(()=>updateRecord('movimentacoes',out.id,{revision:1,record:{quantity:1}},actor),'IMMUTABLE_MOVEMENT');
 await archiveRecord('movimentacoes',out.id,1,actor);assert.equal((await listRecords('materiais')).records[0].quantity,10);
 await updateRecord('movimentacoes',out.id,{revision:2,restore:true},actor);assert.equal((await listRecords('materiais')).records[0].quantity,2);
 const entry=(await listRecords('movimentacoes')).records.find(record=>record.direction==='in');
 await rejects(()=>archiveRecord('movimentacoes',entry.id,entry.revision,actor),'INSUFFICIENT_STOCK');
 const materialRevision=(await listRecords('materiais')).records[0].revision;
 await rejects(()=>archiveRecord('materiais',item.id,materialRevision,actor),'RECORD_IN_USE');
});
test('saídas concorrentes não consomem duas vezes o mesmo saldo; edição direta do saldo é rejeitada',async()=>{
 const item=await material();await movement(item.id,'in',5);
 const attempts=await Promise.allSettled([movement(item.id,'out',4),movement(item.id,'out',4)]);
 assert.equal(attempts.filter(item=>item.status==='fulfilled').length,1);assert.equal(attempts.filter(item=>item.status==='rejected' && item.reason.code==='INSUFFICIENT_STOCK').length,1);
 let saved=(await listRecords('materiais')).records[0];assert.equal(saved.quantity,1);
 await rejects(()=>updateRecord('materiais',item.id,{revision:saved.revision,record:{quantity:999}},actor),'UNKNOWN_FIELD');
 await rejects(()=>createRecord('materiais',{record:{name:'Outra',sku:'LIN-01',unit:'m'}},actor),'DUPLICATE_SKU');
});
test('orçamentos calculam itens/desconto em centavos e vínculos preservam cliente/pedido',async()=>{
 const contact=await lead();const another=(await createLead({lead:{...leadInput,name:'Outra cliente',phone:'85998888888'}},actor)).lead;
 const budget=(await createRecord('orcamentos',{record:{title:'Vestido de festa',leadId:contact.id,items:[{description:'Vestido sob medida',quantity:1,unitPrice:1000},{description:'Ajustes adicionais',quantity:2.5,unitPrice:20.20}],discount:50}},actor)).record;
 assert.equal(budget.total,1000.50);
 await rejects(()=>createRecord('orcamentos',{record:{title:'Total falsificado',leadId:contact.id,items:[{description:'Produto',quantity:1,unitPrice:10}],total:1}},actor),'UNKNOWN_FIELD');
 await rejects(()=>createRecord('orcamentos',{record:{title:'Desconto inválido',leadId:contact.id,items:[{description:'Produto',quantity:1,unitPrice:10}],discount:11}},actor),'INVALID_TOTAL');
 await rejects(()=>createRecord('pedidos',{record:{title:'Pedido',leadId:another.id,orcamentoId:budget.id,total:1000.50}},actor),'RELATION_MISMATCH');
 await rejects(()=>createRecord('pedidos',{record:{title:'Pedido sem orçamento aceito',leadId:contact.id,orcamentoId:budget.id,total:1000.50}},actor),'QUOTE_NOT_ACCEPTED');
 await updateRecord('orcamentos',budget.id,{revision:1,record:{status:'accepted'}},actor);
 const order=(await createRecord('pedidos',{record:{title:'Pedido vestido',leadId:contact.id,orcamentoId:budget.id,total:1}},actor)).record;
 assert.equal(order.total,1000.50);
 await updateRecord('orcamentos',budget.id,{revision:2,record:{discount:20}},actor);
 const editedOrder=await updateRecord('pedidos',order.id,{revision:1,record:{notes:'Entrega confirmada'}},actor);assert.equal(editedOrder.record.total,1000.50);
 await rejects(()=>updateRecord('pedidos',order.id,{revision:2,record:{total:1}},actor),'CONTRACTED_TOTAL_IMMUTABLE');
 await createRecord('producao',{record:{title:'Corte do vestido',pedidoId:order.id,owner:'Modelista'}},actor);
 await rejects(()=>archiveRecord('pedidos',order.id,2,actor),'RECORD_IN_USE');
 await rejects(()=>archiveRecord('orcamentos',budget.id,3,actor),'RECORD_IN_USE');
 await rejects(()=>archiveLead(contact.id,1,actor),'LEAD_IN_USE');
});
test('agenda valida horários, financeiro exige liquidação coerente e relatórios computam dados persistidos',async()=>{
 const contact=await lead();
 await rejects(()=>createRecord('agenda',{record:{title:'Prova',startAt:'2026-10-12T11:00:00-03:00',endAt:'2026-10-12T10:00:00-03:00'}},actor),'INVALID_DATE_RANGE');
 await rejects(()=>createRecord('agenda',{record:{title:'Prova em data inexistente',startAt:'2026-02-30T10:00:00-03:00',endAt:'2026-03-02T12:00:00-03:00'}},actor),'INVALID_DATE');
 await createRecord('agenda',{record:{title:'Prova',leadId:contact.id,startAt:'2026-10-20T10:00:00-03:00',endAt:'2026-10-20T11:00:00-03:00'}},actor);
 await rejects(()=>createRecord('financeiro',{record:{type:'income',title:'Parcela',amount:150,dueDate:'2026-10-20',status:'paid'}},actor),'PAYMENT_DATE_REQUIRED');
 await rejects(()=>createRecord('financeiro',{record:{type:'income',title:'Parcela',amount:150,dueDate:'2026-02-30'}},actor),'INVALID_DATE');
 await createRecord('financeiro',{record:{type:'income',title:'Sinal',leadId:contact.id,amount:500.10,dueDate:'2026-10-01',status:'paid',paidAt:'2026-10-02'}},actor);
 await createRecord('financeiro',{record:{type:'expense',title:'Tecido',amount:100.20,dueDate:'2026-10-01',status:'paid',paidAt:'2026-10-02'}},actor);
 await createRecord('financeiro',{record:{type:'income',title:'Parcela final',amount:300.30,dueDate:'2020-01-01'}},actor);
 const report=await reports();assert.equal(report.counts.agenda,1);assert.equal(report.counts.financeiro,3);assert.equal(report.leads.total,1);assert.equal(report.finance.incomePaid,500.10);assert.equal(report.finance.expensePaid,100.20);assert.equal(report.finance.overdueIncome,300.30);assert.deepEqual(report.finance.byMonth,[{month:'2026-10',income:500.10,expense:100.20}]);
 const periodReport=await reports({from:'2026-10-01',until:'2026-10-31'});assert.equal(periodReport.counts.financeiro,2);assert.equal(periodReport.finance.overdueIncome,0);assert.equal(periodReport.counts.agenda,1);assert.equal(periodReport.leads.total,1);assert.equal(periodReport.period.appliesTo,'finance');
 assert.throws(()=>reportPeriodFromURL(new URL('https://example.test/api/erp/reports?from=2026-10-01')),error=>error.code==='INVALID_REPORT_PERIOD');
 assert.throws(()=>reportPeriodFromURL(new URL('https://example.test/api/erp/reports?from=2026-11-01&until=2026-10-01')),error=>error.code==='INVALID_REPORT_PERIOD');
});
test('arquivamento é reversível e versões inválidas/campos extras são rejeitados',async()=>{
 const product=(await createRecord('catalogo',{record:{name:'Vestido longo',price:1200}},actor)).record;
 await archiveRecord('catalogo',product.id,1,actor);assert.equal((await listRecords('catalogo')).records.length,0);assert.equal((await listRecords('catalogo',true)).records[0].archivedAt.length,24);
 await rejects(()=>updateRecord('catalogo',product.id,{revision:1,restore:true},actor),'REVISION_CONFLICT');
 const restored=await updateRecord('catalogo',product.id,{revision:2,restore:true},actor);assert.equal(restored.record.revision,3);assert.equal((await listRecords('catalogo')).records.length,1);
 await rejects(()=>createRecord('financeiro',{record:{type:'expense',title:'Tentativa',amount:10,dueDate:'2026-10-20',admin:true}},actor),'UNKNOWN_FIELD');
 await rejects(()=>listRecords('DROP TABLE users'),'RESOURCE_NOT_FOUND');
 await rejects(()=>updateRecord('catalogo',product.id,{revision:0,record:{price:1}},actor),'REVISION_REQUIRED');
});
test('consumo individual e paginação explícita preservam total, filtros e notas da ficha correta',async()=>{
 const one=await lead(),two=(await createLead({lead:{...leadInput,name:'Segunda cliente',phone:'85997777777'}},actor)).lead;
 await addNote(one.id,{text:'Nota somente da primeira ficha'},actor);await addNote(two.id,{text:'Nota somente da segunda ficha'},actor);
 assert.equal((await getLead(one.id)).messages.length,1);assert.equal((await getLead(one.id)).messages[0].text,'Nota somente da primeira ficha');
 const paged=await leadsSnapshot(false,{limit:1,offset:0});assert.equal(paged.leads.length,1);assert.equal(Object.keys(paged.details).length,1);assert.deepEqual(paged.pagination,{limit:1,offset:0,total:2,hasMore:true});
 assert.equal((await leadsSnapshot(false,{limit:1,offset:1})).pagination.hasMore,false);
 await archiveLead(one.id,one.revision,actor);await rejects(()=>getLead(one.id),'NOT_FOUND');assert.equal((await getLead(one.id,true)).lead.archivedAt.length,24);
 assert.equal((await leadsSnapshot('only')).leads.length,1);assert.equal((await leadsSnapshot(true)).leads.length,2);
 const created=(await createRecord('catalogo',{record:{name:'Produto de teste',price:10}},actor)).record;assert.equal((await getRecord('catalogo',created.id)).record.name,'Produto de teste');
 assert.deepEqual((await listRecords('catalogo',false,{limit:1,offset:0})).pagination,{limit:1,offset:0,total:1,hasMore:false});
 assert.equal((await getFunnel('vendas')).funnel.name,'Vendas');
 assert.equal(pageFromURL(new URL('https://example.test/api/erp/leads')),undefined);assert.deepEqual(pageFromURL(new URL('https://example.test/api/erp/leads?limit=20&offset=5')),{limit:20,offset:5});
 assert.equal(archiveFilterFromURL(new URL('https://example.test/api/erp/leads?archived=all')),true);
 assert.throws(()=>pageFromURL(new URL('https://example.test/api/erp/leads?limit=501')),error=>error.code==='INVALID_PAGINATION');
 assert.throws(()=>pageFromURL(new URL('https://example.test/api/erp/leads?offset=1')),error=>error.code==='INVALID_PAGINATION');
 assert.throws(()=>archiveFilterFromURL(new URL('https://example.test/api/erp/leads?archived=everything')),error=>error.code==='INVALID_FILTER');
});
