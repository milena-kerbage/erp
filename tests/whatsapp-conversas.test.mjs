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
  for (const file of ['002_whatsapp.sql', '004_integration_settings.sql', '017_whatsapp_conversas.sql', '018_whatsapp_atendimento.sql']) await engine.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  await socket.start();
  process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
  process.env.DATABASE_SSL_MODE = 'disable';
  process.env.NODE_ENV = 'test';
} else { delete process.env.DATABASE_URL; process.env.ALLOW_LOCAL_SQLITE = 'true'; }
const folder = mkdtempSync(join(tmpdir(), 'mk-conversas-'));
Object.assign(process.env, {
  WHATSAPP_DB_PATH: join(folder, 'whatsapp.sqlite'), ERP_DB_PATH: join(folder, 'erp.sqlite'), AUTH_DB_PATH: join(folder, 'auth.sqlite'), WHATSAPP_ACCESS_TOKEN: 'fake-token-for-unit-tests-only-12345',
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
  assert.deepEqual(lista.map((c) => c.phone), [A, B, C], 'quem espera a equipe há mais tempo vem primeiro');
  assert.ok(lista.every((c) => c.waitingSince && c.isNew && c.status === 'aberta'), 'escreveu ao vivo e ninguém respondeu: aguardando e novo');
  await core.updateConversation(A, { fixar: true, favoritar: true, etiquetas: ['Orçamento', ' Orçamento ', 'Kit berço'] }, 'u1');
  assert.notEqual(await core.currentRevision(), revisao, 'organizar avança a revisão');
  lista = (await core.conversations({ userId: 'u1' })).conversations;
  assert.equal(lista[0].phone, A, 'fixada vai para o topo');
  assert.equal(lista[0].starred, true); assert.deepEqual(lista[0].labels, ['Orçamento', 'Kit berço']);
  assert.equal((await core.conversations({ userId: 'u2' })).conversations.find((c) => c.phone === A).starred, false, 'favorito é por pessoa');
  assert.deepEqual((await core.conversations({ userId: 'u1', aba: 'favoritas' })).conversations.map((c) => c.phone), [A]);
  assert.deepEqual((await core.conversations({ userId: 'u1', etiqueta: 'Kit berço' })).conversations.map((c) => c.phone), [A]);
  await core.updateConversation(B, { arquivar: true }, 'u1');
  assert.ok(!(await core.conversations({ userId: 'u1' })).conversations.some((c) => c.phone === B), 'arquivada (resolvida) sai de Todas');
  assert.deepEqual((await core.conversations({ userId: 'u1', aba: 'resolvidas' })).conversations.map((c) => c.status), ['resolvida']);
  assert.deepEqual((await core.conversations({ userId: 'u1', aba: 'arquivadas' })).conversations.map((c) => c.phone), [B]);
  await core.receiveWebhook(mensagem(B, 'wamid.b2', 'Voltei!', 0));
  assert.equal((await core.conversations({ userId: 'u1' })).conversations.find((c) => c.phone === B)?.status, 'aberta', 'mensagem nova reabre a conversa');
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

const D = '5585911110004', E = '5585911110005', F = '5585911110006';
const eco = (para, id, texto, atras = 0) => evento('smb_message_echoes', { message_echoes: [{ to: para, id, timestamp: segundos(atras), type: 'text', text: { body: texto } }] });

test('atendimento: aguardando a equipe, responsável, nota interna, situação, filtros, fechar em massa e exportação', async () => {
  await core.receiveWebhook(mensagem(D, 'wamid.d1', 'Vocês fazem kit cama de solteiro?', 5000));
  await core.receiveWebhook(mensagem(E, 'wamid.e1', 'Qual o prazo?', 4000));
  // Histórico importado do celular: entra lido, sem abrir a janela e sem pôr ninguém na fila de espera.
  await core.receiveWebhook(evento('history', { history: [{ metadata: { phase: 0, chunk_order: 1, progress: 100 }, threads: [{ id: F, messages: [{ from: F, id: 'wamid.f1', timestamp: segundos(86_400_000), type: 'text', text: { body: 'Mensagem antiga do celular' } }] }] }] }));
  const de = async (phone, filtro = {}) => (await core.conversations({ userId: 'u1', limit: 200, ...filtro })).conversations.find((c) => c.phone === phone);
  assert.ok((await de(D)).waitingSince, 'cliente escreveu ao vivo: aguardando a equipe');
  assert.equal((await de(F)).waitingSince, null, 'histórico importado não entra na espera');
  assert.equal((await de(F)).isNew, false);
  const antes = (await core.conversations({ userId: 'u1' })).counts;
  assert.ok(antes.aguardando >= 2 && antes.nao_lidas >= 2, 'os números dos recortes vêm na primeira página');

  // Nota interna: fica na conversa, aparece na prévia, mas não conta como resposta nem vai para a Meta.
  let chamadas = 0;
  const nota = await core.addNote({ phone: D, text: ' Quer em linho; retornar até sexta ', clientRequestId: 'nota-d-0001' }, 'u1');
  assert.equal(nota.message.type, 'note'); assert.equal(nota.message.text, 'Quer em linho; retornar até sexta'); assert.equal(nota.message.author, 'u1');
  await core.addNote({ phone: D, text: 'Quer em linho; retornar até sexta', clientRequestId: 'nota-d-0001' }, 'u1');
  assert.equal((await core.messagesFor(D, undefined, 50, 'u1')).messages.filter((m) => m.type === 'note').length, 1, 'a mesma chave não duplica a nota');
  let d = await de(D);
  assert.equal(d.lastType, 'note'); assert.ok(d.waitingSince, 'a nota não tira o cliente da espera'); assert.equal(d.lastFromContact, true);
  await assert.rejects(() => core.addNote({ phone: D, text: '   ' }, 'u1'), (e) => e.code === 'INVALID_NOTE');
  // Responder a uma nota não vira "context" para a Meta (a nota não existe lá).
  await core.sendMessage({ phone: D, type: 'text', text: 'Fazemos sim!', clientRequestId: 'resposta-d-0001', replyTo: nota.message.id, author: 'u1' }, async (_url, init) => { chamadas++; assert.equal(JSON.parse(init.body).context, undefined); return json({ messages: [{ id: 'wamid.d2' }] }); });
  assert.equal(chamadas, 1);
  d = await de(D);
  assert.equal(d.waitingSince, null, 'a equipe respondeu: sai da espera'); assert.equal(d.isNew, false); assert.equal(d.lastFromContact, false);
  assert.ok(await de(D, { resposta: 'respondida' })); assert.equal(await de(D, { resposta: 'sem-resposta' }), undefined);
  assert.ok(await de(E, { resposta: 'sem-resposta' }));

  // Responsável: assume, aparece em "Minhas", sai de "Aguardando" e deixa o registro na conversa.
  await core.updateConversation(E, { responsavel: 'u1' }, 'u1', 'Maria Souza');
  assert.equal((await de(E)).assignee, 'u1');
  assert.ok(await de(E, { aba: 'minhas' })); assert.equal(await de(E, { aba: 'aguardando' }), undefined, 'com responsável, segue em Minhas');
  assert.equal(await de(E, { userId: 'u2', aba: 'minhas' }), undefined);
  assert.ok(await de(E, { responsaveis: ['u1'] })); assert.equal(await de(E, { responsaveis: [''] }), undefined); assert.ok(await de(D, { responsaveis: [''] }), '"" é sem responsável');
  await core.updateConversation(E, { responsavel: 'u2', responsavelNome: 'Ana Lima' }, 'u1', 'Maria Souza');
  let eventos = (await core.messagesFor(E, undefined, 50, 'u1')).messages.filter((m) => m.type === 'system').map((m) => m.text);
  assert.deepEqual(eventos, ['Maria assumiu a conversa', 'Maria passou a conversa para Ana Lima']);
  assert.equal((await de(E)).lastMessage, 'Qual o prazo?', 'evento do sistema não vira prévia da lista');
  await assert.rejects(() => core.updateConversation(E, { responsavel: 'id inválido!' }, 'u1'), (e) => e.code === 'INVALID_ASSIGNEE');

  // Situação: aguardando o cliente, resolvida (sai da lista) e reaberta quando o cliente escreve.
  await assert.rejects(() => core.updateConversation(D, { situacao: 'fechada' }, 'u1'), (e) => e.code === 'INVALID_STATUS');
  await core.updateConversation(D, { situacao: 'aguardando' }, 'u1', 'Maria Souza');
  assert.equal((await de(D)).status, 'aguardando'); assert.ok(await de(D, { situacoes: ['aguardando'] })); assert.equal(await de(D, { situacoes: ['aberta'] }), undefined);
  await core.updateConversation(D, { fixar: true, situacao: 'resolvida' }, 'u1', 'Maria Souza');
  assert.equal(await de(D), undefined, 'resolvida sai da lista do dia a dia');
  d = await de(D, { aba: 'resolvidas' });
  assert.equal(d.status, 'resolvida'); assert.equal(d.pinned, false, 'resolver desafixa');
  assert.ok(await de(D, { situacoes: ['resolvida'] })); assert.ok(await de(D, { busca: 'solteiro' }), 'a busca acha as resolvidas');
  // O carimbo do webhook vem em segundos: 2 s à frente fazem a mensagem entrar agora, depois do que a equipe acabou de enviar.
  await core.receiveWebhook(mensagem(D, 'wamid.d3', 'Obrigada! E o frete?', -2000));
  d = await de(D);
  assert.equal(d.status, 'aberta', 'cliente escreveu de novo: reabre'); assert.ok(d.waitingSince); assert.equal(d.isNew, false, 'já teve resposta: não é "novo"');
  eventos = (await core.messagesFor(D, undefined, 50, 'u1')).messages.filter((m) => m.type === 'system').map((m) => m.text);
  assert.deepEqual(eventos, ['Maria marcou como aguardando o cliente', 'Maria resolveu a conversa']);

  // Janela de 24h e período.
  assert.ok(await de(D, { janela: 'aberta' })); assert.equal(await de(F, { janela: 'aberta' }), undefined); assert.ok(await de(F, { janela: 'fechada' }));
  assert.ok(await de(D, { periodo: 'hoje' })); assert.equal(await de(F, { periodo: 'hoje' }), undefined); assert.ok(await de(F, { periodo: '7d' }));
  assert.ok(await de(D, { soFixadas: false })); assert.equal(await de(E, { soFixadas: true }), undefined);

  // Fechar em massa: só as abertas contam; telefone inválido é ignorado.
  const fechadas = await core.resolveConversations([D, E, 'abc', D], 'u1', 'Maria Souza');
  assert.equal(fechadas.resolved, 2);
  assert.equal(await de(D), undefined); assert.equal(await de(E), undefined);
  assert.equal((await core.resolveConversations([D], 'u1')).resolved, 0, 'já resolvida não conta de novo');
  await assert.rejects(() => core.resolveConversations([], 'u1'), (e) => e.code === 'INVALID_SELECTION');

  // Exportação em texto: cliente, equipe, nota e evento; sem as notas quando pedido.
  const completa = await core.exportConversation(D), semNotas = await core.exportConversation(D, false);
  assert.match(completa.filename, /^conversa-contato-4\.txt$/);
  assert.match(completa.text, /Contato 4: Vocês fazem kit cama de solteiro\?/); assert.match(completa.text, /Ateliê: Fazemos sim!/);
  assert.match(completa.text, /Nota interna: Quer em linho/); assert.match(completa.text, /— Maria resolveu a conversa —/);
  assert.doesNotMatch(semNotas.text, /Nota interna/);

  // A nota pode ser apagada; mensagem entregue, não.
  await core.discardFailedMessage(D, nota.message.id);
  assert.ok(!(await core.messagesFor(D, undefined, 50, 'u1')).messages.some((m) => m.type === 'note'));
  await assert.rejects(() => core.discardFailedMessage(D, 'wamid.d1'), (e) => e.code === 'NOT_FAILED');

  // Mensagem enviada pelo celular (coexistência) também tira o cliente da espera.
  await core.updateConversation(D, { situacao: 'aberta' }, 'u1', 'Maria Souza');
  await core.receiveWebhook(mensagem(D, 'wamid.d4', 'Oi?', -2000));
  assert.ok((await de(D)).waitingSince);
  await core.receiveWebhook(eco(D, 'wamid.d5', 'Oi! Já te respondo.', -2000));
  assert.equal((await de(D)).waitingSince, null);
});

test('respostas rápidas com nome; a ficha acha a oportunidade do CRM pelo telefone (com e sem 55 e nono dígito)', async () => {
  const lista = await core.saveQuickReply({ title: 'Prazo de produção', shortcut: 'prazo-novo', body: 'Olá, {nome}! O prazo é de 15 dias úteis.' });
  const salva = lista.find((r) => r.shortcut === 'prazo-novo');
  assert.equal(salva.title, 'Prazo de produção');
  assert.equal((await core.saveQuickReply({ shortcut: 'sem-nome', body: 'Texto' })).find((r) => r.shortcut === 'sem-nome').title, 'sem-nome', 'sem nome, vale o atalho');
  await core.saveQuickReply({ id: salva.id, title: 'Prazo', shortcut: 'prazo-novo', body: 'Novo texto' });
  assert.equal((await core.quickReplies()).find((r) => r.id === salva.id).body, 'Novo texto');

  const ficha = await import('../src/lib/whatsapp/ficha.ts');
  assert.deepEqual(new Set(ficha.variantesDoTelefone('5585988887777')), new Set(['5585988887777', '85988887777', '8588887777', '558588887777']));
  assert.ok(ficha.variantesDoTelefone('558588887777').includes('85988887777'), 'o WhatsApp sem o nono dígito acha o cadastro com ele');
  assert.deepEqual(ficha.variantesDoTelefone('351912345678'), ['351912345678'], 'número de fora do Brasil fica como veio');
  if (!postgres) {
    // No SQLite o CRM é um arquivo ao lado; no PGlite deste teste só as migrações do WhatsApp são aplicadas.
    const erp = await import('../src/lib/erp/core.ts');
    const funil = (await erp.workspaceSnapshot()).funnels[0];
    const ator = { id: 'u1', name: 'Maria Souza', email: 'maria@example.test', permission: 'admin', authMode: 'session' };
    const { lead } = await erp.createLead({ lead: { funnelId: funil.id, stage: funil.stages[0].id, name: 'Cliente da ficha', phone: '85988887777', budget: 0, tags: [] }, details: { source: 'WhatsApp' } }, ator);
    assert.equal((await ficha.leadDoTelefone('5585988887777')).id, lead.id);
    assert.equal((await ficha.leadDoTelefone('558588887777')).id, lead.id, 'sem o nono dígito também acha');
    assert.equal(await ficha.leadDoTelefone('5585911119999'), null);
    await erp.archiveLead(lead.id, lead.revision, ator);
    assert.equal(await ficha.leadDoTelefone('5585988887777'), null, 'oportunidade arquivada não vira ficha');
  }
});

test('origem da conversa: código do botão do site e anúncio Click to WhatsApp viram evento e seguem para o CRM', async () => {
  const { guardarReferencia, gerarCodigoRef, textoComRef, REF_NA_MENSAGEM } = await import('../src/lib/whatsapp/origem.ts');
  const F = '5585911110061', G = '5585911110062';
  const codigo = gerarCodigoRef();
  assert.match(codigo, /^[2-9A-HJ-NP-Z]{6}$/);
  assert.match(textoComRef('Oi! Vim pela loja do ateliê.', codigo), REF_NA_MENSAGEM);
  await guardarReferencia(core.db(), codigo, { channel: 'Google Ads', utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'natal', landingPage: 'https://www.ateliemilenakerbage.com.br/kit-berco', clickedPage: 'https://www.ateliemilenakerbage.com.br/produto/kit-berco-bia' });
  const origens = [];
  await core.receiveWebhook(mensagem(F, 'wamid.f-ref', textoComRef('Olá! Tenho uma dúvida sobre o Kit berço Bia.', codigo)), Date.now(), [], origens);
  assert.equal(origens.length, 1);
  assert.equal(origens[0].tipo, 'site'); assert.equal(origens[0].phone, F); assert.equal(origens[0].origem.utmCampaign, 'natal');
  let fio = (await core.messagesFor(F, undefined, 50, 'u1')).messages;
  assert.equal(fio.find((m) => m.id === 'wamid.f-ref').text, 'Olá! Tenho uma dúvida sobre o Kit berço Bia.', 'o código sai do texto guardado');
  assert.ok(fio.some((m) => m.type === 'system' && /^Veio do site: Google Ads · campanha natal · entrou por \/kit-berco · chamou em \/produto\/kit-berco-bia$/.test(m.text)));
  // Código desconhecido: a mensagem fica como chegou e nada é registrado.
  const nada = [];
  await core.receiveWebhook(mensagem(F, 'wamid.f-ref2', 'Oi de novo\n\n(ref. ZZZZZZ)'), Date.now(), [], nada);
  assert.equal(nada.length, 0);
  // Anúncio Click to WhatsApp: o `referral` da primeira mensagem.
  const anuncio = [];
  await core.receiveWebhook(mensagem(G, 'wamid.g-ad', 'Quero saber do enxoval', 0, { referral: { source_url: 'https://www.instagram.com/p/abc/', source_type: 'ad', source_id: '120200', headline: 'Enxoval personalizado', ctwa_clid: 'CLID123' } }), Date.now(), [], anuncio);
  assert.equal(anuncio.length, 1);
  assert.equal(anuncio[0].tipo, 'anuncio'); assert.equal(anuncio[0].origem.channel, 'Meta Ads (Click to WhatsApp)'); assert.equal(anuncio[0].origem.utmSource, 'instagram');
  assert.equal(anuncio[0].origem.ad, 'Enxoval personalizado'); assert.equal(anuncio[0].origem.clickId, 'ctwa_clid=CLID123'); assert.equal(anuncio[0].origem.adId, '120200');
  fio = (await core.messagesFor(G, undefined, 50, 'u1')).messages;
  assert.ok(fio.some((m) => m.type === 'system' && m.text === 'Veio de um anúncio (Click to WhatsApp): "Enxoval personalizado"'));
  // CRM: sem lead com o telefone, cria um com a origem; com lead, completa a ficha.
  const { aplicarOrigensNoCRM } = await import('../src/lib/whatsapp/origemCrm.ts');
  const { leadDoTelefone } = await import('../src/lib/whatsapp/ficha.ts');
  const { getLead } = await import('../src/lib/erp/core.ts');
  await aplicarOrigensNoCRM([...origens, ...anuncio]);
  const doSite = await getLead((await leadDoTelefone(F)).id), doAnuncio = await getLead((await leadDoTelefone(G)).id);
  assert.equal(doSite.details.source, 'Google'); assert.equal(doSite.details.campaign.channel, 'Google Ads'); assert.equal(doSite.details.campaign.utmCampaign, 'natal');
  assert.equal(doSite.details.campaign.clickedPage, undefined, 'a página do clique fica só no evento da conversa');
  assert.equal(doAnuncio.details.source, 'Instagram'); assert.equal(doAnuncio.details.campaign.ad, 'Enxoval personalizado'); assert.deepEqual(doAnuncio.lead.tags, ['Anúncio']);
  // Uma segunda origem não troca o primeiro toque: entra como último toque.
  await aplicarOrigensNoCRM([{ phone: F, nome: '', tipo: 'site', origem: { channel: 'Busca orgânica (google)', utmSource: 'google', utmMedium: 'organic', landingPage: 'https://www.ateliemilenakerbage.com.br/' } }]);
  const depois = (await getLead(doSite.lead.id)).details.campaign;
  assert.equal(depois.channel, 'Google Ads'); assert.equal(depois.lastChannel, 'Busca orgânica (google)'); assert.equal(depois.lastSource, 'google');
});
