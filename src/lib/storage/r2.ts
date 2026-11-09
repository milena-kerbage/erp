import { createHash } from 'node:crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class StorageError extends Error {
  status=503; code='STORAGE_UNAVAILABLE';
  constructor(message='O armazenamento de arquivos está indisponível. Confira a configuração R2 no servidor.'){super(message);}
}
export function storageDriver(){
  const driver=process.env.MEDIA_STORAGE_DRIVER??(process.env.NODE_ENV==='production'?'r2':'database');
  if(!['database','r2'].includes(driver))throw new StorageError('MEDIA_STORAGE_DRIVER inválido. Use r2 ou database.');
  return driver;
}
function configuration(){
  const accountId=process.env.R2_ACCOUNT_ID??'',accessKeyId=process.env.R2_ACCESS_KEY_ID??'',secretAccessKey=process.env.R2_SECRET_ACCESS_KEY??'',bucket=process.env.R2_PRIVATE_BUCKET??'',publicBucket=process.env.R2_PUBLIC_BUCKET??'';
  if(!/^[a-f0-9]{32}$/.test(accountId)||!accessKeyId||!secretAccessKey||!bucket||bucket===publicBucket)throw new StorageError('Configure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_PRIVATE_BUCKET. O bucket privado deve ser diferente do público.');
  return {accountId,accessKeyId,secretAccessKey,bucket,publicBucket};
}
let cached:{hash:string;client:S3Client}|undefined;
function client(){const config=configuration(),hash=createHash('sha256').update(JSON.stringify(config)).digest('hex');if(cached?.hash!==hash)cached={hash,client:new S3Client({region:'auto',endpoint:`https://${config.accountId}.r2.cloudflarestorage.com`,credentials:{accessKeyId:config.accessKeyId,secretAccessKey:config.secretAccessKey},requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED',maxAttempts:2,requestHandler:{connectionTimeout:5000,requestTimeout:20000}})};return cached.client;}
function keyValid(key:string){if(!/^(private|uploads)\/[a-zA-Z0-9/_-]+(?:\.[a-z0-9]+)?$/.test(key)||key.includes('..')||key.length>400)throw new StorageError('Chave de arquivo inválida.');return key;}
export function storageStatus(){let configured=false;try{configuration();configured=true;}catch{}return {driver:storageDriver(),configured,publicMediaConfigured:Boolean(process.env.R2_PUBLIC_BUCKET&&process.env.NEXT_PUBLIC_LOJA_MEDIA_ORIGIN)};}
export async function storeBinary(key:string,bytes:Buffer,type:string):Promise<string|null>{
  if(storageDriver()==='database')return null;
  keyValid(key);const config=configuration();
  try{await client().send(new PutObjectCommand({Bucket:config.bucket,Key:key,Body:bytes,ContentType:type,CacheControl:'private, no-store'}));return key;}catch{throw new StorageError();}
}
export async function readBinary(key:string,maximum=4*1024*1024){
  keyValid(key);const config=configuration();
  try{const result=await client().send(new GetObjectCommand({Bucket:config.bucket,Key:key}));if(!result.Body||Number(result.ContentLength)>maximum)throw new Error();const chunks:Uint8Array[]=[];let size=0;for await(const chunk of result.Body as AsyncIterable<Uint8Array>){size+=chunk.length;if(size>maximum)throw new Error();chunks.push(chunk);}return Buffer.concat(chunks);}
  catch{throw new StorageError();}
}
export async function removeBinary(key:string){keyValid(key);const config=configuration();try{await client().send(new DeleteObjectCommand({Bucket:config.bucket,Key:key}));}catch{throw new StorageError();}}
/** Upload direto de vídeos mantém o binário fora do body da função Next/Vercel. */
export async function presignUpload(key:string,type:string,bytes:number){keyValid(key);const config=configuration();if(storageDriver()!=='r2')throw new StorageError('Ative MEDIA_STORAGE_DRIVER=r2 para enviar mídia.');return getSignedUrl(client(),new PutObjectCommand({Bucket:config.bucket,Key:key,ContentType:type,ContentLength:bytes}),{expiresIn:300});}
export async function inspectUpload(key:string){keyValid(key);const config=configuration();try{const data=await client().send(new HeadObjectCommand({Bucket:config.bucket,Key:key}));return{size:Number(data.ContentLength),type:data.ContentType??'',etag:data.ETag};}catch{throw new StorageError();}}
export async function publishUpload(key:string,publicKey:string,type:string,etag:string){
  keyValid(key);if(!/^vitrine\/midia\/[a-zA-Z0-9_-]+\.(avif|webp|jpg|png|mp4|webm)$/.test(publicKey))throw new StorageError('Chave pública inválida.');
  const config=configuration(),origin=process.env.NEXT_PUBLIC_LOJA_MEDIA_ORIGIN;
  if(!config.publicBucket||!origin)throw new StorageError('Configure R2_PUBLIC_BUCKET e NEXT_PUBLIC_LOJA_MEDIA_ORIGIN para publicar mídia.');
  const url=new URL(origin);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new StorageError('Origem de mídia inválida.');
  try{await client().send(new CopyObjectCommand({Bucket:config.publicBucket,Key:publicKey,CopySource:`${config.bucket}/${key}`,CopySourceIfMatch:etag,ContentType:type,CacheControl:'public, max-age=31536000, immutable',MetadataDirective:'REPLACE'}));return `${url.origin}/${publicKey}`;}catch(error){if(error instanceof StorageError)throw error;throw new StorageError();}
}
export async function readPrefix(key:string){keyValid(key);const config=configuration();try{const data=await client().send(new GetObjectCommand({Bucket:config.bucket,Key:key,Range:'bytes=0-63'}));if(!data.Body)throw new Error();const bytes=await data.Body.transformToByteArray();if(bytes.length>64)throw new Error();return{bytes:Buffer.from(bytes),etag:data.ETag};}catch{throw new StorageError();}}
export async function listPrivateObjects(cursor?:string){const {ListObjectsV2Command}=await import('@aws-sdk/client-s3');const config=configuration();try{const page=await client().send(new ListObjectsV2Command({Bucket:config.bucket,MaxKeys:1000,ContinuationToken:cursor}));return{objects:(page.Contents??[]).map(object=>({key:object.Key??'',modified:object.LastModified?.getTime()??Date.now(),size:Number(object.Size??0)})),cursor:page.NextContinuationToken};}catch{throw new StorageError();}}
/** A referência já foi removida numa transação confirmada. Falhas são retomadas pelo GC. */
export async function discardBinaries(keys:(string|null|undefined)[]){const result=await Promise.allSettled([...new Set(keys.filter((key):key is string=>Boolean(key)))].map(removeBinary));if(result.some(item=>item.status==='rejected'))console.warn('Há arquivos externos removidos da aplicação aguardando limpeza no storage.');}
