import { markConversationRead, markRead } from '@/lib/whatsapp/core';
import { api, jsonBody } from '@/lib/whatsapp/server';
export const runtime = 'nodejs';
// { phone }: abrir a conversa marca tudo como lido (como na Le Ange). { messageId }: compatibilidade.
export async function POST(request: Request) { return api(request, async () => { const corpo = await jsonBody(request); return corpo.phone ? markConversationRead(corpo.phone) : markRead(corpo.messageId); }, true, 120); }
