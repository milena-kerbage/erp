// Padrão dry-run. --apply remove apenas objetos privados sem referência e com mais de 48h.
import {databaseClient} from './lib/database-client.mjs';
import {binaryTables} from '../src/lib/storage/migrate.ts';
import {listPrivateObjects,removeBinary} from '../src/lib/storage/r2.ts';
let client;try{
 client=await databaseClient();const references=new Set();
 for(const target of binaryTables){if(!(await client.query('SELECT to_regclass($1) AS t',[target.table])).rows[0].t)continue;for(const [,key] of target.pairs){for(const row of (await client.query(`SELECT ${key} AS key FROM ${target.table} WHERE ${key} IS NOT NULL`)).rows)references.add(row.key);}}
 if((await client.query("SELECT to_regclass('erp_core.media_uploads') AS t")).rows[0].t){for(const row of (await client.query("SELECT object_key FROM erp_core.media_uploads WHERE status <> 'published' AND created > $1",[Date.now()-48*3600000])).rows)references.add(row.object_key);}
 if((await client.query("SELECT to_regclass('erp_core.image_variants') AS t")).rows[0].t){for(const row of(await client.query('SELECT object_key FROM erp_core.image_variants WHERE object_key IS NOT NULL')).rows)references.add(row.object_key);}
 let cursor,objects=0,bytes=0,removed=0;const apply=process.argv.includes('--apply');
 do{const page=await listPrivateObjects(cursor);for(const object of page.objects){if(!/^(private|uploads)\//.test(object.key)||object.modified>Date.now()-48*3600000||references.has(object.key))continue;objects++;bytes+=object.size;if(apply){await removeBinary(object.key);removed++;}}cursor=page.cursor;}while(cursor);
 console.log(JSON.stringify({mode:apply?'apply':'dry-run',unreferencedObjects:objects,bytes,removed},null,2));
}catch{console.error('Não foi possível concluir a limpeza. Confira a migração 012 e a configuração R2.');process.exitCode=1;}finally{await client?.end().catch(()=>{});}
