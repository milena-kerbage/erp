// Diagnóstico do banco do ERP (Supabase). Padrão: SOMENTE LEITURA, em transação READ ONLY.
//
//   npm run db:check
//   npm run db:check -- --write-test --confirm=ESCREVER-DADOS-DE-TESTE             (insere, lê e desfaz com ROLLBACK)
//   npm run db:check -- --write-test --persist --confirm=ESCREVER-DADOS-DE-TESTE   (grava, lê em outra conexão e remove)
//
// Mostra apenas NOMES de variáveis e metadados do esquema (tabelas, RLS, privilégios, contagens).
// Nunca imprime URLs, senhas, chaves ou conteúdo de registros. Não executa DDL nem migrações.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { databaseTargetProblems, environmentPresence, supabaseProject } from '../src/lib/supabase.ts';

const { Client } = pg;
const args = process.argv.slice(2);
const writeTest = args.includes('--write-test');
const persist = args.includes('--persist');
const confirmed = args.includes('--confirm=ESCREVER-DADOS-DE-TESTE');

// Tabelas esperadas após as dez migrações em supabase/migrations.
const expected = {
  erp_auth: ['users', 'sessions', 'resets', 'attempts', 'members', 'invitations', 'api_keys', 'profile_photos', 'app_webhooks', 'webhook_deliveries', 'notification_states', 'access_audit'],
  erp_whatsapp: ['contacts', 'messages', 'consent_audit', 'webhook_events', 'send_requests', 'pending_statuses', 'suppression', 'deletion_audit', 'metadata', 'rate_limits', 'integration_settings', 'integration_audit', 'management_checklist', 'management_tests', 'management_oauth_states'],
  erp_meta: ['deletion_requests'],
  erp_core: ['workspace_settings', 'funnels', 'leads', 'lead_notes', 'lead_attachments', 'records', 'erp_audit', 'loja_avaliacoes', 'loja_avaliacao_fotos', 'loja_clientes', 'loja_sessoes', 'loja_redefinicoes', 'loja_cupons', 'loja_pedidos', 'loja_categorias', 'loja_produtos', 'loja_produto_categorias', 'loja_produto_relacionados', 'loja_produto_imagens', 'loja_grupos_opcoes', 'loja_opcoes', 'loja_produto_grupos', 'loja_colecoes', 'loja_colecao_produtos', 'loja_menu_itens', 'loja_cupons_campanha', 'loja_cupom_usos', 'loja_carrinhos', 'loja_cliente_leads', 'media_uploads', 'image_variants'],
};
const counted = ['erp_auth.users', 'erp_core.workspace_settings', 'erp_core.funnels', 'erp_core.leads', 'erp_core.records', 'erp_whatsapp.contacts'];

let blocking = 0;
const line = (text = '') => console.log(text);
const fail = text => { blocking++; line(`  ✗ ${text}`); };
const ok = text => line(`  ✓ ${text}`);
const warn = text => line(`  ! ${text}`);

