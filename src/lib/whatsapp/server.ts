import 'server-only';
import { getSession } from '@/lib/auth/server';
import { developmentAccess } from '@/lib/auth/environment';
import { trustedOrigin, HttpError } from '@/lib/auth/http';
import { effectiveConfiguration, limited, readBytes, WhatsAppError, type JsonObject } from './core';
import { IntegrationConfigurationError } from './config';
import { DatabaseConfigurationError, DatabaseOperationError } from '../database.ts';

export const noStore = { 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff' };
export function errorResponse(error: unknown) {
  if (error instanceof WhatsAppError) return Response.json({error: error.message, code: error.code}, {status: error.status, headers: noStore});
  if (error instanceof IntegrationConfigurationError) return Response.json({error: error.message, code: error.code}, {status: error.status, headers: noStore});
  if (error instanceof HttpError) return Response.json({error: error.message}, {status: error.status, headers: noStore});
  if (error instanceof DatabaseConfigurationError || error instanceof DatabaseOperationError) return Response.json({error: error.message, code: error.code}, {status: error.status, headers: noStore});
  return Response.json({error: 'A operação não pôde ser concluída. Verifique a configuração e tente novamente.'}, {status: 500, headers: noStore});
}
export async function api(request: Request, action: (user: {id: string}) => Promise<unknown> | unknown, mutation = false, maximum = 120) {
  try {
    const session = await getSession(mutation);
    if (!session && !developmentAccess()) throw new WhatsAppError(401, 'Entre no sistema para usar esta integração.', 'UNAUTHORIZED');
    const user = session || {id: 'development-access'};
    if (mutation) trustedOrigin(request);
    if (await limited(`api:${user.id}:${new URL(request.url).pathname}`, maximum)) throw new WhatsAppError(429, 'Muitas solicitações. Aguarde um minuto.', 'RATE_LIMITED');
    return Response.json(await action(user), {headers: noStore});
  } catch (error) { return errorResponse(error); }
}
export async function jsonBody(request: Request): Promise<JsonObject> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) throw new WhatsAppError(415, 'Use application/json.', 'INVALID_CONTENT_TYPE');
  const bytes = await readBytes(request, 16 * 1024);
  try { const value = JSON.parse(bytes.toString('utf8')); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); return value; }
  catch { throw new WhatsAppError(400, 'JSON inválido.', 'INVALID_JSON'); }
}
export async function publicUrls(request: Request) {
  const configured = (await effectiveConfiguration()).publicBaseUrl;
  const base = configured || new URL(request.url).origin;
  return {base, publicHttps: Boolean(configured), webhook: `${base}/api/whatsapp/webhook`, privacy: `${base}/privacidade`, terms: `${base}/termos`, deletion: `${base}/exclusao-de-dados`, cookies: `${base}/cookies`, communications: `${base}/politica-de-comunicacao`, policies: `${base}/politicas`, dataDeletionCallback: `${base}/api/meta/data-deletion`};
}
export function boundedQuery(url: URL, key: string, fallback: number, maximum: number) {
  const value = Number(url.searchParams.get(key) || fallback);
  if (!Number.isInteger(value) || value < (key === 'offset' ? 0 : 1) || value > maximum) throw new WhatsAppError(400, 'Paginação inválida.', 'INVALID_PAGINATION');
  return value;
}
