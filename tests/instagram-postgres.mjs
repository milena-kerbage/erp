// PostgreSQL WASM isolado. Não usa DATABASE_URL ou dados reais do Ateliê.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
const engine = await PGlite.create();
const port = Number(process.env.INSTAGRAM_POSTGRES_TEST_PORT || 55447);
const socket = new PGLiteSocketServer({ db: engine, host: '127.0.0.1', port });
Object.assign(process.env, { NODE_ENV: 'test', DATABASE_URL: `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`, DATABASE_SSL_MODE: 'disable', DATABASE_POOL_MAX: '1',
  INSTAGRAM_APP_ID: '123456789', INSTAGRAM_APP_SECRET: 'isolated-instagram-postgres-secret', INSTAGRAM_PUBLIC_BASE_URL: 'https://app.example.test',
  INTEGRATION_ENCRYPTION_KEY: randomBytes(32).toString('base64') });
delete process.env.VERCEL;
const storage = await import('../src/lib/database.ts');
try {
  await engine.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  for (const file of ['003_meta_deletion.sql', '015_instagram.sql', '015_instagram.sql']) await engine.exec(readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  const tables = await engine.query("SELECT count(*)::int AS total, bool_and(rowsecurity) AS protected FROM pg_tables WHERE schemaname = 'erp_meta' AND tablename LIKE 'instagram_%'");
  assert.deepEqual(tables.rows[0], { total: 7, protected: true });
  const privileges = await engine.query("SELECT has_table_privilege('anon','erp_meta.instagram_connections','SELECT') AS anon, has_table_privilege('authenticated','erp_meta.instagram_events','SELECT') AS authenticated");
  assert.deepEqual(privileges.rows[0], { anon: false, authenticated: false });
  await socket.start();
  const store = await import('../src/lib/instagram/store.ts');
  const webhook = await import('../src/lib/instagram/webhook.ts');
  const now = Date.now();
  await store.saveConnection({ subjectId: '111111111', accountId: '222222222', username: 'milenakerbageatelie', token: 'isolated-token-postgres-not-real', scopes: ['instagram_business_basic'], expiresIn: 5184000 });
  const payload = { object: 'instagram', entry: [{ id: '222222222', time: now, changes: [{ field: 'comments', value: { id: '444444444', from: { id: '333333333' }, text: 'Comentário privado de teste' } }] }] };
  assert.equal((await webhook.receiveWebhook(payload)).stored, 1);
  assert.equal((await webhook.receiveWebhook(payload)).stored, 0);
  const state = await store.createState('admin', 'session');
  assert.ok(await store.consumeState(state, 'admin', 'session'));
  assert.equal(await store.consumeState(state, 'admin', 'session'), null);
  const results = await Promise.all(Array.from({ length: 3 }, () => store.removeSubject('111111111', true)));
  assert.equal(new Set(results.map(r => r.confirmation_code)).size, 1);
  assert.equal(await store.currentConnection(), undefined);
  assert.equal((await store.instagramDb().prepare('SELECT count(*) AS total FROM instagram_events').get()).total, 0);
  assert.equal((await store.completeDeletion(results[0].confirmation_code, 'completed', 'Revisão PostgreSQL isolada concluída.')).status, 'completed');
  console.log('OK: migração PostgreSQL idempotente, 7 tabelas com RLS/grants privados, lock transacional, OAuth state, eventos, deduplicação, exclusão e revisão.');
} finally { await storage.closeDatabases(); await socket.stop().catch(() => {}); await engine.close(); }
