import { readBytes } from '../whatsapp/core.ts';
import { InstagramError, instagramConfig, instagramUrls, requireOAuthConfig } from './config.ts';
import { seal } from './crypto.ts';
import { connectionToken, currentConnection, instagramDb, saveConnection } from './store.ts';

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
  if (!response.ok || body.error || body.error_type) throw new InstagramError(502, 'O Instagram recusou a operação. Confira credenciais, permissões, conta e configurações no painel da Meta.', 'META_REJECTED');
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
  const url = new URL('https://www.instagram.com/oauth/authorize');
  url.search = new URLSearchParams({ client_id: config.appId, redirect_uri: instagramUrls().redirect, response_type: 'code', scope: config.scopes.join(','), state, enable_fb_login: 'false' }).toString();
  return url.toString();
}
export async function exchangeCode(code: string, fetcher: typeof fetch = fetch, authorizedAt = Date.now()) {
  const config = requireOAuthConfig();
  if (!code || code.length > 4096 || /\s/.test(code)) throw new InstagramError(400, 'Código de autorização inválido.');
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
  const config = requireOAuthConfig(), c = await currentConnection();
  if (!c) throw new InstagramError(409, 'Conecte o Instagram primeiro.', 'NOT_CONNECTED');
  const fields = subscribedFields(JSON.parse(c.scopes_json));
  if (!fields.length) throw new InstagramError(409, 'Autorize mensagens ou comentários para habilitar notificações.', 'PERMISSION_REQUIRED');
  const body = await metaRequest(`https://graph.instagram.com/${config.version}/${c.account_id}/subscribed_apps`, {
    method: 'POST', headers: { Authorization: `Bearer ${await connectionToken(c)}` }, body: new URLSearchParams({ subscribed_fields: fields.join(',') }),
  }, fetcher);
  if (body.success !== true) throw new InstagramError(502, 'O Instagram não confirmou a inscrição.', 'SUBSCRIPTION_FAILED');
  const result = await instagramDb().prepare('UPDATE instagram_connections SET fields_json = ? WHERE subject_hash = ? AND token_cipher = ?').run(JSON.stringify(fields), c.subject_hash, c.token_cipher);
  if (!result.changes) throw new InstagramError(409, 'A conexão mudou. Atualize a configuração.');
  return { subscribed: true, fields };
}
export async function refreshToken(fetcher: typeof fetch = fetch, now = Date.now()) {
  const c = await currentConnection();
  if (!c) throw new InstagramError(409, 'Conecte o Instagram primeiro.', 'NOT_CONNECTED');
  if (now - c.refreshed_at < 86400_000) throw new InstagramError(409, 'Aguarde 24 horas após a emissão ou renovação do token.', 'TOKEN_TOO_RECENT');
  const url = new URL('https://graph.instagram.com/refresh_access_token');
  url.search = new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: await connectionToken(c) }).toString();
  const body = await metaRequest(url, {}, fetcher), cipher = seal(token(body.access_token), `token:${c.subject_hash}`), expires = now + lifetime(body.expires_in) * 1000;
  const result = await instagramDb().prepare('UPDATE instagram_connections SET token_cipher = ?,expires_at = ?,refreshed_at = ? WHERE subject_hash = ? AND token_cipher = ?').run(cipher, expires, now, c.subject_hash, c.token_cipher);
  if (!result.changes) throw new InstagramError(409, 'A conexão mudou durante a renovação. Atualize a configuração.');
  return { refreshed: true, expiresAt: new Date(expires).toISOString() };
}
