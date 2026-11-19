import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Conexão do WhatsApp em poucos cliques (src/lib/whatsapp/conexao.ts), com a Meta simulada.
const directory = mkdtempSync(join(tmpdir(), 'mk-conexao-'));
process.env.NODE_ENV = 'test';
delete process.env.DATABASE_URL; process.env.ALLOW_LOCAL_SQLITE = 'true'; delete process.env.VERCEL;
process.env.WHATSAPP_DB_PATH = join(directory, 'conexao.sqlite');
process.env.INTEGRATION_ENCRYPTION_KEY = randomBytes(32).toString('base64');
for (const key of ['META_APP_ID', 'META_APP_SECRET', 'WHATSAPP_APP_SECRET', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_SUPPRESSION_SECRET', 'WHATSAPP_GRAPH_VERSION', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_BUSINESS_ACCOUNT_ID', 'WHATSAPP_EMBEDDED_CONFIG_ID']) delete process.env[key];
process.env.AUTH_ORIGIN = process.env.PUBLIC_BASE_URL = 'https://app.ateliemilenakerbage.com.br';
const storage = await import('../src/lib/database.ts');
const config = await import('../src/lib/whatsapp/config.ts');
const conexao = await import('../src/lib/whatsapp/conexao.ts');
const core = await import('../src/lib/whatsapp/core.ts');
after(async () => { await storage.closeDatabases(); rmSync(directory, { recursive: true, force: true }); });

const ator = 'gestor-teste';
const APP_ID = '1122334455', SEGREDO = 'a'.repeat(32), WABA = '555666777', FONE = '888999000';
const TOKEN = `EAA${'x'.repeat(250)}`;
// Chaves do webhook que já estão cadastradas no app da Meta: não podem mudar.
const VERIFY_EXISTENTE = 'token-de-verificacao-ja-cadastrado-na-meta';

