// Conexão do WhatsApp em poucos cliques (trazida do ERP da Le Ange e adaptada ao banco cifrado deste ERP).
//
// Dois caminhos levam ao mesmo final (`finalizarConexao`):
//  1. Cadastro incorporado da Meta (Embedded Signup v4): o gestor clica em "Conectar", entra na Meta
//     numa janela, escolhe a empresa e o número. O navegador devolve um `code` de uso único, trocado
//     aqui pelo token da empresa. Modo "coexistencia" mantém o número também no app WhatsApp Business
//     do celular; modo "novo" registra um número só para a API.
//  2. Token de usuário do sistema colado (Meta Business > Usuários do sistema): sem cadastro
//     incorporado; a conta (WABA) e o número são descobertos a partir do próprio token.
//
// O final valida o token na Meta (app certo, permissões de WhatsApp), descobre conta e número, inscreve o
// app nos webhooks da conta, gera o que falta (token de verificação e chave de supressão) e grava tudo
// cifrado (config.ts). Nada é digitado à mão além do que a própria Meta exige uma única vez (app).

import { randomBytes, randomInt } from 'node:crypto';
import { createOAuthState, consumeOAuthState, recordManagementTest } from '../integrations/management.ts';
import { effectiveSettings, encryptionReady, GRAPH_VERSION_PADRAO, limparSegredo, saveSettings } from './config.ts';
import { db, historySyncProgress, lastWebhookAt, limited, readBytes, WhatsAppError } from './core.ts';

type Json = Record<string, unknown>;
const objeto = (valor: unknown): Json => (valor && typeof valor === 'object' && !Array.isArray(valor) ? valor as Json : {});
const lista = (valor: unknown): unknown[] => (Array.isArray(valor) ? valor : []);
const texto = (valor: unknown, maximo = 300) => (typeof valor === 'string' || typeof valor === 'number' ? String(valor).slice(0, maximo) : '');
const ehId = (valor: unknown) => /^[0-9]{5,30}$/.test(texto(valor));
const ESCOPOS = ['whatsapp_business_management', 'whatsapp_business_messaging'];

/** Campos que a Meta deve enviar ao webhook (Meta for Developers > WhatsApp > Configuração). */
export const CAMPOS_WEBHOOK = ['messages', 'smb_message_echoes', 'history', 'smb_app_state_sync', 'account_update', 'message_template_status_update', 'phone_number_quality_update'];

export type ModoConexao = 'coexistencia' | 'novo' | 'token';

// Erros da Meta mais comuns, em linguagem de gestor.
function mensagemDaMeta(codigo: number, subcodigo: number, contexto: string) {
  if (codigo === 190) return 'A Meta informou que o acesso expirou ou foi revogado. Conecte de novo.';
  if (codigo === 10 || codigo === 200 || codigo === 3) return 'O aplicativo não tem permissão para esta conta do WhatsApp. Na janela da Meta, marque a empresa e o número e conceda as permissões de WhatsApp.';
  if (codigo === 80008 || codigo === 4 || codigo === 17 || codigo === 613) return 'A Meta pediu para aguardar (limite de chamadas). Tente de novo em alguns minutos.';
  if (codigo === 100 && subcodigo === 33) return 'A Meta não encontrou esta conta ou número para este aplicativo.';
  if (codigo === 101 || codigo === 1) return 'A Meta recusou o App ID ou o App Secret. Copie de novo em Meta for Developers > Configurações do app > Básico.';
  if (codigo === 133005 || codigo === 133006) return 'O número pede verificação em duas etapas (PIN) diferente. Desative a confirmação em duas etapas no WhatsApp Manager e tente de novo.';
  if (codigo === 131031) return 'A conta do WhatsApp Business está bloqueada ou restrita pela Meta. Confira no WhatsApp Manager.';
  return `A Meta recusou ${contexto} (código ${codigo || 'desconhecido'}).`;
}

