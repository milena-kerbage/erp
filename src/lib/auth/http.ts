import 'server-only';
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function trustedOrigin(request: Request) {
  const configured = process.env.AUTH_ORIGIN;
  if (process.env.NODE_ENV === 'production' && (!configured || !configured.startsWith('https://'))) throw new HttpError(503, 'Acesso temporariamente indisponível.');
  const expected = configured ? new URL(configured).origin : new URL(request.url).origin;
  if (request.headers.get('origin') !== expected || request.headers.get('sec-fetch-site') === 'cross-site') throw new HttpError(403, 'Requisição não permitida.');
  return expected;
}
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415, 'Formato inválido.');
  if (Number(request.headers.get('content-length')) > 4096) throw new HttpError(413, 'Dados inválidos.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Dados inválidos.');
  let text = '', size = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) { await reader.cancel(); throw new HttpError(413, 'Dados inválidos.'); }
      text += decoder.decode(value, {stream: true});
    }
    text += decoder.decode();
    const result = JSON.parse(text);
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error();
    return result;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'Dados inválidos.');
  }
}
