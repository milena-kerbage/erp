import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHmac } from 'node:crypto';

delete process.env.DATABASE_URL;
delete process.env.VERCEL;
const folder = mkdtempSync(join(tmpdir(), 'mk-whatsapp-'));
Object.assign(process.env, {
  WHATSAPP_DB_PATH: join(folder, 'whatsapp.sqlite'), WHATSAPP_ACCESS_TOKEN: 'fake-token-for-unit-tests-only-12345',
  WHATSAPP_APP_SECRET: 'fake-app-secret-for-tests-12345', WHATSAPP_VERIFY_TOKEN: 'fake-verify-token-for-tests-12345',
  WHATSAPP_PHONE_NUMBER_ID: '123456789', WHATSAPP_BUSINESS_ACCOUNT_ID: '987654321', WHATSAPP_GRAPH_VERSION: 'v24.0',
  WHATSAPP_PUBLIC_BASE_URL: 'https://example.test', PUBLIC_BASE_URL: 'https://example.test',
  WHATSAPP_SUPPRESSION_SECRET: 'fake-suppression-secret-for-unit-tests-123456789', WHATSAPP_RETENTION_DAYS: '90',
  INTEGRATION_ENCRYPTION_KEY: Buffer.alloc(32, 11).toString('base64'),
});
const core = await import('../src/lib/whatsapp/core.ts');
const driver = await import('../src/lib/database.ts');
const managedConfig = await import('../src/lib/whatsapp/config.ts');
const phone = '5585999998888';
const now = () => Date.now();
const webhook = (messages = [], statuses = [], override = {}) => ({object: 'whatsapp_business_account', entry: [{id: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID, changes: [{field: 'messages', value: {metadata: {phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID}, contacts: [{wa_id: phone, profile: {name: 'Pessoa de teste'}}], messages, statuses, ...override}}]}]});
const incoming = (id = 'wamid.incoming', text = 'Olá', time = now()) => ({id, from: phone, timestamp: String(Math.floor(time / 1000)), type: 'text', text: {body: text}});
const consent = async () => (await core.setConsent({phone, status: 'granted', source: 'Autorização registrada pelo titular em formulário de teste.'}, 'operator-test'));
const readyContact = async () => { (await core.receiveWebhook(webhook([incoming()]))); (await consent()); };
const request = (id = 'request_test_123', text = 'Resposta autorizada') => ({phone, type: 'text', text, clientRequestId: id});
const response = value => new Response(JSON.stringify(value), {headers: {'content-type': 'application/json'}});
const reject = (promise, code) => assert.rejects(promise, error => error.code === code);

beforeEach(async () => {
  (await core.db().exec('DELETE FROM contacts; DELETE FROM webhook_events; DELETE FROM pending_statuses; DELETE FROM suppression; DELETE FROM metadata; DELETE FROM rate_limits; DELETE FROM deletion_audit; DELETE FROM integration_settings; DELETE FROM integration_audit;'));
});
after(async () => { (await core.closeDatabase()); rmSync(folder, {recursive: true, force: true}); });

