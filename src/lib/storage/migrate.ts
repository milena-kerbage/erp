import {randomUUID,createHash} from 'node:crypto';
import type {Client} from 'pg';
import {storeBinary,readBinary,storageDriver} from './r2.ts';
export const binaryTables=[
  {table:'erp_core.lead_attachments',id:'id',pairs:[['content','object_key']],mime:'mime_type',version:''},
  {table:'erp_auth.profile_photos',id:'user_id',pairs:[['content','object_key']],mime:'mime_type',version:'updated'},
  {table:'erp_core.loja_avaliacao_fotos',id:'id',pairs:[['grande','grande_key'],['mini','mini_key']],mime:'tipo',version:''},
  {table:'erp_core.loja_produto_imagens',id:'id',pairs:[['grande','grande_key'],['mini','mini_key']],mime:'mime',version:''},
] as const;
/** Migra em lotes pequenos; só esvazia BYTEA após conferir os bytes recuperados do R2. */
export async function migrateBinaries(client:Client,apply=false){
  if(apply&&storageDriver()!=='r2')throw new Error('Ative MEDIA_STORAGE_DRIVER=r2 para migrar.');
  const result:{table:string;pending:number;bytes:number;migrated:number}[]=[];
  for(const target of binaryTables){
    const exists=(await client.query('SELECT to_regclass($1) AS table',[target.table])).rows[0].table;if(!exists)continue;
    const pendingWhere=target.pairs.map(([content,key])=>`(${key} IS NULL AND octet_length(${content})>0)`).join(' OR ');
    const sums=target.pairs.map(([content])=>`octet_length(${content})`).join('+');
    const stats=(await client.query(`SELECT COUNT(*) AS count,COALESCE(SUM(${sums}),0) AS bytes FROM ${target.table} WHERE ${pendingWhere}`)).rows[0];
    const progress={table:target.table,pending:Number(stats.count),bytes:Number(stats.bytes),migrated:0};result.push(progress);
    if(!apply)continue;
    let after='';
    for(;;){
      const rows=(await client.query(`SELECT * FROM ${target.table} WHERE (${pendingWhere}) AND ${target.id}>$1 ORDER BY ${target.id} LIMIT 10`,[after])).rows;if(!rows.length)break;
      for(const row of rows){
        after=String(row[target.id]);const keys:Record<string,string>={};
        for(const [content,key] of target.pairs){if(row[key]||!row[content]?.length)continue;const bytes=Buffer.from(row[content]);const objectKey=await storeBinary(`private/migrated/${randomUUID()}`,bytes,String(row[target.mime]));if(!objectKey)throw new Error('Armazenamento externo não ativado.');const restored=await readBinary(objectKey);if(createHash('sha256').update(restored).digest('hex')!==createHash('sha256').update(bytes).digest('hex'))throw new Error('Verificação do arquivo migrado falhou; original preservado.');keys[key]=objectKey;}
        const values:unknown[]=[],sets:string[]=[],guards:string[]=[];
        for(const [content,key] of target.pairs)if(keys[key]){values.push(keys[key]);sets.push(`${key}=$${values.length}`,`${content}='\\x'::bytea`);guards.push(`${key} IS NULL`);}
        if(!sets.length)continue;values.push(row[target.id]);let where=`${target.id}=$${values.length} AND ${guards.join(' AND ')}`;
        if(target.version){values.push(row[target.version]);where+=` AND ${target.version}=$${values.length}`;}
        const updated=await client.query(`UPDATE ${target.table} SET ${sets.join(',')} WHERE ${where}`,values);progress.migrated+=updated.rowCount??0;
      }
    }
  }
  if((await client.query("SELECT to_regclass('erp_core.image_variants') AS t")).rows[0].t){
    const stats=(await client.query('SELECT COUNT(*) AS count,COALESCE(SUM(octet_length(content)),0) AS bytes FROM erp_core.image_variants WHERE object_key IS NULL AND octet_length(content)>0')).rows[0];
    const progress={table:'erp_core.image_variants',pending:Number(stats.count),bytes:Number(stats.bytes),migrated:0};result.push(progress);
    if(apply)for(;;){const rows=(await client.query('SELECT * FROM erp_core.image_variants WHERE object_key IS NULL AND octet_length(content)>0 LIMIT 10')).rows;if(!rows.length)break;let changed=0;for(const row of rows){const bytes=Buffer.from(row.content),key=await storeBinary(`private/migrated/${randomUUID()}`,bytes,`image/${row.format}`);if(!key||!bytes.equals(await readBinary(key)))throw new Error('Verificação de variante falhou.');const updated=await client.query("UPDATE erp_core.image_variants SET object_key=$1,content='\\x'::bytea WHERE kind=$2 AND owner_id=$3 AND variant=$4 AND format=$5 AND created=$6 AND object_key IS NULL",[key,row.kind,row.owner_id,row.variant,row.format,row.created]);changed+=updated.rowCount??0;progress.migrated+=updated.rowCount??0;}if(!changed)break;}
  }
  return result;
}
