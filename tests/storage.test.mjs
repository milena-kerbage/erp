import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readdirSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Readable} from 'node:stream';
import {createHash} from 'node:crypto';
import {S3Client} from '@aws-sdk/client-s3';
import {PGlite} from '@electric-sql/pglite';
const folder=mkdtempSync(join(tmpdir(),'r2-test-'));process.env.NODE_ENV='test';process.env.ALLOW_LOCAL_SQLITE='true';process.env.ERP_DB_PATH=join(folder,'erp.sqlite');process.env.AUTH_DB_PATH=join(folder,'auth.sqlite');delete process.env.DATABASE_URL;
Object.assign(process.env,{MEDIA_STORAGE_DRIVER:'r2',R2_ACCOUNT_ID:'a'.repeat(32),R2_ACCESS_KEY_ID:'synthetic-test-access-key',R2_SECRET_ACCESS_KEY:'synthetic-test-secret',R2_PRIVATE_BUCKET:'private-test',R2_PUBLIC_BUCKET:'public-test',NEXT_PUBLIC_LOJA_MEDIA_ORIGIN:'https://media.example.test'});
const objects=new Map(),originalSend=S3Client.prototype.send;let reads=0;
const etag=bytes=>'"'+createHash('md5').update(bytes).digest('hex')+'"';
S3Client.prototype.send=async function(command){
 const input=command.input,name=command.constructor.name,key=`${input.Bucket}/${input.Key}`;
 if(name==='PutObjectCommand'){objects.set(key,{bytes:Buffer.from(input.Body),type:input.ContentType});return{};}
 if(name==='DeleteObjectCommand'){objects.delete(key);return{};}
 if(name==='CopyObjectCommand'){const object=objects.get(input.CopySource);assert.equal(input.CopySourceIfMatch,etag(object.bytes));objects.set(key,{...object});return{};}
 const object=objects.get(key);if(!object)throw new Error('NoSuchKey');
 if(name==='HeadObjectCommand')return{ContentLength:object.bytes.length,ContentType:object.type,ETag:etag(object.bytes)};
 if(name==='GetObjectCommand'){reads++;const bytes=input.Range?object.bytes.subarray(0,64):object.bytes,body=Readable.from([bytes]);body.transformToByteArray=async()=>new Uint8Array(bytes);return{Body:body,ContentLength:bytes.length,ETag:etag(object.bytes)};}
 throw new Error(`Unexpected test command ${name}`);
};
const {createUser}=await import('../src/lib/auth/core.ts');
const {accessDb}=await import('../src/lib/erp/access.ts');
const {createLead,erpDB}=await import('../src/lib/erp/core.ts');
const {storeAttachment,getAttachment}=await import('../src/lib/erp/files.ts');
const {storeBinary,readBinary,storageStatus}=await import('../src/lib/storage/r2.ts');
const {createMediaUpload,finalizeMedia}=await import('../src/lib/storage/media.ts');
const {closeDatabases}=await import('../src/lib/database.ts');
const actor={id:'test-admin',name:'Gestora',email:'gestora@example.test',permission:'admin'};
after(async()=>{S3Client.prototype.send=originalSend;await closeDatabases();rmSync(folder,{recursive:true,force:true});});

