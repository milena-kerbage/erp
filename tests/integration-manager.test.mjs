import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { mkdtempSync, readFileSync, writeFileSync, statSync, rmSync, symlinkSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const directory = mkdtempSync(join(tmpdir(), 'mk-manager-'));
process.env.NODE_ENV = 'test';
delete process.env.DATABASE_URL; delete process.env.VERCEL;
process.env.WHATSAPP_DB_PATH = join(directory, 'manager.sqlite');
process.env.INTEGRATION_ENCRYPTION_KEY = randomBytes(32).toString('base64');
process.env.META_APP_ID = '123456789';
process.env.META_APP_SECRET = 'fake-manager-app-secret-for-test';
process.env.WHATSAPP_ACCESS_TOKEN = 'fake-manager-access-token-for-test';
process.env.WHATSAPP_VERIFY_TOKEN = 'fake-manager-verify-token-for-test';
process.env.WHATSAPP_SUPPRESSION_SECRET = 'fake-manager-stable-suppression-secret';
process.env.WHATSAPP_GRAPH_VERSION = 'v25.0';
process.env.WHATSAPP_PHONE_NUMBER_ID = '123456789';
process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = '987654321';
process.env.AUTH_ORIGIN = process.env.PUBLIC_BASE_URL = 'https://app.ateliemilenakerbage.com.br';
process.env.INTEGRATION_MANAGER_EMAILS = ' Gestor@example.test, invalido, OUTRO@example.test ';
process.env.META_OAUTH_ENABLED = 'true';
const storage = await import('../src/lib/database.ts');
const config = await import('../src/lib/whatsapp/config.ts');
const manager = await import('../src/lib/integrations/management.ts');
const access = await import('../src/lib/integrations/access.ts');
const oauth = await import('../src/lib/integrations/oauth.ts');
const bootstrap = await import('../src/lib/integrations/bootstrap.ts');
const actor = 'isolated-manager';
const inspection = (type = 'USER', overrides = {}) => Response.json({ data: { app_id: process.env.META_APP_ID, is_valid: true, type, scopes: ['whatsapp_business_management', 'whatsapp_business_messaging'], expires_at: Math.floor(Date.now() / 1000) + 3600, ...overrides } });
after(async () => { await storage.closeDatabases(); rmSync(directory, { recursive: true, force: true }); });

test('gestor depende da allowlist de servidor e bootstrap depende do loopback de desenvolvimento', () => {
  assert.equal(access.allowedManager('gestor@example.test'), true);
  assert.equal(access.allowedManager('operador@example.test'), false);
  assert.equal(access.loopbackOrigin('http://127.0.0.1:3000'), true);
  assert.equal(access.loopbackOrigin('https://localhost.attacker.example'), false);
  assert.equal(bootstrap.localBootstrapAvailable('http://127.0.0.1:3000'), false);
});
test('checklist exige evidência, persiste situação e visão não expõe credenciais', async () => {
  await assert.rejects(manager.saveChecklist({ id: 'P01', status: 'complete', note: '' }, actor), { code: 'EVIDENCE_REQUIRED' });
  await assert.rejects(manager.saveChecklist({ id: 'inexistente', status: 'complete', note: 'prova' }, actor), { code: 'INVALID_CHECKLIST' });
  await manager.saveChecklist({ id: 'P01', status: 'complete', note: 'Evidência fictícia para teste isolado.' }, actor);
  const overview = await manager.managementOverview(process.env.PUBLIC_BASE_URL);
  assert.equal(overview.stages.find(stage => stage.id === 'P01').status, 'complete');
  assert.equal(overview.bootstrap.length, 4);
  assert.ok(!JSON.stringify(overview).includes(process.env.META_APP_SECRET));
  assert.ok(!JSON.stringify(overview).includes(process.env.WHATSAPP_ACCESS_TOKEN));
});
test('testes locais verificam transação e HMAC sem fabricar mensagens e retenção usa prazo salvo', async () => {
  for (const name of ['database', 'webhook', 'retention']) assert.equal((await manager.runManagementTest(name, actor, process.env.PUBLIC_BASE_URL)).ok, true);
  await config.saveSettings({ values: { retentionDays: 123 } }, actor);
  assert.match((await manager.runManagementTest('retention', actor, process.env.PUBLIC_BASE_URL)).details[0], /123 dias/);
  await assert.rejects(manager.runManagementTest('https://attacker.example', actor, process.env.PUBLIC_BASE_URL), { code: 'INVALID_TEST' });
});
test('consulta pública sem cookie usa só as seis rotas e rejeita origem divergente antes do fetch', async () => {
  const seen = [];
  const result = await manager.runManagementTest('public-routes', actor, process.env.PUBLIC_BASE_URL, async (url, options) => {
    assert.equal(new URL(url).origin, process.env.AUTH_ORIGIN); assert.equal(options.headers, undefined); assert.equal(options.redirect, 'manual');
    seen.push(new URL(url).pathname); return new Response('public', { status: 200 });
  });
  assert.equal(result.ok, true); assert.equal(seen.length, 6);
  await config.saveSettings({ values: { publicBaseUrl: 'https://different.example.test' } }, actor);
  const rejected = await manager.runManagementTest('public-routes', actor, process.env.PUBLIC_BASE_URL, async () => { throw new Error('Não deve fazer fetch'); });
  assert.equal(rejected.ok, false); assert.match(rejected.summary, /corresponder/);
  await config.saveSettings({ values: { publicBaseUrl: process.env.AUTH_ORIGIN } }, actor);
});
test('inspeção de token verifica aplicativo, permissões e limita dados retornados', async () => {
  const result = await manager.debugToken(async (url, options) => {
    assert.equal(new URL(url).hostname, 'graph.facebook.com'); assert.match(options.headers.Authorization, /^Bearer 123456789\|/);
    return inspection('USER', { access_token: 'never-return-secret', user_id: 'private-subject' });
  });
  assert.equal(result.valid, true); assert.equal(result.appMatches, true); assert.equal(result.missingScopes.length, 0);
  assert.ok(!JSON.stringify(result).includes('private-subject')); assert.ok(!JSON.stringify(result).includes('never-return-secret'));
  assert.equal((await manager.runManagementTest('token', actor, process.env.PUBLIC_BASE_URL, async () => inspection('USER', { app_id: '000000000' }))).ok, false);
  assert.equal((await manager.runManagementTest('token', actor, process.env.PUBLIC_BASE_URL, async () => inspection('USER', { scopes: [] }))).ok, false);
  const events = JSON.stringify(await manager.managementEvents());
  assert.ok(!events.includes(process.env.META_APP_SECRET)); assert.ok(!events.includes(process.env.WHATSAPP_ACCESS_TOKEN));
});
test('OAuth state é aleatório, associado à sessão, expira e só pode ser consumido uma vez', async () => {
  const state = await manager.createOAuthState(actor, 'cookie-A');
  assert.match(state, /^[a-f0-9]{64}$/);
  assert.equal(await manager.consumeOAuthState(state, actor, 'cookie-B'), false);
  assert.equal(await manager.consumeOAuthState(state, 'outro-user', 'cookie-A'), false);
  assert.equal(await manager.consumeOAuthState(state, actor, 'cookie-A'), true);
  assert.equal(await manager.consumeOAuthState(state, actor, 'cookie-A'), false);
  const expired = await manager.createOAuthState(actor, 'cookie-A');
  await (await manager.managementDb()).prepare('UPDATE management_oauth_states SET expires = 0 WHERE hash = ?').run(manager.tokenDigest(expired));
  assert.equal(await manager.consumeOAuthState(expired, actor, 'cookie-A'), false);
  const url = new URL(oauth.oauthAuthorizationUrl(await config.effectiveConfiguration(), state));
  assert.equal(url.hostname, 'www.facebook.com'); assert.equal(url.searchParams.get('state'), state);
  assert.equal(url.searchParams.get('redirect_uri'), process.env.AUTH_ORIGIN + '/api/whatsapp/management/oauth/callback');
});
test('troca OAuth guarda token cifrado e resposta não o entrega ao navegador', async () => {
  const token = 'fake-issued-token-for-isolated-test';
  const result = await oauth.exchangeOAuthCode('fake-code', actor, async url => {
    const parsed = new URL(url); assert.equal(parsed.hostname, 'graph.facebook.com'); assert.equal(parsed.searchParams.get('code'), 'fake-code');
    return Response.json({ access_token: token, expires_in: 3600 });
  });
  assert.equal(result.stored, true); assert.equal(result.expiresIn, 3600); assert.ok(!JSON.stringify(result).includes(token));
  const row = await config.settingsDb().prepare("SELECT value, encrypted FROM integration_settings WHERE key = 'accessToken'").get();
  assert.equal(row.encrypted, 1); assert.ok(!row.value.includes(token));
  assert.equal((await config.effectiveConfiguration()).accessToken, token);
});
test('renovação aceita só USER válido do app, não transforma token de sistema em permanente', async () => {
  await assert.rejects(oauth.extendUserToken(actor, async () => inspection('SYSTEM_USER')), { code: 'TOKEN_NOT_EXTENDABLE' });
  const token = 'fake-extended-token-for-isolated-test';
  const result = await oauth.extendUserToken(actor, async url => String(url).includes('/debug_token') ? inspection() : Response.json({ access_token: token, expires_in: 5184000 }));
  assert.equal(result.stored, true); assert.ok(!JSON.stringify(result).includes(token));
  assert.equal((await config.effectiveConfiguration()).accessToken, token);
});
test('bootstrap local preserva arquivo, produz chave uma vez e bloqueia produção, symlink e perda de chave', async () => {
  const original = process.env.INTEGRATION_ENCRYPTION_KEY;
  const environment = process.env.NODE_ENV;
  await assert.rejects(bootstrap.prepareLocalEncryption('http://127.0.0.1:3000', directory), { code: 'LOCAL_BOOTSTRAP_ONLY' });
  process.env.NODE_ENV = 'development'; delete process.env.INTEGRATION_ENCRYPTION_KEY;
  await assert.rejects(bootstrap.prepareLocalEncryption('http://127.0.0.1:3000', directory), { code: 'ENCRYPTION_KEY_RESTORE_REQUIRED' });
  await config.settingsDb().prepare("DELETE FROM integration_settings WHERE encrypted = 1").run();
  const isolated = mkdtempSync(join(directory, 'bootstrap-'));
  writeFileSync(join(isolated, '.env.local'), 'OTHER_VALUE=preservado\nINTEGRATION_ENCRYPTION_KEY=\n');
  const result = await bootstrap.prepareLocalEncryption('http://127.0.0.1:3000', isolated);
  assert.equal(result.created, true); assert.equal(Buffer.from(result.key, 'base64').length, 32);
  assert.match(readFileSync(join(isolated, '.env.local'), 'utf8'), /OTHER_VALUE=preservado/);
  assert.equal(statSync(join(isolated, '.env.local')).mode & 0o777, 0o600);
  assert.equal((await bootstrap.prepareLocalEncryption('http://127.0.0.1:3000', isolated)).key, undefined);
  delete process.env.INTEGRATION_ENCRYPTION_KEY;
  const unsafe = mkdtempSync(join(directory, 'unsafe-'));
  symlinkSync(join(isolated, '.env.local'), join(unsafe, '.env.local'));
  await assert.rejects(bootstrap.prepareLocalEncryption('http://127.0.0.1:3000', unsafe), { code: 'ENV_FILE_UNSAFE' });
  process.env.VERCEL = '1'; await assert.rejects(bootstrap.prepareLocalEncryption('http://127.0.0.1:3000', isolated), { code: 'LOCAL_BOOTSTRAP_ONLY' });
  delete process.env.VERCEL; process.env.INTEGRATION_ENCRYPTION_KEY = original; process.env.NODE_ENV = environment;
});
