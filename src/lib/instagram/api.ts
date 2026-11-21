import { readBytes } from '../whatsapp/core.ts';
import { InstagramError, instagramConfig, instagramUrls, requireOAuthConfig } from './config.ts';
import { seal } from './crypto.ts';
import { connectionToken, currentConnection, instagramDb, saveConnection } from './store.ts';
import { carregarAjustesInstagram, gravarPaginaInstagram } from './ajustes.ts';

type ObjectValue = Record<string, unknown>;
const object = (value: unknown): ObjectValue => value && typeof value === 'object' && !Array.isArray(value) ? value as ObjectValue : {};
function first(body: ObjectValue) { return Array.isArray(body.data) ? object(body.data[0]) : body; }
export async function metaRequest(url: URL | string, init: RequestInit = {}, fetcher: typeof fetch = fetch): Promise<ObjectValue> {
  let response: Response;
  try { response = await fetcher(url, { ...init, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000) }); }
  catch { throw new InstagramError(502, 'O Instagram não confirmou a operação. Tente novamente.', 'META_UNAVAILABLE'); }
  let body: ObjectValue;
  try { body = object(JSON.parse((await readBytes(response, 256 * 1024)).toString('utf8'))); }
  catch { throw new InstagramError(502, 'Resposta inválida do Instagram.', 'META_INVALID_RESPONSE'); }
  if (!response.ok || body.error || body.error_type) {
    // Código e mensagem da Meta (não trazem segredos) para a tela e o log dizerem o motivo real.
    const erro = object(body.error), codigo = Number(erro.code) || 0;
    const mensagem = (typeof erro.message === 'string' ? erro.message : typeof body.error_message === 'string' ? body.error_message : '').replace(/[A-Za-z0-9_-]{40,}/g, '…').slice(0, 220);
    throw new InstagramError(502, `A Meta recusou a operação${codigo ? ` (código ${codigo})` : ''}${mensagem ? `: ${mensagem}` : '.'}`, codigo ? `META_${codigo}` : 'META_REJECTED');
  }
  return body;
}
function token(value: unknown) {
  if (typeof value !== 'string' || value.length < 20 || value.length > 4096 || /\s/.test(value)) throw new InstagramError(502, 'Token inválido recebido do Instagram.', 'META_INVALID_RESPONSE');
  return value;
}
function lifetime(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) <= 0 || Number(value) > 31536000) throw new InstagramError(502, 'Validade inválida recebida do Instagram.', 'META_INVALID_RESPONSE');
  return Number(value);
}
function identifier(value: unknown) {
  const id = typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : value;
  if (typeof id !== 'string' || !/^\d{1,32}$/.test(id)) throw new InstagramError(502, 'Identificador inválido recebido do Instagram.', 'META_INVALID_RESPONSE');
  return id;
}
export function authorizationUrl(state: string) {
  const config = requireOAuthConfig();
  if (!/^[a-f0-9]{64}$/.test(state)) throw new InstagramError(400, 'Estado de autorização inválido.');
  if (config.modo === 'facebook') {
    // Login do Facebook para Empresas (configuração com as permissões de Instagram), no formato passado pela Meta.
    const url = new URL('https://www.facebook.com/dialog/oauth');
    url.search = new URLSearchParams({ client_id: config.appId, config_id: config.configId, display: 'popup', override_default_response_type: 'true', redirect_uri: instagramUrls().redirect, response_type: 'code', state, prompt: 'login' }).toString();
    return url.toString();
  }
  const url = new URL('https://www.instagram.com/oauth/authorize');
  url.search = new URLSearchParams({ client_id: config.appId, redirect_uri: instagramUrls().redirect, response_type: 'code', scope: config.scopes.join(','), state, enable_fb_login: 'false' }).toString();
  return url.toString();
}
export async function exchangeCode(code: string, fetcher: typeof fetch = fetch, authorizedAt = Date.now()) {
  await carregarAjustesInstagram();
  const config = requireOAuthConfig();
  if (!code || code.length > 4096 || /\s/.test(code)) throw new InstagramError(400, 'Código de autorização inválido.');
  if (config.modo === 'facebook') return exchangeFacebook(code, fetcher, authorizedAt);
  const form = new FormData();
  for (const [key, value] of Object.entries({ client_id: config.appId, client_secret: config.appSecret, grant_type: 'authorization_code', redirect_uri: instagramUrls().redirect, code })) form.set(key, value);
  const short = first(await metaRequest('https://api.instagram.com/oauth/access_token', { method: 'POST', body: form }, fetcher));
  const subjectId = identifier(short.user_id);
  const longUrl = new URL('https://graph.instagram.com/access_token');
  longUrl.search = new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: config.appSecret, access_token: token(short.access_token) }).toString();
  const long = await metaRequest(longUrl, {}, fetcher), accessToken = token(long.access_token), expiresIn = lifetime(long.expires_in);
  const profileUrl = new URL(`https://graph.instagram.com/${config.version}/me`);
  profileUrl.searchParams.set('fields', 'id,user_id,username');
  const profile = first(await metaRequest(profileUrl, { headers: { Authorization: `Bearer ${accessToken}` } }, fetcher));
  const accountId = identifier(profile.user_id);
  if (typeof profile.username !== 'string' || !/^[a-zA-Z0-9._]{1,30}$/.test(profile.username)) throw new InstagramError(502, 'Perfil inválido recebido do Instagram.');
  if (config.expectedUsername && profile.username.toLowerCase() !== config.expectedUsername) throw new InstagramError(403, 'Autorize o perfil do Instagram configurado para o Ateliê.', 'WRONG_ACCOUNT');
  const granted = typeof short.permissions === 'string' ? short.permissions.split(',').map(v => v.trim()) : Array.isArray(short.permissions) ? short.permissions.filter((v): v is string => typeof v === 'string') : ['instagram_business_basic'];
  if (!granted.includes('instagram_business_basic')) throw new InstagramError(403, 'Autorize a permissão básica do Instagram.', 'PERMISSION_REQUIRED');
  await saveConnection({ subjectId, accountId, username: profile.username, token: accessToken, scopes: config.scopes.filter(s => granted.includes(s)), expiresIn, authorizedAt });
  return { connected: true };
}
export function subscribedFields(scopes: string[]) {
  return [
    ...(scopes.includes('instagram_business_manage_messages') ? ['messages', 'messaging_postbacks', 'messaging_seen', 'message_reactions', 'messaging_referral'] : []),
    ...(scopes.includes('instagram_business_manage_comments') ? ['comments', 'live_comments'] : []),
  ];
}
export async function subscribeAccount(fetcher: typeof fetch = fetch) {
  const c = await currentConnection(), config = requireOAuthConfig();
  if (!c) throw new InstagramError(409, 'Conecte o Instagram primeiro.', 'NOT_CONNECTED');
  const fields = subscribedFields(JSON.parse(c.scopes_json));
  if (!fields.length) throw new InstagramError(409, 'Autorize mensagens ou comentários para habilitar notificações.', 'PERMISSION_REQUIRED');
  if (config.modo === 'facebook') {
    // Mensagens do Instagram pela página ligada: o app é inscrito na página (os campos do objeto "instagram" ficam no painel).
    // Com página: inscreve a página; só Instagram: inscreve a própria conta do Instagram nos campos autorizados.
    const alvo = /^\d{1,32}$/.test(config.pageId) ? config.pageId : c.account_id;
    const inscrever = async (campos: string) => metaRequest(`https://graph.facebook.com/${config.version}/${alvo}/subscribed_apps`, { method: 'POST', body: new URLSearchParams({ subscribed_fields: campos, access_token: await connectionToken(c) }) }, fetcher);
    let resposta: ObjectValue;
    try { resposta = await inscrever(alvo === c.account_id ? fields.join(',') : 'messages,messaging_postbacks,message_reactions,message_reads'); }
    catch { resposta = await inscrever('messages'); }
    if (resposta.success !== true) throw new InstagramError(502, 'A Meta não confirmou a inscrição da página.', 'SUBSCRIPTION_FAILED');
    const atualizado = await instagramDb().prepare('UPDATE instagram_connections SET fields_json = ? WHERE subject_hash = ? AND token_cipher = ?').run(JSON.stringify(fields), c.subject_hash, c.token_cipher);
    if (!atualizado.changes) throw new InstagramError(409, 'A conexão mudou. Atualize a configuração.');
    return { subscribed: true, fields };
  }
  const body = await metaRequest(`https://graph.instagram.com/${config.version}/${c.account_id}/subscribed_apps`, {
    method: 'POST', headers: { Authorization: `Bearer ${await connectionToken(c)}` }, body: new URLSearchParams({ subscribed_fields: fields.join(',') }),
  }, fetcher);
  if (body.success !== true) throw new InstagramError(502, 'O Instagram não confirmou a inscrição.', 'SUBSCRIPTION_FAILED');
  const result = await instagramDb().prepare('UPDATE instagram_connections SET fields_json = ? WHERE subject_hash = ? AND token_cipher = ?').run(JSON.stringify(fields), c.subject_hash, c.token_cipher);
  if (!result.changes) throw new InstagramError(409, 'A conexão mudou. Atualize a configuração.');
  return { subscribed: true, fields };
}
export async function refreshToken(fetcher: typeof fetch = fetch, now = Date.now()) {
  await carregarAjustesInstagram();
  const c = await currentConnection();
  if (!c) throw new InstagramError(409, 'Conecte o Instagram primeiro.', 'NOT_CONNECTED');
  if (instagramConfig().modo === 'facebook') return { refreshed: false, naoVence: true, expiresAt: new Date(c.expires_at).toISOString() };
  if (now - c.refreshed_at < 86400_000) throw new InstagramError(409, 'Aguarde 24 horas após a emissão ou renovação do token.', 'TOKEN_TOO_RECENT');
  const url = new URL('https://graph.instagram.com/refresh_access_token');
  url.search = new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: await connectionToken(c) }).toString();
  const body = await metaRequest(url, {}, fetcher), cipher = seal(token(body.access_token), `token:${c.subject_hash}`), expires = now + lifetime(body.expires_in) * 1000;
  const result = await instagramDb().prepare('UPDATE instagram_connections SET token_cipher = ?,expires_at = ?,refreshed_at = ? WHERE subject_hash = ? AND token_cipher = ?').run(cipher, expires, now, c.subject_hash, c.token_cipher);
  if (!result.changes) throw new InstagramError(409, 'A conexão mudou durante a renovação. Atualize a configuração.');
  return { refreshed: true, expiresAt: new Date(expires).toISOString() };
}

