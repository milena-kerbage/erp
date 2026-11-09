// Valida scripts/check-database.mjs contra PostgreSQL em WASM (PGlite). Não conecta ao Supabase.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const engine = await PGlite.create();
const port = Number(process.env.DB_CHECK_TEST_PORT || 55441);
const socket = new PGLiteSocketServer({ db: engine, host: '127.0.0.1', port });
const password = 'senha-sintetica-de-teste';
const environment = (extra = {}) => {
  const base = { ...process.env, NODE_ENV: 'test', DATABASE_SSL_MODE: 'disable', DATABASE_URL: `postgresql://postgres:${password}@127.0.0.1:${port}/postgres`, ...extra };
  for (const name of ['SUPABASE_PROJECT_ID', 'SUPABASE_URL', 'VERCEL']) if (!(name in extra)) delete base[name];
  return base;
};
// Assíncrono: o servidor PGlite roda neste processo e precisa do event loop livre.
const execute = (environmentVariables, arguments_) => new Promise(resolve => {
  const child = spawn(process.execPath, ['--experimental-strip-types', '--no-warnings', 'scripts/check-database.mjs', ...arguments_], { env: environmentVariables });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const timer = setTimeout(() => child.kill(), 60_000);
  child.on('close', status => { clearTimeout(timer); resolve({ status, output }); });
});
const run = async (arguments_ = [], extra = {}) => {
  const result = await execute(environment(extra), arguments_);
  assert.ok(!result.output.includes(password), 'a saída não pode conter a senha');
  assert.ok(!result.output.includes('127.0.0.1:' + port), 'a saída não pode conter a URL de conexão');
  return result;
};
const confirm = '--confirm=ESCREVER-DADOS-DE-TESTE';

try {
  await socket.start();

  const missing = await execute({ ...environment(), DATABASE_URL: '' }, []);
  assert.equal(missing.status, 1);
  assert.match(missing.output, /DATABASE_URL: ausente/);
  assert.match(missing.output, /DATABASE_URL ausente/);

  const wrongProject = await run([], { SUPABASE_PROJECT_ID: 'abcdefghijklmnopqrst' });
  assert.equal(wrongProject.status, 1);
  assert.match(wrongProject.output, /não pertence ao projeto Supabase/);

  const empty = await run();
  assert.equal(empty.status, 0, empty.output);
  assert.match(empty.output, /migração ainda não aplicada/);
  assert.match(empty.output, /Aplicar as migrações exige autorização/);
  console.log('OK: banco vazio é reportado sem alterar nada e sem expor a conexão');

  await engine.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  for (const file of ['001_auth.sql', '002_whatsapp.sql', '003_meta_deletion.sql', '004_integration_settings.sql', '005_integration_manager.sql', '006_erp.sql', '007_workspace_access.sql', '008_loja_avaliacoes.sql', '009_loja_clientes.sql', '010_loja_gestao.sql', '011_performance.sql', '012_storage.sql', '013_crm_reporting_indexes.sql', '014_image_compression.sql']) {
    await engine.exec(readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  }
  const migrated = await run();
  assert.equal(migrated.status, 0, migrated.output);
  for (const schema of ['erp_auth: 12/12', 'erp_whatsapp: 15/15', 'erp_meta: 1/1', 'erp_core: 31/31', 'RLS habilitado em 59/59', 'anon e authenticated sem USAGE', 'nenhuma concessão']) assert.ok(migrated.output.includes(schema), `esperava "${schema}" em:\n${migrated.output}`);
  assert.match(migrated.output, /erp_core\.records: 0 registro/);
  console.log('OK: esquemas, RLS e privilégios verificados nas quatorze migrações');

  const unconfirmed = await run(['--write-test']);
  assert.equal(unconfirmed.status, 1);
  assert.match(unconfirmed.output, /exige --confirm/);
  assert.equal((await engine.query('SELECT count(*)::int AS total FROM erp_core.records')).rows[0].total, 0);

  const rolledBack = await run(['--write-test', confirm]);
  assert.equal(rolledBack.status, 0, rolledBack.output);
  assert.match(rolledBack.output, /ROLLBACK concluído: nada foi gravado/);
  assert.equal((await engine.query('SELECT count(*)::int AS total FROM erp_core.records')).rows[0].total, 0);

  const persisted = await run(['--write-test', '--persist', confirm]);
  assert.equal(persisted.status, 0, persisted.output);
  assert.match(persisted.output, /persistido e lido por outra conexão/);
  assert.match(persisted.output, /registro de teste removido/);
  assert.equal((await engine.query('SELECT count(*)::int AS total FROM erp_core.records')).rows[0].total, 0);
  console.log('OK: teste de escrita reversível (rollback e gravar/ler/remover) sem resíduos');

  // Exposição indevida precisa ser detectada.
  await engine.exec('GRANT USAGE ON SCHEMA erp_core TO anon');
  const exposed = await run();
  assert.equal(exposed.status, 1);
  assert.match(exposed.output, /anon→erp_core/);
  console.log('OK: concessão indevida a anon é detectada');
} finally {
  await socket.stop().catch(() => {});
  await engine.close().catch(() => {});
}
