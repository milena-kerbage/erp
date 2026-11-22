import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Credenciais do Instagram cadastradas pela tela (src/lib/instagram/ajustes.ts).
const directory = mkdtempSync(join(tmpdir(), 'mk-ig-ajustes-'));
process.env.NODE_ENV = 'test';
delete process.env.DATABASE_URL; process.env.ALLOW_LOCAL_SQLITE = 'true'; delete process.env.VERCEL;
process.env.WHATSAPP_DB_PATH = join(directory, 'wa.sqlite'); process.env.META_DELETION_DB_PATH = join(directory, 'meta.sqlite');
process.env.INTEGRATION_ENCRYPTION_KEY = randomBytes(32).toString('base64');
for (const key of ['INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET', 'INSTAGRAM_WEBHOOK_APP_SECRET', 'INSTAGRAM_GRAPH_VERSION', 'INSTAGRAM_SCOPES', 'META_APP_SECRET', 'WHATSAPP_APP_SECRET']) delete process.env[key];
const TOKEN_NA_META = 'v'.repeat(64);
process.env.INSTAGRAM_VERIFY_TOKEN = TOKEN_NA_META;
process.env.AUTH_ORIGIN = process.env.PUBLIC_BASE_URL = 'https://app.ateliemilenakerbage.com.br';
const storage = await import('../src/lib/database.ts');
const waConfig = await import('../src/lib/whatsapp/config.ts');
const config = await import('../src/lib/instagram/config.ts');
const ajustes = await import('../src/lib/instagram/ajustes.ts');
after(async () => { await storage.closeDatabases(); rmSync(directory, { recursive: true, force: true }); });

test('campos errados apontam o campo e o tamanho (senha salva do navegador)', async () => {
  await assert.rejects(ajustes.salvarAjustesInstagram({ appId: '12ab' }, 'gestor'), (erro) => erro.field === 'appId');
  await assert.rejects(ajustes.salvarAjustesInstagram({ appId: '123456789', appSecret: 'Senha@202' }, 'gestor'), (erro) => erro.field === 'appSecret' && /9 caracteres/.test(erro.message));
  await assert.rejects(ajustes.salvarAjustesInstagram({ appId: '123456789' }, 'gestor'), (erro) => erro.field === 'appSecret');
});

test('salvo pela tela vale sem variáveis de ambiente, cifrado; webhook usa o App Secret do WhatsApp; token já na Meta não muda', async () => {
  await waConfig.saveSettings({ secrets: { appSecret: 'w'.repeat(32) } }, 'gestor');
  await ajustes.salvarAjustesInstagram({ appId: '123456789', appSecret: ` ${'i'.repeat(32)} `, recursos: ['instagram_business_manage_messages', 'instagram_business_manage_comments', 'instagram_business_content_publish'] }, 'gestor');
  const atual = config.instagramConfig();
  assert.equal(atual.appId, '123456789'); assert.equal(atual.appSecret, 'i'.repeat(32));
  assert.equal(atual.webhookSecret, 'w'.repeat(32), 'sem segredo próprio, usa o App Secret do mesmo app (WhatsApp)');
  assert.equal(atual.version, config.VERSAO_INSTAGRAM_PADRAO);
  assert.deepEqual(atual.scopes, ['instagram_business_basic', 'instagram_business_manage_messages', 'instagram_business_manage_comments'], 'publicação não é pedida');
  assert.equal(atual.verifyToken, TOKEN_NA_META);
  const linha = await waConfig.settingsDb().prepare("SELECT value, encrypted FROM integration_settings WHERE key = 'instagram.appSecret'").get();
  assert.equal(linha.encrypted, 1); assert.ok(!linha.value.includes('iiii'));
  assert.equal((await waConfig.effectiveConfiguration()).appSecret, 'w'.repeat(32), 'ajustes do Instagram não mexem no WhatsApp');
  assert.doesNotThrow(() => config.requireOAuthConfig());
  // Salvar de novo sem segredo mantém o guardado.
  await ajustes.salvarAjustesInstagram({ appId: '123456789', webhookSecret: 'h'.repeat(32) }, 'gestor');
  assert.equal(config.instagramConfig().appSecret, 'i'.repeat(32)); assert.equal(config.instagramConfig().webhookSecret, 'h'.repeat(32));
});

