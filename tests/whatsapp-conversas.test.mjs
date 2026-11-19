import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Conversas no padrão da Le Ange: abas, fixar, favoritar por pessoa, arquivar, não lida, etiquetas, busca no histórico,
// resposta citada, reações, mídia (upload à Meta), nova tentativa após recusa, leitura ao abrir e revisão leve.
// SQLite temporário por padrão; com CONVERSAS_TEST_POSTGRES=1, PostgreSQL em WASM (PGlite) com as migrações reais.
const postgres = process.env.CONVERSAS_TEST_POSTGRES === '1';
let engine, socket;
delete process.env.VERCEL;
process.env.MEDIA_STORAGE_DRIVER = 'database';
if (postgres) {
  const { PGlite } = await import('@electric-sql/pglite');
  const { PGLiteSocketServer } = await import('@electric-sql/pglite-socket');
  const { readFile } = await import('node:fs/promises');
  engine = await PGlite.create();
  const port = Number(process.env.CONVERSAS_POSTGRES_TEST_PORT || 55451);
  socket = new PGLiteSocketServer({ db: engine, host: '127.0.0.1', port });
  await engine.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  for (const file of ['002_whatsapp.sql', '004_integration_settings.sql', '017_whatsapp_conversas.sql']) await engine.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  await socket.start();
  process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
  process.env.DATABASE_SSL_MODE = 'disable';
  process.env.NODE_ENV = 'test';
} else { delete process.env.DATABASE_URL; process.env.ALLOW_LOCAL_SQLITE = 'true'; }
const folder = mkdtempSync(join(tmpdir(), 'mk-conversas-'));
Object.assign(process.env, {
  WHATSAPP_DB_PATH: join(folder, 'whatsapp.sqlite'), WHATSAPP_ACCESS_TOKEN: 'fake-token-for-unit-tests-only-12345',
  WHATSAPP_APP_SECRET: 'fake-app-secret-for-tests-12345', WHATSAPP_VERIFY_TOKEN: 'fake-verify-token-for-tests-12345',
  WHATSAPP_PHONE_NUMBER_ID: '123456789', WHATSAPP_BUSINESS_ACCOUNT_ID: '987654321', WHATSAPP_GRAPH_VERSION: 'v24.0',
  WHATSAPP_PUBLIC_BASE_URL: 'https://example.test', PUBLIC_BASE_URL: 'https://example.test',
  WHATSAPP_SUPPRESSION_SECRET: 'fake-suppression-secret-for-unit-tests-123456789', WHATSAPP_RETENTION_DAYS: '90',
  INTEGRATION_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
});
const core = await import('../src/lib/whatsapp/core.ts');
const midia = await import('../src/lib/whatsapp/midia.ts');
const driver = await import('../src/lib/database.ts');
after(async () => { await driver.closeDatabases(); if (socket) await socket.stop(); if (engine) await engine.close(); rmSync(folder, { recursive: true, force: true }); });

const A = '5585911110001', B = '5585911110002', C = '5585911110003';
const segundos = (ms) => String(Math.floor((Date.now() - ms) / 1000));
const evento = (field, value) => ({ object: 'whatsapp_business_account', entry: [{ id: '987654321', changes: [{ field, value: { metadata: { phone_number_id: '123456789' }, ...value } }] }] });
const mensagem = (de, id, texto, atras = 0, extra = {}) => evento('messages', { contacts: [{ wa_id: de, profile: { name: `Contato ${de.slice(-1)}` } }], messages: [{ from: de, id, timestamp: segundos(atras), type: 'text', text: { body: texto }, ...extra }] });
const json = (valor, status = 200) => new Response(JSON.stringify(valor), { status, headers: { 'content-type': 'application/json' } });

