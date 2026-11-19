import { currentRevision, unreadConversationCount } from '@/lib/whatsapp/core';
import { api } from '@/lib/whatsapp/server';
export const runtime = 'nodejs';
// Consulta barata que as telas fazem a cada poucos segundos: só quando a revisão muda elas buscam lista e conversa.
export async function GET(request: Request) { return api(request, async () => ({ revision: await currentRevision(), unread: await unreadConversationCount() }), false, 600); }
