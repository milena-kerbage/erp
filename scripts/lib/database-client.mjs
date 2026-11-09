import pg from 'pg';
import {databaseTargetProblems} from '../../src/lib/supabase.ts';
export async function databaseClient(){
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL ausente.');
  if(databaseTargetProblems(process.env.DATABASE_URL).length)throw new Error('Confira o projeto e DATABASE_URL.');
  const url=new URL(process.env.DATABASE_URL);for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(key);
  const ca=process.env.DATABASE_SSL_CA?.replace(/\\n/g,'\n');
  const client=new pg.Client({connectionString:url.toString(),ssl:{rejectUnauthorized:true,...(ca?{ca}:{})},connectionTimeoutMillis:10000,statement_timeout:15000});client.on('error',()=>{});await client.connect();return client;
}