test('abas, fixar, favoritar por pessoa, arquivar, não lida, etiquetas e revisão', async () => {
  await core.receiveWebhook(mensagem(A, 'wamid.a1', 'Quero o kit berço Jardim rosê', 3000));
  await core.receiveWebhook(mensagem(B, 'wamid.b1', 'Bom dia', 2000));
  await core.receiveWebhook(mensagem(C, 'wamid.c1', 'Obrigada!', 1000));
  const revisao = await core.currentRevision();
  let lista = (await core.conversations({ userId: 'u1' })).conversations;
  assert.deepEqual(lista.map((c) => c.phone), [C, B, A], 'mais recente primeiro');
  await core.updateConversation(A, { fixar: true, favoritar: true, etiquetas: ['Orçamento', ' Orçamento ', 'Kit berço'] }, 'u1');
  assert.notEqual(await core.currentRevision(), revisao, 'organizar avança a revisão');
  lista = (await core.conversations({ userId: 'u1' })).conversations;
  assert.equal(lista[0].phone, A, 'fixada vai para o topo');
  assert.equal(lista[0].starred, true); assert.deepEqual(lista[0].labels, ['Orçamento', 'Kit berço']);
  assert.equal((await core.conversations({ userId: 'u2' })).conversations.find((c) => c.phone === A).starred, false, 'favorito é por pessoa');
  assert.deepEqual((await core.conversations({ userId: 'u1', aba: 'favoritas' })).conversations.map((c) => c.phone), [A]);
  assert.deepEqual((await core.conversations({ userId: 'u1', etiqueta: 'Kit berço' })).conversations.map((c) => c.phone), [A]);
  await core.updateConversation(B, { arquivar: true }, 'u1');
  assert.ok(!(await core.conversations({ userId: 'u1' })).conversations.some((c) => c.phone === B), 'arquivada sai de Todas');
  assert.deepEqual((await core.conversations({ userId: 'u1', aba: 'arquivadas' })).conversations.map((c) => c.phone), [B]);
  await core.receiveWebhook(mensagem(B, 'wamid.b2', 'Voltei!', 0));
  assert.ok((await core.conversations({ userId: 'u1' })).conversations.some((c) => c.phone === B), 'mensagem nova desarquiva');
  await core.markConversationRead(C, async () => json({ success: true }));
  await core.updateConversation(C, { naoLida: true }, 'u1');
  const c = (await core.conversations({ userId: 'u1', aba: 'nao_lidas' })).conversations.find((item) => item.phone === C);
  assert.equal(c.markedUnread, true); assert.equal(c.unreadCount, 1);
  await core.markConversationRead(C, async () => json({ success: true }));
  assert.ok(!(await core.conversations({ userId: 'u1', aba: 'nao_lidas' })).conversations.some((item) => item.phone === C), 'abrir tira o "não lida"');
  assert.deepEqual(await core.allLabels(), ['Kit berço', 'Orçamento']);
});

test('busca no histórico (sem acento) devolve o trecho; telefone e nome também acham', async () => {
  const resultado = (await core.conversations({ userId: 'u1', busca: 'JARDIM ROSE' })).conversations;
  assert.equal(resultado.length, 1); assert.equal(resultado[0].phone, A);
  assert.match(resultado[0].match ?? '', /Jardim rosê/);
  assert.equal((await core.conversations({ userId: 'u1', busca: '1110002' })).conversations[0].phone, B);
});

test('resposta citada e reações (do contato e da equipe)', async () => {
  await core.receiveWebhook(mensagem(A, 'wamid.a2', 'Qual o prazo?', 0, { context: { id: 'wamid.a1' } }));
  let { messages } = await core.messagesFor(A);
  const citada = messages.find((m) => m.id === 'wamid.a2');
  assert.deepEqual(citada.replyTo, { id: 'wamid.a1', text: 'Quero o kit berço Jardim rosê', type: 'text', direction: 'inbound' });
  await core.receiveWebhook(evento('messages', { messages: [{ from: A, id: 'wamid.r1', timestamp: segundos(0), type: 'reaction', reaction: { message_id: 'wamid.a1', emoji: '❤️' } }] }));
  ({ messages } = await core.messagesFor(A));
  assert.deepEqual(messages.find((m) => m.id === 'wamid.a1').reactions.map((r) => [r.emoji, r.from]), [['❤️', 'contact']]);
  assert.ok(!messages.some((m) => m.id === 'wamid.r1'), 'reação não vira mensagem');
  let corpo;
  await core.sendReaction(A, 'wamid.a1', '👍', async (_url, opcoes) => { corpo = JSON.parse(opcoes.body); return json({ messages: [{ id: 'x' }] }); });
  assert.deepEqual(corpo.reaction, { message_id: 'wamid.a1', emoji: '👍' });
  ({ messages } = await core.messagesFor(A));
  assert.deepEqual(messages.find((m) => m.id === 'wamid.a1').reactions.map((r) => r.from).sort(), ['contact', 'me']);
});

