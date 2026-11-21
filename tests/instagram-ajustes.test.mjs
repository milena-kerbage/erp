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
  await assert.rejects(api.exchangeCode('codigo', semPagina), (erro) => erro.code === 'WRONG_ACCOUNT' && /ID da página/.test(erro.message) && /instagram_basic/.test(erro.message));
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