test('login pelo Facebook (config_id): URL igual à da Meta, troca com o segredo certo, acha a página do perfil e inscreve a página', async () => {
  const api = await import('../src/lib/instagram/api.ts');
  const store = await import('../src/lib/instagram/store.ts');
  await ajustes.salvarAjustesInstagram({ appId: '1178499741393086', configId: '1438707898432586', appSecret: 'a'.repeat(32), webhookSecret: 'b'.repeat(32) }, 'gestor');
  assert.equal(config.instagramConfig().modo, 'facebook');
  const url = new URL(api.authorizationUrl('c'.repeat(64)));
  assert.equal(url.origin + url.pathname, 'https://www.facebook.com/dialog/oauth');
  for (const [chave, valor] of Object.entries({ client_id: '1178499741393086', config_id: '1438707898432586', display: 'popup', override_default_response_type: 'true', redirect_uri: 'https://app.ateliemilenakerbage.com.br/api/instagram/oauth/callback', response_type: 'code', state: 'c'.repeat(64), prompt: 'login' })) assert.equal(url.searchParams.get(chave), valor, chave);

  const chamadas = [];
  // Usuário do sistema (configuração de empresa): /me/accounts vem vazio; as páginas saem das permissões granulares.
  const fetcher = async (endereco, opcoes = {}) => {
    const u = new URL(String(endereco)), caminho = u.pathname.replace(/^\/v\d+\.0\//, '');
    chamadas.push(`${opcoes.method || 'GET'} ${caminho}`);
    if (caminho === 'oauth/access_token' && u.searchParams.get('code')) return u.searchParams.get('client_secret') === 'b'.repeat(32) ? Response.json({ access_token: 'EAAsistema' + 'x'.repeat(40) }) : Response.json({ error: { code: 1, message: 'Error validating client secret.' } }, { status: 400 });
    if (caminho === 'oauth/access_token') throw new Error('token de usuário do sistema não se estende');
    if (caminho === 'debug_token' && u.searchParams.get('input_token').startsWith('EAAsistema')) return Response.json({ data: { is_valid: true, type: 'SYSTEM_USER', app_id: '1178499741393086', user_id: '777', scopes: ['instagram_basic', 'instagram_manage_messages', 'instagram_manage_comments', 'pages_show_list'], granular_scopes: [{ scope: 'pages_show_list', target_ids: ['111', '222'] }, { scope: 'instagram_basic', target_ids: ['17841400000000'] }], expires_at: 0 } });
    if (caminho === 'debug_token') return Response.json({ data: { is_valid: true, expires_at: 0 } });
    if (caminho === 'me/accounts') return Response.json({ data: [] });
    if (caminho === '111') return Response.json({ id: '111', name: 'Outra', access_token: 'EAAoutra' + 'x'.repeat(40), instagram_business_account: { id: '900', username: 'outraconta' } });
    if (caminho === '222') return Response.json({ id: '222', name: 'Ateliê', access_token: 'EAApagina' + 'x'.repeat(40), instagram_business_account: { id: '17841400000000', username: 'milenakerbageatelie' } });
    if (caminho === '222/subscribed_apps') return Response.json({ success: true });
    return Response.json({ error: { code: 100 } }, { status: 400 });
  };
  await api.exchangeCode('codigo-da-meta', fetcher);
  const conexao = await store.currentConnection();
  assert.equal(conexao.username, 'milenakerbageatelie'); assert.equal(conexao.account_id, '17841400000000');
  assert.equal(await store.connectionToken(conexao), 'EAApagina' + 'x'.repeat(40), 'guarda o acesso da página');
  assert.deepEqual(JSON.parse(conexao.scopes_json), ['instagram_business_basic', 'instagram_business_manage_messages', 'instagram_business_manage_comments']);
  assert.equal(config.instagramConfig().pageId, '222');
  assert.ok(conexao.expires_at > Date.now() + 300 * 86400_000, 'acesso da página não vence');
  const inscricao = await api.subscribeAccount(fetcher);
  assert.ok(inscricao.fields.includes('messages') && inscricao.fields.includes('comments'));
  assert.ok(chamadas.includes('POST 222/subscribed_apps'));
  assert.equal((await api.refreshToken(fetcher)).naoVence, true, 'acesso pelo Facebook não usa a renovação do Instagram');
});

test('login pelo Facebook: falha mostra o motivo real da Meta (código e mensagem), sem segredo', async () => {
  const api = await import('../src/lib/instagram/api.ts');
  const recusa = async () => Response.json({ error: { code: 191, message: "Can't load URL: The domain of this URL isn't included in the app's domains." } }, { status: 400 });
  await assert.rejects(api.exchangeCode('codigo', recusa), (erro) => erro.code === 'EXCHANGE_FAILED' && /código 191/.test(erro.message) && /domain/.test(erro.message));
  const semPagina = async (endereco) => {
    const caminho = new URL(String(endereco)).pathname.replace(/^\/v\d+\.0\//, '');
    if (caminho === 'oauth/access_token') return Response.json({ access_token: 'EAAsistema' + 'x'.repeat(40) });
    if (caminho === 'debug_token') return Response.json({ data: { is_valid: true, type: 'SYSTEM_USER', app_id: '1178499741393086', user_id: '777', scopes: ['instagram_basic'], granular_scopes: [] } });
    return Response.json({ data: [] });
  };
  // Nenhuma conta do Instagram compartilhada: o aviso manda marcar a conta na janela da Meta (e não pede página do Facebook).
  await assert.rejects(api.exchangeCode('codigo', semPagina), (erro) => erro.code === 'WRONG_ACCOUNT' && /marque o Instagram @milenakerbageatelie/.test(erro.message) && !/ID da página/.test(erro.message) && /instagram_basic/.test(erro.message));
});

test('login pelo Facebook: usuário do sistema acha a página por assigned_pages ou pelo ID cadastrado na tela', async () => {
  const api = await import('../src/lib/instagram/api.ts');
  const store = await import('../src/lib/instagram/store.ts');
  const montar = (comAtribuidas) => async (endereco) => {
    const caminho = new URL(String(endereco)).pathname.replace(/^\/v\d+\.0\//, '');
    if (caminho === 'oauth/access_token') return Response.json({ access_token: 'EAAsistema' + 'x'.repeat(40) });
    if (caminho === 'debug_token') return Response.json({ data: { is_valid: true, type: 'SYSTEM_USER', app_id: '1178499741393086', user_id: '777', scopes: ['instagram_basic', 'instagram_manage_messages'], granular_scopes: [{ scope: 'instagram_basic', target_ids: ['17841400000000'] }], expires_at: 0 } });
    if (caminho === 'me/assigned_pages' && comAtribuidas) return Response.json({ data: [{ id: '123456789012345' }] });
    if (caminho === '123456789012345') return Response.json({ id: '123456789012345', access_token: 'EAApagina' + 'x'.repeat(40), instagram_business_account: { id: '17841400000000', username: 'milenakerbageatelie' } });
    return Response.json({ data: [] });
  };
  await api.exchangeCode('codigo', montar(true));
  assert.equal((await store.currentConnection()).username, 'milenakerbageatelie');
  assert.equal(config.instagramConfig().pageId, '123456789012345');
  // Sem nenhuma lista, vale o ID da página cadastrado na tela.
  await ajustes.salvarAjustesInstagram({ pageId: '123456789012345' }, 'gestor');
  await api.exchangeCode('codigo', montar(false));
  assert.equal((await store.currentConnection()).account_id, '17841400000000');
  await assert.rejects(ajustes.salvarAjustesInstagram({ pageId: 'abc' }, 'gestor'), (erro) => erro.field === 'pageId');
});

test('login unificado: a conta vem de /me/assigned_instagram_accounts, sem página; guarda o portfólio e inscreve a própria conta', async () => {
  const api = await import('../src/lib/instagram/api.ts');
  const store = await import('../src/lib/instagram/store.ts');
  const IG = '17841477777777', chamadas = [];
  // Como no caso real: token de usuário do sistema, permissões sem pages_*, nenhum ID nas permissões granulares e um ID
  // de página que alguém cadastrou na tela (a página não devolve o vínculo com o Instagram).
  await ajustes.salvarAjustesInstagram({ pageId: '123456789012345' }, 'gestor');
  const montar = (contas) => async (endereco, opcoes = {}) => {
    const u = new URL(String(endereco)), caminho = u.pathname.replace(/^\/v\d+\.0\//, '');
    chamadas.push(`${opcoes.method || 'GET'} ${u.hostname} ${caminho}`);
    if (caminho === 'oauth/access_token') return Response.json({ access_token: 'EAAunificado' + 'z'.repeat(40) });
    if (caminho === 'debug_token') return Response.json({ data: { is_valid: true, type: 'SYSTEM_USER', app_id: '1178499741393086', user_id: '888', scopes: ['ads_management', 'ads_read', 'instagram_basic', 'instagram_manage_comments', 'instagram_content_publish', 'instagram_manage_messages', 'public_profile'], granular_scopes: [{ scope: 'instagram_basic' }], expires_at: 0 } });
    if (caminho === 'me/assigned_instagram_accounts') return Response.json({ data: contas, paging: { cursors: { before: 'a', after: 'b' } } });
    if (caminho === 'me' && u.searchParams.get('fields') === 'client_business_id') return Response.json({ client_business_id: '555000111222', id: '888' });
    if (caminho === '123456789012345') return Response.json({ id: '123456789012345', name: 'Página' }); // sem pages_*: não traz access_token nem o Instagram
    if (caminho === `${IG}/subscribed_apps` && opcoes.method === 'POST') return Response.json({ success: true });
    return Response.json({ data: [] });
  };
  await store.instagramDb().prepare('DELETE FROM instagram_connections').run();
  // Várias contas marcadas e nenhuma é a do Ateliê: pede para marcar uma só, sem guardar nada.
  await assert.rejects(api.exchangeCode('codigo', montar([{ id: '17841400000001', username: 'outra.loja' }, { id: '17841400000002', username: 'mais.uma' }])), (erro) => erro.code === 'WRONG_ACCOUNT' && /@outra\.loja/.test(erro.message) && /marque só a conta/.test(erro.message));
  assert.equal(await store.currentConnection(), undefined, 'nada é guardado na dúvida');

  // Uma conta só, mesmo não sendo a do Ateliê (conta de teste): conecta a que a pessoa escolheu na janela da Meta.
  await api.exchangeCode('codigo', montar([{ id: '17841400000001', username: 'owallaceproenca' }]));
  assert.equal((await store.currentConnection()).username, 'owallaceproenca');
  // Trocar de perfil exige desconectar antes (não troca em silêncio).
  await assert.rejects(api.exchangeCode('codigo', montar([{ id: IG, username: 'milenakerbageatelie' }])), { code: 'ACCOUNT_ALREADY_CONNECTED' });
  await store.instagramDb().prepare('DELETE FROM instagram_connections').run();

  // Com a do Ateliê entre as marcadas, é ela que conecta.
  await api.exchangeCode('codigo', montar([{ id: '17841400000001', username: 'outra.loja' }, { id: IG, username: 'MilenaKerbageAtelie' }]));
  const conexao = await store.currentConnection();
  assert.equal(conexao.account_id, IG); assert.equal(conexao.username, 'MilenaKerbageAtelie');
  assert.deepEqual(JSON.parse(conexao.scopes_json).sort(), ['instagram_business_basic', 'instagram_business_manage_comments', 'instagram_business_manage_messages']);
  const atual = config.instagramConfig();
  assert.equal(atual.loginTipo, 'unificado'); assert.equal(atual.pageId, '', 'o ID de página cadastrado é apagado'); assert.equal(atual.clientBusinessId, '555000111222');
  assert.equal(config.usaPaginaDoFacebook(), false);
  assert.ok(chamadas.includes('GET graph.facebook.com me/assigned_instagram_accounts'));
  assert.equal(chamadas.some((chamada) => chamada.includes('graph.instagram.com')), false, 'o login unificado só fala com graph.facebook.com');

  // Notificações: a própria conta do Instagram é inscrita (nunca a página).
  chamadas.length = 0;
  const inscricao = await api.subscribeAccount(montar([]));
  assert.equal(inscricao.subscribed, true); assert.ok(inscricao.fields.includes('messages') && inscricao.fields.includes('comments'));
  assert.deepEqual(chamadas, [`POST graph.facebook.com ${IG}/subscribed_apps`]);
  // Mesmo que alguém cadastre de novo um ID de página, a conexão unificada continua falando pela conta do Instagram.
  await ajustes.salvarAjustesInstagram({ pageId: '123456789012345' }, 'gestor');
  assert.equal(config.usaPaginaDoFacebook(), false);
});

test('só Instagram (sem página): conecta pela conta do token e o chat recebe, sincroniza e responde pelo ID do Instagram', async () => {
  const api = await import('../src/lib/instagram/api.ts');
  const store = await import('../src/lib/instagram/store.ts');
  const chat = await import('../src/lib/instagram/chat.ts');
  const IG = '17841499999999', CLIENTE = '9988776655', OUTRO = '5544332211';
  const chamadas = [];
  const fetcher = async (endereco, opcoes = {}) => {
    const u = new URL(String(endereco)), caminho = u.pathname.replace(/^\/v\d+\.0\//, '');
    chamadas.push(`${opcoes.method || 'GET'} ${caminho}`);
    if (caminho === 'oauth/access_token') return Response.json({ access_token: 'EAAsistema' + 'y'.repeat(40) });
    if (caminho === 'debug_token') return Response.json({ data: { is_valid: true, type: 'SYSTEM_USER', app_id: '1178499741393086', user_id: '777', scopes: ['instagram_basic', 'instagram_manage_messages'], granular_scopes: [{ scope: 'instagram_basic', target_ids: [IG] }], expires_at: 0 } });
    if (caminho === IG && u.searchParams.get('fields') === 'id,username') return Response.json({ id: IG, username: 'milenakerbageatelie' });
    if (caminho === `${IG}/conversations`) return Response.json({ data: [{ participants: { data: [{ id: IG, username: 'milenakerbageatelie' }, { id: OUTRO, username: 'cliente.antiga' }] }, messages: { data: [
      { id: 'mid.h2', message: 'Obrigada!', from: { id: IG }, created_time: new Date(Date.now() - 3 * 86400000).toISOString() },
      { id: 'mid.h1', message: 'Vocês fazem kit berço?', from: { id: OUTRO }, created_time: new Date(Date.now() - 4 * 86400000).toISOString() },
    ] } }] });
    if (caminho === `${IG}/messages` && opcoes.method === 'POST') return Response.json({ recipient_id: CLIENTE, message_id: `mid.out.${chamadas.length}` });
    if (caminho === CLIENTE) return Response.json({ name: 'Cliente Nova', username: 'cliente.nova', profile_pic: 'https://cdn.example/foto.jpg' });
    if (caminho === OUTRO) return Response.json({ name: 'Cliente Antiga', username: 'cliente.antiga' });
    return Response.json({ data: [] });
  };
  await store.instagramDb().prepare('DELETE FROM instagram_connections').run(); // a conta dos testes anteriores era outra
  await api.exchangeCode('codigo', fetcher);
  const conexao = await store.currentConnection();
  assert.equal(conexao.account_id, IG); assert.equal(conexao.username, 'milenakerbageatelie');
  assert.equal(config.instagramConfig().pageId, '', 'sem página');

  // Webhook: mensagem recebida e o eco do que a conta mandou pelo app.
  const agora = Date.now();
  assert.equal(await chat.receberDoWebhook({ sender: { id: CLIENTE }, recipient: { id: IG }, timestamp: agora - 60000, message: { mid: 'mid.in1', text: 'Oi! Quero um orçamento' } }, IG, agora), CLIENTE);
  await chat.receberDoWebhook({ sender: { id: IG }, recipient: { id: CLIENTE }, timestamp: agora - 30000, message: { mid: 'mid.eco1', text: 'Oi! Claro', is_echo: true } }, IG, agora);
  assert.equal(await chat.receberDoWebhook({ sender: { id: CLIENTE }, recipient: { id: IG }, timestamp: agora, message: { mid: 'mid.in1', text: 'repetida' } }, IG, agora), null, 'mensagem repetida não duplica');
  assert.equal(await chat.naoLidas(), 1);
  await chat.completarPerfis([CLIENTE], fetcher);

  // Histórico do Direct pela conta do Instagram.
  const sync = await chat.sincronizarHistorico(fetcher);
  assert.equal(sync.mensagens, 2);
  assert.ok(chamadas.includes(`GET ${IG}/conversations`));
  const conversas = await chat.listarConversas();
  assert.deepEqual(conversas.map((c) => c.username), ['cliente.nova', 'cliente.antiga'], 'mais recente primeiro');
  assert.equal(conversas[0].nome, 'Cliente Nova'); assert.equal(conversas[0].naoLidas, 1);
  assert.deepEqual((await chat.mensagensDe(CLIENTE)).map((m) => [m.id, m.direcao]), [['mid.in1', 'entrada'], ['mid.eco1', 'saida']]);
  await chat.marcarLidas(CLIENTE);
  assert.equal(await chat.naoLidas(), 0);

  // Resposta: dentro de 24 h normal; entre 1 e 7 dias com HUMAN_AGENT; depois de 7 dias, bloqueada.
  await chat.enviarTexto(CLIENTE, 'Mando o orçamento já', 'Equipe', fetcher);
  assert.ok(chamadas.includes(`POST ${IG}/messages`));
  await chat.enviarTexto(OUTRO, 'Ainda tem interesse?', 'Equipe', fetcher);
  await assert.rejects(chat.enviarTexto(OUTRO, 'Oi', 'Equipe', fetcher, Date.now() + 8 * 86400000), { code: 'WINDOW_CLOSED' });
  assert.equal((await chat.mensagensDe(CLIENTE)).at(-1).texto, 'Mando o orçamento já');
});

test('chat do Instagram: responder cita a mensagem (reply_to), curtir usa a reação "love" e apagar do ERP tira da conversa', async () => {
  const chat = await import('../src/lib/instagram/chat.ts');
  const corpos = [];
  const fetcher = async (endereco, opcoes = {}) => { if (opcoes.body) corpos.push(JSON.parse(opcoes.body)); return Response.json({ recipient_id: '9988776655', message_id: `mid.r.${corpos.length}` }); };
  await chat.enviarTexto('9988776655', 'Respondendo você', 'Equipe', fetcher, Date.now(), 'mid.in1');
  assert.deepEqual(corpos.at(-1).reply_to, { mid: 'mid.in1' });
  await chat.reagir('9988776655', 'mid.in1', fetcher);
  assert.equal(corpos.at(-1).sender_action, 'react'); assert.deepEqual(corpos.at(-1).payload, { message_id: 'mid.in1', reaction: 'love' });
  await chat.apagarDoErp('9988776655', 'mid.in1');
  assert.ok(!(await chat.mensagensDe('9988776655')).some((m) => m.id === 'mid.in1'));
});
