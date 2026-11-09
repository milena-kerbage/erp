// Somente metadados agregados. Nunca imprime URLs, segredos, SQL de usuários ou registros.
import pg from 'pg';
import { databaseTargetProblems } from '../src/lib/supabase.ts';

if (!process.env.DATABASE_URL) { console.error('DATABASE_URL ausente.'); process.exit(1); }
const problems = databaseTargetProblems(process.env.DATABASE_URL);
if (problems.length) { console.error(problems.join(' ')); process.exit(1); }
const url = new URL(process.env.DATABASE_URL);
for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
const ca = process.env.DATABASE_SSL_CA?.replace(/\\n/g, '\n');
const client = new pg.Client({connectionString: url.toString(), ssl: {rejectUnauthorized: true, ...(ca ? {ca} : {})}, connectionTimeoutMillis: 10_000, statement_timeout: 10_000});
client.on('error', () => {});
try {
  await client.connect();
  await client.query('BEGIN READ ONLY');
  const database = (await client.query('SELECT pg_database_size(current_database()) AS bytes')).rows[0];
  const tables = (await client.query(`SELECT schemaname AS schema, relname AS tabela, n_live_tup AS linhas_estimadas,
    pg_total_relation_size(relid) AS bytes_com_indices, pg_indexes_size(relid) AS bytes_indices,
    seq_scan, idx_scan, n_dead_tup AS linhas_mortas_estimadas
    FROM pg_stat_user_tables WHERE schemaname LIKE 'erp\\_%'
    ORDER BY pg_total_relation_size(relid) DESC LIMIT 20`)).rows;
  const total = (await client.query(`SELECT COALESCE(SUM(pg_total_relation_size(relid)), 0) AS bytes
    FROM pg_stat_user_tables WHERE schemaname LIKE 'erp\\_%'`)).rows[0];
  const connections = (await client.query(`SELECT state AS estado, COUNT(*)::int AS conexoes
    FROM pg_stat_activity WHERE datname = current_database() GROUP BY state`)).rows;
  await client.query('ROLLBACK');
  console.log(JSON.stringify({coletadoEm: new Date().toISOString(), bancoTotalBytes: Number(database.bytes), tabelasErpBytes: Number(total.bytes), maioresTabelas: tables, conexoes: connections,
    observacao: 'Estatísticas cumulativas/estimadas; bancoTotalBytes inclui estruturas gerenciadas. Confira a cota oficial no painel Supabase.'}, null, 2));
} catch (error) {
  console.error(`Não foi possível medir o banco (${typeof error?.code === 'string' && /^[A-Z0-9_]+$/.test(error.code) ? error.code : 'erro de conexão/consulta'}). Nenhum registro foi alterado.`);
  process.exitCode = 1;
} finally { await client.end().catch(() => {}); }
