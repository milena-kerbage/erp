import assert from 'node:assert/strict';
import { test, beforeEach, after } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes, createHmac } from 'node:crypto';

const folder = mkdtempSync(join(tmpdir(), 'mk-instagram-'));
Object.assign(process.env, { NODE_ENV: 'test', DATABASE_URL: '', ALLOW_LOCAL_SQLITE: 'true', META_DELETION_DB_PATH: join(folder, 'meta.sqlite'),
  INSTAGRAM_APP_ID: '123456789', INSTAGRAM_APP_SECRET: 'instagram-login-secret-for-isolated-tests', INSTAGRAM_WEBHOOK_APP_SECRET: 'meta-webhook-secret-different-from-login',
  INSTAGRAM_VERIFY_TOKEN: randomBytes(32).toString('hex'), INSTAGRAM_GRAPH_VERSION: 'v27.0', INSTAGRAM_EXPECTED_USERNAME: 'milenakerbageatelie',
  INSTAGRAM_SCOPES: 'instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments', INSTAGRAM_PUBLIC_BASE_URL: 'https://app.example.test',
  INTEGRATION_ENCRYPTION_KEY: randomBytes(32).toString('base64'), INSTAGRAM_RETENTION_DAYS: '90' });
delete process.env.VERCEL;
const storage = await import('../src/lib/database.ts');
const config = await import('../src/lib/instagram/config.ts');
const crypto = await import('../src/lib/instagram/crypto.ts');
const store = await import('../src/lib/instagram/store.ts');
const api = await import('../src/lib/instagram/api.ts');
const webhook = await import('../src/lib/instagram/webhook.ts');
const feed = await import('../src/loja/lib/instagram/servidor.ts');
const token = 'isolated-instagram-token-never-use-remotely';
const subjectId = '111111111', accountId = '222222222', visitorId = '333333333';
const input = { subjectId, accountId, username: 'milenakerbageatelie', token, scopes: config.instagramConfig().scopes, expiresIn: 5184000 };
const event = (mid = 'mid.1', id = accountId) => ({ object: 'instagram', entry: [{ id, time: Date.now(), messaging: [{ sender: { id: visitorId }, recipient: { id }, timestamp: Date.now(), message: { mid, text: 'Mensagem privada de teste' } }] }] });
const signed = (payload, secret = process.env.INSTAGRAM_APP_SECRET) => {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${createHmac('sha256', secret).update(data).digest('base64url')}.${data}`;
};
beforeEach(async () => {
  for (const table of ['instagram_event_subjects', 'instagram_events', 'instagram_connections', 'instagram_oauth_states', 'instagram_suppression', 'instagram_deletion_requests', 'instagram_lifecycle']) await store.instagramDb().prepare(`DELETE FROM ${table}`).run();
});
after(async () => { await storage.closeDatabases(); rmSync(folder, { recursive: true, force: true }); });

test('URLs usam origem configurada e recusam credenciais, caminhos e HTTP público', () => {
  assert.equal(config.instagramUrls().redirect, 'https://app.example.test/api/instagram/oauth/callback');
  for (const origin of ['https://user:secret@example.test', 'https://example.test/path', 'http://example.test', 'https://example.test/?x=1']) {
    process.env.INSTAGRAM_PUBLIC_BASE_URL = origin;
    assert.throws(() => config.instagramUrls(), { status: 503 });
  }
  process.env.INSTAGRAM_PUBLIC_BASE_URL = 'https://app.example.test';
});
test('state exige sessão/usuário corretos, expira e é consumido atomicamente uma única vez', async () => {
  const now = Date.now(), state = await store.createState('admin', 'session', now);
  assert.equal(await store.consumeState(state, 'other', 'session', now), null);
  assert.equal(await store.consumeState(state, 'admin', 'other', now), null);
  const results = await Promise.all(Array.from({ length: 5 }, () => store.consumeState(state, 'admin', 'session', now)));
  assert.equal(results.filter(v => v === now).length, 1);
  assert.equal(await store.consumeState(await store.createState('admin', 'session', now), 'admin', 'session', now + 600001), null);
});
test('URL oficial exige versão/configuração e usa os scopes atuais com state', () => {
  const url = new URL(api.authorizationUrl('a'.repeat(64)));
  assert.equal(url.origin, 'https://www.instagram.com');
  assert.equal(url.searchParams.get('client_id'), process.env.INSTAGRAM_APP_ID);
  assert.equal(url.searchParams.get('redirect_uri'), config.instagramUrls().redirect);
  assert.match(url.searchParams.get('scope'), /instagram_business_basic/);
  const version = process.env.INSTAGRAM_GRAPH_VERSION;
  process.env.INSTAGRAM_GRAPH_VERSION = '';
  assert.throws(() => api.authorizationUrl('a'.repeat(64)), { code: 'OAUTH_NOT_CONFIGURED' });
  process.env.INSTAGRAM_GRAPH_VERSION = version;
});
test('HMAC de lifecycle usa o segredo Instagram e valida algoritmo, ID e issued_at', () => {
  const payload = { algorithm: 'HMAC-SHA256', user_id: subjectId, issued_at: Math.floor(Date.now() / 1000) };
  assert.equal(crypto.signedSubject(signed(payload)), subjectId);
  assert.throws(() => crypto.signedSubject(signed(payload, process.env.INSTAGRAM_WEBHOOK_APP_SECRET)), { status: 403 });
  for (const patch of [{ algorithm: 'none' }, { user_id: '../test' }, { user_id: 123 }, { issued_at: Math.floor(Date.now() / 1000) + 1000 }]) assert.throws(() => crypto.signedSubject(signed({ ...payload, ...patch })), { status: 400 });
  assert.throws(() => crypto.signedSubject('bad'), { status: 400 });
});
test('webhook valida challenge e assinatura do corpo bruto com segredo separado', () => {
  const url = new URL(config.instagramUrls().webhook);
  url.search = new URLSearchParams({ 'hub.mode': 'subscribe', 'hub.verify_token': process.env.INSTAGRAM_VERIFY_TOKEN, 'hub.challenge': '123456' }).toString();
  assert.equal(webhook.verifyChallenge(url), '123456');
  url.searchParams.append('hub.challenge', 'duplicated');
  assert.throws(() => webhook.verifyChallenge(url), { status: 403 });
  const bytes = Buffer.from(JSON.stringify(event()));
  const signature = `sha256=${createHmac('sha256', process.env.INSTAGRAM_WEBHOOK_APP_SECRET).update(bytes).digest('hex')}`;
  assert.equal(crypto.verifyWebhook(bytes, signature), true);
  assert.equal(crypto.verifyWebhook(Buffer.concat([bytes, Buffer.from(' ')]), signature), false);
  assert.equal(crypto.verifyWebhook(bytes, null), false);
});
test('tokens e payloads ficam cifrados com contexto autenticado', async () => {
  await store.saveConnection(input);
  const c = await store.currentConnection();
  assert.equal(await store.connectionToken(c), token);
  assert.ok(!c.token_cipher.includes(token));
  assert.throws(() => crypto.unseal(c.token_cipher, 'different-context'), { code: 'DECRYPTION_FAILED' });
  await assert.rejects(store.connectionToken({ ...c, expires_at: 1 }), { code: 'TOKEN_EXPIRED' });
});
test('troca OAuth aceita data[] oficial, obtém token longo e mantém os dois IDs distintos', async () => {
  const seen = [];
  await api.exchangeCode('isolated-code', async (url, options) => {
    const parsed = new URL(url); seen.push(parsed);
    assert.equal(options.redirect, 'error'); assert.equal(options.cache, 'no-store');
    if (parsed.hostname === 'api.instagram.com') {
      assert.equal(options.method, 'POST'); assert.equal(options.body.get('redirect_uri'), config.instagramUrls().redirect);
      return Response.json({ data: [{ access_token: token, user_id: subjectId, permissions: input.scopes.join(',') }] });
    }
    if (parsed.pathname === '/access_token') { assert.equal(parsed.searchParams.get('grant_type'), 'ig_exchange_token'); return Response.json({ access_token: token, expires_in: input.expiresIn }); }
    assert.equal(parsed.searchParams.get('fields'), 'id,user_id,username');
    assert.equal(options.headers.Authorization, `Bearer ${token}`);
    return Response.json({ data: [{ id: subjectId, user_id: accountId, username: input.username }] });
  });
  assert.equal(seen.length, 3);
  const c = await store.currentConnection();
  assert.equal(c.subject_hash, crypto.subjectHash(subjectId)); assert.equal(c.account_id, accountId);
});
test('troca OAuth também aceita resposta plana e recusa perfil de outra conta sem guardar token', async () => {
  let call = 0;
  await assert.rejects(api.exchangeCode('isolated-code', async () => {
    call++;
    return Response.json(call === 1 ? { access_token: token, user_id: subjectId, permissions: input.scopes } : call === 2 ? { access_token: token, expires_in: input.expiresIn } : { user_id: accountId, username: 'outroperfil' });
  }), { code: 'WRONG_ACCOUNT' });
  assert.equal(await store.currentConnection(), undefined);
});
test('falha remota não vaza resposta, token, código ou segredo', async () => {
  await assert.rejects(api.exchangeCode('private-code', async () => Response.json({ error: { message: token } }, { status: 400 })), error => error.code === 'META_REJECTED' && !error.message.includes(token));
  await assert.rejects(api.metaRequest('https://graph.instagram.com/test', {}, async () => { throw new Error(token); }), { code: 'META_UNAVAILABLE' });
});
test('inscrição usa IG_ID e somente campos autorizados; renovação substitui token cifrado', async () => {
  await store.saveConnection({ ...input, scopes: ['instagram_business_basic', 'instagram_business_manage_messages'] });
  const result = await api.subscribeAccount(async (url, options) => {
    assert.equal(new URL(url).pathname, `/v27.0/${accountId}/subscribed_apps`);
    assert.ok(!options.body.get('subscribed_fields').includes('comments'));
    return Response.json({ success: true });
  });
  assert.ok(result.fields.includes('messages'));
  await assert.rejects(api.refreshToken(), { code: 'TOKEN_TOO_RECENT' });
  const c = await store.currentConnection();
  await store.instagramDb().prepare('UPDATE instagram_connections SET refreshed_at = ?').run(Date.now() - 2 * 86400000);
  await api.refreshToken(async url => {
    assert.equal(new URL(url).searchParams.get('grant_type'), 'ig_refresh_token');
    return Response.json({ access_token: `${token}-renewed`, expires_in: input.expiresIn });
  });
  const refreshed = await store.currentConnection();
  assert.notEqual(refreshed.token_cipher, c.token_cipher);
  assert.equal(await store.connectionToken(refreshed), `${token}-renewed`);
});
test('eventos deduplicam e ficam cifrados; conta alheia é ignorada', async () => {
  await store.saveConnection(input);
  const payload = event();
  assert.equal((await webhook.receiveWebhook(payload)).stored, 1);
  assert.equal((await webhook.receiveWebhook(payload)).stored, 0);
  assert.equal((await webhook.receiveWebhook(event('mid.other', '999999999'))).stored, 0);
  const row = await store.instagramDb().prepare('SELECT * FROM instagram_events').get();
  assert.ok(!row.payload_cipher.includes('Mensagem privada'));
  assert.equal(JSON.parse(crypto.unseal(row.payload_cipher, `event:${row.id}`)).message.text, 'Mensagem privada de teste');
});
test('evento inválido em lote desfaz gravações do mesmo lote', async () => {
  await store.saveConnection(input);
  const payload = event(); payload.entry[0].messaging.push(null);
  await assert.rejects(webhook.receiveWebhook(payload), { status: 400 });
  assert.equal((await store.instagramDb().prepare('SELECT count(*) AS n FROM instagram_events').get()).n, 0);
});
test('recebe o lote oficial de até 1000 atualizações sem perda e recusa excesso', async () => {
  await store.saveConnection(input);
  const payload = event();
  const template = payload.entry[0].messaging[0];
  payload.entry[0].messaging = Array.from({ length: 1000 }, (_, i) => ({ ...template, message: { mid: `mid.batch.${i}`, text: 'Teste de lote' } }));
  assert.equal((await webhook.receiveWebhook(payload)).stored, 1000);
  payload.entry[0].messaging.push(template);
  await assert.rejects(webhook.receiveWebhook(payload), { status: 400 });
  assert.equal((await store.instagramDb().prepare('SELECT count(*) AS n FROM instagram_events').get()).n, 1000);
});
test('exclusão pelo ID app-scoped apaga conexão/eventos e retorna protocolo idempotente sem dados privados', async () => {
  await store.saveConnection(input); await webhook.receiveWebhook(event());
  const receipts = await Promise.all(Array.from({ length: 5 }, () => store.removeSubject(subjectId, true)));
  assert.equal(new Set(receipts.map(r => r.confirmation_code)).size, 1);
  assert.equal(await store.currentConnection(), undefined);
  assert.equal((await store.instagramDb().prepare('SELECT count(*) AS n FROM instagram_events').get()).n, 0);
  assert.equal((await webhook.receiveWebhook(event('mid.late'))).stored, 0);
  const status = await store.deletionStatus(receipts[0].confirmation_code);
  assert.equal(status.status, 'pending_review');
  for (const secret of [subjectId, accountId, token]) assert.ok(!JSON.stringify(status).includes(secret));
  assert.equal(await store.deletionStatus('guess'), null);
  assert.equal((await store.completeDeletion(receipts[0].confirmation_code, 'completed', 'Revisão controlada dos demais registros concluída.')).status, 'completed');
  await assert.rejects(store.completeDeletion(receipts[0].confirmation_code, 'completed', 'Repetir revisão não é permitido.'), { status: 409 });
});
test('pedido de participante apaga seus eventos sem desconectar o perfil e bloqueia replay', async () => {
  await store.saveConnection(input); const payload = event(); await webhook.receiveWebhook(payload);
  await store.removeSubject(visitorId, true);
  assert.ok(await store.currentConnection());
  assert.equal((await webhook.receiveWebhook(payload)).stored, 0);
});
test('revogação invalida state e bloqueia gravação de OAuth iniciado antes da remoção', async () => {
  const now = Date.now(), state = await store.createState('admin', 'session', now - 1000);
  await store.removeSubject(subjectId, false, now);
  assert.equal(await store.consumeState(state, 'admin', 'session'), null);
  await assert.rejects(store.saveConnection({ ...input, authorizedAt: now - 1000 }, now + 100), { code: 'STALE_AUTHORIZATION' });
  await store.saveConnection({ ...input, authorizedAt: now + 1000 }, now + 1000);
  assert.ok(await store.currentConnection());
});
test('retenção remove evento e vínculos vencidos e preserva os recentes', async () => {
  await store.saveConnection(input); await webhook.receiveWebhook(event()); await webhook.receiveWebhook(event('mid.2'));
  const row = await store.instagramDb().prepare('SELECT id FROM instagram_events LIMIT 1').get();
  await store.instagramDb().prepare('UPDATE instagram_events SET received_at = ? WHERE id = ?').run(Date.now() - 91 * 86400000, row.id);
  await store.pruneEvents();
  assert.equal((await store.instagramDb().prepare('SELECT count(*) AS n FROM instagram_events').get()).n, 1);
  assert.equal((await store.instagramDb().prepare('SELECT count(*) AS n FROM instagram_event_subjects WHERE event_id = ?').get(row.id)).n, 0);
});
test('feed usa OAuth e nunca restaura o token legado após revogação ou falha de criptografia', async () => {
  process.env.INSTAGRAM_ACCESS_TOKEN = 'legacy-token-never-restore-after-revoke';
  assert.equal((await feed.configuracaoInstagram()).token, undefined);
  await store.saveConnection(input);
  assert.equal((await feed.configuracaoInstagram()).token, token);
  const key = process.env.INTEGRATION_ENCRYPTION_KEY;
  process.env.INTEGRATION_ENCRYPTION_KEY = randomBytes(32).toString('base64');
  assert.equal((await feed.configuracaoInstagram()).token, undefined);
  process.env.INTEGRATION_ENCRYPTION_KEY = key;
  await store.removeSubject(subjectId, false);
  assert.equal((await feed.configuracaoInstagram()).token, undefined);
  const appId = process.env.INSTAGRAM_APP_ID; process.env.INSTAGRAM_APP_ID = '';
  assert.equal((await feed.configuracaoInstagram()).token, process.env.INSTAGRAM_ACCESS_TOKEN);
  process.env.INSTAGRAM_APP_ID = appId; delete process.env.INSTAGRAM_ACCESS_TOKEN;
});