test('configuração exige versão explícita e segredos apenas servidor', async () => {
  assert.equal(core.configuration().configured, true);
  const version = process.env.WHATSAPP_GRAPH_VERSION; delete process.env.WHATSAPP_GRAPH_VERSION;
  assert.equal(core.configuration().configured, false); process.env.WHATSAPP_GRAPH_VERSION = version;
  const base = process.env.PUBLIC_BASE_URL; process.env.PUBLIC_BASE_URL = 'https://user:password@example.test';
  assert.equal(core.configuration().configured, false); process.env.PUBLIC_BASE_URL = base;
  assert.equal(statSync(process.env.WHATSAPP_DB_PATH).mode & 0o777, 0o600);
});
test('desafio webhook valida modo/token e preserva challenge texto', async () => {
  const url = new URL(`https://example.test/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${process.env.WHATSAPP_VERIFY_TOKEN}&hub.challenge=123456`);
  assert.equal(core.verifyChallenge(url), '123456');
  url.searchParams.set('hub.verify_token', 'á'.repeat(process.env.WHATSAPP_VERIFY_TOKEN.length));
  assert.throws(() => core.verifyChallenge(url), error => error.code === 'INVALID_VERIFY_TOKEN');
});
test('HMAC valida bytes originais, rejeita tamper, ausência e segredo ausente', async () => {
  const bytes = Buffer.from('{ "texto":"ação" }');
  const signature = 'sha256=' + createHmac('sha256', process.env.WHATSAPP_APP_SECRET).update(bytes).digest('hex');
  assert.equal(core.signatureValid(bytes, signature), true);
  assert.equal(core.signatureValid(Buffer.from('{"texto":"ação"}'), signature), false);
  assert.equal(core.signatureValid(bytes, null), false);
  assert.equal(core.signatureValid(bytes, signature, ''), false);
  assert.equal(core.signatureValid(bytes, 'sha256=bad'), false);
});
test('recebimento idempotente, nomes reais, janela e replay persistem após reabrir SQLite', async () => {
  const payload = webhook([incoming()]);
  assert.deepEqual((await core.receiveWebhook(payload)), {processed: 1, ignored: 0});
  assert.equal((await core.conversation(phone)).name, 'Pessoa de teste');
  assert.equal((await core.conversation(phone)).unreadCount, 1);
  assert.ok(Date.parse((await core.conversation(phone)).serviceWindowExpiresAt) > now());
  (await core.closeDatabase());
  assert.deepEqual((await core.receiveWebhook(payload)), {processed: 0, ignored: 1});
  assert.equal((await core.messagesFor(phone)).messages.length, 1);
});
test('webhook ignora outra WABA ou número comercial e eventos antigos/futuros', async () => {
  const payload = webhook([incoming()]); payload.entry[0].id = 'different';
  assert.equal((await core.receiveWebhook(payload)).processed, 0);
  assert.equal((await core.receiveWebhook(webhook([incoming()], [], {metadata: {phone_number_id: 'different'}}))).processed, 0);
  assert.equal((await core.receiveWebhook(webhook([incoming('future', 'Olá', now() + core.DAY)]))).processed, 0);
  assert.equal((await core.receiveWebhook(webhook([incoming('old', 'Olá', now() - 91 * core.DAY)]))).processed, 0);
  assert.equal((await core.conversation(phone)), null);
});
test('mais nova mensagem abre janela; eventos atrasados nunca regressam o prazo', async () => {
  (await core.receiveWebhook(webhook([incoming('new', 'Olá', now()), incoming('late', 'Mais antiga', now() - core.DAY)])));
  assert.ok(Date.parse((await core.conversation(phone)).serviceWindowExpiresAt) > now());
});
test('texto bloqueia falta consent, optout e janela encerrada antes de fetch', async () => {
  let calls = 0; const fetcher = async () => { calls++; return response({messages: [{id: 'wamid.out'}]}); };
  (await core.receiveWebhook(webhook([incoming()])));
  await reject(core.sendMessage(request(), fetcher), 'CONSENT_REQUIRED');
  (await consent()); (await core.db().prepare('UPDATE contacts SET last_inbound = ? WHERE phone = ?').run(now() - core.DAY - 1, phone));
  await reject(core.sendMessage(request(), fetcher), 'WINDOW_CLOSED');
  (await core.setConsent({phone, status: 'revoked', source: 'Solicitação externa verificada pelo operador'}, 'operator-test'));
  await reject(core.sendMessage(request(), fetcher), 'OPTED_OUT'); assert.equal(calls, 0);
});
test('texto envia bearer/contrato oficial, ID remoto e repetições não reenviam', async () => {
  (await readyContact()); let calls = 0;
  const fetcher = async (url, options) => {
    calls++; assert.equal(url, 'https://graph.facebook.com/v24.0/123456789/messages');
    assert.equal(options.headers.Authorization, `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`);
    const body = JSON.parse(options.body);
    assert.equal(body.messaging_product, 'whatsapp'); assert.equal(body.to, phone); assert.equal(body.biz_opaque_callback_data, 'request_test_123');
    assert.deepEqual(body.text, {body: 'Resposta autorizada', preview_url: false});
    assert.equal(options.redirect, 'error'); return response({messages: [{id: 'wamid.out'}]});
  };
  const sent = await core.sendMessage(request(), fetcher);
  assert.equal(sent.message.id, 'wamid.out'); assert.equal(sent.message.status, 'accepted');
  assert.equal((await core.sendMessage(request(), fetcher)).duplicate, true);
  await reject(core.sendMessage(request('request_test_123', 'outro conteúdo'), fetcher), 'REQUEST_ID_CONFLICT'); assert.equal(calls, 1);
});
test('falha de rede fica ambígua durável e não provoca retry automático', async () => {
  (await readyContact()); let calls = 0;
  const fetcher = async () => { calls++; throw new Error('network'); };
  await reject(core.sendMessage(request(), fetcher), 'META_UNAVAILABLE');
  assert.equal((await core.messagesFor(phone)).messages.at(-1).status, 'unknown');
  await reject(core.sendMessage(request(), fetcher), 'SEND_ALREADY_STARTED'); assert.equal(calls, 1);
  (await core.receiveWebhook(webhook([], [{id: 'wamid.recovered', status: 'delivered', timestamp: String(Math.floor(now() / 1000)), biz_opaque_callback_data: 'request_test_123'}])));
  assert.equal((await core.messagesFor(phone)).messages.at(-1).id, 'wamid.recovered');
  assert.equal((await core.messagesFor(phone)).messages.at(-1).status, 'delivered');
});
test('Meta rejection fica failed e não expõe corpo/token de erro', async () => {
  (await readyContact());
  const fetcher = async () => new Response(JSON.stringify({error: {code: 190, message: process.env.WHATSAPP_ACCESS_TOKEN}}), {status: 401});
  await assert.rejects(core.sendMessage(request(), fetcher), error => error.code === 'META_REJECTED' && !error.message.includes(process.env.WHATSAPP_ACCESS_TOKEN));
  assert.equal((await core.messagesFor(phone)).messages.at(-1).status, 'failed');
});
test('status fora de ordem não regressa read; failed supera accepted/sent mas não delivered', async () => {
  (await readyContact()); await core.sendMessage(request(), async () => response({messages: [{id: 'wamid.out'}]}));
  const status = state => ({id: 'wamid.out', status: state, timestamp: String(Math.floor(now() / 1000))});
  (await core.receiveWebhook(webhook([], [status('failed')]))); assert.equal((await core.messagesFor(phone)).messages.at(-1).status, 'failed');
  (await core.receiveWebhook(webhook([], [status('sent')]))); assert.equal((await core.messagesFor(phone)).messages.at(-1).status, 'failed');
  (await core.receiveWebhook(webhook([], [status('read'), status('delivered'), status('failed')]))); assert.equal((await core.messagesFor(phone)).messages.at(-1).status, 'read');
});
test('status recebido antes de resposta HTTP é reconciliado sem regressão', async () => {
  (await readyContact());
  const fetcher = async () => {
    (await core.receiveWebhook(webhook([], [{id: 'wamid.fast', status: 'read', timestamp: String(Math.floor(now() / 1000)), biz_opaque_callback_data: 'request_test_123'}])));
    return response({messages: [{id: 'wamid.fast'}]});
  };
  assert.equal((await core.sendMessage(request(), fetcher)).message.status, 'read');
});
test('template approved funciona fora janela, parâmetros posicionais e paginação sem URLs externas', async () => {
  (await consent()); let gets = 0, sends = 0;
  const fetcher = async (url, options) => {
    if (options.method === 'POST') { sends++; assert.deepEqual(JSON.parse(options.body).template, {name: 'pedido_pronto', language: {code: 'pt_BR'}, components: [{type: 'body', parameters: [{type: 'text', text: '123'}]}]}); return response({messages: [{id: 'wamid.template'}]}); }
    gets++; assert.ok(url.startsWith('https://graph.facebook.com/v24.0/987654321/message_templates?'));
    if (gets === 1) return response({data: [], paging: {next: 'https://evil.test/should-not-be-used', cursors: {after: 'abc'}}});
    assert.ok(url.includes('after=abc'));
    return response({data: [{name: 'pedido_pronto', language: 'pt_BR', status: 'APPROVED', category: 'UTILITY', components: [{type: 'BODY', text: 'Seu pedido {{1}} está pronto.'}]}]});
  };
  const result = await core.sendMessage({phone, type: 'template', clientRequestId: 'template_request_1', template: {name: 'pedido_pronto', language: 'pt_BR', components: [{type: 'body', parameters: [{type: 'text', text: '123'}]}]}}, fetcher);
  assert.equal(result.message.status, 'accepted'); assert.equal(gets, 2); assert.equal(sends, 1);
});
test('template pendente, nomeado, header mídia e número incorreto parâmetros são bloqueados', async () => {
  (await consent()); const input = {phone, type: 'template', clientRequestId: 'template_request_1', template: {name: 'pedido_pronto', language: 'pt_BR'}};
  const template = {name: 'pedido_pronto', language: 'pt_BR', status: 'PENDING', category: 'UTILITY', components: [{type: 'BODY', text: 'Seu pedido {{1}} está pronto.'}]};
  await reject(core.sendMessage(input, async () => response({data: [template]})), 'TEMPLATE_NOT_APPROVED');
  template.status = 'APPROVED';
  await reject(core.sendMessage(input, async () => response({data: [template]})), 'TEMPLATE_PARAMETERS_MISMATCH');
  template.parameter_format = 'NAMED';
  await reject(core.sendMessage(input, async () => response({data: [template]})), 'UNSUPPORTED_TEMPLATE');
  delete template.parameter_format; template.components = [{type: 'HEADER', format: 'IMAGE'}];
  await reject(core.sendMessage(input, async () => response({data: [template]})), 'UNSUPPORTED_TEMPLATE');
});
test('read receipt envia ID inbound real e atualiza somente após sucesso', async () => {
  (await readyContact()); let calls = 0;
  const fetcher = async (_url, options) => { calls++; assert.deepEqual(JSON.parse(options.body), {messaging_product: 'whatsapp', status: 'read', message_id: 'wamid.incoming'}); return response({success: true}); };
  assert.equal((await core.conversation(phone)).unreadCount, 1);
  await core.markRead('wamid.incoming', fetcher); assert.equal((await core.conversation(phone)).unreadCount, 0);
  await core.markRead('wamid.incoming', fetcher); assert.equal(calls, 1);
  await reject(core.markRead('does-not-exist', fetcher), 'MESSAGE_NOT_FOUND');
});
test('leitura confirma um ID na Meta e limpa histórico local anterior somente após sucesso remoto', async () => {
  (await core.receiveWebhook(webhook([incoming('wamid.previous', 'Primeira', now() - 20_000), incoming('wamid.latest', 'Última')])));
  assert.equal((await core.unreadConversationCount()), 1);
  assert.equal((await core.conversation(phone)).unreadCount, 2);
  await reject(core.markRead('wamid.latest', async () => { throw new Error('offline'); }), 'META_UNAVAILABLE');
  assert.equal((await core.conversation(phone)).unreadCount, 2);
  let calls = 0;
  const result = await core.markRead('wamid.latest', async (_url, options) => { calls++; assert.equal(JSON.parse(options.body).message_id, 'wamid.latest'); return response({success: true}); });
  assert.equal(calls, 1); assert.ok(result.localHistoryReadThrough);
  assert.equal((await core.unreadConversationCount()), 0);
  assert.equal((await core.conversation(phone)).unreadCount, 0);
  assert.ok((await core.messagesFor(phone)).messages.every(message => message.isRead));
  (await core.receiveWebhook(webhook([incoming('wamid.delayed-before-read', 'Mensagem atrasada', now() - 10_000)])));
  assert.equal((await core.conversation(phone)).unreadCount, 1);
  await core.markRead('wamid.latest', async () => { throw new Error('Não deve repetir recibo já confirmado.'); });
  assert.equal((await core.conversation(phone)).unreadCount, 0);
});
test('contador de conversas não lidas é agregado exato e exclui optout', async () => {
  (await core.receiveWebhook(webhook(Array.from({length: 110}, (_, index) => ({...incoming(`unread-${index}`), from: `5585999${String(index).padStart(6, '0')}`})))));
  assert.equal((await core.conversations()).length, 100);
  assert.equal((await core.unreadConversationCount()), 110);
  (await core.setConsent({phone: '5585999000000', status: 'revoked', source: 'Titular pediu retirada de comunicações.'}, 'operator-test'));
  assert.equal((await core.unreadConversationCount()), 109);
});
test('optout retira contato ativo e suprime novos webhooks até novo consent comprovado', async () => {
  (await readyContact()); (await core.receiveWebhook(webhook([incoming('wamid.stop', 'SAIR')])));
  assert.equal((await core.conversation(phone)).consent.status, 'revoked'); assert.equal((await core.conversations()).length, 0);
  (await core.receiveWebhook(webhook([incoming('after-stop', 'Olá de novo')]))); assert.equal((await core.messagesFor(phone)).messages.length, 2);
  (await consent()); (await core.receiveWebhook(webhook([incoming('new-optin', 'Olá de novo')]))); assert.equal((await core.messagesFor(phone)).messages.length, 3);
});
test('exclusão remove dados pessoais relacionados e deixa somente supressão HMAC/auditoria hash', async () => {
  (await readyContact());
  assert.deepEqual((await core.deleteContact(phone, {actor: 'operator-test', verification: 'Titular verificado por atendimento humano.'})), {deleted: 1, suppressed: true});
  assert.equal((await core.conversation(phone)), null);
  assert.equal((await core.db().prepare('SELECT COUNT(*) AS n FROM messages').get()).n, 0);
  assert.equal((await core.db().prepare('SELECT COUNT(*) AS n FROM consent_audit').get()).n, 0);
  const tombstone = (await core.db().prepare('SELECT * FROM suppression').get()); assert.equal(tombstone.phone_hash.length, 64); assert.ok(!JSON.stringify(tombstone).includes(phone));
  assert.equal((await core.db().prepare('SELECT * FROM deletion_audit').get()).verification_hash.length, 64);
  assert.equal((await core.receiveWebhook(webhook([incoming('deleted-replay')]))).processed, 0);
});
test('retenção exclui históricos e provas antigos preservando bloqueio de recontato', async () => {
  (await readyContact()); (await core.setConsent({phone, status: 'revoked', source: 'Pedido de revogação validado'}, 'operator-test'));
  const future = now() + 91 * core.DAY;
  assert.equal((await core.pruneRetention(future)).messages, 1);
  assert.equal((await core.conversation(phone)), null);
  assert.equal((await core.db().prepare('SELECT COUNT(*) AS n FROM consent_audit').get()).n, 0);
  assert.equal((await core.db().prepare('SELECT COUNT(*) AS n FROM suppression').get()).n, 1);
});
test('cursor composto não perde mensagens no mesmo timestamp', async () => {
  (await core.receiveWebhook(webhook(Array.from({length: 5}, (_, index) => incoming(`same-second-${index}`)))));
  const first = (await core.messagesFor(phone, undefined, 2)), second = (await core.messagesFor(phone, first.nextBefore, 2)), third = (await core.messagesFor(phone, second.nextBefore, 2));
  const ids = [...first.messages, ...second.messages, ...third.messages].map(row => row.id);
  assert.equal(ids.length, 5); assert.equal(new Set(ids).size, 5); assert.equal(third.nextBefore, null);
});
test('limite persistente isolado por chave e tamanho real body', async () => {
  assert.equal((await core.limited('operator-1', 2)), false); assert.equal((await core.limited('operator-1', 2)), false);
  (await core.closeDatabase()); assert.equal((await core.limited('operator-1', 2)), true); assert.equal((await core.limited('operator-2', 2)), false);
  await reject(core.readBytes(new Request('https://example.test', {method: 'POST', body: 'x'.repeat(20)}), 10), 'BODY_TOO_LARGE');
});
test('mídia usa URL Meta autorizada, valida hash e rejeita SSRF/redirect/tamanho', async () => {
  const bytes = Buffer.from('arquivo de teste');
  const media = {id: 'wamid.media', from: phone, timestamp: String(Math.floor(now() / 1000)), type: 'document', document: {id: '11111111', mime_type: 'application/pdf', filename: 'nome.pdf'}};
  (await core.receiveWebhook(webhook([media]))); let calls = 0;
  const fetcher = async (url, options) => {
    calls++; assert.equal(options.redirect, 'error');
    if (calls === 1) { assert.ok(url.includes('11111111?phone_number_id=123456789')); return response({url: 'https://lookaside.fbsbx.com/whatsapp/file', mime_type: 'application/pdf', sha256: core.digest(bytes)}); }
    assert.equal(url, 'https://lookaside.fbsbx.com/whatsapp/file'); assert.equal(options.headers.Authorization, `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`); return new Response(bytes);
  };
  assert.deepEqual((await core.downloadMedia('wamid.media', fetcher)).bytes, bytes);
  let base64Calls = 0;
  const base64Fetcher = async () => ++base64Calls === 1 ? response({url: 'https://lookaside.fbsbx.com/file', mime_type: 'application/pdf', sha256: Buffer.from(core.digest(bytes), 'hex').toString('base64')}) : new Response(bytes);
  assert.deepEqual((await core.downloadMedia('wamid.media', base64Fetcher)).bytes, bytes);
  let mismatchCalls = 0;
  await reject(core.downloadMedia('wamid.media', async () => ++mismatchCalls === 1 ? response({url: 'https://lookaside.fbsbx.com/file', mime_type: 'application/pdf', sha256: 'a'.repeat(64)}) : new Response(bytes)), 'MEDIA_INTEGRITY_ERROR');
  await reject(core.downloadMedia('wamid.media', async () => response({url: 'http://127.0.0.1/internal', mime_type: 'application/pdf'})), 'INVALID_MEDIA_URL');
  await reject(core.downloadMedia('wamid.media', async () => response({url: 'https://lookaside.fbsbx.com/file', mime_type: 'application/pdf', file_size: 17 * 1024 * 1024})), 'MEDIA_TOO_LARGE');
});
test('Vercel impede SQLite e aplica limite de mídia de 3 MiB', async () => {
  process.env.VERCEL = '1';
  try {
    assert.equal(core.mediaMaximumBytes(), 3 * 1024 * 1024);
    assert.equal(core.configuration().configured, false);
    assert.equal(driver.storageConfiguration().configured, false);
    assert.throws(() => core.db(), error => error.code === 'DATABASE_NOT_CONFIGURED');
  } finally { delete process.env.VERCEL; }
  assert.equal(core.mediaMaximumBytes(), 16 * 1024 * 1024);
});
test('parâmetros PostgreSQL preservam strings, identificadores e comentários SQL', async () => {
  const source = `SELECT ?, '?', "?", $$?$$, $tag$?$tag$ /* ? */ -- ?\n, ?, 'it''s ?'`;
  assert.equal(driver.postgresParameters(source), `SELECT $1, '?', "?", $$?$$, $tag$?$tag$ /* ? */ -- ?\n, $2, 'it''s ?'`);
});
test('adapter serializa transações SQLite com awaits e reverte alterações em erro', async () => {
  const database = driver.databaseFor('whatsapp', join(folder, 'adapter.sqlite'), 'CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, value INTEGER NOT NULL);');
  try {
    await assert.rejects(database.transaction(async () => { await database.prepare('INSERT INTO jobs VALUES (?, ?)').run('rollback', 1); throw new Error('rollback-intencional'); }), /rollback-intencional/);
    assert.equal((await database.prepare('SELECT COUNT(*) AS count FROM jobs').get()).count, 0);
    await Promise.all(['first', 'second'].map(id => database.transaction(async () => { await database.prepare('INSERT INTO jobs VALUES (?, ?)').run(id, 1); await new Promise(resolve => setTimeout(resolve, 5)); await database.prepare('UPDATE jobs SET value = greatest(value, ?) WHERE id = ?').run(2, id); })));
    assert.equal((await database.prepare('SELECT COUNT(*) AS count FROM jobs WHERE value = 2').get()).count, 2);
    await assert.rejects(database.prepare('SELECT * FROM missing_private_table').all(), error => error.code === 'DATABASE_UNAVAILABLE' && !error.message.includes('missing_private_table'));
  } finally { await database.close(); }
});
test('configuração do gestor salva segredos cifrados, preserva campos vazios e nunca revela em GET/auditoria', async () => {
  const accessToken = 'fake-management-token-sensitive-test-123456';
  const returned = await managedConfig.saveSettings({values: {graphVersion: 'v25.0', appId: '111222333', retentionDays: 45, legalPrivacyEmail: 'privacidade@example.test'}, secrets: {accessToken}}, 'manager-test');
  assert.equal(returned.values.graphVersion, 'v25.0');
  assert.equal(returned.secrets.accessToken.configured, true);
  assert.equal(returned.secrets.accessToken.source, 'database');
  assert.ok(!JSON.stringify(returned).includes(accessToken));
  const row = await core.db().prepare('SELECT * FROM integration_settings WHERE key = ?').get('accessToken');
  assert.equal(row.encrypted, 1); assert.ok(!row.value.includes(accessToken));
  const audit = await core.db().prepare('SELECT * FROM integration_audit').all();
  assert.equal(audit.length, 1); assert.ok(!JSON.stringify(audit).includes(accessToken));
  await managedConfig.saveSettings({secrets: {accessToken: '   '}}, 'manager-test');
  assert.equal((await core.effectiveConfiguration()).accessToken, accessToken);
  assert.equal((await core.effectiveConfiguration()).retentionDays, 45);
  assert.equal((await managedConfig.effectiveLegalFields()).privacyEmail, 'privacidade@example.test');
  let headers;
  await core.graph('123456789/messages', {method: 'POST', body: '{}'}, async (_url, options) => { headers = options.headers; return response({success: true}); });
  assert.equal(headers.Authorization, `Bearer ${accessToken}`);
});
test('remoção explícita desabilita segredo efetivo mesmo quando existe fallback no ambiente', async () => {
  await managedConfig.saveSettings({removeSecrets: ['accessToken']}, 'manager-test');
  assert.equal((await core.effectiveConfiguration()).accessToken, '');
  assert.equal((await managedConfig.sanitizedSettings()).secrets.accessToken.configured, false);
  await reject(core.graph('123456789/messages', {}, async () => response({success: true})), 'NOT_CONFIGURED');
});
test('AES-GCM falha fechado com chave errada, envelope adulterado ou troca de campos', async () => {
  await managedConfig.saveSettings({secrets: {appSecret: 'fake-managed-app-secret-test-12345', accessToken: 'fake-managed-access-token-test-12345'}}, 'manager-test');
  const original = process.env.INTEGRATION_ENCRYPTION_KEY;
  process.env.INTEGRATION_ENCRYPTION_KEY = Buffer.alloc(32, 12).toString('base64');
  try { await reject(managedConfig.effectiveConfiguration(), 'ENCRYPTION_DECRYPT_FAILED'); }
  finally { process.env.INTEGRATION_ENCRYPTION_KEY = original; }
  const envelope = await core.db().prepare('SELECT value FROM integration_settings WHERE key = ?').get('appSecret');
  await core.db().prepare('UPDATE integration_settings SET value = ? WHERE key = ?').run(envelope.value, 'accessToken');
  await reject(managedConfig.effectiveConfiguration(), 'ENCRYPTION_DECRYPT_FAILED');
  assert.equal((await managedConfig.effectiveLegalFields()).entity, 'Milena Cavalcante Kerbage');
});
test('gera apenas tokens locais, resposta única não reaparece em config e webhook usa override', async () => {
  const generated = await managedConfig.generateSecret('verifyToken', 'manager-test');
  assert.match(generated.secret, /^[a-f0-9]{64}$/); assert.equal(generated.stored, true);
  assert.ok(!JSON.stringify(await managedConfig.sanitizedSettings()).includes(generated.secret));
  const url = new URL(`https://example.test/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${generated.secret}&hub.challenge=managed-challenge`);
  assert.equal(await core.verifyEffectiveChallenge(url), 'managed-challenge');
  await reject(managedConfig.generateSecret('accessToken', 'manager-test'), 'INVALID_GENERATED_SECRET');
  await reject(managedConfig.generateSecret('appSecret', 'manager-test'), 'INVALID_GENERATED_SECRET');
  await reject(managedConfig.generateSecret('suppressionSecret', 'manager-test'), 'SUPPRESSION_ROTATION_BLOCKED');
  const appSecret = 'fake-managed-signing-secret-test-12345';
  await managedConfig.saveSettings({secrets: {appSecret}}, 'manager-test');
  const bytes = Buffer.from('{"managed":true}');
  const signature = 'sha256=' + createHmac('sha256', appSecret).update(bytes).digest('hex');
  assert.equal(await core.effectiveSignatureValid(bytes, signature), true);
  assert.equal(core.signatureValid(bytes, signature), false);
});
test('criptografia bootstrap ausente impede salvar segredo sem gravar texto puro; campos inválidos não entram', async () => {
  const original = process.env.INTEGRATION_ENCRYPTION_KEY; delete process.env.INTEGRATION_ENCRYPTION_KEY;
  try { await reject(managedConfig.saveSettings({secrets: {accessToken: 'fake-managed-access-token-test-12345'}}, 'manager-test'), 'ENCRYPTION_NOT_CONFIGURED'); }
  finally { process.env.INTEGRATION_ENCRYPTION_KEY = original; }
  assert.equal((await core.db().prepare('SELECT COUNT(*) AS count FROM integration_settings').get()).count, 0);
  await reject(managedConfig.saveSettings({values: {publicBaseUrl: 'https://secret:password@example.test/path'}}, 'manager-test'), 'INVALID_PUBLIC_URL');
  await reject(managedConfig.saveSettings({values: {databaseUrl: 'secret'}}, 'manager-test'), 'INVALID_CONFIG_FIELD');
  await reject(managedConfig.saveSettings({values: {retentionDays: 0}}, 'manager-test'), 'INVALID_RETENTION');
  await reject(managedConfig.saveSettings({secrets: {suppressionSecret: 'new-key-prohibited-1234567890123456789'}}, 'manager-test'), 'SUPPRESSION_ROTATION_BLOCKED');
});
test('gestor gera chave de supressão no primeiro uso e ela passa a proteger revogações', async () => {
  const previous = process.env.WHATSAPP_SUPPRESSION_SECRET; delete process.env.WHATSAPP_SUPPRESSION_SECRET;
  try {
    const result = await managedConfig.generateSecret('suppressionSecret', 'manager-test');
    assert.match(result.secret, /^[a-f0-9]{64}$/);
    assert.equal((await managedConfig.sanitizedSettings()).secrets.suppressionSecret.source, 'database');
    await core.setConsent({phone, status: 'revoked', source: 'Titular pediu interrupção em teste gerencial.'}, 'manager-test');
    const row = await core.db().prepare('SELECT phone_hash FROM suppression').get();
    assert.equal(row.phone_hash, createHmac('sha256', result.secret).update(phone).digest('hex'));
    await reject(managedConfig.generateSecret('suppressionSecret', 'manager-test'), 'SUPPRESSION_ROTATION_BLOCKED');
  } finally { process.env.WHATSAPP_SUPPRESSION_SECRET = previous; }
});