/* ------------------------------------------------------------------ login pelo Facebook (config_id) */
// Roteiro do ERP da Le Ange: com o ID da configuração (Login do Facebook para Empresas) a Meta devolve um token de usuário
// do sistema, que não se estende e não lista páginas em /me/accounts. Então: troca o code (tenta os dois App Secrets),
// confere o token (app e permissões), descobre as páginas pelas permissões do próprio token (granular_scopes) e por
// /me/accounts, consulta cada página direto e guarda o acesso da página ligada ao @ esperado.
const ESCOPOS_FACEBOOK: Record<string, string> = { instagram_basic: 'instagram_business_basic', instagram_manage_messages: 'instagram_business_manage_messages', instagram_manage_comments: 'instagram_business_manage_comments', instagram_business_basic: 'instagram_business_basic', instagram_business_manage_messages: 'instagram_business_manage_messages', instagram_business_manage_comments: 'instagram_business_manage_comments' };
async function exchangeFacebook(code: string, fetcher: typeof fetch, authorizedAt: number) {
  const config = requireOAuthConfig(), base = `https://graph.facebook.com/${config.version}`;
  const segredos = [...new Set([config.appSecret, config.webhookSecret].filter((valor) => valor.length >= 16))];
  let userToken = '', segredo = '', ultimoErro: unknown = null;
  for (const candidato of segredos) {
    try {
      const url = new URL(`${base}/oauth/access_token`);
      url.search = new URLSearchParams({ client_id: config.appId, client_secret: candidato, redirect_uri: instagramUrls().redirect, code }).toString();
      userToken = token((await metaRequest(url, {}, fetcher)).access_token); segredo = candidato; break;
    } catch (erro) { ultimoErro = erro; }
  }
  if (!userToken) throw ultimoErro instanceof InstagramError ? new InstagramError(502, `${ultimoErro.message} Confira o App ID e o App Secret do app (Configurações do app > Básico) cadastrados na tela.`, 'EXCHANGE_FAILED') : new InstagramError(502, 'A Meta não trocou a autorização.', 'EXCHANGE_FAILED');
  const inspecionar = async (alvo: string) => {
    const url = new URL(`${base}/debug_token`);
    url.search = new URLSearchParams({ input_token: alvo, access_token: `${config.appId}|${segredo}` }).toString();
    return object((await metaRequest(url, {}, fetcher)).data);
  };
  const info = await inspecionar(userToken);
  if (info.is_valid !== true || String(info.app_id) !== config.appId) throw new InstagramError(403, 'A Meta não validou o acesso deste aplicativo.', 'TOKEN_INVALID');
  const escopos = (Array.isArray(info.scopes) ? info.scopes : []).filter((v): v is string => typeof v === 'string');
  if (!escopos.some((escopo) => escopo === 'instagram_basic' || escopo === 'instagram_business_basic')) throw new InstagramError(403, `A configuração do login não concedeu a permissão instagram_basic. Permissões recebidas: ${escopos.join(', ') || 'nenhuma'}.`, 'PERMISSION_REQUIRED');
  // Token de usuário comum: estende para longa duração (o de usuário do sistema não precisa).
  if (info.type === 'USER') {
    try {
      const url = new URL(`${base}/oauth/access_token`);
      url.search = new URLSearchParams({ grant_type: 'fb_exchange_token', client_id: config.appId, client_secret: segredo, fb_exchange_token: userToken }).toString();
      userToken = token((await metaRequest(url, {}, fetcher)).access_token);
    } catch { /* segue com o curto */ }
  }
  // Páginas: das permissões granulares do token (escopos de página) e de /me/accounts.
  const granulares = (Array.isArray(info.granular_scopes) ? info.granular_scopes : []).map(object);
  const idsDe = (filtro: (escopo: string) => boolean) => granulares.filter((g) => typeof g.scope === 'string' && filtro(g.scope)).flatMap((g) => (Array.isArray(g.target_ids) ? g.target_ids : []).map(String)).filter((id) => /^\d{1,32}$/.test(id));
  // A página cadastrada na tela (como o FACEBOOK_PAGE_ID da Le Ange) vem primeiro.
  const candidatas = new Set([config.pageId, ...idsDe((escopo) => escopo.startsWith('pages_') || escopo === 'business_management')].filter((id) => /^\d{1,32}$/.test(id)));
  // Usuário comum: /me/accounts; usuário do sistema: páginas atribuídas a ele no gerenciador de negócios.
  for (const caminho of ['me/accounts', 'me/assigned_pages', ...(typeof info.user_id === 'string' && /^\d{1,32}$/.test(info.user_id) ? [`${info.user_id}/assigned_pages`] : [])]) {
    try {
      const url = new URL(`${base}/${caminho}`);
      url.search = new URLSearchParams({ fields: 'id', limit: '100', access_token: userToken }).toString();
      const resposta = await metaRequest(url, {}, fetcher);
      for (const pagina of (Array.isArray(resposta.data) ? resposta.data : []).map(object)) if (typeof pagina.id === 'string') candidatas.add(pagina.id);
    } catch { /* este tipo de token não tem esta lista */ }
  }
  const contasInstagram = new Set(idsDe((escopo) => escopo.startsWith('instagram_')));
  const paginas: Array<{ id: string; token: string; ig: string; username: string }> = [];
  for (const id of [...candidatas].slice(0, 25)) {
    try {
      const url = new URL(`${base}/${id}`);
      url.search = new URLSearchParams({ fields: 'id,name,access_token,instagram_business_account{id,username}', access_token: userToken }).toString();
      const pagina = await metaRequest(url, {}, fetcher), conta = object(pagina.instagram_business_account);
      if (typeof pagina.access_token === 'string' && typeof conta.id === 'string') paginas.push({ id: String(pagina.id), token: pagina.access_token, ig: conta.id, username: typeof conta.username === 'string' ? conta.username : '' });
    } catch { /* página sem acesso para este token */ }
  }
  const escolhida = paginas.find((p) => p.username.toLowerCase() === config.expectedUsername) ?? (paginas.length === 1 && (!config.expectedUsername || contasInstagram.has(paginas[0].ig)) ? paginas[0] : undefined);
  // Só Instagram, sem página do Facebook: a conta vem das permissões do token e o próprio token (usuário do sistema)
  // acessa a conta direto pelo ID do Instagram.
  if (!escolhida && contasInstagram.size) {
    const contas: Array<{ id: string; username: string }> = [];
    for (const id of [...contasInstagram].slice(0, 10)) {
      try {
        const url = new URL(`${base}/${id}`);
        url.search = new URLSearchParams({ fields: 'id,username', access_token: userToken }).toString();
        const conta = await metaRequest(url, {}, fetcher);
        if (typeof conta.username === 'string') contas.push({ id: String(conta.id ?? id), username: conta.username });
      } catch { /* conta sem acesso para este token */ }
    }
    const conta = contas.find((c) => c.username.toLowerCase() === config.expectedUsername) ?? (contas.length === 1 && !config.expectedUsername ? contas[0] : undefined);
    if (conta && /^[a-zA-Z0-9._]{1,30}$/.test(conta.username)) {
      const vence = Number(info.expires_at), expiresIn = Number.isSafeInteger(vence) && vence > 0 ? Math.max(3600, Math.min(31536000, vence - Math.floor(Date.now() / 1000))) : 31536000;
      await gravarPaginaInstagram('', 'instagram-login');
      const granted = ['instagram_business_basic', ...escopos.map((escopo) => ESCOPOS_FACEBOOK[escopo]).filter(Boolean)];
      await saveConnection({ subjectId: identifier(info.user_id ?? conta.id), accountId: identifier(conta.id), username: conta.username, token: token(userToken), scopes: [...new Set(granted)], expiresIn, authorizedAt });
      return { connected: true };
    }
    if (contas.length) throw new InstagramError(403, `A conta autorizada foi ${contas.map((c) => `@${c.username}`).join(', ')}; na janela da Meta, selecione o @${config.expectedUsername}.`, 'WRONG_ACCOUNT');
  }
  if (!escolhida) {
    throw new InstagramError(403, paginas.length
      ? `A conta autorizada foi ${paginas.map((p) => `@${p.username || p.ig}`).join(', ')}; na janela da Meta, selecione a página ligada ao @${config.expectedUsername}.`
      : `A Meta não informou a página do Facebook ligada ao Instagram (páginas verificadas: ${candidatas.size}; permissões recebidas: ${escopos.join(', ') || 'nenhuma'}). Cadastre o ID da página do Facebook do Ateliê no cartão “App do Instagram” (no Facebook: página > Sobre > Transparência da página) e conecte de novo. Se preferir, inclua pages_show_list e pages_manage_metadata na configuração ${config.configId}.`, 'WRONG_ACCOUNT');
  }
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(escolhida.username)) throw new InstagramError(502, 'Perfil inválido recebido da Meta.');
  const infoPagina = await inspecionar(escolhida.token).catch(() => ({} as ObjectValue));
  const vence = Number(infoPagina.expires_at), expiresIn = Number.isSafeInteger(vence) && vence > 0 ? Math.max(3600, Math.min(31536000, vence - Math.floor(Date.now() / 1000))) : 31536000;
  await gravarPaginaInstagram(identifier(escolhida.id), 'instagram-login');
  const granted = ['instagram_business_basic', ...escopos.map((escopo) => ESCOPOS_FACEBOOK[escopo]).filter(Boolean)];
  await saveConnection({ subjectId: identifier(info.user_id ?? escolhida.id), accountId: identifier(escolhida.ig), username: escolhida.username, token: token(escolhida.token), scopes: [...new Set(granted)], expiresIn, authorizedAt });
  return { connected: true };
}
