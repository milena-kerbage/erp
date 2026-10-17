// Aplica supabase/migrations/*.sql em ordem no banco de DATABASE_URL. Cada arquivo já tem seu BEGIN/COMMIT e usa
// CREATE ... IF NOT EXISTS: nada é removido nem sobrescrito. Para no primeiro erro (a transação do arquivo é desfeita).
//
//   npm run db:migrate -- --confirm=APLICAR-MIGRACOES
//
// Exige confirmação explícita porque o banco configurado pode ser o de produção. Mostra só nomes de arquivos e
// contagens; nunca URLs, senhas ou conteúdo de registros.
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';
import { databaseTargetProblems, supabaseProject } from '../src/lib/supabase.ts';

const { Client } = pg;
if (!process.argv.includes('--confirm=APLICAR-MIGRACOES')) {
  console.log('Recusado: aplicar migrações altera o banco configurado em DATABASE_URL (possivelmente produção).\nRepita com --confirm=APLICAR-MIGRACOES depois de conferir o destino com: npm run db:check');
  process.exit(1);
}
if (!process.env.DATABASE_URL) { console.log('DATABASE_URL ausente: defina-a em .env.local (npm run env:set-database-url).'); process.exit(1); }
const problems = [...supabaseProject().problems, ...databaseTargetProblems(process.env.DATABASE_URL)];
if (problems.length) { console.log([...new Set(problems)].join('\n')); process.exit(1); }

const url = new URL(process.env.DATABASE_URL);
for (const parameter of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(parameter);
const certificate = process.env.DATABASE_SSL_CA?.replace(/\\n/g, '\n');
// TLS sempre verificado; a única exceção é teste automatizado (NODE_ENV=test) em loopback, como em src/lib/database.ts.
const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
const disableTls = process.env.DATABASE_SSL_MODE === 'disable' && process.env.NODE_ENV === 'test' && loopback;
const client = new Client({ connectionString: url.toString(), ssl: disableTls ? false : { rejectUnauthorized: true, ...(certificate ? { ca: certificate } : {}) }, connectionTimeoutMillis: 10_000, statement_timeout: 60_000 });
client.on('error', () => {});
try { await client.connect(); } catch (error) { console.log(`Não foi possível conectar (${error?.code || 'sem código'}). Rode npm run db:check para o diagnóstico.`); process.exit(1); }

const directory = resolve('supabase/migrations');
const files = readdirSync(directory).filter(name => /^\d+_.+\.sql$/.test(name)).sort();
let failed = false;
try {
  const existing = (await client.query("SELECT count(*)::int AS total FROM pg_tables WHERE schemaname LIKE 'erp\\_%'")).rows[0].total;
  if (existing && !process.argv.includes('--allow-existing')) {
    console.log(`Já existem ${existing} tabela(s) em esquemas erp_*. Nada foi aplicado. Se for reaplicação intencional (as migrações são idempotentes), use --allow-existing.`);
    process.exit(1);
  }
  console.log(`Aplicando ${files.length} migrações (${existing} tabelas erp_* pré-existentes)…`);
  for (const file of files) {
    try {
      await client.query(readFileSync(resolve(directory, file), 'utf8'));
      console.log(`  ✓ ${file}`);
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch { /* sem transação aberta */ }
      console.log(`  ✗ ${file} falhou (${error?.code || 'sem código'}): a transação do arquivo foi desfeita; as seguintes não foram executadas.`);
      failed = true;
      break;
    }
  }
  const summary = (await client.query("SELECT schemaname, count(*)::int AS tables, count(*) FILTER (WHERE rowsecurity)::int AS with_rls FROM pg_tables WHERE schemaname LIKE 'erp\\_%' GROUP BY 1 ORDER BY 1")).rows;
  for (const row of summary) console.log(`  · ${row.schemaname}: ${row.tables} tabela(s), RLS em ${row.with_rls}`);
} finally { await client.end().catch(() => {}); }
console.log(failed ? '\nResultado: interrompido por erro. Corrija e repita (é idempotente).' : '\nResultado: migrações concluídas. Confira com: npm run db:check');
process.exit(failed ? 1 : 0);