/** Chamada à Graph API com o token informado (não depende da configuração já gravada). */
async function meta(versao: string, caminho: string, opcoes: { token?: string; metodo?: 'GET' | 'POST' | 'DELETE'; corpo?: Json; query?: Record<string, string>; contexto: string }, fetcher: typeof fetch = fetch): Promise<Json> {
  const url = new URL(`https://graph.facebook.com/${versao}/${caminho}`);
  if (opcoes.query) url.search = new URLSearchParams(opcoes.query).toString();
  let resposta: Response;
  try {
    resposta = await fetcher(url.toString(), {
      method: opcoes.metodo ?? 'GET',
      headers: { ...(opcoes.token ? { Authorization: `Bearer ${opcoes.token}` } : {}), ...(opcoes.corpo ? { 'Content-Type': 'application/json' } : {}) },
      body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(20_000),
    });
  } catch { throw new WhatsAppError(502, `A Meta não respondeu ao ${opcoes.contexto}. Tente de novo em instantes.`, 'META_UNAVAILABLE'); }
  let corpo: Json;
  try { corpo = objeto(JSON.parse((await readBytes(resposta, 1024 * 1024)).toString('utf8'))); }
  catch { throw new WhatsAppError(502, `Resposta inválida da Meta no ${opcoes.contexto}.`, 'META_INVALID_RESPONSE'); }
  if (!resposta.ok || corpo.error) {
    const erro = objeto(corpo.error);
    throw new WhatsAppError(resposta.status === 429 ? 429 : 502, mensagemDaMeta(Number(erro.code), Number(erro.error_subcode), opcoes.contexto), `META_${Number(erro.code) || 'REJECTED'}`);
  }
  return corpo;
}

async function configuracaoAtual() {
  const { values, secrets } = await effectiveSettings();
  return { values, secrets, versao: /^v\d{2,3}\.0$/.test(values.graphVersion) ? values.graphVersion : GRAPH_VERSION_PADRAO };
}

/** O que falta para o botão "Conectar" funcionar. */
function pendenciasDoApp(values: { appId: string; embeddedConfigId: string }, appSecret: string) {
  const faltando: string[] = [];
  if (!ehId(values.appId)) faltando.push('App ID');
  if (appSecret.length < 16) faltando.push('App Secret');
  if (!ehId(values.embeddedConfigId)) faltando.push('ID da configuração do cadastro incorporado');
  return faltando;
}

/** Estado completo para a tela (sem token nem App Secret). */
export async function situacaoConexao(origemDaRequisicao: string) {
  const { values, secrets, versao } = await configuracaoAtual();
  const base = values.publicBaseUrl || origemDaRequisicao;
  const faltando = pendenciasDoApp(values, secrets.appSecret);
  const conectado = secrets.accessToken.length >= 20 && ehId(values.phoneNumberId) && ehId(values.businessAccountId);
  return {
    criptografiaPronta: encryptionReady(),
    app: {
      appId: values.appId, configId: values.embeddedConfigId, versao, appSecretSalvo: secrets.appSecret.length >= 16,
      cadastroIncorporadoPronto: faltando.length === 0, faltando,
      // Só App ID + App Secret já permitem conectar com token de usuário do sistema.
      tokenPossivel: ehId(values.appId) && secrets.appSecret.length >= 16,
    },
    conexao: {
      conectado, numero: values.connectedPhone, nome: values.connectedName, modo: values.connectionMode || (conectado ? 'token' : ''),
      desde: values.connectedAt, phoneNumberId: values.phoneNumberId, wabaId: values.businessAccountId,
    },
    historico: conectado && values.connectionMode === 'coexistencia' ? await situacaoHistorico(values.connectedAt) : null,
    webhook: { url: `${base}/api/whatsapp/webhook`, verifyToken: secrets.verifyToken, campos: CAMPOS_WEBHOOK, ultimoEvento: await lastWebhookAt() },
    meta: {
      dominio: new URL(base).host, paginaDoBotao: `${base}/configuracoes/whatsapp`, privacidade: `${base}/privacidade`, termos: `${base}/termos`,
      exclusao: `${base}/exclusao-de-dados`, exclusaoCallback: `${base}/api/meta/data-deletion`,
    },
  };
}

