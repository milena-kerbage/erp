import {compressImage} from './images.ts';
import {prepareImageVariants,saveImageVariants,variantsDb,variantsTable,variantKeys,discardBinaries} from './variants.ts';
import {randomUUID} from 'node:crypto';
import {erpDB} from '../erp/core.ts';
import {ApiError,type Actor} from '../erp/access.ts';
import {storageStatus,presignUpload,inspectUpload,publishUpload,readPrefix,readBinary,removePublicBinary,publicKeyFromUrl} from './r2.ts';
const schema=`CREATE TABLE IF NOT EXISTS media_uploads(id TEXT PRIMARY KEY,actor TEXT NOT NULL,object_key TEXT NOT NULL UNIQUE,mime TEXT NOT NULL,size INTEGER NOT NULL,created INTEGER NOT NULL,status TEXT NOT NULL,public_url TEXT);CREATE INDEX IF NOT EXISTS media_uploads_actor ON media_uploads(actor,created DESC);`;
function db(){const database=erpDB();database.registerSqliteSchema(schema);return database;}
const types:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/avif':'avif','image/webp':'webp','video/mp4':'mp4','video/webm':'webm'};
const max=128*1024*1024;
export async function mediaList(offset=0){if(!Number.isInteger(offset)||offset<0||offset>100000)throw new ApiError(400,'Paginação inválida.');const rows=await db().prepare('SELECT id,mime,size,created,status,public_url FROM media_uploads ORDER BY created DESC,id LIMIT 51 OFFSET ?').all(offset);return{storage:storageStatus(),files:rows.slice(0,50),hasMore:rows.length>50};}
export async function createMediaUpload(input:Record<string,unknown>,actor:Actor){
  if(actor.permission!=='admin'&&actor.permission!=='manager')throw new ApiError(403,'Apenas gestão pode enviar mídia.');
  const type=String(input.type??''),size=Number(input.size);
  if(!types[type]||!Number.isSafeInteger(size)||size<1||size>(type.startsWith('image/')?12*1024*1024:max))throw new ApiError(400,'Envie JPG, PNG, WebP, MP4 ou WebM de até 128 MiB.','INVALID_UPLOAD');
  const database=db(),id=randomUUID(),key=`uploads/${id}.${types[type]}`;
  const uploadUrl=await presignUpload(key,type,size);
  await purgeExpiredUploads();
  // Limite de reserva persistente para impedir uma quantidade ilimitada de URLs válidas.
  await database.transaction(async()=>{
    if(database.backend==='postgres')await database.prepare('SELECT pg_advisory_xact_lock(hashtextextended(?,0))').get('media-upload-reservation');
    const count=Number((await database.prepare("SELECT COUNT(*) AS count FROM media_uploads WHERE status='pending' AND created>?").get(Date.now()-3600000))?.count??0);
    if(count>=20)throw new ApiError(429,'Conclua os uploads pendentes antes de enviar mais arquivos.');
    await database.prepare('INSERT INTO media_uploads VALUES (?,?,?,?,?,?,?,NULL)').run(id,actor.id,key,type,size,Date.now(),'pending');
  });
  return{id,uploadUrl,expiresIn:300};
}
function matches(type:string,bytes:Buffer){
  if(type==='video/mp4')return bytes.length>=12&&bytes.subarray(4,8).toString()==='ftyp';
  if(type==='video/webm')return bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
  if(type==='image/avif')return bytes.subarray(4,8).toString()==='ftyp'&&['avif','avis'].includes(bytes.subarray(8,12).toString());
  if(type==='image/png')return bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if(type==='image/jpeg')return bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  return bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
}
export async function finalizeMedia(id:string,actor:Actor){
  if(!/^[a-f0-9-]{36}$/.test(id))throw new ApiError(404,'Mídia não encontrada.');
  const row=await db().prepare('SELECT * FROM media_uploads WHERE id=? AND actor=?').get(id,actor.id);
  if(!row)throw new ApiError(404,'Mídia não encontrada.');
  if(row.status==='published')return{id,url:String(row.public_url)};
  if(Date.now()-Number(row.created)>3600000)throw new ApiError(410,'O envio expirou. Envie o arquivo novamente.','UPLOAD_EXPIRED');
  const metadata=await inspectUpload(String(row.object_key));
  if(metadata.size!==Number(row.size)||metadata.type!==row.mime||!metadata.etag)throw new ApiError(400,'O arquivo enviado difere do tamanho ou formato informado.','INVALID_UPLOAD');
  const prefix=await readPrefix(String(row.object_key));
  if(prefix.etag!==metadata.etag||!matches(String(row.mime),prefix.bytes))throw new ApiError(415,'O conteúdo do arquivo não corresponde ao formato.','INVALID_UPLOAD');
  if(String(row.mime).startsWith('image/')){
    const compressed=await compressImage(await readBinary(String(row.object_key),12*1024*1024),'general');
    const variants=await prepareImageVariants('asset',id,compressed);
    const privateKeys=variantKeys(variants),database=variantsDb(db());
    let url='';
    try{
      for(const variant of variants){
        if(!variant.key)throw new ApiError(503,'Armazenamento externo não está ativo.');
        const metadata=await inspectUpload(variant.key);if(!metadata.etag)throw new ApiError(503,'Não foi possível verificar o arquivo.');
        variant.publicUrl=await publishUpload(variant.key,`vitrine/midia/${id}-${variant.variant}.${variant.format}`,`image/${variant.format}`,metadata.etag);
      }
      url=variants.find(v=>v.format==='webp'&&v.variant==='large')!.publicUrl!;
      await database.transaction(async()=>{
        await saveImageVariants(database,variants.map(variant=>({...variant,key:null,bytes:Buffer.alloc(0)})));
        await database.prepare("UPDATE media_uploads SET status='published',public_url=?,mime='image/webp' WHERE id=? AND actor=?").run(url,id,actor.id);
      });
    }catch(error){
      // Falhou no meio: nada de cópias convertidas esquecidas (o original segue para uma nova tentativa).
      await discardBinaries(privateKeys);await discardPublic(variants.map(variant=>publicKeyFromUrl(variant.publicUrl)));
      throw error;
    }
    await discardBinaries([String(row.object_key),...privateKeys]);
    return{id,url,avifUrl:variants.find(v=>v.format==='avif'&&v.variant==='large')!.publicUrl,compression:{originalBytes:compressed.originalBytes,webpBytes:compressed.webp.large.length,avifBytes:compressed.avif.large.length}};
  }
  const url=await publishUpload(String(row.object_key),`vitrine/midia/${id}.${types[String(row.mime)]}`,String(row.mime),metadata.etag);
  await db().prepare("UPDATE media_uploads SET status='published',public_url=? WHERE id=? AND actor=?").run(url,id,actor.id);
  await discardBinaries([String(row.object_key)]);
  return{id,url};
}

