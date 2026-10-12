import { downloadMedia, limited, WhatsAppError } from '@/lib/whatsapp/core';
import { errorResponse, noStore } from '@/lib/whatsapp/server';
import { getSession } from '@/lib/auth/server';
import { developmentAccess } from '@/lib/auth/environment';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const user = await getSession();
    if (!user && !developmentAccess()) throw new WhatsAppError(401, 'Entre no sistema para acessar a mídia.', 'UNAUTHORIZED');
    if (await limited(`media:${user?.id || 'development'}`, 20)) throw new WhatsAppError(429, 'Muitos downloads. Aguarde um minuto.', 'RATE_LIMITED');
    const id = new URL(request.url).searchParams.get('messageId') || '';
    if (!id || id.length > 300) throw new WhatsAppError(400, 'Informe o identificador da mensagem.', 'INVALID_MESSAGE_ID');
    const media = await downloadMedia(id);
    return new Response(new Uint8Array(media.bytes), {headers: {...noStore, 'Content-Type': media.mime, 'Content-Disposition': `attachment; filename="${media.filename}"`, 'Content-Security-Policy': "default-src 'none'; sandbox"}});
  } catch (error) { return errorResponse(error); }
}
