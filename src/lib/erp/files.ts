import { randomUUID } from 'node:crypto';
import { databaseFor } from '../database.ts';
import { accessDb, ApiError, currentMember, patchMemberMetadata, type Actor } from './access.ts';
import { lockErpCore } from './core.ts';

export const MAX_FILE_BYTES = 3 * 1024 * 1024;
export const attachmentSchema = `CREATE TABLE IF NOT EXISTS lead_attachments (id TEXT PRIMARY KEY,lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,name TEXT NOT NULL,size INTEGER NOT NULL,mime_type TEXT NOT NULL,created INTEGER NOT NULL,duration REAL,content BLOB NOT NULL);`;
const filesDb = () => databaseFor('erp', process.env.ERP_DB_PATH || '.data/erp.sqlite', attachmentSchema);
export function normalizedFilename(name: string) { return name.replace(/[\u0000-\u001f\u007f/\\]/g,'_').slice(0,180) || 'arquivo'; }
export function imageMime(bytes: Buffer) {
  if (bytes.length >= 8 && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (bytes.length >= 3 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return 'image/jpeg';
  if (bytes.length >= 12 && bytes.subarray(0,4).toString()==='RIFF' && bytes.subarray(8,12).toString()==='WEBP') return 'image/webp';
  throw new ApiError(400,'Envie uma foto PNG, JPEG ou WebP.','INVALID_IMAGE');
}
function checkSize(bytes: Buffer) { if (!bytes.length || bytes.length>MAX_FILE_BYTES) throw new ApiError(413,'O arquivo precisa ter de 1 byte a 3 MiB.','FILE_TOO_LARGE'); }
export async function storePhoto(bytes: Buffer,actor:Actor) {
  checkSize(bytes); const type=imageMime(bytes), database=accessDb();
  await database.transaction(async()=>{
    await database.prepare('INSERT INTO profile_photos VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET content = excluded.content, mime_type = excluded.mime_type, updated = excluded.updated').run(actor.id,bytes,type,Date.now());
    await patchMemberMetadata(actor.id,{avatarUrl:`/api/erp/profile/photo?userId=${encodeURIComponent(actor.id)}`});
  });
  return {currentUser:await currentMember(actor)};
}
export async function deletePhoto(actor:Actor) {
  const database=accessDb();
  await database.transaction(async()=>{
    await database.prepare('DELETE FROM profile_photos WHERE user_id = ?').run(actor.id);
    await patchMemberMetadata(actor.id,{avatarUrl:null});
  });
  return {currentUser:await currentMember(actor)};
}
export async function getPhoto(id:string) {
  if (!id || id.length>100) throw new ApiError(400,'Identificador inválido.','INVALID_ID');
  const row=await accessDb().prepare("SELECT profile_photos.content, profile_photos.mime_type FROM profile_photos JOIN members ON members.user_id = profile_photos.user_id WHERE profile_photos.user_id = ? AND members.status = 'active'").get(id) as {content:Uint8Array;mime_type:string} | undefined;
  if (!row) throw new ApiError(404,'Foto não encontrada.','NOT_FOUND'); return row;
}
async function activeLead(id:string) {
  if (!id || id.length>100) throw new ApiError(400,'Identificador inválido.','INVALID_ID');
  if (!await filesDb().prepare('SELECT id FROM leads WHERE id = ? AND archived_at IS NULL').get(id)) throw new ApiError(404,'Lead não encontrado.','NOT_FOUND');
}
export async function storeAttachment(leadId:string,name:string,mime:string,bytes:Buffer,duration?:number,actor?:Actor) {
  checkSize(bytes); await activeLead(leadId);
  if (duration !== undefined && (!Number.isFinite(duration) || duration<0 || duration>86400)) throw new ApiError(400,'Duração inválida.','INVALID_DURATION');
  const database=filesDb(), id=randomUUID(), created=Date.now(), filename=normalizedFilename(name), type=/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(mime) ? mime : 'application/octet-stream';
  await database.transaction(async()=>{
    await lockErpCore();
    await activeLead(leadId);
    const size=await database.prepare('SELECT COALESCE(SUM(size),0) AS bytes, COUNT(*) AS count FROM lead_attachments WHERE lead_id = ?').get(leadId) as {bytes:number;count:number};
    if (!Number.isSafeInteger(Number(size.bytes)) || Number(size.count)>=100 || Number(size.bytes)+bytes.length>30*1024*1024) throw new ApiError(413,'O limite deste lead é 100 arquivos e 30 MiB.','ATTACHMENT_LIMIT');
    await database.prepare('INSERT INTO lead_attachments VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id,leadId,filename,bytes.length,type,created,duration??null,bytes);
    const lead=await database.prepare('SELECT details_json FROM leads WHERE id = ?').get(leadId) as {details_json:string};
    const details=JSON.parse(lead.details_json);details.history.push({id:randomUUID(),type:'file',fileName:filename,at:new Date(created).toISOString(),by:actor?.name || 'Sistema'});
    await database.prepare('UPDATE leads SET details_json = ?, updated = ? WHERE id = ?').run(JSON.stringify(details),created,leadId);
    await database.prepare('INSERT INTO erp_audit VALUES (?, ?, ?, ?, ?, ?)').run(randomUUID(),actor?.id || 'system','file_attached','leads',leadId,created);
  });
  return {attachment:{id,name:filename,size:bytes.length,type,addedAt:new Date(created).toISOString(),url:`/api/erp/leads/${encodeURIComponent(leadId)}/attachments/${id}`,...(duration!==undefined?{duration}:{})}};
}
export async function getAttachment(leadId:string,id:string) {
  await activeLead(leadId);
  if (!id || id.length>100) throw new ApiError(400,'Identificador inválido.','INVALID_ID');
  const row=await filesDb().prepare('SELECT content, name, mime_type FROM lead_attachments WHERE id = ? AND lead_id = ?').get(id,leadId) as {content:Uint8Array;name:string;mime_type:string} | undefined;
  if (!row) throw new ApiError(404,'Arquivo não encontrado.','NOT_FOUND'); return row;
}
export async function deleteAttachment(leadId:string,id:string,actor?:Actor) {
  return filesDb().transaction(async()=>{await lockErpCore();await activeLead(leadId);const result=await filesDb().prepare('DELETE FROM lead_attachments WHERE id = ? AND lead_id = ?').run(id,leadId);if(!result.changes) throw new ApiError(404,'Arquivo não encontrado.','NOT_FOUND');await filesDb().prepare('INSERT INTO erp_audit VALUES (?, ?, ?, ?, ?, ?)').run(randomUUID(),actor?.id || 'system','file_removed','leads',leadId,Date.now());return {deleted:true};});
}
