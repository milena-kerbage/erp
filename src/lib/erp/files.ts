import {compressImage} from '../storage/images.ts';
import {prepareImageVariants,saveImageVariants,imageVariant,deleteImageVariants,variantsDb} from '../storage/variants.ts';
import {storeBinary,readBinary,discardBinaries} from '../storage/r2.ts';
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
  if(bytes.length>=12&&bytes.subarray(4,8).toString()==='ftyp'&&['avif','avis'].includes(bytes.subarray(8,12).toString()))return 'image/avif';
  throw new ApiError(400,'Envie uma foto PNG, JPEG, WebP ou AVIF.','INVALID_IMAGE');
}
function checkSize(bytes: Buffer) { if (!bytes.length || bytes.length>MAX_FILE_BYTES) throw new ApiError(413,'O arquivo precisa ter de 1 byte a 3 MiB.','FILE_TOO_LARGE'); }
export async function storePhoto(bytes: Buffer,actor:Actor) {
  checkSize(bytes);imageMime(bytes);
  const compressed=await compressImage(bytes,'profile'),database=variantsDb(accessDb());
  const variants=await prepareImageVariants('profile',actor.id,compressed),objectKey=variants.find(v=>v.format==='webp'&&v.variant==='large')!.key;
  await database.transaction(async()=>{
    await database.prepare('INSERT INTO profile_photos (user_id,content,mime_type,updated,object_key) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET content = excluded.content, mime_type = excluded.mime_type, updated = excluded.updated, object_key=excluded.object_key').run(actor.id,objectKey?Buffer.alloc(0):compressed.webp.large,'image/webp',Date.now(),objectKey);
    await saveImageVariants(database,variants);
    await patchMemberMetadata(actor.id,{avatarUrl:`/api/erp/profile/photo?userId=${encodeURIComponent(actor.id)}&v=${Date.now()}`});
  });
  return {currentUser:await currentMember(actor)};
}
export async function deletePhoto(actor:Actor) {
  const database=variantsDb(accessDb());let oldKey:string|undefined,variantKeys:string[]=[];
  await database.transaction(async()=>{
    const removed=await database.prepare('DELETE FROM profile_photos WHERE user_id = ? RETURNING object_key').get(actor.id);oldKey=removed?.object_key?String(removed.object_key):undefined;
    variantKeys=await deleteImageVariants(database,'profile',actor.id);
    await patchMemberMetadata(actor.id,{avatarUrl:null});
  });
  await discardBinaries([oldKey,...variantKeys]);
  return {currentUser:await currentMember(actor)};
}
export async function getPhoto(id:string,formato:'webp'|'avif'='webp') {
  if (!id || id.length>100) throw new ApiError(400,'Identificador inválido.','INVALID_ID');
  const row=await accessDb().prepare("SELECT profile_photos.content, profile_photos.mime_type, profile_photos.object_key FROM profile_photos JOIN members ON members.user_id = profile_photos.user_id WHERE profile_photos.user_id = ? AND members.status = 'active'").get(id) as {content:Uint8Array;mime_type:string;object_key?:string} | undefined;
  if (!row) throw new ApiError(404,'Foto não encontrada.','NOT_FOUND'); if(formato==='avif'){const variant=await imageVariant(accessDb(),'profile',id,'large','avif');if(variant)return{content:variant.content,mime_type:variant.type};}if(row.object_key)row.content=await readBinary(row.object_key); return row;
}
async function activeLead(id:string) {
  if (!id || id.length>100) throw new ApiError(400,'Identificador inválido.','INVALID_ID');
  if (!await filesDb().prepare('SELECT id FROM leads WHERE id = ? AND archived_at IS NULL').get(id)) throw new ApiError(404,'Lead não encontrado.','NOT_FOUND');
}
export async function storeAttachment(leadId:string,name:string,mime:string,bytes:Buffer,duration?:number,actor?:Actor) {
  checkSize(bytes); await activeLead(leadId);
  if (duration !== undefined && (!Number.isFinite(duration) || duration<0 || duration>86400)) throw new ApiError(400,'Duração inválida.','INVALID_DURATION');
  let raster=false;try{imageMime(bytes);raster=true;}catch{if(mime.startsWith('image/'))throw new ApiError(415,'Imagem inválida.','INVALID_IMAGE');}
  const compressed=raster?await compressImage(bytes,'general'):null;
  if(compressed)bytes=compressed.webp.large;
  const database=variantsDb(filesDb()),id=randomUUID(),created=Date.now(),filename=compressed?normalizedFilename(name).replace(/\.[^.]+$/,'')+'.webp':normalizedFilename(name),type=compressed?'image/webp':/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(mime)?mime:'application/octet-stream';
  const variants=compressed?await prepareImageVariants('attachment',id,compressed):null;
  const objectKey=variants?variants.find(v=>v.format==='webp'&&v.variant==='large')!.key:await storeBinary(`private/attachments/${id}`,bytes,type);
  await database.transaction(async()=>{
    await lockErpCore();
    await activeLead(leadId);
    const size=await database.prepare('SELECT COALESCE(SUM(size),0) AS bytes, COUNT(*) AS count FROM lead_attachments WHERE lead_id = ?').get(leadId) as {bytes:number;count:number};
    if (!Number.isSafeInteger(Number(size.bytes)) || Number(size.count)>=100 || Number(size.bytes)+bytes.length>30*1024*1024) throw new ApiError(413,'O limite deste lead é 100 arquivos e 30 MiB.','ATTACHMENT_LIMIT');
    await database.prepare('INSERT INTO lead_attachments (id,lead_id,name,size,mime_type,created,duration,content,object_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id,leadId,filename,bytes.length,type,created,duration??null,objectKey?Buffer.alloc(0):bytes,objectKey);
    if(variants)await saveImageVariants(database,variants);
    const lead=await database.prepare('SELECT details_json FROM leads WHERE id = ?').get(leadId) as {details_json:string};
    const details=JSON.parse(lead.details_json);details.history.push({id:randomUUID(),type:'file',fileName:filename,at:new Date(created).toISOString(),by:actor?.name || 'Sistema'});
    await database.prepare('UPDATE leads SET details_json = ?, updated = ? WHERE id = ?').run(JSON.stringify(details),created,leadId);
    await database.prepare('INSERT INTO erp_audit VALUES (?, ?, ?, ?, ?, ?)').run(randomUUID(),actor?.id || 'system','file_attached','leads',leadId,created);
  });
  return {attachment:{id,name:filename,size:bytes.length,type,addedAt:new Date(created).toISOString(),url:`/api/erp/leads/${encodeURIComponent(leadId)}/attachments/${id}`,...(duration!==undefined?{duration}:{})}};
}
export async function getAttachment(leadId:string,id:string,formato:'webp'|'avif'='webp') {
  await activeLead(leadId);
  if (!id || id.length>100) throw new ApiError(400,'Identificador inválido.','INVALID_ID');
  const row=await filesDb().prepare('SELECT content, name, mime_type, object_key FROM lead_attachments WHERE id = ? AND lead_id = ?').get(id,leadId) as {content:Uint8Array;name:string;mime_type:string;object_key?:string} | undefined;
  if (!row) throw new ApiError(404,'Arquivo não encontrado.','NOT_FOUND'); if(formato==='avif'&&row.mime_type.startsWith('image/')){const variant=await imageVariant(filesDb(),'attachment',id,'large','avif');if(variant)return{...row,name:row.name.replace(/\.[^.]+$/,'.avif'),content:variant.content,mime_type:variant.type};}if(row.object_key)row.content=await readBinary(row.object_key); return row;
}
export async function deleteAttachment(leadId:string,id:string,actor?:Actor) {
  let variants:string[]=[];const database=variantsDb(filesDb());
  const removed=await database.transaction(async()=>{await lockErpCore();await activeLead(leadId);const row=await filesDb().prepare('DELETE FROM lead_attachments WHERE id = ? AND lead_id = ? RETURNING object_key').get(id,leadId);if(!row)throw new ApiError(404,'Arquivo não encontrado.','NOT_FOUND');variants=await deleteImageVariants(database,'attachment',id);await filesDb().prepare('INSERT INTO erp_audit VALUES (?, ?, ?, ?, ?, ?)').run(randomUUID(),actor?.id||'system','file_removed','leads',leadId,Date.now());return row.object_key?String(row.object_key):undefined;});
  await discardBinaries([removed,...variants]);return {deleted:true};
}
