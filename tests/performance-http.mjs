// Smoke de produção com usuários/banco SQLite temporários. Nunca usa o Supabase real.
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import sharp from 'sharp';
const directory=mkdtempSync(join(tmpdir(),'erp-http-performance-'));
Object.assign(process.env,{NODE_ENV:'test',DATABASE_URL:'',ALLOW_LOCAL_SQLITE:'true',AUTH_DB_PATH:join(directory,'auth.sqlite'),ERP_DB_PATH:join(directory,'erp.sqlite'),WHATSAPP_DB_PATH:join(directory,'whatsapp.sqlite'),MEDIA_STORAGE_DRIVER:'database',ERP_ADMIN_EMAILS:'smoke@example.test',AUTH_ORIGIN:'https://erp.example.test',AUTH_REQUIRE_LOGIN:'true'});
const {createUser,hashPassword,createSession}=await import('../src/lib/auth/core.ts');
const {erpDB,initializeERP}=await import('../src/lib/erp/core.ts');
const {closeDatabases}=await import('../src/lib/database.ts');
await createUser('smoke@example.test','Gestora de teste',await hashPassword('SenhaSintetica!123'),'smoke-user');
const cookie=`__Host-mk_session=${await createSession('smoke-user')}`;
await initializeERP();const database=erpDB();
await database.transaction(async()=>{for(let index=0;index<125;index++){const id=`http-${String(index).padStart(4,'0')}`,created=Date.now()-index*1000,lead={id,name:index===120?'Cliente distante':'Cliente '+index,phone:'85999999999',budget:10,tags:[],funnelId:'vendas',stage:'novo',createdAt:new Date(created).toISOString()},details={owner:{name:'Gestora',seed:'smoke-user'},source:'Teste',links:[],attachments:[],history:[]};await database.prepare('INSERT INTO leads VALUES (?,?,?,?,?,?,?,?,?,NULL)').run(id,'vendas','novo',JSON.stringify(lead),JSON.stringify(details),'open',1,created,created);}});
const port=await new Promise(resolve=>{const server=createServer();server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});});
const origin=`http://localhost:${port}`;
let output='';const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port',String(port)],{env:{...process.env,NODE_ENV:'production',VERCEL:'0',NEXT_DIST_DIR:process.env.NEXT_DIST_DIR||'.next-performance'},stdio:['ignore','pipe','pipe']});
child.stdout.on('data',chunk=>{output+=chunk;});child.stderr.on('data',chunk=>{output+=chunk;});
const request=(path,init={})=>fetch(origin+path,{...init,headers:{cookie,origin:process.env.AUTH_ORIGIN,...init.headers},redirect:'manual'});
try{
 let ready=false;for(let attempt=0;attempt<80;attempt++){if(child.exitCode!==null)throw new Error('Servidor de teste não iniciou.');try{const response=await fetch(origin+'/login');if(response.ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,250));}assert.ok(ready,'servidor precisa iniciar');
 const anonymous=await fetch(origin+'/api/erp/media');assert.equal(anonymous.status,401);
 for(const page of ['/','/clientes','/leads','/relatorios','/configuracoes/midia'])assert.equal((await request(page)).status,200,page);
 const first=await request('/api/erp/leads?summary=1&limit=50');assert.equal(first.status,200);assert.match(first.headers.get('cache-control'),/private|no-store/);const page=await first.json();assert.equal(page.leads.length,50);assert.equal(page.pagination.total,125);
 const next=await(await request('/api/erp/leads?summary=1&limit=50&totals=0&cursor='+encodeURIComponent(page.pagination.nextCursor))).json();assert.equal(next.leads[0].id,'http-0050');assert.equal(next.pagination.total,null);
 const search=await(await request('/api/erp/leads?summary=1&filter='+encodeURIComponent(JSON.stringify({q:'distante'})))).json();assert.equal(search.leads[0].id,'http-0120');
 assert.equal((await(await request('/api/erp/dashboard?offset=180')).json()).total,125);
 assert.equal((await(await request('/api/erp/reports')).json()).leads.total,125);
 const image=await sharp({create:{width:500,height:300,channels:3,background:'#80aa90'}}).png().toBuffer(),form=new FormData();form.set('file',new File([image],'perfil.png',{type:'image/png'}));
 const saved=await request('/api/erp/profile/photo',{method:'POST',body:form});assert.equal(saved.status,200);const url=(await saved.json()).currentUser.avatarUrl;
 const avif=await request(url,{headers:{accept:'image/avif,image/webp'}});assert.equal(avif.headers.get('content-type'),'image/avif');assert.equal((await sharp(Buffer.from(await avif.arrayBuffer())).metadata()).compression,'av1');assert.match(avif.headers.get('vary'),/Accept/);
 const webp=await request(url+'&formato=webp');assert.equal(webp.headers.get('content-type'),'image/webp');assert.equal((await sharp(Buffer.from(await webp.arrayBuffer())).metadata()).format,'webp');
 console.log('OK: produção HTTP isolada: páginas, autorização, paginação/cursor, busca global, dashboard/relatórios e perfil WebP/AVIF.');
}finally{
 child.kill('SIGTERM');await new Promise(resolve=>{if(child.exitCode!==null)return resolve();const timeout=setTimeout(()=>{child.kill('SIGKILL');resolve();},5000);child.once('exit',()=>{clearTimeout(timeout);resolve();});});
 await closeDatabases();rmSync(directory,{recursive:true,force:true});
}