async function discardPublic(keys:(string|null)[]){const result=await Promise.allSettled([...new Set(keys.filter((key):key is string=>Boolean(key)))].map(removePublicBinary));if(result.some(item=>item.status==='rejected'))console.warn('Há arquivos públicos removidos da biblioteca aguardando limpeza no storage.');}
/** Reservas não concluídas em 1 hora (a URL assinada já expirou): o arquivo enviado e a linha saem. */
export async function purgeExpiredUploads(now=Date.now()){
  const database=db(),rows=await database.prepare("DELETE FROM media_uploads WHERE status='pending' AND created<? RETURNING object_key").all(now-3600000);
  await discardBinaries(rows.map(row=>String(row.object_key)));
  return rows.length;
}
/** Exclusão definitiva de uma mídia da biblioteca: tira do bucket público (todos os formatos) e do banco. */
export async function deleteMedia(id:string,actor:Actor){
  if(actor.permission!=='admin'&&actor.permission!=='manager')throw new ApiError(403,'Apenas gestão pode excluir mídia.');
  if(!/^[a-f0-9-]{36}$/.test(id))throw new ApiError(404,'Mídia não encontrada.');
  const database=variantsDb(db());
  const removed=await database.transaction(async()=>{
    const row=await database.prepare('DELETE FROM media_uploads WHERE id=? RETURNING object_key,public_url').get(id);
    if(!row)throw new ApiError(404,'Mídia não encontrada.');
    const variants=await database.prepare(`DELETE FROM ${variantsTable(database)} WHERE kind='asset' AND owner_id=? RETURNING object_key,public_url`).all(id);
    return{privateKeys:[String(row.object_key),...variants.map(variant=>variant.object_key?String(variant.object_key):null)],publicKeys:[publicKeyFromUrl(row.public_url),...variants.map(variant=>publicKeyFromUrl(variant.public_url))]};
  });
  await discardBinaries(removed.privateKeys);await discardPublic(removed.publicKeys);
  return{deleted:true};
}
