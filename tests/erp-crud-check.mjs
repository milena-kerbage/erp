// Valida scripts/check-erp-crud.mjs contra PostgreSQL em WASM (PGlite). Não conecta ao Supabase.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const engine = await PGlite.create();
const port = Number(process.env.CRUD_CHECK_TEST_PORT || 55443);
const socket = new PGLiteSocketServer({ db: engine, host: '127.0.0.1', port });
const run = arguments_ => new Promise(resolve => {
  const env = { ...process.env, NODE_ENV: 'test', DATABASE_SSL_MODE: 'disable', DATABASE_URL: `postgresql://postgres:senha-sintetica@127.0.0.1:${port}/postgres` };
  for (const name of ['SUPABASE_PROJECT_ID', 'SUPABASE_URL', 'DATABASE_SSL_CA', 'VERCEL']) delete env[name];
  const child = spawn(process.execPath, ['--experimental-strip-types', '--no-warnings', 'scripts/check-erp-crud.mjs', ...arguments_], { env });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const timer = setTimeout(() => child.kill(), 90_000);
  child.on('close', status => { clearTimeout(timer); resolve({ status, output }); });
});
const count = async table => (await engine.query(`SELECT count(*)::int AS total FROM erp_core.${table}`)).rows[0].total;

try {
  await socket.start();
  await engine.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  await engine.exec(readFileSync(new URL('../supabase/migrations/006_erp.sql', import.meta.url), 'utf8'));
  const refused = await run([]);
  assert.equal(refused.status, 1);
  assert.match(refused.output, /Recusado/);
  assert.equal(await count('workspace_settings'), 0);

  const result = await run(['--confirm=ESCREVER-DADOS-DE-TESTE']);
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /CRUD real concluído e dados de teste removidos/);
  assert.equal(await count('leads'), 0);
  assert.equal(await count('lead_notes'), 0);
  assert.equal(await count('erp_audit'), 0);
  assert.equal(await count('funnels'), 3, 'a configuração inicial (3 funis) permanece, como no primeiro acesso do app');
  assert.equal(await count('workspace_settings'), 1);
  console.log('OK: CRUD real em processos separados, persistência verificada e dados de teste removidos');
} finally {
  await socket.stop().catch(() => {});
  await engine.close().catch(() => {});
}