/** Cadastro do app da Meta (uma vez). App ID e App Secret são conferidos na própria Meta antes de gravar. */
export async function salvarApp(entrada: Json, ator: string, fetcher: typeof fetch = fetch) {
  const { values, secrets, versao } = await configuracaoAtual();
  const appId = texto(entrada.appId, 40).trim(), configId = texto(entrada.configId, 40).trim();
  const appSecret = limparSegredo(texto(entrada.appSecret, 400));
  if (appId && !ehId(appId)) throw new WhatsAppError(400, 'O App ID tem só números. Copie em Meta for Developers > Configurações do app > Básico.', 'INVALID_META_ID', 'appId');
  if (configId && !ehId(configId)) throw new WhatsAppError(400, 'O ID da configuração tem só números. Copie em Login do Facebook para Empresas > Configurações.', 'INVALID_META_ID', 'configId');
  if (appSecret && !/^[a-f0-9]{32}$/i.test(appSecret) && (appSecret.length < 16 || appSecret.length > 200)) throw new WhatsAppError(400, `O App Secret tem ${appSecret.length} caracteres; o da Meta tem 32 letras e números. Clique em "Mostrar" na Meta e copie de novo (confira se o navegador não preencheu uma senha salva).`, 'INVALID_SECRET', 'appSecret');
  const idFinal = appId || values.appId, segredoFinal = appSecret || secrets.appSecret;
  if (!ehId(idFinal)) throw new WhatsAppError(400, 'Informe o App ID.', 'MISSING_FIELD', 'appId');
  if (segredoFinal.length < 16) throw new WhatsAppError(400, 'Informe o App Secret.', 'MISSING_FIELD', 'appSecret');
  const trocouApp = (appId && appId !== values.appId) || (appSecret && appSecret !== secrets.appSecret);
  if (trocouApp) {
    // Confere o par na Meta: o token de app só sai com App ID e App Secret corretos.
    try { await meta(versao, 'oauth/access_token', { query: { client_id: idFinal, client_secret: segredoFinal, grant_type: 'client_credentials' }, contexto: 'conferência do aplicativo' }, fetcher); }
    catch (erro) { if (erro instanceof WhatsAppError && erro.code !== 'META_UNAVAILABLE') throw new WhatsAppError(400, 'A Meta não reconheceu este App ID com este App Secret. Copie os dois de novo em Meta for Developers > Configurações do app > Básico.', 'META_APP_REJECTED', appSecret ? 'appSecret' : 'appId'); throw erro; }
  }
  const novoApp = Boolean(appId && values.appId && appId !== values.appId);
  await saveSettings({
    values: { ...(appId ? { appId } : {}), ...(configId ? { embeddedConfigId: configId } : {}), ...(values.graphVersion ? {} : { graphVersion: GRAPH_VERSION_PADRAO }),
      // Outro aplicativo: a conexão anterior (token emitido para o app antigo) deixa de valer.
      ...(novoApp ? { phoneNumberId: '', businessAccountId: '', connectedPhone: '', connectedName: '', connectionMode: '', connectedAt: '' } : {}) },
    secrets: { ...(appSecret ? { appSecret } : {}) },
    ...(novoApp && secrets.accessToken ? { removeSecrets: ['accessToken'] } : {}),
  }, ator);
  await garantirSegredosLocais(ator);
}

/** Token de verificação do webhook e chave de supressão: gerados uma vez, sem o gestor digitar nada. */
async function garantirSegredosLocais(ator: string) {
  const { secrets } = await configuracaoAtual();
  if (secrets.verifyToken.length < 16) await saveSettings({ secrets: { verifyToken: randomBytes(24).toString('hex') } }, ator);
  // A chave de supressão nunca é trocada depois de existir (protege os descadastros); só nasce se faltar.
  if (secrets.suppressionSecret.length < 32) {
    try { await saveSettings({ secrets: { suppressionSecret: randomBytes(32).toString('hex') } }, ator); }
    catch { /* Bloqueada por descadastros já gravados: o diagnóstico avançado mostra a pendência. */ }
  }
}