test('texto respondendo uma mensagem vai com context; recusa da Meta permite "tentar de novo" com a mesma chave', async () => {
  let corpo;
  await assert.rejects(core.sendMessage({ phone: A, type: 'text', text: 'Fica pronto em 15 dias', clientRequestId: 'chave_resposta_1', replyTo: 'wamid.a2', author: 'u1' }, async () => json({ error: { code: 131000 } }, 400)), (e) => e.code === 'META_REJECTED');
  const { message } = await core.sendMessage({ phone: A, type: 'text', text: 'Fica pronto em 15 dias', clientRequestId: 'chave_resposta_1', replyTo: 'wamid.a2', author: 'u1' }, async (_url, opcoes) => { corpo = JSON.parse(opcoes.body); return json({ messages: [{ id: 'wamid.out1' }] }); });
  assert.deepEqual(corpo.context, { message_id: 'wamid.a2' });
  assert.equal(message.id, 'wamid.out1'); assert.equal(message.author, 'u1'); assert.equal(message.replyTo.id, 'wamid.a2');
  const { messages } = await core.messagesFor(A);
  assert.equal(messages.filter((m) => m.text === 'Fica pronto em 15 dias').length, 1, 'a tentativa recusada não fica duplicada');
});

test('mídia: valida tipo e assinatura, envia à Meta e manda a mensagem com o id; nota de voz vai com voice', async () => {
  const ogg = Buffer.concat([Buffer.from('OggS'), Buffer.alloc(200, 1)]);
  await assert.rejects(midia.enviarMidia({ phone: A, tipo: 'audio', mime: 'audio/webm', clientRequestId: 'chave_audio_0' }, 'u1', { bytes: ogg, nome: 'a.webm' }), (e) => e.code === 'UNSUPPORTED_MEDIA');
  await assert.rejects(midia.enviarMidia({ phone: A, tipo: 'image', mime: 'image/jpeg', clientRequestId: 'chave_foto_0' }, 'u1', { bytes: ogg, nome: 'a.jpg' }), (e) => e.code === 'MEDIA_SIGNATURE');
  const chamadas = [];
  const resultado = await midia.enviarMidia({ phone: A, tipo: 'audio', mime: 'audio/ogg', voice: true, duration: 7, clientRequestId: 'chave_audio_1' }, 'u1', { bytes: ogg, nome: 'nota-de-voz.ogg' }, async (url, opcoes) => {
    chamadas.push(String(url));
    if (String(url).endsWith('/media')) { assert.ok(opcoes.body instanceof FormData); return json({ id: '1234567890' }); }
    const corpo = JSON.parse(opcoes.body);
    assert.deepEqual(corpo.audio, { id: '1234567890', voice: true });
    return json({ messages: [{ id: 'wamid.voz1' }] });
  });
  assert.deepEqual(chamadas.map((u) => u.split('/').slice(-1)[0]), ['media', 'messages']);
  assert.equal(resultado.message.type, 'audio'); assert.equal(resultado.message.voice, true); assert.equal(resultado.message.duration, 7); assert.equal(resultado.message.hasMedia, true);
  await assert.rejects(midia.prepararEnvio({ phone: A, tipo: 'video', mime: 'video/mp4', size: 17 * 1024 * 1024 }), (e) => e.code === 'MEDIA_TOO_LARGE');
  assert.equal((await midia.prepararEnvio({ phone: A, tipo: 'image', mime: 'image/jpeg', size: 1000 })).modo, 'direto', 'sem R2, envio direto');
});

test('mídia do celular e do histórico guarda o id para baixar depois; respostas rápidas', async () => {
  await core.receiveWebhook(evento('smb_message_echoes', { message_echoes: [{ from: '558599990000', to: A, id: 'wamid.eco-foto', timestamp: segundos(0), type: 'image', image: { id: '99887766', mime_type: 'image/jpeg', caption: 'Olha o bordado' } }] }));
  const { messages } = await core.messagesFor(A);
  const foto = messages.find((m) => m.id === 'wamid.eco-foto');
  assert.equal(foto.mediaId, '99887766'); assert.equal(foto.hasMedia, true); assert.equal(foto.text, 'Olha o bordado');
  await core.saveQuickReply({ shortcut: '/Prazo', body: 'Oi, {nome}! 15 a 25 dias úteis.' });
  await assert.rejects(core.saveQuickReply({ shortcut: 'prazo', body: 'outro' }), (e) => e.code === 'DUPLICATE_SHORTCUT');
  const lista = await core.quickReplies();
  assert.deepEqual(lista.map((r) => r.shortcut), ['prazo']);
  assert.deepEqual(await core.deleteQuickReply(lista[0].id), []);
});
