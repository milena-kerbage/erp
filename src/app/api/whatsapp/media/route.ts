import { limited, WhatsAppError } from '@/lib/whatsapp/core';
import { midiaParaVer } from '@/lib/whatsapp/midia';
import { errorResponse } from '@/lib/whatsapp/server';
import { getSession } from '@/lib/auth/server';
import { developmentAccess } from '@/lib/auth/environment';
export const runtime = 'nodejs';
export const maxDuration = 60;
// Mostra a mídia na conversa: redireciona para o link assinado do R2 (cacheado, com Range) ou, sem R2, devolve os bytes.
export async function GET(request: Request) {
  try {
    const user = await getSession(false);
    if (!user && !developmentAccess()) throw new WhatsAppError(401, 'Entre no sistema para acessar a mídia.', 'UNAUTHORIZED');
    if (await limited(`media:${user?.id || 'development'}`, 240)) throw new WhatsAppError(429, 'Muitas mídias abertas ao mesmo tempo. Aguarde um minuto.', 'RATE_LIMITED');
    const url = new URL(request.url), id = url.searchParams.get('messageId') || '', baixar = url.searchParams.get('download') === '1';
    if (!id || id.length > 300) throw new WhatsAppError(400, 'Informe o identificador da mensagem.', 'INVALID_MESSAGE_ID');
    const midia = await midiaParaVer(id);
    if ('url' in midia) return new Response(null, { status: 302, headers: { Location: midia.url, 'Cache-Control': 'private, max-age=1800', 'Referrer-Policy': 'no-referrer' } });
    return new Response(new Uint8Array(midia.bytes), { headers: { 'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff', 'Content-Type': midia.mime, 'Content-Disposition': `${baixar ? 'attachment' : 'inline'}; filename="${midia.filename}"`, 'Content-Security-Policy': "default-src 'none'; sandbox" } });
  } catch (error) { return errorResponse(error); }
}
