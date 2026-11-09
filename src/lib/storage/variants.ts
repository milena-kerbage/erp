import {randomUUID} from 'node:crypto';
import type {Database} from '../database.ts';
import {storeBinary,readBinary,discardBinaries} from './r2.ts';
import type {CompressedImage} from './images.ts';
export type ImageKind='product'|'review'|'profile'|'attachment'|'asset';
const schema=`CREATE TABLE IF NOT EXISTS image_variants(kind TEXT NOT NULL,owner_id TEXT NOT NULL,variant TEXT NOT NULL,format TEXT NOT NULL,object_key TEXT,content BLOB NOT NULL,size INTEGER NOT NULL,width INTEGER NOT NULL,height INTEGER NOT NULL,original_size INTEGER NOT NULL,profile TEXT NOT NULL,created INTEGER NOT NULL,public_url TEXT,PRIMARY KEY(kind,owner_id,variant,format));`;
export const variantsTable=(db:Database)=>db.backend==='postgres'?'erp_core.image_variants':'image_variants';
export function variantsDb(db:Database){db.registerSqliteSchema(schema);return db;}
export async function prepareImageVariants(kind:ImageKind,id:string,image:CompressedImage){
  const variants=[],version=randomUUID();
  for(const format of ['webp','avif'] as const)for(const variant of ['large','small'] as const){const bytes=image[format][variant],key=await storeBinary(`private/images/${kind}/${version}/${variant}.${format}`,bytes,`image/${format}`);variants.push({kind,id,variant,format,key,bytes,size:bytes.length,width:variant==='large'?image.width:image.thumbnailWidth,height:variant==='large'?image.height:image.thumbnailHeight,originalSize:image.originalBytes,profile:image.profile,publicUrl:null as string|null});}
  return variants;
}
export type PreparedVariants=Awaited<ReturnType<typeof prepareImageVariants>>;
export async function saveImageVariants(database:Database,variants:PreparedVariants,keepWebp=false){
  const db=variantsDb(database),table=variantsTable(db);
  for(const item of variants)await db.prepare(`INSERT INTO ${table} (kind,owner_id,variant,format,object_key,content,size,width,height,original_size,profile,created,public_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(kind,owner_id,variant,format) DO UPDATE SET object_key=excluded.object_key,content=excluded.content,size=excluded.size,width=excluded.width,height=excluded.height,original_size=excluded.original_size,profile=excluded.profile,created=excluded.created,public_url=excluded.public_url`).run(item.kind,item.id,item.variant,item.format,item.key,item.key||item.format==='webp'&&!keepWebp?Buffer.alloc(0):item.bytes,item.size,item.width,item.height,item.originalSize,item.profile,Date.now(),item.publicUrl);
}
export async function imageVariant(database:Database,kind:ImageKind,id:string,variant:'large'|'small',format:'avif'|'webp'){
  const db=variantsDb(database),row=await db.prepare(`SELECT object_key,content FROM ${variantsTable(db)} WHERE kind=? AND owner_id=? AND variant=? AND format=?`).get(kind,id,variant,format);
  if(!row)return null;
  const bytes=row.object_key?await readBinary(String(row.object_key)):Buffer.from(row.content as Uint8Array);
  return bytes.length?{content:bytes,type:`image/${format}`} : null;
}
export async function deleteImageVariants(database:Database,kind:ImageKind,id:string){const db=variantsDb(database);return(await db.prepare(`DELETE FROM ${variantsTable(db)} WHERE kind=? AND owner_id=? RETURNING object_key`).all(kind,id)).flatMap(row=>row.object_key?[String(row.object_key)]:[]);}
export {discardBinaries};