/** Meta simulada: responde por rota e registra as chamadas. */
function metaFalsa({ naApp = true, numeros = [{ id: FONE, display_phone_number: '+55 85 99999-0000', verified_name: 'Ateliê Milena Kerbage', quality_rating: 'GREEN' }], appDoToken = APP_ID, escopos = ['whatsapp_business_management', 'whatsapp_business_messaging'], segredoValido = true } = {}) {
  const chamadas = [];
  const fetcher = async (endereco, opcoes = {}) => {
    const url = new URL(String(endereco)), caminho = url.pathname.replace(/^\/v\d+\.0\//, ''), metodo = opcoes.method || 'GET';
    chamadas.push(`${metodo} ${caminho}`);
    if (caminho === 'oauth/access_token' && url.searchParams.get('grant_type') === 'client_credentials') return segredoValido ? Response.json({ access_token: `${APP_ID}|app` }) : Response.json({ error: { code: 101 } }, { status: 400 });
    if (caminho === 'oauth/access_token') return Response.json({ access_token: TOKEN });
    if (caminho === 'debug_token') return Response.json({ data: { is_valid: true, app_id: appDoToken, type: 'SYSTEM_USER', scopes: escopos, granular_scopes: [{ scope: 'whatsapp_business_management', target_ids: [WABA] }] } });
    if (caminho === `${WABA}/phone_numbers`) return Response.json({ data: numeros });
    if (caminho === `${WABA}/subscribed_apps`) return Response.json(metodo === 'POST' ? { success: true } : { data: [{ whatsapp_business_api_data: { id: APP_ID, name: 'App' } }] });
    if (caminho === `${FONE}/register`) return Response.json({ success: true });
    if (caminho === `${FONE}/smb_app_data`) return Response.json({ request_id: `req-${JSON.parse(opcoes.body).sync_type}` });
    if (caminho === FONE && url.searchParams.get('fields')?.includes('is_on_biz_app')) return Response.json({ id: FONE, is_on_biz_app: naApp, platform_type: naApp ? 'CLOUD_API' : 'NOT_APPLICABLE' });
    if (caminho === FONE) return Response.json({ id: FONE, display_phone_number: '+55 85 99999-0000', verified_name: 'Ateliê Milena Kerbage', quality_rating: 'GREEN' });
    return Response.json({ error: { code: 100 } }, { status: 400 });
  };
  return { fetcher, chamadas };
}

test('segredo curto (senha preenchida pelo navegador) diz o campo e o tamanho; "Bearer" e espaços colados são limpos', async () => {
  await assert.rejects(config.saveSettings({ secrets: { accessToken: 'Senha@202' } }, ator), (erro) => erro.code === 'INVALID_SECRET' && erro.field === 'accessToken' && /9 caracteres/.test(erro.message) && /senha salva/.test(erro.message));
  await config.saveSettings({ secrets: { verifyToken: `  ${VERIFY_EXISTENTE}\n` } }, ator);
  assert.equal((await config.effectiveConfiguration()).verifyToken, VERIFY_EXISTENTE);
  assert.equal(config.limparSegredo(`Bearer EAA123 456 789`), 'EAA123456789');
});

test('cadastro do app confere App ID e App Secret na Meta, aponta o campo errado e não troca as chaves do webhook', async () => {
  const recusa = metaFalsa({ segredoValido: false });
  await assert.rejects(conexao.salvarApp({ appId: APP_ID, appSecret: SEGREDO }, ator, recusa.fetcher), (erro) => erro.code === 'META_APP_REJECTED' && erro.field === 'appSecret');
  await assert.rejects(conexao.salvarApp({ appId: '12ab', appSecret: SEGREDO }, ator, recusa.fetcher), (erro) => erro.field === 'appId');
  const meta = metaFalsa();
  await conexao.salvarApp({ appId: APP_ID, appSecret: SEGREDO, configId: '998877665' }, ator, meta.fetcher);
  const situacao = await conexao.situacaoConexao('https://localhost');
  assert.equal(situacao.app.cadastroIncorporadoPronto, true);
  assert.equal(situacao.webhook.verifyToken, VERIFY_EXISTENTE, 'token de verificação já cadastrado na Meta preservado');
  assert.equal(situacao.webhook.url, 'https://app.ateliemilenakerbage.com.br/api/whatsapp/webhook');
  assert.equal(situacao.app.versao, config.GRAPH_VERSION_PADRAO);
  assert.ok((await config.effectiveConfiguration()).suppressionSecret.length >= 32, 'chave de supressão gerada quando faltava');
  // Salvar de novo só com o ID da configuração não consulta a Meta nem mexe no App Secret.
  const quieta = metaFalsa();
  await conexao.salvarApp({ configId: '998877666' }, ator, quieta.fetcher);
  assert.equal(quieta.chamadas.length, 0);
  assert.equal((await config.effectiveConfiguration()).appSecret, SEGREDO);
});

test('token colado: valida na Meta, descobre conta e número, inscreve o webhook e guarda cifrado', async () => {
  const supressaoAntes = (await config.effectiveConfiguration()).suppressionSecret;
  await assert.rejects(conexao.conectarComToken({ token: 'Senha@2024' }, ator, metaFalsa().fetcher), (erro) => erro.field === 'token');
  await assert.rejects(conexao.conectarComToken({ token: TOKEN }, ator, metaFalsa({ appDoToken: '999' }).fetcher), { code: 'TOKEN_OTHER_APP' });
  await assert.rejects(conexao.conectarComToken({ token: TOKEN }, ator, metaFalsa({ escopos: ['whatsapp_business_management'] }).fetcher), { code: 'TOKEN_SCOPES' });
  const varios = metaFalsa({ numeros: [{ id: FONE, display_phone_number: '+55 85 1' }, { id: '111222333', display_phone_number: '+55 85 2' }] });
  await assert.rejects(conexao.conectarComToken({ token: TOKEN }, ator, varios.fetcher), (erro) => erro.code === 'CHOOSE_PHONE' && erro.details.length === 2);

  const meta = metaFalsa();
  const resultado = await conexao.conectarComToken({ token: `Bearer ${TOKEN}` }, ator, meta.fetcher);
  assert.equal(resultado.numero, '+55 85 99999-0000');
  assert.deepEqual(resultado.avisos, []);
  assert.ok(meta.chamadas.includes(`POST ${WABA}/subscribed_apps`), 'inscreve o app nos webhooks da conta');
  assert.ok(!meta.chamadas.some((chamada) => chamada.endsWith('/register')), 'token não registra número');
  const efetiva = await config.effectiveConfiguration();
  assert.equal(efetiva.accessToken, TOKEN); assert.equal(efetiva.phoneNumberId, FONE); assert.equal(efetiva.businessAccountId, WABA);
  assert.equal(efetiva.verifyToken, VERIFY_EXISTENTE); assert.equal(efetiva.suppressionSecret, supressaoAntes);
  assert.equal(efetiva.configured, true, 'conectar deixa a integração pronta para rodar');
  const linha = await config.settingsDb().prepare("SELECT value, encrypted FROM integration_settings WHERE key = 'accessToken'").get();
  assert.equal(linha.encrypted, 1); assert.ok(!linha.value.includes('EAA'));
  assert.ok(!JSON.stringify(await conexao.situacaoConexao('https://localhost')).includes(TOKEN), 'a tela nunca recebe o token');
});

test('cadastro incorporado: state de uso único preso à sessão; coexistência não registra, número novo registra', async () => {
  const usuario = { id: 'gestor-1', development: false };
  await assert.rejects(conexao.prepararConexao({ ...usuario, development: true }, 'sessao'), { code: 'REAL_SESSION_REQUIRED' });
  const preparo = await conexao.prepararConexao(usuario, 'sessao-do-gestor');
  assert.equal(preparo.appId, APP_ID); assert.match(preparo.state, /^[a-f0-9]{64}$/);
  await assert.rejects(conexao.concluirConexao({ state: preparo.state, code: 'abc' }, usuario, 'outra-sessao', metaFalsa().fetcher), { code: 'SESSION_EXPIRED' });

  const novo = await conexao.prepararConexao(usuario, 'sessao-do-gestor');
  const coexistencia = metaFalsa();
  const resultado = await conexao.concluirConexao({ state: novo.state, code: 'codigo-da-meta', modo: 'coexistencia', wabaId: WABA, phoneNumberId: FONE }, usuario, 'sessao-do-gestor', coexistencia.fetcher);
  assert.equal(resultado.conectado, true);
  assert.ok(!coexistencia.chamadas.some((chamada) => chamada.endsWith('/register')));
  assert.equal((await conexao.situacaoConexao('https://localhost')).conexao.modo, 'coexistencia');
  await assert.rejects(conexao.concluirConexao({ state: novo.state, code: 'de-novo' }, usuario, 'sessao-do-gestor', metaFalsa().fetcher), { code: 'SESSION_EXPIRED' }, 'state não é reaproveitado');

  const outro = await conexao.prepararConexao(usuario, 'sessao-do-gestor');
  const numeroNovo = metaFalsa();
  await conexao.concluirConexao({ state: outro.state, code: 'codigo', modo: 'novo', wabaId: WABA, phoneNumberId: FONE }, usuario, 'sessao-do-gestor', numeroNovo.fetcher);
  assert.ok(numeroNovo.chamadas.includes(`POST ${FONE}/register`));
  assert.equal((await config.effectiveConfiguration()).verifyToken, VERIFY_EXISTENTE);
});

test('testar confere número e inscrição; desconectar apaga só o acesso e mantém as chaves do webhook', async () => {
  const meta = metaFalsa();
  const teste = await conexao.testarConexao(ator, meta.fetcher);
  assert.equal(teste.inscrito, true); assert.equal(teste.reinscrito, false); assert.equal(teste.qualidade, 'GREEN');
  const antes = await config.effectiveConfiguration();
  await conexao.desconectar(ator);
  const depois = await config.effectiveConfiguration();
  assert.equal(depois.accessToken, ''); assert.equal(depois.phoneNumberId, ''); assert.equal(depois.configured, false);
  assert.equal(depois.verifyToken, VERIFY_EXISTENTE); assert.equal(depois.appSecret, antes.appSecret); assert.equal(depois.suppressionSecret, antes.suppressionSecret);
  assert.equal((await conexao.situacaoConexao('https://localhost')).conexao.conectado, false);
});

test('coexistência: mensagem enviada pelo app do celular entra na conversa como enviada', async () => {
  await conexao.conectarComToken({ token: TOKEN }, ator, metaFalsa().fetcher);
  const agora = Date.now();
  const resultado = await core.receiveWebhook({ object: 'whatsapp_business_account', entry: [{ id: WABA, changes: [{ field: 'smb_message_echoes', value: { metadata: { phone_number_id: FONE }, message_echoes: [{ id: 'wamid.eco1', from: '5585999990000', to: '5585988887777', timestamp: String(Math.floor(agora / 1000)), type: 'text', text: { body: 'Oi! Seu kit fica pronto amanhã.' } }] } }] }] }, agora);
  assert.equal(resultado.processed, 1);
  const mensagem = await core.db().prepare("SELECT direction, text, status FROM messages WHERE id = 'wamid.eco1'").get();
  assert.deepEqual({ ...mensagem }, { direction: 'outbound', text: 'Oi! Seu kit fica pronto amanhã.', status: 'sent' });
  assert.equal((await core.receiveWebhook({ object: 'whatsapp_business_account', entry: [{ id: WABA, changes: [{ field: 'smb_message_echoes', value: { metadata: { phone_number_id: FONE }, message_echoes: [{ id: 'wamid.eco1', to: '5585988887777', timestamp: String(Math.floor(agora / 1000)), type: 'text', text: { body: 'x' } }] } }] }] }, agora)).processed, 0, 'eco repetido é ignorado');
});

test('histórico do celular: agenda 5 min após conectar, espera o número, pede contatos e depois histórico uma única vez', async () => {
  const usuario = { id: 'gestor-1', development: false };
  const liberar = () => core.db().prepare('DELETE FROM rate_limits').run();
  const preparo = await conexao.prepararConexao(usuario, 'sessao-do-gestor');
  await conexao.concluirConexao({ state: preparo.state, code: 'codigo', modo: 'coexistencia', wabaId: WABA, phoneNumberId: FONE }, usuario, 'sessao-do-gestor', metaFalsa().fetcher);
  let situacao = await conexao.situacaoConexao('https://localhost');
  assert.equal(situacao.historico.estado, 'agendado');
  assert.ok(Date.parse(situacao.historico.agendadoPara) > Date.now() + 4 * 60_000);
  assert.equal((await conexao.sincronizarHistorico(ator, true, metaFalsa().fetcher, 0)).resultado, 'aguardando_horario');

  const vencer = async () => { const linha = await core.db().prepare("SELECT value FROM metadata WHERE key = 'historyRequest'").get(); await core.db().prepare("UPDATE metadata SET value = ? WHERE key = 'historyRequest'").run(JSON.stringify({ ...JSON.parse(linha.value), agendadoPara: new Date(Date.now() - 1000).toISOString() })); };
  await vencer(); await liberar();
  const foraDoApp = metaFalsa({ naApp: false });
  assert.equal((await conexao.sincronizarHistorico(ator, true, foraDoApp.fetcher, 0)).resultado, 'esperando');
  assert.ok(!foraDoApp.chamadas.some((chamada) => chamada.includes('smb_app_data')), 'sem o número confirmado, nada é pedido');

  await vencer(); await liberar();
  const meta = metaFalsa();
  assert.equal((await conexao.sincronizarHistorico(ator, true, meta.fetcher, 0)).resultado, 'pedido');
  const pedidos = meta.chamadas.filter((chamada) => chamada.includes('smb_app_data'));
  assert.deepEqual(pedidos, [`POST ${FONE}/smb_app_data`, `POST ${FONE}/smb_app_data`]);
  await liberar();
  const de_novo = metaFalsa();
  assert.equal((await conexao.sincronizarHistorico(ator, false, de_novo.fetcher, 0)).resultado, 'ja_pedido');
  assert.equal(de_novo.chamadas.length, 0, 'pedido único: nunca repete');
  situacao = await conexao.situacaoConexao('https://localhost');
  assert.equal(situacao.historico.estado, 'importando'); assert.equal(situacao.historico.contatosPedidos, true);
});

test('histórico do celular: contatos ganham nome e conversas antigas entram lidas, nos dois sentidos', async () => {
  const agora = Date.now(), ts = String(Math.floor(agora / 1000) - 3600), cliente = '5585977776666';
  const evento = (field, value) => ({ object: 'whatsapp_business_account', entry: [{ id: WABA, changes: [{ field, value: { metadata: { phone_number_id: FONE }, ...value } }] }] });
  await core.receiveWebhook(evento('smb_app_state_sync', { state_sync: [{ type: 'contact', action: 'add', contact: { phone_number: cliente, full_name: 'Maria Cliente' }, metadata: { timestamp: ts } }] }), agora);
  assert.equal((await core.db().prepare('SELECT name FROM contacts WHERE phone = ?').get(cliente)).name, 'Maria Cliente');
  const lote = (progress, mensagens) => evento('history', { history: [{ metadata: { phase: 0, chunk_order: 1, progress }, threads: [{ id: cliente, messages: mensagens }] }] });
  await core.receiveWebhook(lote(40, [
    { id: 'wamid.h1', from: cliente, timestamp: ts, type: 'text', text: { body: 'Oi, queria um kit berço' } },
    { id: 'wamid.h2', from: '5585999990000', timestamp: ts, type: 'text', text: { body: 'Claro! Qual tema?' } },
  ]), agora);
  const linhas = await core.db().prepare("SELECT id, direction, is_read FROM messages WHERE id IN ('wamid.h1', 'wamid.h2') ORDER BY id").all();
  assert.deepEqual(linhas.map((linha) => [linha.id, linha.direction, linha.is_read]), [['wamid.h1', 'inbound', 1], ['wamid.h2', 'outbound', 1]]);
  assert.equal((await core.db().prepare('SELECT last_inbound FROM contacts WHERE phone = ?').get(cliente)).last_inbound, null, 'histórico não abre a janela de 24 h');
  assert.equal((await conexao.situacaoConexao('https://localhost')).historico.progresso, 40);
  await core.receiveWebhook(lote(100, []), agora);
  assert.equal((await conexao.situacaoConexao('https://localhost')).historico.estado, 'concluido');
});
