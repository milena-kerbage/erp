import test,{beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomBytes,createHmac} from 'node:crypto';
import * as auth from '../src/lib/auth/core.ts';
import * as access from '../src/lib/erp/access.ts';
import * as hooks from '../src/lib/erp/webhooks.ts';
import * as files from '../src/lib/erp/files.ts';
import * as core from '../src/lib/erp/core.ts';
import * as notifications from '../src/lib/erp/notifications.ts';
import {closeDatabases} from '../src/lib/database.ts';
let directory;
const admin={id:'admin-test',name:'Gestora de teste',email:'admin@example.test',permission:'admin'};
const member={id:'member-test',name:'Operador de teste',email:'member@example.test',permission:'member'};
beforeEach(async()=>{
 directory=mkdtempSync(join(tmpdir(),'mk-erp-access-'));delete process.env.DATABASE_URL;delete process.env.VERCEL;
 process.env.AUTH_DB_PATH=join(directory,'auth.sqlite');process.env.ERP_DB_PATH=join(directory,'erp.sqlite');process.env.ERP_ADMIN_EMAILS=admin.email;process.env.INTEGRATION_ENCRYPTION_KEY=randomBytes(32).toString('base64');process.env.ERP_WEBHOOK_ALLOWED_HOSTS='hooks.example.com';
 await auth.createUser(admin.email,admin.name,'unused-hash',admin.id);await auth.createUser(member.email,member.name,'unused-hash',member.id);
 await access.currentMember(admin);await access.currentMember(member);
});
afterEach(async()=>{await closeDatabases();rmSync(directory,{recursive:true,force:true});});
test('papéis vêm do servidor; perfil próprio não eleva permissão e último admin é preservado',async()=>{
 assert.equal((await access.currentMember(admin)).permission,'admin');assert.equal((await access.currentMember(member)).permission,'member');
 await assert.rejects(access.updateMember(member.id,{permission:'admin'},member,true),{status:400});
 await assert.rejects(access.updateMember(admin.id,{permission:'member'},admin),{code:'LAST_ADMIN'});
 await assert.rejects(access.updateMember(admin.id,{status:'disabled'},admin),{code:'SELF_DISABLE_BLOCKED'});
 await access.updateMember(member.id,{permission:'manager'},admin);assert.equal((await access.currentMember(member)).permission,'manager');
 const manager={...member,permission:'manager'};
 await assert.rejects(access.updateMember(member.id,{email:admin.email},manager,true),{code:'EMAIL_CHANGE_FORBIDDEN'});
 await assert.rejects(access.updateMember(member.id,{email:'gestor-autorizado@example.test'},manager,true),{code:'EMAIL_CHANGE_FORBIDDEN'});
 await access.updateMember(member.id,{email:member.email,phone:'85999999999'},manager,true);
 assert.equal((await access.currentMember(member)).email,member.email);
});
test('convite não simula SMTP, guarda só hash, expira e ativa a conta uma vez',async()=>{
 const issued=await access.inviteMember({name:'Nova pessoa',email:'new@example.test',permission:'member',role:'Costura'},admin,'https://app.example.com');
 assert.equal(issued.delivery,'manual');assert.equal(issued.emailSent,false);assert.equal(issued.member.status,'invited');
 const token=new URL(issued.inviteUrl).hash.slice(1),row=await access.accessDb().prepare('SELECT hash FROM invitations').get();assert.notEqual(row.hash,token);
 await assert.rejects(access.currentMember(issued.member),{code:'ACCOUNT_DISABLED'});
 await access.acceptInvitation(token,'Nova!Senha123');await assert.rejects(access.acceptInvitation(token,'Outra!Senha123'),{code:'INVALID_INVITATION'});
 assert.equal((await access.currentMember(issued.member)).permission,'member');assert.equal(await auth.verifyPassword('Nova!Senha123',(await auth.findUser('new@example.test')).password_hash),true);
 await assert.rejects(access.reissueInvitation(issued.member.id,admin,'https://app.example.com'),{code:'ACCOUNT_ALREADY_ACTIVATED'});
 const expired=await access.inviteMember({name:'Expirado',email:'expired@example.test',permission:'member',role:'Equipe'},admin,'https://app.example.com');
 await access.accessDb().prepare('UPDATE invitations SET expires = 0 WHERE user_id = ?').run(expired.member.id);
 await assert.rejects(access.acceptInvitation(new URL(expired.inviteUrl).hash.slice(1),'Nova!Senha123'),{code:'INVALID_INVITATION'});
});
test('escopo de chave de API restringe escrita, valor não aparece em GET e revogação é efetiva',async()=>{
 const generated=await access.createApiKey({name:'Leitura',scope:'read'},admin);assert.match(generated.key,/^mk_live_[a-f0-9]{64}$/);
 assert.ok(!JSON.stringify(await access.apiKeys()).includes(generated.key));assert.equal((await access.authenticateApiKey(generated.key,false)).id,admin.id);
 await assert.rejects(access.authenticateApiKey(generated.key,true),{code:'READ_ONLY_KEY'});
 const row=await access.accessDb().prepare('SELECT hash FROM api_keys WHERE id = ?').get(generated.apiKey.id);assert.notEqual(row.hash,generated.key);
 await access.revokeApiKey(generated.apiKey.id,admin.id);await assert.rejects(access.authenticateApiKey(generated.key,false),{status:401});
 await assert.rejects(access.createApiKey({name:'Tentativa',scope:'write'},member),{status:403});
});
test('desativação revoga sessões e bloqueia conta; role change não aceita self escalation',async()=>{
 const cookie=await auth.createSession(member.id);await access.updateMember(member.id,{status:'disabled'},admin);
 assert.equal(await auth.sessionUser(cookie),null);await assert.rejects(access.currentMember(member),{code:'ACCOUNT_DISABLED'});
 await assert.rejects(access.updateMember(admin.id,{permission:'admin'},member),{status:403});
});
test('foto e anexos são persistidos, restritos à ficha e servidos por URL de backend',async()=>{
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1foAAAAASUVORK5CYII=','base64');
 const result=await files.storePhoto(png,admin);assert.equal(result.currentUser.avatarUrl,'/api/erp/profile/photo?userId='+admin.id);assert.deepEqual(Buffer.from((await files.getPhoto(admin.id)).content),png);
 await assert.rejects(files.storePhoto(Buffer.from('<svg onload=evil>'),admin),{code:'INVALID_IMAGE'});
 const lead=(await core.createLead({lead:{name:'Teste',phone:'85999999999',budget:0,tags:[],funnelId:'vendas',stage:'novo'}},admin)).lead;
 const saved=await files.storeAttachment(lead.id,'../medidas.txt','text/plain',Buffer.from('medidas conferidas'));
 assert.equal(saved.attachment.name,'.._medidas.txt');assert.deepEqual(Buffer.from((await files.getAttachment(lead.id,saved.attachment.id)).content),Buffer.from('medidas conferidas'));
 await assert.rejects(files.getAttachment('outra-ficha',saved.attachment.id),{status:404});
 assert.equal((await core.leadsSnapshot()).details[lead.id].attachments.length,1);
 await files.deleteAttachment(lead.id,saved.attachment.id);await assert.rejects(files.getAttachment(lead.id,saved.attachment.id),{status:404});
 await files.deletePhoto(admin);await assert.rejects(files.getPhoto(admin.id),{status:404});
});
test('webhook exige host autorizado e IP público; DNS privado e URLs impróprias são rejeitados',async()=>{
 for(const url of ['http://example.com','https://127.0.0.1/x','https://user:pass@example.com','https://localhost/x','https://example.com:8443']) assert.throws(()=>hooks.webhookUrl(url),{code:'INVALID_WEBHOOK_URL'});
 for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','192.168.1.1','::1','::ffff:127.0.0.1','fc00::1']) assert.equal(hooks.publicAddress(ip),false);
 assert.equal(hooks.publicAddress('1.1.1.1'),true);
 await assert.rejects(hooks.deliveryTarget('https://other.example.com',async()=>[{address:'1.1.1.1',family:4}]),{code:'WEBHOOK_HOST_NOT_ALLOWED'});
 await assert.rejects(hooks.deliveryTarget('https://hooks.example.com',async()=>[{address:'10.0.0.1',family:4}]),{code:'WEBHOOK_PRIVATE_NETWORK'});
});
test('evento é assinado, secreto cifrado e entrega registra resultado real sem redirect/reenvio implícito',async()=>{
 const created=await hooks.createWebhook({url:'https://hooks.example.com/events',events:['lead.created']},admin);
 assert.ok(!JSON.stringify(await hooks.webhooks()).includes(created.secret));
 assert.ok(!(await access.accessDb().prepare('SELECT secret_encrypted FROM app_webhooks').get()).secret_encrypted.includes(created.secret));
 const [id]=await hooks.enqueueEvent('lead.created','entity-id');
 const delivery=await hooks.deliverWebhook(id,async(target,body,headers)=>{
  assert.equal(target.address.address,'1.1.1.1');assert.equal(headers['X-MK-Signature-256'],'sha256='+createHmac('sha256',created.secret).update(body).digest('hex'));assert.equal(JSON.parse(body).data.entityId,'entity-id');return 204;
 },async()=>[{address:'1.1.1.1',family:4}]);
 assert.equal(delivery.ok,true);assert.equal((await hooks.pendingDeliveries())[0].status,'delivered');
 await assert.rejects(hooks.deliverWebhook(id),{code:'DELIVERY_NOT_AVAILABLE'});
 const [failed]=await hooks.enqueueEvent('lead.created','other');assert.equal((await hooks.deliverWebhook(failed,async()=>302,async()=>[{address:'1.1.1.1',family:4}])).ok,false);
 assert.equal((await hooks.pendingDeliveries()).find(row=>row.id===failed).status,'failed');
});
test('notificações derivam de auditoria real e escolhas são privadas por usuário',async()=>{
 await core.createLead({lead:{name:'Cliente teste',phone:'85999999999',budget:0,tags:[],funnelId:'vendas',stage:'novo'}},admin);
 const feed=(await notifications.notifications(member)).notifications;assert.equal(feed.length,1);assert.equal(feed[0].read,false);
 await notifications.updateNotifications({id:feed[0].id,read:true},member);assert.equal((await notifications.notifications(member)).notifications[0].read,true);
 await notifications.updateNotifications({id:feed[0].id,archived:true},member);assert.equal((await notifications.notifications(member)).notifications[0].archived,true);
 assert.equal((await notifications.notifications(admin)).notifications[0].archived,false);
});