/** Abre uma sessão de cadastro presa à sessão do gestor (o `state` volta no fim e é de uso único). */
export async function prepararConexao(usuario: { id: string; development: boolean }, sessao: string | undefined) {
  if (!encryptionReady()) throw new WhatsAppError(503, 'A chave de criptografia do servidor (INTEGRATION_ENCRYPTION_KEY) não está configurada na hospedagem.', 'ENCRYPTION_NOT_CONFIGURED');
  if (!sessao || usuario.development) throw new WhatsAppError(401, 'Entre no ERP com sua conta para conectar o WhatsApp.', 'REAL_SESSION_REQUIRED');
  const { values, secrets, versao } = await configuracaoAtual();
  const faltando = pendenciasDoApp(values, secrets.appSecret);
  if (faltando.length) throw new WhatsAppError(409, `Antes de conectar, cadastre no app da Meta: ${faltando.join(', ')}.`, 'APP_NOT_READY');
  return { appId: values.appId, configId: values.embeddedConfigId, versao, state: await createOAuthState(usuario.id, sessao) };
}

/** Troca o `code` do cadastro incorporado pelo token da empresa e finaliza. */
export async function concluirConexao(entrada: Json, usuario: { id: string; development: boolean }, sessao: string | undefined, fetcher: typeof fetch = fetch) {
  const state = texto(entrada.state, 100), code = texto(entrada.code, 4096);
  const modo: ModoConexao = entrada.modo === 'novo' ? 'novo' : 'coexistencia';
  if (!sessao || !await consumeOAuthState(state, usuario.id, sessao)) throw new WhatsAppError(409, 'A janela de conexão expirou. Clique em "Conectar" de novo.', 'SESSION_EXPIRED');
  if (!code) throw new WhatsAppError(400, 'A Meta não devolveu a autorização. Conclua todas as etapas na janela da Meta.', 'MISSING_CODE');
  const { values, secrets, versao } = await configuracaoAtual();
  // O cadastro incorporado usa o SDK do Facebook: a troca do code é feita sem redirect_uri.
  const resposta = await meta(versao, 'oauth/access_token', { query: { client_id: values.appId, client_secret: secrets.appSecret, code }, contexto: 'troca da autorização' }, fetcher);
  const token = texto(resposta.access_token, 8192);
  if (token.length < 20) throw new WhatsAppError(502, 'A Meta não emitiu o acesso. Conecte de novo.', 'META_NO_TOKEN');
  return finalizarConexao(token, { modo, wabaId: texto(entrada.wabaId, 40), phoneNumberId: texto(entrada.phoneNumberId, 40) }, usuario.id, fetcher);
}

/** Caminho sem cadastro incorporado: token de usuário do sistema colado pelo gestor. */
export async function conectarComToken(entrada: Json, ator: string, fetcher: typeof fetch = fetch) {
  const token = limparSegredo(texto(entrada.token, 9000));
  if (token.length < 20) throw new WhatsAppError(400, `O token tem ${token.length} caracteres; o da Meta começa com "EAA" e tem centenas. Confira se o navegador não colocou uma senha salva no campo.`, 'INVALID_SECRET', 'token');
  return finalizarConexao(token, { modo: 'token', phoneNumberId: texto(entrada.phoneNumberId, 40) }, ator, fetcher);
}

type Numero = { id: string; numero: string; nome: string; qualidade: string };

