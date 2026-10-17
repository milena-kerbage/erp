// Valida scripts/apply-migrations.mjs contra PostgreSQL em WASM (PGlite). Não conecta ao Supabase.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const engine = await PGlite.create();
const port = Number(process.env.MIGRATE_TEST_PORT || 55442);
const socket = new PGLiteSocketServer({ db: engine, host: '127.0.0.1', port });
const password = 'senha-sintetica-de-teste';
const environment = () => {
  const base = { ...process.env, NODE_ENV: 'test', DATABASE_URL: `postgresql://postgres:${password}@127.0.0.1:${port}/postgres` };
  for (const name of ['SUPABASE_PROJECT_ID', 'SUPABASE_URL', 'DATABASE_SSL_CA']) delete base[name];
  return base;
};
const run = arguments_ => new Promise(resolve => {
  const child = spawn(process.execPath, ['--experimental-strip-types', '--no-warnings', 'scripts/apply-migrations.mjs', ...arguments_], { env: { ...environment(), DATABASE_SSL_MODE: 'disable' } });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const timer = setTimeout(() => child.kill(), 90_000);
  child.on('close', status => { clearTimeout(timer); assert.ok(!output.includes(password)); resolve({ status, output }); });
});
const count = async () => (await engine.query("SELECT count(*)::int AS total FROM pg_tables WHERE schemaname LIKE 'erp\\_%'")).rows[0].total;

try {
  await socket.start();
  await engine.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  const refused = await run([]);
  assert.equal(refused.status, 1);
  assert.match(refused.output, /Recusado/);
  assert.equal(await count(), 0);

  const applied = await run(['--confirm=APLICAR-MIGRACOES']);
  assert.equal(applied.status, 0, applied.output);
  for (const file of ['001_auth.sql', '002_whatsapp.sql', '003_meta_deletion.sql', '004_integration_settings.sql', '005_integration_manager.sql', '006_erp.sql', '007_workspace_access.sql']) assert.ok(applied.output.includes(`✓ ${file}`), applied.output);
  assert.equal(await count(), 35);
  assert.match(applied.output, /erp_core: 7 tabela\(s\), RLS em 7/);
  assert.equal((await engine.query("SELECT count(*)::int AS total FROM pg_tables WHERE schemaname LIKE 'erp\\_%' AND NOT rowsecurity")).rows[0].total, 0);
  console.log('OK: sete migrações aplicadas em ordem, 35 tabelas, RLS em todas');

  const again = await run(['--confirm=APLICAR-MIGRACOES']);
  assert.equal(again.status, 1);
  assert.match(again.output, /Já existem 35 tabela/);
  const idempotent = await run(['--confirm=APLICAR-MIGRACOES', '--allow-existing']);
  assert.equal(idempotent.status, 0, idempotent.output);
  assert.equal(await count(), 35);
  console.log('OK: reaplicar exige --allow-existing e é idempotente');
} finally {
  await socket.stop().catch(() => {});
  await engine.close().catch(() => {});
}
