// Usa build isolado .next-validacao. Não faz chamadas à Meta nem lê os bancos do Ateliê.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes, createHmac } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const folder = mkdtempSync(join(tmpdir(), 'mk-instagram-http-'));
const port = Number(process.env.INSTAGRAM_HTTP_TEST_PORT || 3361), origin = `http://127.0.0.1:${port}`, publicOrigin = 'https://app.ateliemilenakerbage.com.br';
const loginSecret = randomBytes(32).toString('hex'), webhookSecret = randomBytes(32).toString('hex'), verifyToken = randomBytes(32).toString('hex');
const adminEmail = 'instagram-http-admin@example.test';
Object.assign(process.env, { NODE_ENV: 'test', DATABASE_URL: '', ALLOW_LOCAL_SQLITE: 'true', AUTH_DB_PATH: join(folder, 'auth.sqlite'), ERP_DB_PATH: join(folder, 'erp.sqlite'), WHATSAPP_DB_PATH: join(folder, 'whatsapp.sqlite'), META_DELETION_DB_PATH: join(folder, 'meta.sqlite'),
  INTEGRATION_ENCRYPTION_KEY: randomBytes(32).toString('base64'), ERP_ADMIN_EMAILS: adminEmail, AUTH_REQUIRE_LOGIN: 'true', AUTH_ORIGIN: publicOrigin, PUBLIC_BASE_URL: publicOrigin,
  INSTAGRAM_APP_ID: '123456789', INSTAGRAM_APP_SECRET: loginSecret, INSTAGRAM_WEBHOOK_APP_SECRET: webhookSecret, INSTAGRAM_VERIFY_TOKEN: verifyToken,
  INSTAGRAM_GRAPH_VERSION: 'v27.0', INSTAGRAM_PUBLIC_BASE_URL: publicOrigin, INSTAGRAM_SCOPES: 'instagram_business_basic,instagram_business_manage_messages',
  INSTAGRAM_EXPECTED_USERNAME: 'milenakerbageatelie', INSTAGRAM_RETENTION_DAYS: '90', INSTAGRAM_ACCESS_TOKEN: '', INTEGRATION_MANAGER_EMAILS: '' });
delete process.env.VERCEL;
const auth = await import('../src/lib/auth/core.ts'), storage = await import('../src/lib/database.ts'), store = await import('../src/lib/instagram/store.ts');
await auth.createUser(adminEmail, 'Admin de teste', 'unused-http-hash', 'instagram-http-admin');
await auth.createUser('instagram-staff@example.test', 'Operador de teste', 'unused-http-hash', 'instagram-http-staff');
const cookie = `__Host-mk_session=${await auth.createSession('instagram-http-admin')}`, staffCookie = `__Host-mk_session=${await auth.createSession('instagram-http-staff')}`;
let output = '';
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
  env: { ...process.env, NODE_ENV: 'production', NEXT_DIST_DIR: '.next-validacao', VERCEL: '', DATABASE_SSL_CA: '', SUPABASE_PROJECT_ID: '', SUPABASE_URL: '', R2_ACCESS_KEY_ID: '', R2_SECRET_ACCESS_KEY: '' }, stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', data => { output = (output + data.toString()).slice(-5000); });