async function finalizarConexao(token: string, opcoes: { modo: ModoConexao; wabaId?: string; phoneNumberId?: string }, ator: string, fetcher: typeof fetch) {
  const { values, secrets, versao } = await configuracaoAtual();
  if (!ehId(values.appId) || secrets.appSecret.length < 16) throw new WhatsAppError(409, 'Cadastre antes o App ID e o App Secret do aplicativo da Meta.', 'APP_NOT_READY');
  const campoToken = opcoes.modo === 'token' ? 'token' : undefined;

  // 1. O token é do nosso app, está válido e tem as permissões de WhatsApp?
  const inspecao = objeto((await meta(versao, 'debug_token', { token: `${values.appId}|${secrets.appSecret}`, query: { input_token: token }, contexto: 'conferência do acesso' }, fetcher)).data);
  if (inspecao.is_valid !== true) throw new WhatsAppError(400, 'A Meta informou que este acesso não é válido (expirado ou revogado).', 'TOKEN_INVALID', campoToken);
  if (texto(inspecao.app_id) !== values.appId) throw new WhatsAppError(400, 'Este token foi emitido para outro aplicativo da Meta. Gere o token no mesmo app cadastrado aqui.', 'TOKEN_OTHER_APP', campoToken);
  const escopos = lista(inspecao.scopes).map((item) => texto(item));
  const faltam = ESCOPOS.filter((escopo) => !escopos.includes(escopo));
  if (faltam.length) throw new WhatsAppError(400, `Faltam permissões no acesso: ${faltam.join(', ')}. Ao gerar o token (ou na janela da Meta), marque as permissões de WhatsApp.`, 'TOKEN_SCOPES', campoToken);

  // 2. Qual conta (WABA)? A janela da Meta informa; senão, sai das permissões do próprio token.
  const contas = lista(inspecao.granular_scopes).map(objeto).filter((escopo) => escopo.scope === 'whatsapp_business_management').flatMap((escopo) => lista(escopo.target_ids).map((id) => texto(id))).filter(ehId);
  const candidatas = [...new Set([opcoes.wabaId, ...contas].filter((id): id is string => ehId(id)))];
  if (!candidatas.length) throw new WhatsAppError(400, 'O acesso não inclui nenhuma conta do WhatsApp Business. Ao autorizar, selecione a conta e o número.', 'NO_WABA', campoToken);

  // 3. Qual número? O escolhido na janela; senão, o único da conta; com vários, o gestor escolhe.
  let escolhido: { waba: string; numero: Numero } | null = null;
  const todos: Array<Numero & { waba: string }> = [];
  for (const waba of candidatas.slice(0, 10)) {
    const resposta = await meta(versao, `${waba}/phone_numbers`, { token, query: { fields: 'id,display_phone_number,verified_name,quality_rating', limit: '50' }, contexto: 'consulta dos números' }, fetcher);
    for (const item of lista(resposta.data).map(objeto)) {
      const numero = { id: texto(item.id, 40), numero: texto(item.display_phone_number, 40), nome: texto(item.verified_name, 120), qualidade: texto(item.quality_rating, 20), waba };
      if (!ehId(numero.id)) continue;
      todos.push(numero);
      if (opcoes.phoneNumberId && numero.id === opcoes.phoneNumberId) escolhido = { waba, numero };
    }
  }
  if (!escolhido && todos.length === 1) escolhido = { waba: todos[0].waba, numero: todos[0] };
  if (!escolhido) {
    if (!todos.length) throw new WhatsAppError(400, 'A conta autorizada ainda não tem número de WhatsApp. Adicione o número no WhatsApp Manager ou escolha outro na janela da Meta.', 'NO_PHONE', campoToken);
    throw new WhatsAppError(409, 'A conta tem mais de um número. Escolha qual será usado pelo ERP.', 'CHOOSE_PHONE', 'phoneNumberId', todos.map(({ id, numero, nome }) => ({ id, numero, nome })));
  }
  const { waba, numero } = escolhido;
  const avisos: string[] = [];

  // 4. Número novo (fora do app do celular): registra na Cloud API com um PIN de duas etapas.
  if (opcoes.modo === 'novo') {
    try { await meta(versao, `${numero.id}/register`, { token, metodo: 'POST', corpo: { messaging_product: 'whatsapp', pin: String(randomInt(0, 1_000_000)).padStart(6, '0') }, contexto: 'registro do número' }, fetcher); }
    catch (erro) { avisos.push(`Registro do número: ${erro instanceof Error ? erro.message : 'não confirmado'} O número pode já estar registrado; teste o recebimento.`); }
  }

  // 5. Inscreve o app nos webhooks da conta (com nova tentativa quando a Meta pede para aguardar).
  for (let tentativa = 0; ; tentativa++) {
    try { await meta(versao, `${waba}/subscribed_apps`, { token, metodo: 'POST', corpo: {}, contexto: 'inscrição do webhook' }, fetcher); break; }
    catch (erro) {
      if (tentativa < 1 && erro instanceof WhatsAppError && erro.code === 'META_80008') { await new Promise((ok) => setTimeout(ok, 4000)); continue; }
      avisos.push(`Inscrição do webhook: ${erro instanceof Error ? erro.message : 'não confirmada'} Use "Testar conexão" para tentar de novo.`);
      break;
    }
  }

  // 6. Grava tudo cifrado e gera o que o webhook precisa.
  await saveSettings({
    values: { phoneNumberId: numero.id, businessAccountId: waba, connectedPhone: numero.numero, connectedName: numero.nome, connectionMode: opcoes.modo, connectedAt: new Date().toISOString(), ...(values.graphVersion ? {} : { graphVersion: versao }) },
    secrets: { accessToken: token },
  }, ator);
  await garantirSegredosLocais(ator);
  // Coexistência: contatos e histórico do celular são pedidos 5 min depois (a Meta valida o número antes).
  await gravarPedido(opcoes.modo === 'coexistencia' ? { agendadoPara: new Date(Date.now() + ESPERA_SYNC_MS).toISOString() } : null);
  await db().prepare("DELETE FROM metadata WHERE key = 'historySync'").run();
  await recordManagementTest('conexao', true, `WhatsApp conectado: ${numero.numero || numero.id}${numero.nome ? ` (${numero.nome})` : ''}.`, [`Modo: ${opcoes.modo}.`, `Conta: ${waba}.`, ...avisos], ator);
  return { conectado: true, numero: numero.numero, nome: numero.nome, qualidade: numero.qualidade, avisos };
}

