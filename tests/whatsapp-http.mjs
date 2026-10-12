// Instância local de produção isolada. Nunca usa tokens reais nem bases do ateliê.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHmac, randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { once } from 'node:events';

const folder = mkdtempSync(join(tmpdir(), 'mk-whatsapp-http-'));
const port = Number(process.env.WHATSAPP_HTTP_TEST_PORT || 3347);
const origin = `http://127.0.0.1:${port}`;
const publicOrigin = 'https://app.ateliemilenakerbage.com.br';
const appSecret = randomBytes(32).toString('hex');
let verifyToken = randomBytes(32).toString('hex');
process.env.AUTH_DB_PATH = join(folder, 'auth.sqlite');
delete process.env.DATABASE_URL;
delete process.env.VERCEL;
const auth = await import('../src/lib/auth/core.ts');
const userId = randomBytes(16).toString('hex');
const managerEmail = `http-${userId}@example.test`;
const unusedManagerEmail = `authorized-${userId}@example.test`;
await auth.createUser(managerEmail, 'Teste HTTP WhatsApp', 'unused-test-hash', userId);
const cookie = `__Host-mk_session=${await auth.createSession(userId)}`;
const staffId = randomBytes(16).toString('hex');
await auth.createUser(`staff-${staffId}@example.test`, 'Operador sem gestão', 'unused-test-hash', staffId);
let staffCookie = `__Host-mk_session=${await auth.createSession(staffId)}`;
let output = '';
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
  env: { ...process.env, NODE_ENV: 'production', AUTH_REQUIRE_LOGIN: 'true', AUTH_ORIGIN: publicOrigin, PUBLIC_BASE_URL: publicOrigin,
    AUTH_DB_PATH: process.env.AUTH_DB_PATH, ERP_DB_PATH: join(folder,'erp.sqlite'), WHATSAPP_DB_PATH: join(folder, 'whatsapp.sqlite'), META_DELETION_DB_PATH: join(folder, 'deletion.sqlite'), ERP_WEBHOOK_ALLOWED_HOSTS:'',
    INTEGRATION_MANAGER_EMAILS: `${managerEmail},${unusedManagerEmail}`, ERP_ADMIN_EMAILS: managerEmail, INTEGRATION_ENCRYPTION_KEY: randomBytes(32).toString('base64'), META_OAUTH_ENABLED: 'false', META_APP_ID: '',
    WHATSAPP_GRAPH_VERSION: '', WHATSAPP_ACCESS_TOKEN: '', WHATSAPP_APP_SECRET: appSecret, META_APP_SECRET: appSecret,
    WHATSAPP_VERIFY_TOKEN: verifyToken, WHATSAPP_PHONE_NUMBER_ID: '123456789', WHATSAPP_BUSINESS_ACCOUNT_ID: '987654321',
    WHATSAPP_SUPPRESSION_SECRET: randomBytes(32).toString('hex'), WHATSAPP_PUBLIC_BASE_URL: publicOrigin,
    LEGAL_PRIVACY_EMAIL: '', LEGAL_SUPPORT_EMAIL: '' }, stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', data => { output = (output + data.toString()).slice(-4000); });