test('anexos guardam só referência no banco e leitura mantém controle da ficha',async()=>{
 await createUser(actor.email,actor.name,'test-only-hash',actor.id);
 const lead=(await createLead({lead:{name:'Cliente',phone:'85999999999',funnelId:'vendas',stage:'novo',budget:10,tags:[]}},actor)).lead;
 const bytes=Buffer.from('medidas reais de teste'),attachment=(await storeAttachment(lead.id,'medidas.txt','text/plain',bytes)).attachment;
 const row=await erpDB().prepare('SELECT content,object_key FROM lead_attachments WHERE id=?').get(attachment.id);
 assert.equal(row.content.length,0);assert.match(row.object_key,/^private\/attachments\//);
 assert.deepEqual(Buffer.from((await getAttachment(lead.id,attachment.id)).content),bytes);
 const before=reads;await assert.rejects(getAttachment('lead-inexistente',attachment.id),{status:404});assert.equal(reads,before,'autorização/validação antecede download do R2');
});
test('configuração incompleta falha sem gravar bytes no banco e sem expor segredo',async()=>{
 const secret=process.env.R2_SECRET_ACCESS_KEY;delete process.env.R2_SECRET_ACCESS_KEY;
 try{assert.equal(storageStatus().configured,false);await assert.rejects(storeBinary('private/test',Buffer.from('x'),'text/plain'),error=>error.status===503&&!error.message.includes(secret));}
 finally{process.env.R2_SECRET_ACCESS_KEY=secret;}
 await assert.rejects(readBinary('private/../secret'),{status:503});
});
test('vídeo tem upload privado, publicação explícita, tamanho/formato verificados e dono isolado',async()=>{
 const reservation=await createMediaUpload({type:'video/mp4',size:32},actor);assert.match(reservation.uploadUrl,/X-Amz-Signature=/);assert.equal(reservation.expiresIn,300);
 const row=await erpDB().prepare('SELECT object_key FROM media_uploads WHERE id=?').get(reservation.id),bytes=Buffer.alloc(32);bytes.write('ftyp',4);objects.set(`private-test/${row.object_key}`,{bytes,type:'video/mp4'});
 await assert.rejects(finalizeMedia(reservation.id,{...actor,id:'another-admin'}),{status:404});
 const result=await finalizeMedia(reservation.id,actor);assert.match(result.url,/^https:\/\/media.example.test\/vitrine\/midia\/.+\.mp4$/);assert.equal((await finalizeMedia(reservation.id,actor)).url,result.url);
 assert.ok(objects.has('public-test/'+new URL(result.url).pathname.slice(1)));
 const bad=await createMediaUpload({type:'video/mp4',size:10},actor),badRow=await erpDB().prepare('SELECT object_key FROM media_uploads WHERE id=?').get(bad.id);objects.set(`private-test/${badRow.object_key}`,{bytes:Buffer.from('<html>x</html>'),type:'video/mp4'});await assert.rejects(finalizeMedia(bad.id,actor),{status:400});
 await assert.rejects(createMediaUpload({type:'video/mp4',size:129*1024*1024},actor),{status:400});
});
test('migração só libera BYTEA depois de verificar os bytes no R2',async()=>{
 const engine=await PGlite.create();try{
  await engine.exec('CREATE ROLE anon;CREATE ROLE authenticated;');const directory=new URL('../supabase/migrations/',import.meta.url);for(const file of readdirSync(directory).filter(file=>file.endsWith('.sql')).sort())await engine.exec(readFileSync(new URL(file,directory),'utf8'));
  await engine.query('INSERT INTO erp_auth.users VALUES ($1,$2,$3,$4)',['user','test@example.test','Nome','hash']);await engine.query('INSERT INTO erp_auth.profile_photos (user_id,content,mime_type,updated) VALUES ($1,$2,$3,$4)',['user',Buffer.from('bytes-originais'),'text/plain',1]);
  const client={query:async(sql,params)=>{const result=await engine.query(sql,params);return{...result,rowCount:result.affectedRows};}};
  const {migrateBinaries}=await import('../src/lib/storage/migrate.ts');const dry=await migrateBinaries(client);assert.equal(dry.find(table=>table.table==='erp_auth.profile_photos').pending,1);
  await migrateBinaries(client,true);const row=(await engine.query('SELECT content,object_key FROM erp_auth.profile_photos')).rows[0];assert.equal(row.content.length,0);assert.deepEqual(await readBinary(row.object_key),Buffer.from('bytes-originais'));
 }finally{await engine.close();}
});
test('imagem da biblioteca é publicada só em WebP/AVIF e os originais privados são liberados',async()=>{
 const sharp=(await import('sharp')).default;
 const bytes=await sharp({create:{width:800,height:600,channels:3,background:'#789d82'}}).png().toBuffer();
 const reservation=await createMediaUpload({type:'image/png',size:bytes.length},actor),row=await erpDB().prepare('SELECT object_key FROM media_uploads WHERE id=?').get(reservation.id);
 objects.set(`private-test/${row.object_key}`,{bytes,type:'image/png'});
 const result=await finalizeMedia(reservation.id,actor);assert.match(result.url,/\.webp$/);assert.match(result.avifUrl,/\.avif$/);assert.equal(result.compression.originalBytes,bytes.length);
 const variants=await erpDB().prepare('SELECT object_key,content,public_url,size FROM image_variants WHERE kind=? AND owner_id=?').all('asset',reservation.id);assert.equal(variants.length,4);assert.ok(variants.every(variant=>!variant.object_key&&variant.content.length===0&&String(variant.public_url).startsWith('https://media.example.test/')));
 assert.equal(objects.has(`private-test/${row.object_key}`),false);
});

test('duplicar produto conserva WebP/AVIF sem duplicar objetos e exclusão libera a última referência',async()=>{
 const sharp=(await import('sharp')).default;
 const {criarCategoria}=await import('../src/lib/loja/gestao/categorias.ts');
 const {criarProduto,duplicarProduto,removerProduto}=await import('../src/lib/loja/gestao/produtos.ts');
 const {enviarImagem,removerImagem,arquivoDaImagem}=await import('../src/lib/loja/gestao/imagens.ts');
 const categoria=(await criarCategoria({slug:'fotos-storage',nome:'Fotos'},actor)).categoria;
 const produto=(await criarProduto({slug:'produto-storage',sku:'STORAGE-1',nome:'Produto',precoCentavos:100,categoriaId:categoria.id},actor)).produto;
 const image=await sharp({create:{width:320,height:200,channels:3,background:'#927849'}}).png().toBuffer();
 const uploaded=await enviarImagem(produto.id,{conteudo:image,revisao:produto.revisao},actor),sourceId=uploaded.imagens[0].id;
 const count=objects.size,copia=await duplicarProduto(produto.id,{},actor),copyId=copia.produto.imagens[0].id;
 assert.equal(objects.size,count,'cópia só cria metadados');
 const keys=(await erpDB().prepare('SELECT object_key FROM image_variants WHERE kind=? AND owner_id=?').all('product',sourceId)).map(row=>row.object_key);
 assert.equal(keys.length,4);
 await removerImagem(produto.id,sourceId,uploaded.revisao,actor);
 assert.ok(keys.every(key=>objects.has('private-test/'+key)),'objetos compartilhados permanecem');
 assert.equal((await sharp((await arquivoDaImagem(copyId,'grande',false,undefined,'avif')).conteudo).metadata()).compression,'av1');
 assert.equal((await sharp((await arquivoDaImagem(copyId,'mini',false)).conteudo).metadata()).format,'webp');
 await removerProduto(copia.produto.id,copia.produto.revisao,actor);
 assert.ok(keys.every(key=>!objects.has('private-test/'+key)),'última exclusão libera todos os formatos');
 assert.equal((await erpDB().prepare('SELECT COUNT(*) AS total FROM image_variants WHERE kind=? AND owner_id IN (?,?)').get('product',sourceId,copyId)).total,0);
});