function options() {
  const url = new URL(process.env.DATABASE_URL);
  for (const parameter of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(parameter);
  const certificate = process.env.DATABASE_SSL_CA?.replace(/\\n/g, '\n');
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const disableTls = process.env.DATABASE_SSL_MODE === 'disable' && process.env.NODE_ENV === 'test' && loopback;
  return { connectionString: url.toString(), ssl: disableTls ? false : { rejectUnauthorized: true, ...(certificate ? { ca: certificate } : {}) }, connectionTimeoutMillis: 10_000, query_timeout: 15_000, statement_timeout: 15_000 };
}
async function connect() { const client = new Client(options()); client.on('error', () => {}); await client.connect(); return client; }
const hint = code => ({
  ECONNREFUSED: 'conexão recusada: confira host e porta de DATABASE_URL',
  ENOTFOUND: 'host não encontrado: confira DATABASE_URL',
  ETIMEDOUT: 'tempo esgotado: confira rede/porta (pooler usa 6543 ou 5432)',
  '28P01': 'usuário ou senha recusados: copie novamente a connection string do painel Supabase (Connect)',
  '28000': 'autenticação recusada: confira usuário (postgres.<project-id>) em DATABASE_URL',
  '3D000': 'banco inexistente: use o nome "postgres"',
  DEPTH_ZERO_SELF_SIGNED_CERT: 'cadeia TLS não confiável: informe DATABASE_SSL_CA (PEM do painel Supabase)',
  SELF_SIGNED_CERT_IN_CHAIN: 'cadeia TLS não confiável: informe DATABASE_SSL_CA (PEM do painel Supabase)',
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'cadeia TLS não confiável: informe DATABASE_SSL_CA (PEM do painel Supabase)',
}[code] || 'falha ao conectar; confira DATABASE_URL e a rede');

line('Variáveis de ambiente (apenas nomes)');
const presence = environmentPresence(['DATABASE_URL', 'DATABASE_SSL_CA', 'SUPABASE_PROJECT_ID', 'SUPABASE_URL', 'AUTH_ORIGIN', 'AUTH_REQUIRE_LOGIN', 'INTEGRATION_ENCRYPTION_KEY', 'ERP_ADMIN_EMAILS']);
for (const [name, defined] of Object.entries(presence)) line(`  ${defined ? '✓' : '·'} ${name}: ${defined ? 'definida' : 'ausente'}`);
if (!presence.DATABASE_URL) fail('DATABASE_URL ausente: copie a connection string do Transaction Pooler (painel Supabase > Connect) para .env.local.');
const project = supabaseProject();
for (const problem of project.problems) fail(problem);
if (presence.DATABASE_URL) for (const problem of databaseTargetProblems(process.env.DATABASE_URL)) if (!project.problems.includes(problem)) fail(problem);
if (!presence.SUPABASE_PROJECT_ID && !presence.SUPABASE_URL) warn('SUPABASE_PROJECT_ID/SUPABASE_URL ausentes: sem a trava que impede apontar para outro projeto.');
if (project.projectId) ok(`projeto Supabase configurado: ${project.projectId}`);
if (blocking) { line(`\n${blocking} problema(s) impedem a verificação.`); process.exit(1); }

let client;
try { client = await connect(); }
catch (error) { fail(`não foi possível conectar (${error?.code || 'sem código'}): ${hint(error?.code)}`); process.exit(1); }

try {
  line('\nConexão');
  await client.query('BEGIN READ ONLY');
  const server = (await client.query("SELECT current_user AS role, current_setting('server_version') AS version, current_database() AS database")).rows[0];
  ok(`conectado ao banco ${server.database} (PostgreSQL ${server.version}) como papel ${server.role}`);

  line('\nEsquemas e tabelas (migrações 001–014)');
  const tables = (await client.query("SELECT schemaname, tablename, rowsecurity, (SELECT count(*)::int FROM pg_policies p WHERE p.schemaname = t.schemaname AND p.tablename = t.tablename) AS policies FROM pg_tables t WHERE schemaname LIKE 'erp\\_%'")).rows;
  const present = new Map(tables.map(row => [`${row.schemaname}.${row.tablename}`, row]));
  let missing = 0;
  for (const [schema, names] of Object.entries(expected)) {
    const found = names.filter(name => present.has(`${schema}.${name}`));
    const absent = names.filter(name => !present.has(`${schema}.${name}`));
    missing += absent.length;
    if (!found.length) warn(`${schema}: nenhuma tabela (migração ainda não aplicada)`);
    else if (absent.length) warn(`${schema}: ${found.length}/${names.length} tabelas; ausentes: ${absent.join(', ')}`);
    else ok(`${schema}: ${names.length}/${names.length} tabelas`);
  }
  if (missing) warn('Há estruturas ausentes. Aplicar as migrações exige autorização explícita (todas usam IF NOT EXISTS e não removem dados).');
  const extra = tables.filter(row => !(expected[row.schemaname] || []).includes(row.tablename));
  if (extra.length) warn(`tabelas fora do esperado em esquemas erp_*: ${extra.map(row => `${row.schemaname}.${row.tablename}`).join(', ')}`);

  line('\nRLS e privilégios');
  const noRls = tables.filter(row => !row.rowsecurity);
  if (noRls.length) fail(`tabelas sem RLS: ${noRls.map(row => `${row.schemaname}.${row.tablename}`).join(', ')}`); else if (tables.length) ok(`RLS habilitado em ${tables.length}/${tables.length} tabelas`);
  const policies = tables.reduce((sum, row) => sum + row.policies, 0);
  line(`  · políticas de RLS declaradas: ${policies} (o servidor acessa pela conexão PostgreSQL; sem política, anon/authenticated não leem nada)`);
  const exposure = (await client.query("SELECT r.rolname AS role, n.nspname AS schema, has_schema_privilege(r.rolname, n.nspname, 'USAGE') AS usage FROM pg_roles r CROSS JOIN pg_namespace n WHERE r.rolname IN ('anon', 'authenticated') AND n.nspname LIKE 'erp\\_%'")).rows;
  const exposed = exposure.filter(row => row.usage);
  if (exposed.length) fail(`papéis da Data API com acesso a esquemas privados: ${exposed.map(row => `${row.role}→${row.schema}`).join(', ')}`);
  else ok(exposure.length ? 'anon e authenticated sem USAGE nos esquemas erp_*' : 'esquemas erp_* ainda não existem (nada exposto)');
  const grants = (await client.query("SELECT count(*)::int AS total FROM information_schema.role_table_grants WHERE table_schema LIKE 'erp\\_%' AND grantee IN ('anon', 'authenticated', 'PUBLIC')")).rows[0].total;
  if (grants) fail(`${grants} concessões de tabela para anon/authenticated/PUBLIC em esquemas erp_*`); else ok('nenhuma concessão de tabela a anon/authenticated/PUBLIC');
  const api = (await client.query("SELECT unnest(rolconfig) AS setting FROM pg_roles WHERE rolname = 'authenticator'")).rows.map(row => row.setting).find(setting => setting.startsWith('pgrst.db_schemas='));
  if (api === undefined) line('  · Data API: lista de esquemas expostos não legível por SQL; confira em Settings > API que erp_* não está em "Exposed schemas"');
  else if (/erp_/.test(api)) fail('esquemas erp_* aparecem entre os esquemas expostos da Data API (pgrst.db_schemas)'); else ok('Data API não expõe esquemas erp_*');

  line('\nOutras estruturas já existentes no projeto (somente nomes e metadados)');
  const others = (await client.query("SELECT n.nspname AS schema, c.relname AS name, c.relrowsecurity AS rls, c.reltuples::bigint AS estimate, (SELECT count(*)::int FROM pg_policies p WHERE p.schemaname = n.nspname AND p.tablename = c.relname) AS policies FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind IN ('r', 'p') AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast') AND n.nspname NOT LIKE 'pg\\_%' AND n.nspname NOT LIKE 'erp\\_%' AND n.nspname NOT IN ('auth', 'storage', 'realtime', 'vault', 'extensions', 'graphql', 'graphql_public', 'pgsodium', 'pgsodium_masks', 'net', 'cron', 'supabase_functions', '_realtime', 'pgbouncer', 'supabase_migrations', '_analytics') ORDER BY 1, 2")).rows;
  if (!others.length) ok('nenhuma tabela de aplicação fora dos esquemas erp_* (esquemas gerenciados pelo Supabase omitidos)');
  for (const row of others) line(`  · ${row.schema}.${row.name}: RLS ${row.rls ? 'ligado' : 'DESLIGADO'}, ${row.policies} política(s), ~${Math.max(Number(row.estimate), 0)} linha(s) estimadas`);
  const open = others.filter(row => row.schema === 'public' && !row.rls);
  if (open.length) warn(`tabelas em public sem RLS (expostas pela Data API): ${open.map(row => row.name).join(', ')}`);
  const history = await client.query("SELECT to_regclass('supabase_migrations.schema_migrations') AS name");
  if (history.rows[0].name) {
    const versions = (await client.query('SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version')).rows;
    line(`  · migrações registradas pelo Supabase CLI: ${versions.length}${versions.length ? ` (${versions.map(row => `${row.version}${row.name ? `_${row.name}` : ''}`).join(', ')})` : ''}`);
  } else line('  · nenhum histórico de migrações do Supabase CLI (supabase_migrations ausente)');
  const extensions = (await client.query("SELECT extname FROM pg_extension WHERE extname NOT IN ('plpgsql') ORDER BY 1")).rows.map(row => row.extname);
  line(`  · extensões: ${extensions.join(', ') || 'nenhuma além de plpgsql'}`);

  line('\nContagens (somente números, sem conteúdo)');
  for (const name of counted) {
    if (!present.has(name)) { line(`  · ${name}: tabela ausente`); continue; }
    const [schema, table] = name.split('.');
    const total = (await client.query(`SELECT count(*)::int AS total FROM ${schema}.${table}`)).rows[0].total;
    line(`  · ${name}: ${total} registro(s)`);
  }
  await client.query('ROLLBACK');

  if (writeTest) {
    line('\nTeste de escrita');
    if (!confirmed) fail('escrita exige --confirm=ESCREVER-DADOS-DE-TESTE (autorização explícita).');
    else if (!present.has('erp_core.records')) fail('erp_core.records ausente: aplique a migração 006 antes do teste.');
    else {
      const id = `teste-integracao-${randomUUID()}`;
      const data = JSON.stringify({ name: '[TESTE-INTEGRACAO] registro temporário', createdBy: 'scripts/check-database.mjs' });
      const insert = 'INSERT INTO erp_core.records (id, resource, data_json, lead_id, parent_id, revision, created, updated, archived_at) VALUES ($1, \'catalogo\', $2, \'\', \'\', 1, $3, $3, NULL)';
      let reader;
      try {
        await client.query('BEGIN');
        await client.query(insert, [id, data, Date.now()]);
        const inside = (await client.query('SELECT count(*)::int AS total FROM erp_core.records WHERE id = $1', [id])).rows[0].total;
        if (inside === 1) ok('INSERT e leitura na mesma transação'); else fail('registro de teste não lido após o INSERT');
        if (!persist) {
          await client.query('ROLLBACK');
          const after = (await client.query('SELECT count(*)::int AS total FROM erp_core.records WHERE id = $1', [id])).rows[0].total;
          if (after === 0) ok('ROLLBACK concluído: nada foi gravado'); else fail('registro de teste permaneceu após o ROLLBACK');
        } else {
          await client.query('COMMIT');
          // Nova conexão (uma de cada vez): prova que o dado sobreviveu ao COMMIT e que a remoção também persiste.
          await client.end();
          reader = await connect();
          const seen = (await reader.query('SELECT count(*)::int AS total FROM erp_core.records WHERE id = $1', [id])).rows[0].total;
          if (seen === 1) ok('registro persistido e lido por outra conexão'); else fail('registro não visível em outra conexão');
          await reader.query('DELETE FROM erp_core.records WHERE id = $1', [id]);
          const left = (await reader.query('SELECT count(*)::int AS total FROM erp_core.records WHERE id = $1', [id])).rows[0].total;
          if (left === 0) ok('registro de teste removido'); else fail(`registro de teste ${id} NÃO foi removido: apague-o manualmente`);
        }
      } catch (error) {
        const cleaner = reader ?? client;
        try { await cleaner.query('ROLLBACK'); } catch { /* sem transação aberta ou conexão encerrada */ }
        fail(`falha no teste de escrita (${error?.code || 'sem código'}): confira privilégios do papel e as constraints de erp_core.records`);
        if (persist) {
          try { await (reader ?? await connect()).query('DELETE FROM erp_core.records WHERE id = $1', [id]); }
          catch { warn(`confirme que o registro ${id} não ficou no banco`); }
        }
      } finally { await reader?.end().catch(() => {}); }
    }
  }
} catch (error) {
  fail(`falha durante a verificação (${error?.code || 'sem código'})`);
} finally {
  await client.end().catch(() => {});
}
line(blocking ? `\nResultado: ${blocking} problema(s) encontrados.` : '\nResultado: verificação concluída sem problemas bloqueantes.');
process.exit(blocking ? 1 : 0);
