import { effectiveConfiguration, saveSettings } from '../whatsapp/config.ts';
import { WhatsAppError, readBytes } from '../whatsapp/core.ts';
import { oauthAvailable, recordManagementTest, debugToken } from './management.ts';

export function oauthAuthorizationUrl(config: { appId: string; apiVersion: string; publicBaseUrl: string }, state: string) {
  if (!/^[0-9]{5,30}$/.test(config.appId) || !/^v\d{2,3}\.0$/.test(config.apiVersion) || !/^[a-f0-9]{64}$/.test(state)) throw new WhatsAppError(400, 'Configuração de autorização inválida.', 'INVALID_OAUTH_CONFIGURATION');
  const url = new URL(`https://www.facebook.com/${config.apiVersion}/dialog/oauth`);
  url.search = new URLSearchParams({ client_id: config.appId, state, response_type: 'code', redirect_uri: `${config.publicBaseUrl}/api/whatsapp/management/oauth/callback`, scope: 'whatsapp_business_management,whatsapp_business_messaging' }).toString();
  return url.toString();
}

async function requestToken(parameters: Record<string, string>, fetcher: typeof fetch) {
  const config = await effectiveConfiguration();
  if (!config.appId || config.appSecret.length < 16 || !/^v\d{2,3}\.0$/.test(config.apiVersion)) throw new WhatsAppError(503, 'Configure App ID, App Secret e versão Graph.', 'OAUTH_NOT_CONFIGURED');
  const url = new URL(`https://graph.facebook.com/${config.apiVersion}/oauth/access_token`);
  url.search = new URLSearchParams({ client_id: config.appId, client_secret: config.appSecret, ...parameters }).toString();
  let response: Response;
  try { response = await fetcher(url.toString(), { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000) }); }
  catch { throw new WhatsAppError(502, 'A Meta não confirmou a emissão do token. Tente autorizar novamente pelo painel.', 'META_UNAVAILABLE'); }
  let body: Record<string, unknown>;
  try { body = JSON.parse((await readBytes(response, 128 * 1024)).toString('utf8')); } catch { throw new WhatsAppError(502, 'Resposta de autorização inválida.', 'META_INVALID_RESPONSE'); }
  if (!response.ok || body.error || typeof body.access_token !== 'string' || body.access_token.length < 20 || body.access_token.length > 4096 || /\s/.test(body.access_token)) throw new WhatsAppError(502, 'A Meta recusou a emissão do token. Confira produto de login, permissões, versão, modo do app e URI de redirecionamento.', 'META_REJECTED');
  const lifetime = Number(body.expires_in ?? body.expires);
  return { token: body.access_token, expiresIn: Number.isSafeInteger(lifetime) && lifetime > 0 && lifetime < 31536000 ? lifetime : null };
}
export async function exchangeOAuthCode(code: string, actor: string, fetcher: typeof fetch = fetch) {
  const config = await effectiveConfiguration();
  if (!oauthAvailable(config) || !code || code.length > 4096) throw new WhatsAppError(503, 'Autorização Meta opcional ainda não está habilitada nesta instalação.', 'OAUTH_NOT_CONFIGURED');
  const result = await requestToken({ code, redirect_uri: `${config.publicBaseUrl}/api/whatsapp/management/oauth/callback` }, fetcher);
  await saveSettings({ secrets: { accessToken: result.token } }, actor);
  await recordManagementTest('oauth', true, 'Token emitido pela Meta e guardado criptografado no servidor.', ['Confirme permissões, validade e acesso à WABA antes de usar. Esta autorização não cria automaticamente número ou conta WhatsApp.'], actor);
  return { stored: true, expiresIn: result.expiresIn, expiresAt: result.expiresIn ? new Date(Date.now() + result.expiresIn * 1000).toISOString() : null };
}
export async function extendUserToken(actor: string, fetcher: typeof fetch = fetch) {
  const config = await effectiveConfiguration(), inspection = await debugToken(fetcher);
  if (!inspection.valid || !inspection.appMatches || inspection.type !== 'USER') throw new WhatsAppError(409, 'A troca de duração se aplica a token de usuário válido do aplicativo. Tokens de sistema ou de outros tipos seguem o fluxo de emissão da Meta Business.', 'TOKEN_NOT_EXTENDABLE');
  const result = await requestToken({ grant_type: 'fb_exchange_token', fb_exchange_token: config.accessToken }, fetcher);
  await saveSettings({ secrets: { accessToken: result.token } }, actor);
  await recordManagementTest('token-extension', true, 'A Meta confirmou a troca do token de usuário e o novo valor foi guardado.', ['A troca não garante validade permanente nem substitui permissões e ativos corretamente atribuídos.'], actor);
  return { stored: true, expiresIn: result.expiresIn, expiresAt: result.expiresIn ? new Date(Date.now() + result.expiresIn * 1000).toISOString() : null };
}
