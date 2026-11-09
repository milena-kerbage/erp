import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
const directory=mkdtempSync(join(tmpdir(),'crm-pages-'));
process.env.NODE_ENV='test';process.env.TZ='America/Sao_Paulo';process.env.ALLOW_LOCAL_SQLITE='true';process.env.ERP_DB_PATH=join(directory,'erp.sqlite');delete process.env.DATABASE_URL;
const postgres=process.env.CRM_TEST_POSTGRES==='1';let engine,socket;
if(postgres){engine=await PGlite.create();await engine.exec('CREATE ROLE anon;CREATE ROLE authenticated;');await engine.exec(readFileSync(new URL('../supabase/migrations/006_erp.sql',import.meta.url),'utf8'));await engine.exec(readFileSync(new URL('../supabase/migrations/013_crm_reporting_indexes.sql',import.meta.url),'utf8'));socket=new PGLiteSocketServer({db:engine,host:'127.0.0.1',port:55468});await socket.start();process.env.DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:55468/postgres';process.env.DATABASE_SSL_MODE='disable';}
const {erpDB,initializeERP,getLead,reports}=await import('../src/lib/erp/core.ts');
const {crmPage,crmQuery}=await import('../src/lib/erp/crm.ts');
const {dashboardSummary}=await import('../src/lib/erp/dashboard.ts');
const {closeDatabases}=await import('../src/lib/database.ts');
await initializeERP();const db=erpDB(),now=new Date('2026-11-08T18:00:00-03:00').getTime();
await db.transaction(async()=>{for(let index=0;index<125;index++){
 const id=`lead-${String(index).padStart(4,'0')}`,created=now-index*86400000,details={owner:{seed:'owner-1',name:'Gestão'},source:index%2?'Instagram':'Loja online',email:`cliente-${index}@example.test`,links:[],attachments:[],history:[{id:'large',text:'x'.repeat(10000)}]};
 const lead={id,name:index===110?'Úrsula distante':`Cliente ${index}`,phone:`8599999${String(index).padStart(4,'0')}`,budget:10.25,funnelId:'vendas',stage:'novo',tags:['enxoval'],createdAt:new Date(created).toISOString()};
 await db.prepare('INSERT INTO leads VALUES (?,?,?,?,?,?,?,?,?,NULL)').run(id,'vendas','novo',JSON.stringify(lead),JSON.stringify(details),'open',1,created,created);
 await db.prepare('INSERT INTO lead_notes VALUES (?,?,?,?,?,?,?)').run(`note-${index}`,id,'actor','Gestão',`Nota ${index} `+'n'.repeat(1500),'[]',created);
}});
after(async()=>{await closeDatabases();await socket?.stop();await engine?.close();rmSync(directory,{recursive:true,force:true});});

test('páginas limitadas, totais globais e histórico completo somente por ficha',async()=>{
 const first=await crmPage({},50,0),second=await crmPage({},50,50),third=await crmPage({},50,100);
 assert.deepEqual([first.leads.length,second.leads.length,third.leads.length],[50,50,25]);
 assert.equal(new Set([...first.leads,...second.leads,...third.leads].map(lead=>lead.id)).size,125);
 assert.equal(first.pagination.total,125);assert.equal(third.pagination.hasMore,false);
 assert.equal(first.byStage[0].count,125);assert.equal(first.byStage[0].budget,1281.25);
 assert.equal(first.details[first.leads[0].id].history.length,0);
 assert.ok(first.messages[first.leads[0].id][0].text.length<=500);
 const detail=await getLead('lead-0110');assert.equal(detail.details.history[0].text.length,10000);assert.ok(detail.messages[0].text.length>1000);
 assert.equal((await crmPage({},50,1000)).pagination.total,125);
});
test('busca e filtros encontram registros fora da primeira página e ordenam o conjunto global',async()=>{
 const found=await crmPage({q:'ursula'},50,0);assert.equal(found.leads[0].id,'lead-0110');assert.equal(found.pagination.total,1);
 const exact=await crmPage({sources:['Instagram'],owners:['owner-1']},10,0);assert.equal(exact.pagination.total,62);assert.equal(exact.leads.length,10);
 const oldest=await crmPage({sort:'created',direction:'asc'},10,0);assert.equal(oldest.leads[0].id,'lead-0124');
 assert.equal((await crmPage({q:'%_\\'},50,0)).leads.length,0);
 assert.throws(()=>crmQuery(new URL('https://local/?filter='+encodeURIComponent(JSON.stringify({sort:'created; DROP TABLE leads'})))),{code:'INVALID_FILTER'});
 await assert.rejects(crmPage({},101,0),{code:'INVALID_PAGINATION'});
});
test('dashboard recebe agregados globais e somente cinco fichas de atenção',async()=>{
 const summary=await dashboardSummary(now,180);assert.equal(summary.total,125);assert.equal(summary.fresh,8);assert.equal(summary.monthTotal,82);assert.equal(summary.pipeline,1281.25);assert.ok(summary.stale.length<=5);assert.equal(summary.staleCount,118);assert.equal(summary.stages.vendas[0].count,125);
 assert.ok(JSON.stringify(summary).length<15000);
});
test('relatórios limitam detalhes de estoque e contam todo o conjunto em SQL',async()=>{
 await db.transaction(async()=>{for(let index=0;index<70;index++){const data={id:`stock-${index}`,resource:'materiais',name:'Linha',unit:'un',quantity:1,minQuantity:2,unitCost:0.25};await db.prepare('INSERT INTO records VALUES (?,?,?,?,?,?,?,?,NULL)').run(data.id,'materiais',JSON.stringify(data),'','',1,now,now);}});
 const result=await reports();assert.equal(result.inventory.low.length,50);assert.equal(result.inventory.lowTotal,70);assert.equal(result.inventory.stockValue,17.5);assert.equal(result.counts.materiais,70);assert.equal(result.leads.total,125);
});

test('cursor não pula itens quando uma nova ficha entra antes da página atual',async()=>{
 const first=await crmPage({},20,0);
 const original=await db.prepare('SELECT * FROM leads WHERE id=?').get('lead-0000');
 const data=JSON.parse(String(original.data_json));data.id='inserted-after-page';
 await db.prepare('INSERT INTO leads VALUES (?,?,?,?,?,?,?,?,?,NULL)').run(data.id,'vendas','novo',JSON.stringify(data),String(original.details_json),'open',1,now+1000,now+1000);
 try{const next=await crmPage({},20,20,{cursor:first.pagination.nextCursor,totals:false});assert.equal(next.leads[0].id,'lead-0020');assert.equal(next.pagination.total,null);assert.equal(next.byStage.length,0);assert.equal(next.pagination.hasMore,true);await assert.rejects(crmPage({q:'changed'},20,20,{cursor:first.pagination.nextCursor}),{code:'INVALID_CURSOR'});}
 finally{await db.prepare('DELETE FROM leads WHERE id=?').run(data.id);}
});
test('busca de notas encontra trechos antigos e traz somente correspondências limitadas',async()=>{
 await db.prepare('INSERT INTO lead_notes VALUES (?,?,?,?,?,?,?)').run('older-match','lead-0110','actor','Gestão','x'.repeat(800)+' bordado especial '+'z'.repeat(800),'[]',now-200*86400000);
 const result=await crmPage({q:'bordado especial',searchNotes:true},20,0);assert.equal(result.leads[0].id,'lead-0110');assert.ok(result.messages['lead-0110'][0].text.includes('bordado especial'));assert.ok(result.messages['lead-0110'][0].text.length<=500);
});