/** Confere na Meta o número e a inscrição do app; refaz a inscrição se tiver caído. */
export async function testarConexao(ator: string, fetcher: typeof fetch = fetch) {
  const { values, secrets, versao } = await configuracaoAtual();
  if (secrets.accessToken.length < 20 || !ehId(values.phoneNumberId) || !ehId(values.businessAccountId)) throw new WhatsAppError(409, 'O WhatsApp ainda não está conectado.', 'NOT_CONNECTED');
  const token = secrets.accessToken;
  const numero = await meta(versao, values.phoneNumberId, { token, query: { fields: 'id,display_phone_number,verified_name,quality_rating' }, contexto: 'consulta do número' }, fetcher);
  let inscritos = await meta(versao, `${values.businessAccountId}/subscribed_apps`, { token, contexto: 'consulta da inscrição' }, fetcher);
  const inscrito = () => lista(inscritos.data).some((item) => texto(objeto(objeto(item).whatsapp_business_api_data).id) === values.appId);
  let reinscrito = false;
  if (!inscrito()) {
    await meta(versao, `${values.businessAccountId}/subscribed_apps`, { token, metodo: 'POST', corpo: {}, contexto: 'inscrição do webhook' }, fetcher);
    inscritos = await meta(versao, `${values.businessAccountId}/subscribed_apps`, { token, contexto: 'consulta da inscrição' }, fetcher);
    reinscrito = true;
  }
  const resultado = { numero: texto(numero.display_phone_number, 40), nome: texto(numero.verified_name, 120), qualidade: texto(numero.quality_rating, 20), inscrito: inscrito(), reinscrito, ultimoEvento: await lastWebhookAt() };
  if (resultado.numero !== values.connectedPhone || resultado.nome !== values.connectedName) await saveSettings({ values: { connectedPhone: resultado.numero, connectedName: resultado.nome } }, ator);
  await recordManagementTest('conexao-teste', resultado.inscrito, resultado.inscrito ? `Número ${resultado.numero} respondeu e o app está inscrito nos webhooks.` : 'O número respondeu, mas a inscrição do app não foi confirmada.', [`Qualidade: ${resultado.qualidade || 'não informada'}.`, ...(reinscrito ? ['A inscrição tinha caído e foi refeita.'] : [])], ator);
  return resultado;
}

/** Desliga o canal no ERP: apaga o acesso e os IDs (as conversas ficam). */
export async function desconectar(ator: string) {
  const { secrets } = await configuracaoAtual();
  await saveSettings({
    values: { phoneNumberId: '', businessAccountId: '', connectedPhone: '', connectedName: '', connectionMode: '', connectedAt: '' },
    ...(secrets.accessToken ? { removeSecrets: ['accessToken'] } : {}),
  }, ator);
  await gravarPedido(null);
  await recordManagementTest('conexao', true, 'WhatsApp desconectado no ERP. As conversas foram mantidas.', [], ator);
  return { conectado: false };
}