server.stderr.on('data', data => { output = (output + data.toString()).slice(-4000); });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const request = (path, options = {}, authenticated = true) => fetch(origin + path, { redirect: 'manual', ...options, headers: { ...(authenticated ? { cookie } : {}), ...options.headers } });
const post = (path, body, requestOrigin = publicOrigin, method = 'POST') => request(path, { method, headers: { origin: requestOrigin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
const phone = '5511987654321';
function webhook(text = 'Olá, preciso de um orçamento.', id = 'wamid.http.inbound') {
  return JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: '987654321', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', metadata: { phone_number_id: '123456789' }, contacts: [{ wa_id: phone, profile: { name: 'Cliente de teste' } }], messages: [{ from: phone, id, timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: text } }] } }] }] });
}
async function deliver(raw, signature = `sha256=${createHmac('sha256', appSecret).update(raw).digest('hex')}`) {
  return request('/api/whatsapp/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'x-hub-signature-256': signature }, body: raw }, false);
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (server.exitCode !== null) throw new Error('Servidor de teste não iniciou. ' + output);
    try { if ((await request('/login', {}, false)).status === 200) { ready = true; break; } } catch { /* Aguardando inicialização. */ }
    await sleep(250);
  }
  assert.ok(ready, 'Servidor de produção não ficou disponível. ' + output);
  for (const path of ['/politicas', '/privacidade', '/termos', '/exclusao-de-dados', '/cookies', '/politica-de-comunicacao']) {
    const response = await request(path, {}, false);
    assert.equal(response.status, 200, `${path} deve ser público em produção`);
    assert.match(await response.text(), /Ateliê Milena Kerbage/);
  }
  assert.equal((await request('/configuracoes/whatsapp', {}, false)).status, 307);
  assert.equal((await request('/api/whatsapp/status', {}, false)).status, 401);
  assert.equal((await request('/api/whatsapp/messages?phone=' + phone, {}, false)).status, 401);
  console.log('OK: políticas públicas e APIs operacionais protegidas em produção');
  const management = '/api/whatsapp/management/';
  assert.equal((await request(management + 'config', {}, false)).status, 401);
  assert.equal((await request(management + 'guide', {}, false)).status, 401);
  assert.equal((await request(management + 'config', { headers: { cookie: staffCookie } })).status, 403);
  assert.equal((await request(management + 'guide', { headers: { cookie: staffCookie } })).status, 403);
  for (const document of ['manager', 'technical', 'pending']) {
    const guide = await request(management + 'guide?document=' + document);
    assert.equal(guide.status, 200); assert.match(guide.headers.get('content-disposition'), /^attachment;/); assert.ok((await guide.text()).length > 5000);
  }
  assert.equal((await request(management + 'guide?document=../../.env.local')).status, 400);
  assert.equal((await post(management + 'config', { values: { retentionDays: 123 } }, 'https://attacker.example', 'PUT')).status, 403);
  assert.equal((await post(management + 'bootstrap', { action: 'GENERATE_LOCAL_ENCRYPTION_KEY' })).status, 403);
  let configured = await (await request(management + 'config')).json();
  assert.equal(configured.encryptionReady, true); assert.ok(!JSON.stringify(configured).includes(appSecret));
  const saved = await post(management + 'config', { values: { retentionDays: 123, legalPrivacyEmail: 'milenakerbageatelie@gmail.com', legalSupportEmail: 'milenakerbageatelie@gmail.com' }, secrets: { appSecret: '' } }, publicOrigin, 'PUT');
  assert.equal(saved.status, 200); configured = await saved.json();
  assert.equal(configured.values.retentionDays, 123); assert.equal(configured.secrets.appSecret.configured, true);
  const privacy = await (await request('/privacidade', {}, false)).text();
  assert.match(privacy, /milenakerbageatelie@gmail.com/); assert.match(privacy, /123/);
  assert.equal((await post(management + 'checklist', { id: 'P01', status: 'complete', note: '' }, publicOrigin, 'PUT')).status, 400);
  assert.equal((await post(management + 'checklist', { id: 'P01', status: 'complete', note: 'Documento fictício conferido em teste isolado.' }, publicOrigin, 'PUT')).status, 200);
  const overview = await (await request(management + 'overview')).json();
  assert.equal(overview.stages.find(stage => stage.id === 'P01').status, 'complete');
  assert.equal(overview.environment.localBootstrapAvailable, false); assert.equal(overview.environment.managementMode, 'session');
  assert.equal((await post(management + 'tests', { test: 'database' })).status, 200);
  assert.equal((await post(management + 'tests', { test: 'https://attacker.example' })).status, 400);
  assert.equal((await post(management + 'secrets', { kind: 'accessToken' })).status, 400);
  const generated = await (await post(management + 'secrets', { kind: 'verifyToken' })).json();
  assert.equal(generated.stored, true); assert.match(generated.secret, /^[a-f0-9]{64}$/);
  const oldVerify = verifyToken; verifyToken = generated.secret;
  assert.equal((await request('/api/whatsapp/webhook?hub.mode=subscribe&hub.challenge=test&hub.verify_token=' + oldVerify, {}, false)).status, 403);
  assert.ok(!JSON.stringify(await (await request(management + 'config')).json()).includes(verifyToken));
  assert.equal((await post(management + 'subscribe', {})).status, 400);
  assert.equal((await post(management + 'subscribe', { confirmation: 'INSCREVER' })).status, 503);
  assert.equal((await post(management + 'token', { action: 'extend' })).status, 400);
  assert.equal((await post(management + 'token', { action: 'inspect' })).status, 503);
  assert.equal((await post(management + 'oauth/start', { confirmation: 'AUTORIZAR_META' })).status, 503);
  const events = await (await request(management + 'events')).json(); assert.ok(events.events.length > 0);
  assert.ok(!JSON.stringify(events).includes(appSecret)); assert.ok(!JSON.stringify(events).includes(verifyToken));
  console.log('OK: gestor autorizado, origem, bootstrap bloqueado em produção, credenciais protegidas, checklist e testes persistidos');
  const erp='/api/erp';
  assert.equal((await request(erp,{},false)).status,401);
  const catalog=await (await request(erp)).json();assert.equal(catalog.routes.length,28);assert.equal(catalog.baseUrl,publicOrigin);
  for(const document of ['technical','operation']) {
    const guide=await request(erp+'/documentation?document='+document);
    assert.equal(guide.status,200);assert.match(guide.headers.get('content-disposition'),/^attachment;/);assert.ok((await guide.text()).length>5000);
  }
  assert.equal((await request(erp+'/documentation',{},false)).status,401);
  assert.equal((await request(erp+'/documentation?document=../../.env.local')).status,400);
  assert.equal((await request('/api/rota-inexistente',{},false)).status,401);
  const unknownApi=await request('/api/rota-inexistente');assert.equal(unknownApi.status,404);assert.match(unknownApi.headers.get('content-type'),/application\/json/);
  assert.equal((await request(erp+'/workspace',{},false)).status,401);
  assert.equal((await request(erp+'/records/financeiro',{headers:{cookie:staffCookie}})).status,403);
  assert.equal((await request(erp+'/api-keys',{headers:{cookie:staffCookie}})).status,403);
  assert.equal((await request(erp+'/webhooks',{headers:{cookie:staffCookie}})).status,403);
  const workspace=await (await request(erp+'/workspace')).json();assert.equal(workspace.currentUser.permission,'admin');assert.equal(workspace.funnels.length,3);
  assert.equal((await post(erp+'/preferences',{revision:workspace.revision,preferences:{city:'Fortaleza - teste isolado'}},publicOrigin,'PATCH')).status,200);
  assert.equal((await post(erp+'/preferences',{revision:workspace.revision,preferences:{city:'Versão antiga'}},publicOrigin,'PATCH')).status,409);
  assert.equal((await post(erp+'/profile',{permission:'admin'},publicOrigin,'PATCH')).status,400);
  assert.equal((await post(erp+'/team/'+staffId,{permission:'manager'},publicOrigin,'PATCH')).status,200);
  const outsideManagerCookie=`__Host-mk_session=${await auth.createSession(staffId)}`;
  const guardedProfile=await request(erp+'/profile',{method:'PATCH',headers:{cookie:outsideManagerCookie,origin:publicOrigin,'content-type':'application/json'},body:JSON.stringify({email:unusedManagerEmail})});
  assert.equal(guardedProfile.status,403);assert.equal((await guardedProfile.json()).code,'EMAIL_CHANGE_FORBIDDEN');
  assert.equal((await request(management+'config',{headers:{cookie:outsideManagerCookie}})).status,403,'Gestão fora da allowlist não a contorna alterando e-mail');
  assert.equal((await post(erp+'/team/'+staffId,{permission:'member'},publicOrigin,'PATCH')).status,200);
  staffCookie=`__Host-mk_session=${await auth.createSession(staffId)}`;
  assert.equal((await post(erp+'/leads',{lead:{name:'Cliente de teste HTTP ERP',phone:'85999999999',funnelId:'vendas',stage:'novo',budget:1200,tags:[]}},'https://attacker.example')).status,403);
  const created=await (await post(erp+'/leads',{lead:{name:'Cliente de teste HTTP ERP',phone:'85999999999',funnelId:'vendas',stage:'novo',budget:1200,tags:[]}})).json();
  assert.ok(created.lead.id);const leadId=created.lead.id;
  const leadPage=await request('/leads/'+leadId);assert.equal(leadPage.status,200);const leadHtml=await leadPage.text();assert.match(leadHtml,/<title>Cliente de teste HTTP ERP/);assert.doesNotMatch(leadHtml,/NEXT_HTTP_ERROR_FALLBACK;404/);
  assert.equal((await request('/leads/'+leadId,{},false)).status,307);
  const missingLead=await request('/leads/lead-inexistente');assert.ok([200,404].includes(missingLead.status));assert.match(await missingLead.text(),/NEXT_HTTP_ERROR_FALLBACK;404|This page could not be found/);
  const moved=await post(erp+'/leads/'+leadId,{revision:1,lead:{stage:'contato'}},publicOrigin,'PATCH');assert.equal(moved.status,200);
  assert.equal((await post(erp+'/leads/'+leadId,{revision:1,lead:{name:'Sobrescrever'}},publicOrigin,'PATCH')).status,409);
  assert.equal((await request(erp+'/leads/'+leadId)).status,200);
  const note=await post(erp+'/leads/'+leadId+'/notes',{text:'Nota interna fictícia de teste isolado.'});assert.equal(note.status,200);assert.equal((await note.json()).message.kind,'note');
  const fileForm=new FormData();fileForm.set('file',new Blob(['medidas de teste'],{type:'text/plain'}),'medidas.txt');
  const attachmentResponse=await request(erp+'/leads/'+leadId+'/attachments',{method:'POST',headers:{origin:publicOrigin},body:fileForm});assert.equal(attachmentResponse.status,200);
  const attachment=(await attachmentResponse.json()).attachment;
  const downloaded=await request(attachment.url);assert.equal(downloaded.status,200);assert.match(downloaded.headers.get('content-disposition'),/^attachment/);assert.equal(await downloaded.text(),'medidas de teste');
  assert.equal((await request(attachment.url,{},false)).status,401);
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1foAAAAASUVORK5CYII=','base64');
  const photoForm=new FormData();photoForm.set('file',new Blob([png],{type:'image/png'}),'foto.png');
  const photoSaved=await request(erp+'/profile/photo',{method:'POST',headers:{origin:publicOrigin},body:photoForm});assert.equal(photoSaved.status,200);
  const photo=await request((await photoSaved.json()).currentUser.avatarUrl);assert.equal(photo.status,200);assert.equal(photo.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await photo.arrayBuffer()),png);
  assert.equal((await post(erp+'/profile',{phone:'85999999999'},publicOrigin,'PATCH')).status,200);
  assert.ok((await (await request(erp+'/profile')).json()).currentUser.avatarUrl,'Salvar telefone preserva foto de perfil');
  const keyCreated=await (await post(erp+'/api-keys',{name:'Leitura HTTP isolada',scope:'read'})).json();assert.ok(keyCreated.key);
  const bearer={authorization:'Bearer '+keyCreated.key};
  assert.equal((await request(erp,{headers:bearer},false)).status,200,'Catálogo base também aceita a chave de leitura anunciada');
  assert.equal((await request(erp+'/leads',{headers:bearer},false)).status,200);
  assert.equal((await request(erp+'/records/catalogo',{headers:bearer},false)).status,200);
  assert.equal((await request(erp+'/records/catalogo',{method:'POST',headers:{...bearer,'content-type':'application/json'},body:JSON.stringify({record:{name:'Tentativa',price:10}})},false)).status,403);
  assert.equal((await request(erp+'/team',{headers:bearer},false)).status,401,'Chave de dados não administra contas');
  assert.equal((await post(erp+'/api-keys/'+keyCreated.apiKey.id,{},publicOrigin,'DELETE')).status,200);
  assert.equal((await request(erp+'/leads',{headers:bearer},false)).status,401);
  const invited=await (await post(erp+'/team',{name:'Pessoa convidada HTTP',email:'invited-http@example.test',role:'Costura',permission:'member'})).json();assert.equal(invited.emailSent,false);
  const firstToken=new URL(invited.inviteUrl).hash.slice(1);
  const reissued=await (await post(erp+'/team/'+invited.member.id+'/invite',{})).json();const inviteToken=new URL(reissued.inviteUrl).hash.slice(1);assert.notEqual(firstToken,inviteToken);
  assert.equal((await post('/api/auth/accept-invitation',{token:firstToken,password:'Senha!HTTPConvidada123'})).status,400);
  const acceptOptions={method:'POST',headers:{origin:publicOrigin,'content-type':'application/json'},body:JSON.stringify({token:inviteToken,password:'Senha!HTTPConvidada123'})};
  assert.equal((await request('/api/auth/accept-invitation',acceptOptions,false)).status,200);
  assert.equal((await request('/api/auth/accept-invitation',acceptOptions,false)).status,400);
  assert.equal((await post(erp+'/team/'+invited.member.id,{},publicOrigin,'DELETE')).status,200);
  assert.equal((await post(erp+'/team/'+invited.member.id,{status:'active'},publicOrigin,'PATCH')).status,200);
  assert.equal((await post(erp+'/team/'+userId,{permission:'member'},publicOrigin,'PATCH')).status,409,'Não pode remover última administração');
  const resources=['agenda','orcamentos','pedidos','catalogo','producao','materiais','movimentacoes','financeiro'];
  const newRecord=async(resource,record)=>{const response=await post(erp+'/records/'+resource,{record});assert.equal(response.status,200,resource+' criação');return (await response.json()).record;};
  const budget=await newRecord('orcamentos',{title:'Vestido de teste',leadId,items:[{description:'Peça sob medida',quantity:1,unitPrice:1000}],discount:50});assert.equal(budget.total,950);
  assert.equal((await post(erp+'/records/orcamentos/'+budget.id,{revision:budget.revision,record:{status:'accepted'}},publicOrigin,'PATCH')).status,200);
  const order=await newRecord('pedidos',{title:'Pedido de teste',leadId,orcamentoId:budget.id,status:'confirmed',total:950,dueDate:'2026-11-20'});
  await newRecord('agenda',{title:'Prova de teste',leadId,startAt:'2026-11-10T10:00:00-03:00',endAt:'2026-11-10T11:00:00-03:00'});
  const catalogRecord=await newRecord('catalogo',{name:'Vestido de teste',sku:'HTTP-TEST',price:1200});
  await newRecord('producao',{title:'Corte de teste',pedidoId:order.id,owner:'Equipe de teste',dueDate:'2026-11-05'});
  const material=await newRecord('materiais',{name:'Tecido de teste',unit:'m',unitCost:20,minQuantity:1});
  await newRecord('movimentacoes',{materialId:material.id,direction:'in',quantity:5,date:'2026-10-12',notes:'Entrada fictícia de teste isolado'});
  assert.equal((await post(erp+'/records/movimentacoes',{record:{materialId:material.id,direction:'out',quantity:6,date:'2026-10-12',notes:'Saída inválida de teste'}})).status,409);
  assert.equal((await (await request(erp+'/records/materiais/'+material.id)).json()).record.quantity,5);
  await newRecord('financeiro',{type:'income',title:'Sinal de teste',leadId,pedidoId:order.id,amount:200,dueDate:'2026-10-12',status:'paid',paidAt:'2026-10-12'});
  const report=await (await request(erp+'/reports?from=2026-10-01&until=2026-10-31')).json();assert.equal(report.finance.incomePaid,200);assert.equal(report.leads.total,1);
  for(const resource of resources) assert.equal((await request(erp+'/records/'+resource+'?limit=10&offset=0')).status,200,resource+' listagem');
  assert.equal((await post(erp+'/records/catalogo/'+catalogRecord.id,{},publicOrigin,'DELETE')).status,400);
  assert.equal((await post(erp+'/records/catalogo/'+catalogRecord.id+'?revision=1',{},publicOrigin,'DELETE')).status,200);
  assert.equal((await post(erp+'/records/catalogo/'+catalogRecord.id,{revision:2,restore:true},publicOrigin,'PATCH')).status,200);
  const hook=await (await post(erp+'/webhooks',{url:'https://hooks.example.com/erp',events:['lead.created','message.received']})).json();assert.ok(hook.secret);assert.ok(!JSON.stringify(await (await request(erp+'/webhooks')).json()).includes(hook.secret));
  const hookTest=await (await post(erp+'/webhooks/'+hook.webhook.id+'/test',{confirmation:'TESTAR'})).json();assert.equal(hookTest.ok,false);assert.match(hookTest.error,/ERP_WEBHOOK_ALLOWED_HOSTS/);
  assert.equal((await post(erp+'/webhooks/'+hook.webhook.id+'/test',{})).status,400);
  assert.equal((await post(erp+'/webhooks/'+hook.webhook.id,{},publicOrigin,'DELETE')).status,200);
  const notices=await (await request(erp+'/notifications',{headers:{cookie:staffCookie}})).json();assert.ok(notices.notifications.length>0);assert.equal(notices.notifications[0].read,false);
  assert.equal((await request(erp+'/notifications',{method:'PATCH',headers:{cookie:staffCookie,origin:publicOrigin,'content-type':'application/json'},body:JSON.stringify({id:notices.notifications[0].id,read:true,archived:true})})).status,200);
  for(const path of ['/agenda','/orcamentos','/pedidos','/pedidos/em-andamento','/pedidos/finalizados','/catalogo','/producao','/estoque','/estoque/materiais','/estoque/movimentacoes','/financeiro','/financeiro/receber','/financeiro/pagar','/financeiro/fluxo-de-caixa','/relatorios','/conta','/conta/novidades','/ajuda']) {
    const response=await request(path);assert.ok([200,307].includes(response.status),path+' página');assert.equal((await request(path,{},false)).status,307,path+' privada');
  }
  const notFound=await request('/rota-inexistente');assert.ok([200,404].includes(notFound.status));assert.match(await notFound.text(),/NEXT_HTTP_ERROR_FALLBACK;404|This page could not be found/,'Next.js pode servir 404 semântico após iniciar o streaming');
  console.log('OK: ERP completo via handlers reais, revisões, oito recursos, papéis, bearer, convites, fotos/anexos, webhooks e notificações');
  const challenge = '/api/whatsapp/webhook?hub.mode=subscribe&hub.challenge=challenge-http&hub.verify_token=';
  assert.equal((await request(challenge + 'wrong', {}, false)).status, 403);
  const verified = await request(challenge + verifyToken, {}, false);
  assert.equal(verified.status, 200); assert.equal(await verified.text(), 'challenge-http');
  const raw = webhook();
  assert.equal((await deliver(raw, 'sha256=' + '0'.repeat(64))).status, 403);
  assert.equal((await deliver(raw)).status, 200);
  assert.equal((await deliver(raw)).status, 200);
  const messages = await (await request('/api/whatsapp/messages?phone=' + phone)).json();
  assert.equal(messages.messages.length, 1, 'Webhook repetido não duplica mensagem');
  assert.equal(messages.messages[0].text, 'Olá, preciso de um orçamento.');
  console.log('OK: challenge, HMAC, persistência e deduplicação nos handlers reais');
  assert.equal((await post('/api/whatsapp/consent', { phone, status: 'granted', source: 'Permissão explícita de teste isolado.' }, 'https://attacker.example')).status, 403);
  assert.equal((await post('/api/whatsapp/consent', { phone, status: 'granted', source: 'Permissão explícita de teste isolado.' })).status, 200);
  const status = await (await request('/api/whatsapp/status')).json();
  assert.equal(status.ready, false, 'Sem credenciais, não pode anunciar conexão pronta');
  assert.ok(!JSON.stringify(status).includes(appSecret)); assert.ok(!JSON.stringify(status).includes(verifyToken));
  assert.equal((await post('/api/whatsapp/messages', { phone, type: 'text', text: 'Teste local sem token Meta.', clientRequestId: randomBytes(16).toString('hex') })).status, 503);
  console.log('OK: origem validada, segredos ausentes da resposta e envio sem token falha fechado');
  const encoded = Buffer.from(JSON.stringify({ algorithm: 'HMAC-SHA256', user_id: '123456789', issued_at: Math.floor(Date.now() / 1000) })).toString('base64url');
  const signed = `${createHmac('sha256', appSecret).update(encoded).digest('base64url')}.${encoded}`;
  const deleted = await request('/api/meta/data-deletion', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ signed_request: signed }).toString() }, false);
  assert.equal(deleted.status, 200);
  const receipt = await deleted.json();
  assert.match(receipt.confirmation_code, /^[a-f0-9]{48}$/);
  assert.equal(new URL(receipt.url).origin, publicOrigin);
  const tracked = await request('/api/meta/data-deletion/status?code=' + receipt.confirmation_code, {}, false);
  assert.equal(tracked.status, 200); assert.equal((await tracked.json()).status, 'pending_review');
  const statusPage = await request('/exclusao-de-dados/status?code=' + receipt.confirmation_code, {}, false);
  assert.equal(statusPage.status, 200);
  assert.match(await statusPage.text(), /Recebida e aguardando revisão/);
  assert.equal((await request('/api/whatsapp/messages?phone=' + phone)).status, 200, 'Callback Facebook não apaga contato WhatsApp sem vínculo');
  const queue = await (await request(management + 'deletions')).json();
  assert.equal(queue.requests[0].code, receipt.confirmation_code); assert.ok(!JSON.stringify(queue).includes('identity_hash'));
  assert.equal((await post(management + 'deletions', { code: receipt.confirmation_code, outcome: 'no_matching_data', note: 'Teste isolado; confirmado identificador Meta sem vínculo a dados do titular.' })).status, 200);
  assert.equal((await (await request('/api/meta/data-deletion/status?code=' + receipt.confirmation_code, {}, false)).json()).status, 'no_matching_data');
  assert.equal((await post('/api/whatsapp/contacts', { phone, confirmation: 'EXCLUIR', identityVerification: 'Identidade confirmada em teste HTTP isolado.' }, publicOrigin, 'DELETE')).status, 200);
  assert.equal((await (await request('/api/whatsapp/messages?phone=' + phone)).json()).messages.length, 0);
  assert.equal((await deliver(webhook('Evento após exclusão deve ser ignorado.', 'wamid.http.after-delete'))).status, 200);
  assert.equal((await (await request('/api/whatsapp/messages?phone=' + phone)).json()).messages.length, 0);
  console.log('OK: protocolo Meta sem vinculação falsa e exclusão WhatsApp com supressão de reingestão');
  const authRun = spawn(process.execPath, ['--experimental-strip-types', 'tests/auth-http.mjs'], {
    env: { ...process.env, NODE_ENV: 'production', AUTH_TEST_ORIGIN: origin, AUTH_ORIGIN: publicOrigin, AUTH_DB_PATH: process.env.AUTH_DB_PATH }, stdio: 'inherit',
  });
  const [authExit] = await once(authRun, 'exit');
  assert.equal(authExit, 0, 'Regressão HTTP de autenticação deve passar no mesmo ambiente isolado.');
} finally {
  if (server.exitCode === null) {
    const closed = once(server, 'exit'); server.kill('SIGTERM');
    await Promise.race([closed, sleep(5000)]);
    if (server.exitCode === null) { server.kill('SIGKILL'); await closed; }
  }
  await auth.db().close();
  rmSync(folder, { recursive: true, force: true });
}
