// Padrão somente leitura. --apply migra bytes, verifica o R2 e só depois libera BYTEA.
import {databaseClient} from './lib/database-client.mjs';
import {migrateBinaries} from '../src/lib/storage/migrate.ts';
let client;try{client=await databaseClient();const apply=process.argv.includes('--apply');console.log(JSON.stringify({mode:apply?'apply':'dry-run',tables:await migrateBinaries(client,apply)},null,2));}catch{console.error('Migração de arquivos interrompida. Confira a migração 012, TLS e as variáveis R2. Originais de arquivos não confirmados permanecem no banco.');process.exitCode=1;}finally{await client?.end().catch(()=>{});}