/* ------------------------------------------------------------------ histórico e contatos do celular */
// Coexistência (roteiro do ERP da Le Ange): passados 5 min da conexão, confirma o número no app e na Cloud API, pede os
// contatos (smb_app_state_sync) e, segundos depois, o histórico (history). Cada pedido sai uma única vez e só vale até 24 h
// após conectar; a Meta entrega o resultado pelo webhook (core.ts guarda contatos e mensagens). Sem rotina agendada na
// hospedagem, o pedido dispara quando a tela de conexão está aberta, a cada webhook recebido e pelo botão "Importar agora".

const ESPERA_SYNC_MS = 5 * 60_000;
const PRAZO_SYNC_MS = 24 * 3600_000;
const INTERVALO_SYNC_MS = 8_000;
type Passo = { estado: 'pedido' | 'erro'; em: string; requestId?: string; erro?: string };
type Pedido = { agendadoPara?: string; contatos?: Passo; historico?: Passo; esperando?: string; bloqueio?: string };

async function lerPedido(): Promise<Pedido> {
  const linha = await db().prepare("SELECT value FROM metadata WHERE key = 'historyRequest'").get() as { value: string } | undefined;
  try { return objeto(JSON.parse(linha?.value || '{}')) as Pedido; } catch { return {}; }
}
async function gravarPedido(pedido: Pedido | null) {
  if (!pedido) { await db().prepare("DELETE FROM metadata WHERE key IN ('historyRequest', 'historySync')").run(); return; }
  await db().prepare('INSERT INTO metadata VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run('historyRequest', JSON.stringify(pedido).slice(0, 4000));
}

async function situacaoHistorico(conectadoEm: string) {
  const pedido = await lerPedido(), recebido = await historySyncProgress();
  const limite = Date.parse(conectadoEm) + PRAZO_SYNC_MS;
  const estado = recebido.refused ? 'recusado'
    : pedido.historico?.estado === 'pedido' ? (recebido.progress >= 100 ? 'concluido' : 'importando')
    : pedido.bloqueio || pedido.historico?.estado === 'erro' ? 'erro'
    : Number.isFinite(limite) && Date.now() > limite ? 'expirado'
    : 'agendado';
  return {
    estado, progresso: recebido.progress, ultimoLote: recebido.lastAt, agendadoPara: pedido.agendadoPara ?? null, prazo: Number.isFinite(limite) ? new Date(limite).toISOString() : null,
    contatosPedidos: pedido.contatos?.estado === 'pedido', esperando: pedido.esperando ?? null, erro: pedido.bloqueio ?? pedido.historico?.erro ?? pedido.contatos?.erro ?? null,
  };
}

export type ResultadoSync = { resultado: 'pedido' | 'ja_pedido' | 'esperando' | 'aguardando_horario' | 'parado' | 'ocupado' | 'nao_se_aplica' | 'expirado'; mensagem: string };

/** Pede contatos e histórico quando chega a hora. `automatico`: só age no horário e não repete pedido com erro. */
export async function sincronizarHistorico(ator: string, automatico = false, fetcher: typeof fetch = fetch, intervaloMs = INTERVALO_SYNC_MS): Promise<ResultadoSync> {
  const { values, secrets, versao } = await configuracaoAtual();
  const conectado = secrets.accessToken.length >= 20 && ehId(values.phoneNumberId) && ehId(values.businessAccountId);
  if (!conectado || values.connectionMode !== 'coexistencia') return { resultado: 'nao_se_aplica', mensagem: 'O histórico do celular só existe na conexão com o app WhatsApp Business.' };
  const pedido = await lerPedido();
  if (pedido.historico?.estado === 'pedido') return { resultado: 'ja_pedido', mensagem: 'O histórico já foi pedido; a Meta entrega em lotes.' };
  if (Date.parse(values.connectedAt) + PRAZO_SYNC_MS < Date.now()) return { resultado: 'expirado', mensagem: 'A Meta só aceita o pedido do histórico nas primeiras 24 horas após conectar. Para importar, conecte o número de novo.' };
  if (automatico && (pedido.bloqueio || pedido.historico?.estado === 'erro' || pedido.contatos?.estado === 'erro')) return { resultado: 'parado', mensagem: pedido.bloqueio || 'O pedido parou com erro; use "Importar agora".' };
  if (automatico && pedido.agendadoPara && Date.parse(pedido.agendadoPara) > Date.now()) return { resultado: 'aguardando_horario', mensagem: 'O pedido sai 5 minutos depois da conexão.' };
  // Uma execução por vez (tela aberta, webhook e botão podem coincidir).
  if (await limited('whatsapp-sync-historico', 1, 45_000)) return { resultado: 'ocupado', mensagem: 'O pedido já está em andamento.' };
  const token = secrets.accessToken, fone = values.phoneNumberId;
  const agora = () => new Date().toISOString();
  const atual: Pedido = { ...pedido, bloqueio: undefined, esperando: undefined };
  const parar = async (motivo: string, esperar = false) => {
    if (esperar) await gravarPedido({ ...atual, esperando: motivo, agendadoPara: new Date(Date.now() + 60_000).toISOString() });
    else await gravarPedido({ ...atual, bloqueio: motivo });
    await recordManagementTest('historico', false, esperar ? `Histórico do celular: aguardando (${motivo}).` : `Histórico do celular parado: ${motivo}`, [], ator);
    return { resultado: esperar ? 'esperando' as const : 'parado' as const, mensagem: motivo };
  };

  // 1) O app inscrito na conta (repetível).
  try { await meta(versao, `${values.businessAccountId}/subscribed_apps`, { token, metodo: 'POST', corpo: {}, contexto: 'inscrição do webhook' }, fetcher); }
  catch (erro) { return parar(erro instanceof Error ? erro.message : 'Inscrição não confirmada.', erro instanceof WhatsAppError && erro.code === 'META_80008'); }
  // 2) O número no app do celular e na Cloud API.
  try {
    const numero = await meta(versao, fone, { token, query: { fields: 'id,is_on_biz_app,platform_type' }, contexto: 'consulta do número' }, fetcher);
    if (numero.is_on_biz_app !== true || numero.platform_type !== 'CLOUD_API') return parar('A Meta ainda está confirmando o número no app e na API. Tentamos de novo em 1 minuto.', true);
  } catch (erro) { return parar(erro instanceof Error ? erro.message : 'Número não confirmado.', true); }
  // 3) Contatos (pedido único) e 4) histórico (pedido único), com alguns segundos entre eles.
  const pedir = async (tipo: 'smb_app_state_sync' | 'history'): Promise<Passo> => {
    try {
      const resposta = await meta(versao, `${fone}/smb_app_data`, { token, metodo: 'POST', corpo: { messaging_product: 'whatsapp', sync_type: tipo }, contexto: tipo === 'history' ? 'pedido do histórico' : 'pedido dos contatos' }, fetcher);
      const requestId = texto(resposta.request_id, 200);
      return requestId ? { estado: 'pedido', em: agora(), requestId } : { estado: 'erro', em: agora(), erro: 'A Meta não confirmou o pedido.' };
    } catch (erro) { return { estado: 'erro', em: agora(), erro: erro instanceof Error ? erro.message : 'Pedido recusado.' }; }
  };
  if (!atual.contatos) {
    atual.contatos = await pedir('smb_app_state_sync');
    await gravarPedido(atual);
    if (atual.contatos.estado === 'erro') return parar(`Contatos: ${atual.contatos.erro}`);
    await new Promise((ok) => setTimeout(ok, intervaloMs));
  } else if (atual.contatos.estado === 'erro') return parar(`Contatos: ${atual.contatos.erro} O pedido é único: para tentar de novo, conecte o número outra vez.`);
  atual.historico = await pedir('history');
  await gravarPedido({ ...atual, agendadoPara: undefined });
  if (atual.historico.estado === 'erro') return parar(`Histórico: ${atual.historico.erro}`);
  await recordManagementTest('historico', true, 'Contatos e histórico do celular pedidos à Meta. Chegam pelo webhook em lotes.', [], ator);
  return { resultado: 'pedido', mensagem: 'Pedido feito. Contatos e conversas chegam em lotes nos próximos minutos.' };
}
