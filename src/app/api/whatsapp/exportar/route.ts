import { exportConversation, limited, WhatsAppError } from '@/lib/whatsapp/core';
import { errorResponse, noStore } from '@/lib/whatsapp/server';
import { getSession } from '@/lib/auth/server';
import { developmentAccess } from '@/lib/auth/environment';
export const runtime = 'nodejs';
// A conversa em texto, para baixar (menu "Exportar conversa").
export async function GET(request: Request) {
  try {
    const session = await getSession(false);
    if (!session && !developmentAccess()) throw new WhatsAppError(401, 'Entre no sistema para usar esta integração.', 'UNAUTHORIZED');
    if (await limited(`api:${session?.id ?? 'development-access'}:exportar`, 20)) throw new WhatsAppError(429, 'Muitas solicitações. Aguarde um minuto.', 'RATE_LIMITED');
    const url = new URL(request.url), arquivo = await exportConversation(url.searchParams.get('phone'), url.searchParams.get('notas') !== '0');
    return new Response(arquivo.text, { headers: { ...noStore, 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="${arquivo.filename}"` } });
  } catch (error) { return errorResponse(error); }
}
