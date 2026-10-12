import { randomBytes, randomUUID, createCipheriv, createDecipheriv, createHmac } from 'node:crypto';
import { lookup as dnsLookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { request as httpsRequest, type RequestOptions } from 'node:https';
import { accessDb, ApiError, type Actor } from './access.ts';

export const WEBHOOK_EVENTS=['lead.created','lead.stage_changed','message.received','message.sent','conversation.resolved'] as const;
const forbidden=new BlockList();
for (const [ip,bits] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.168.0.0',16],['192.0.2.0',24],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]] as const) forbidden.addSubnet(ip,bits,'ipv4');
for (const [ip,bits] of [['::',128],['::1',128],['fc00::',7],['fe80::',10],['ff00::',8],['2001:db8::',32],['2001::',32]] as const) forbidden.addSubnet(ip,bits,'ipv6');
const globalV6=new BlockList(); globalV6.addSubnet('2000::',3,'ipv6');
export function publicAddress(address:string) {
  const family=isIP(address);
  if (family===4) return !forbidden.check(address,'ipv4');
  return family===6 && globalV6.check(address,'ipv6') && !forbidden.check(address,'ipv6');
}
export function webhookUrl(value:unknown) {
  try { if (typeof value!=='string' || value.length>2000) throw new Error(); const url=new URL(value); if(url.protocol!=='https:' || url.username || url.password || url.hash || url.port && url.port!=='443' || isIP(url.hostname.replace(/^\[|\]$/g,'')) || !url.hostname.includes('.') || /(?:^|\.)(?:localhost|local|internal|test)$/.test(url.hostname)) throw new Error(); return url.toString(); }
  catch {throw new ApiError(400,'Informe uma URL HTTPS pública, sem credenciais, IP ou fragmento.','INVALID_WEBHOOK_URL');}
}
function events(value:unknown) { if(!Array.isArray(value) || !value.length || value.length>WEBHOOK_EVENTS.length || value.some(item=>!WEBHOOK_EVENTS.includes(item as typeof WEBHOOK_EVENTS[number]))) throw new ApiError(400,'Selecione eventos válidos.','INVALID_EVENTS'); return [...new Set(value as string[])]; }
function key() { const value=process.env.INTEGRATION_ENCRYPTION_KEY || ''; if(!/^[A-Za-z0-9+/]{43}=$/.test(value) || Buffer.from(value,'base64').toString('base64')!==value) throw new ApiError(503,'Configure a chave de criptografia privada para proteger o webhook.','ENCRYPTION_NOT_CONFIGURED'); return Buffer.from(value,'base64'); }
function encryptWithIv(id:string,secret:string) {const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);cipher.setAAD(Buffer.from(`erp-webhook:${id}:v1`));const bytes=Buffer.concat([cipher.update(secret,'utf8'),cipher.final()]);return JSON.stringify({iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),bytes:bytes.toString('base64')});}
function decrypt(id:string,envelope:string) {try {const value=JSON.parse(envelope),decipher=createDecipheriv('aes-256-gcm',key(),Buffer.from(value.iv,'base64'));decipher.setAAD(Buffer.from(`erp-webhook:${id}:v1`));decipher.setAuthTag(Buffer.from(value.tag,'base64'));return Buffer.concat([decipher.update(Buffer.from(value.bytes,'base64')),decipher.final()]).toString('utf8');}catch{throw new ApiError(503,'Não foi possível recuperar a assinatura do webhook. Restaure a chave original.','ENCRYPTION_DECRYPT_FAILED');}}
type Hook={id:string;user_id:string;url:string;events_json:string;active:number;secret_encrypted:string;created:number;updated:number};
export async function webhooks() {
  const database=accessDb(), rows=await database.prepare('SELECT id, url, events_json, active, created FROM app_webhooks ORDER BY created DESC').all() as Hook[];
  return Promise.all(rows.map(async row=>{const delivery=await database.prepare('SELECT updated,response_status FROM webhook_deliveries WHERE webhook_id = ? ORDER BY updated DESC LIMIT 1').get(row.id) as {updated:number;response_status:number} | undefined; return {id:row.id,url:row.url,events:JSON.parse(row.events_json),active:Boolean(row.active),createdAt:new Date(row.created).toISOString(),...(delivery?{lastDelivery:{at:new Date(delivery.updated).toISOString(),status:delivery.response_status || 0}}:{})};}));
}
export async function createWebhook(input:Record<string,unknown>,actor:Actor) {
  if(Object.keys(input).some(value=>!['url','events'].includes(value))) throw new ApiError(400,'Campo de webhook desconhecido.','INVALID_INPUT');
  const url=webhookUrl(input.url), selected=events(input.events), secret=`whsec_${randomBytes(32).toString('hex')}`,id=randomUUID(),database=accessDb();
  const count=await database.prepare('SELECT COUNT(*) AS count FROM app_webhooks').get() as {count:number}; if(count.count>=20) throw new ApiError(409,'O limite é 20 webhooks por instalação.','WEBHOOK_LIMIT');
  await database.prepare('INSERT INTO app_webhooks VALUES (?, ?, ?, ?, 1, ?, ?, ?)').run(id,actor.id,url,JSON.stringify(selected),encryptWithIv(id,secret),Date.now(),Date.now());
  return {secret,webhook:(await webhooks()).find(item=>item.id===id)};
}
export async function updateWebhook(id:string,input:Record<string,unknown>) {
  if(Object.keys(input).some(value=>!['url','events','active'].includes(value))) throw new ApiError(400,'Campo de webhook desconhecido.','INVALID_INPUT');
  const database=accessDb(), row=await database.prepare('SELECT * FROM app_webhooks WHERE id = ?').get(id) as Hook | undefined;
  if(!row) throw new ApiError(404,'Webhook não encontrado.','NOT_FOUND');
  if(input.active!==undefined && typeof input.active!=='boolean') throw new ApiError(400,'Situação inválida.','INVALID_INPUT');
  await database.prepare('UPDATE app_webhooks SET url = ?, events_json = ?, active = ?, updated = ? WHERE id = ?').run(input.url===undefined?row.url:webhookUrl(input.url),input.events===undefined?row.events_json:JSON.stringify(events(input.events)),input.active===undefined?row.active:input.active?1:0,Date.now(),id);
  return {webhook:(await webhooks()).find(item=>item.id===id)};
}
export async function removeWebhook(id:string) {const result=await accessDb().prepare('DELETE FROM app_webhooks WHERE id = ?').run(id);if(!result.changes) throw new ApiError(404,'Webhook não encontrado.','NOT_FOUND');return {deleted:true};}
export type ResolvedAddress={address:string;family:number};
async function resolvePublicHost(host:string):Promise<ResolvedAddress[]> {
  let timer:ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([dnsLookup(host,{all:true}),new Promise<ResolvedAddress[]>((_,reject)=>{timer=setTimeout(()=>reject(new ApiError(502,'A consulta DNS do destino excedeu o prazo.','WEBHOOK_DNS_TIMEOUT')),6000);})]); }
  finally { if(timer) clearTimeout(timer); }
}
export async function deliveryTarget(value:string,resolver:(host:string)=>Promise<ResolvedAddress[]> = resolvePublicHost) {
  const url=new URL(webhookUrl(value));
  const hosts=new Set((process.env.ERP_WEBHOOK_ALLOWED_HOSTS || '').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean));
  if(!hosts.has(url.hostname)) throw new ApiError(503,'O administrador precisa autorizar este host em ERP_WEBHOOK_ALLOWED_HOSTS antes da entrega.','WEBHOOK_HOST_NOT_ALLOWED');
  const addresses=await resolver(url.hostname);
  if(!addresses.length || addresses.some(item=>!publicAddress(item.address))) throw new ApiError(400,'O destino resolve para uma rede privada ou reservada.','WEBHOOK_PRIVATE_NETWORK');
  return {url,address:addresses[0]};
}
async function pinnedPost(target:Awaited<ReturnType<typeof deliveryTarget>>,body:string,headers:Record<string,string>) {
  return new Promise<number>((resolve,reject)=>{
    const pinnedLookup:NonNullable<RequestOptions['lookup']>=(_hostname,options,callback)=>{if(typeof options==='object' && options.all) callback(null,[target.address] as never);else callback(null,target.address.address,target.address.family);};
    const request=httpsRequest(target.url,{method:'POST',agent:false,lookup:pinnedLookup,headers:{...headers,'Content-Length':String(Buffer.byteLength(body))},signal:AbortSignal.timeout(12000)},response=>{const status=response.statusCode || 0;response.destroy();resolve(status);});
    request.on('error',()=>reject(new ApiError(502,'Não foi possível entregar ao endpoint autorizado.','WEBHOOK_UNAVAILABLE'))); request.end(body);
  });
}
export async function enqueueEvent(event:string,entityId:string,onlyHook?:string) {
  if(!WEBHOOK_EVENTS.includes(event as typeof WEBHOOK_EVENTS[number]) && event!=='webhook.test') throw new ApiError(400,'Evento inválido.','INVALID_EVENT');
  const database=accessDb(),hooks=(await database.prepare('SELECT * FROM app_webhooks WHERE active = 1').all() as Hook[]).filter(hook=>onlyHook?hook.id===onlyHook:(JSON.parse(hook.events_json) as string[]).includes(event));
  if(onlyHook && !hooks.length) throw new ApiError(404,'Webhook ativo não encontrado.','NOT_FOUND');
  const ids:string[]=[];
  for(const hook of hooks) {const id=randomUUID();await database.prepare('INSERT INTO webhook_deliveries VALUES (?, ?, ?, ?, ?, 0, ?, ?, NULL)').run(id,hook.id,event,JSON.stringify({id,event,occurredAt:new Date().toISOString(),data:{entityId}}),'queued',Date.now(),Date.now());ids.push(id);}
  return ids;
}
export async function deliverWebhook(id:string,transport:typeof pinnedPost=pinnedPost,resolver?: (host:string)=>Promise<ResolvedAddress[]>) {
  const database=accessDb();
  const row=await database.prepare("UPDATE webhook_deliveries SET status = 'sending', attempts = attempts + 1, updated = ? WHERE id = ? AND (status IN ('queued','failed') OR (status = 'sending' AND updated < ?)) AND attempts < 5 RETURNING *").get(Date.now(),id,Date.now()-60000) as {webhook_id:string;payload_json:string} | undefined;
  if(!row) throw new ApiError(409,'Entrega inexistente, já processada ou sem tentativas disponíveis.','DELIVERY_NOT_AVAILABLE');
  const hook=await database.prepare('SELECT * FROM app_webhooks WHERE id = ? AND active = 1').get(row.webhook_id) as Hook | undefined;
  let status=0, failure='';
  try { if(!hook) throw new ApiError(409,'Webhook desativado.','WEBHOOK_DISABLED'); const target=await deliveryTarget(hook.url,resolver); status=await transport(target,row.payload_json,{'Content-Type':'application/json','X-MK-Signature-256':`sha256=${createHmac('sha256',decrypt(hook.id,hook.secret_encrypted)).update(row.payload_json).digest('hex')}`,'X-MK-Delivery-ID':id}); }
  catch(error) {failure=error instanceof ApiError?error.message:'Falha ao resolver ou alcançar o destino autorizado.';}
  const ok=status>=200&&status<300;
  await database.prepare('UPDATE webhook_deliveries SET status = ?, response_status = ?, updated = ? WHERE id = ?').run(ok?'delivered':'failed',status||null,Date.now(),id);
  return {id,ok,status:status||null,error:failure || (ok?undefined:'O destino não confirmou a entrega com HTTP 2xx.'),at:new Date().toISOString()};
}
export async function testWebhook(id:string) {const [delivery]=await enqueueEvent('webhook.test','test',id);return deliverWebhook(delivery);}
export async function pendingDeliveries() {return await accessDb().prepare("SELECT id,webhook_id,event,status,attempts,created,updated,response_status FROM webhook_deliveries ORDER BY created DESC LIMIT 100").all();}