server.stderr.on('data', data => { output = (output + data.toString()).slice(-5000); });
const request = (path, options = {}, session = false) => fetch(origin + path, { redirect: 'manual', ...options, headers: { ...(session ? { cookie: session === 'staff' ? staffCookie : cookie } : {}), ...options.headers } });
const post = (path, body, session = true, requestOrigin = publicOrigin) => request(path, { method: 'POST', headers: { origin: requestOrigin, 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }, session);
const signed = id => {
  const data = Buffer.from(JSON.stringify({ algorithm: 'HMAC-SHA256', user_id: id, issued_at: Math.floor(Date.now() / 1000) })).toString('base64url');
  return `${createHmac('sha256', loginSecret).update(data).digest('base64url')}.${data}`;
};
const callback = (path, id) => request(path, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ signed_request: signed(id) }) });
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error('Servidor não iniciou: ' + output);
    try { if ((await request('/login')).status === 200) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(ready, output);
  for (const path of ['/privacidade', '/termos', '/exclusao-de-dados', '/exclusao-de-dados/instagram/status']) assert.equal((await request(path)).status, 200, path);
  assert.equal((await request('/configuracoes/instagram')).status, 307);
  assert.equal((await request('/api/instagram/status')).status, 401);
  assert.equal((await request('/api/instagram/status', {}, 'staff')).status, 403);
  assert.equal((await request('/api/instagram/status', {}, true)).status, 200);
  assert.equal((await post('/api/instagram/oauth/start', undefined, true, 'https://attacker.example')).status, 403);
  const starting = await post('/api/instagram/oauth/start'); assert.equal(starting.status, 200);
  const url = new URL((await starting.json()).authorizationUrl); assert.equal(url.origin, 'https://www.instagram.com'); assert.ok(url.searchParams.get('state'));
  const rejectedReturn = await request('/api/instagram/oauth/callback?code=secret&state=invalid', {}, true);
  assert.equal(rejectedReturn.status, 303); assert.equal(rejectedReturn.headers.get('location'), publicOrigin + '/configuracoes/instagram?instagram=failed');
  const denied = await request('/api/instagram/oauth/callback?error=access_denied&state=' + url.searchParams.get('state'), {}, true);
  assert.equal(denied.status, 303); assert.match(denied.headers.get('location'), /instagram=denied$/);
  const verify = await post('/api/instagram/webhook/verify-token'); assert.equal((await verify.json()).verifyToken, verifyToken);
  const challenge = await request('/api/instagram/webhook?' + new URLSearchParams({ 'hub.mode': 'subscribe', 'hub.verify_token': verifyToken, 'hub.challenge': '18463' }));
  assert.equal(challenge.status, 200); assert.equal(await challenge.text(), '18463');
  assert.equal((await request('/api/instagram/deauthorize')).status, 405);
  assert.equal((await request('/api/instagram/data-deletion', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'signed_request=bad.payload' })).status, 403);
  await store.saveConnection({ subjectId: '111111111', accountId: '222222222', username: 'milenakerbageatelie', token: 'isolated-http-token-never-use-remotely', scopes: ['instagram_business_basic'], expiresIn: 5184000 });
  const raw = JSON.stringify({ object: 'instagram', entry: [{ id: '222222222', time: Date.now(), messaging: [{ sender: { id: '333333333' }, recipient: { id: '222222222' }, message: { mid: 'mid.http', text: 'Mensagem HTTP privada' } }] }] });
  const deliver = signature => request('/api/instagram/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'x-hub-signature-256': signature }, body: raw });
  assert.equal((await deliver('sha256=' + '0'.repeat(64))).status, 403);
  const signature = 'sha256=' + createHmac('sha256', webhookSecret).update(raw).digest('hex');
  assert.equal((await deliver(signature)).status, 200); assert.equal((await deliver(signature)).status, 200);
  const status = await (await request('/api/instagram/status', {}, true)).json();
  assert.equal(status.events.total, 1);
  for (const secret of [loginSecret, webhookSecret, verifyToken, 'isolated-http-token']) assert.ok(!JSON.stringify(status).includes(secret));
  assert.equal((await request('/api/instagram/events')).status, 401);
  assert.equal((await (await request('/api/instagram/events', {}, true)).json()).events.length, 1);
  const deletion = await callback('/api/instagram/data-deletion', '111111111'); assert.equal(deletion.status, 200);
  const receipt = await deletion.json(); assert.match(receipt.confirmation_code, /^[a-f0-9]{48}$/);
  assert.deepEqual(await (await callback('/api/instagram/data-deletion', '111111111')).json(), receipt);
  assert.equal((await request('/exclusao-de-dados/instagram/status?code=' + receipt.confirmation_code)).status, 200);
  const tracking = await (await request('/api/instagram/data-deletion/status?code=' + receipt.confirmation_code)).json(); assert.equal(tracking.status, 'pending_review');
  assert.equal(await store.currentConnection(), undefined);
  assert.equal((await (await request('/api/instagram/status', {}, true)).json()).events.total, 0);
  assert.equal((await callback('/api/instagram/deauthorize', '111111111')).status, 200);
  assert.equal((await request('/api/instagram/deletion-requests')).status, 401);
  assert.equal((await request('/api/instagram/data-deletion/status?code=guess')).status, 404);
  const revision = await request('/api/instagram/deletion-requests', { method: 'PATCH', headers: { origin: publicOrigin, 'content-type': 'application/json' }, body: JSON.stringify({ code: receipt.confirmation_code, status: 'completed', note: 'Revisão HTTP dos demais dados concluída.' }) }, true);
  assert.equal(revision.status, 200); assert.equal((await revision.json()).status, 'completed');
  console.log('OK: produção HTTP com autenticação obrigatória; páginas públicas, gestão/papéis/Origin, OAuth start/cancelamento, challenge/HMAC, deduplicação, exclusão/status/revisão. Nenhuma chamada à Meta.');
} finally {
  server.kill('SIGTERM');
  await new Promise(resolve => { if (server.exitCode !== null) return resolve(); server.once('exit', resolve); setTimeout(() => { server.kill('SIGKILL'); resolve(); }, 3000).unref(); });
  await storage.closeDatabases(); rmSync(folder, { recursive: true, force: true });
}
