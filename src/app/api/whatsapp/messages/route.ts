import { addNote, discardFailedMessage, messagesFor, sendMessage } from '@/lib/whatsapp/core';
import { api, jsonBody, boundedQuery } from '@/lib/whatsapp/server';
import { queueApplicationEvent } from '@/lib/erp/dispatch';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(request: Request) { return api(request, (user) => { const url = new URL(request.url); return messagesFor(url.searchParams.get('phone'), url.searchParams.get('before') || undefined, boundedQuery(url, 'limit', 100, 200), user.id); }, false, 300); }
// Mensagem para o cliente (texto, modelo) ou nota interna (type "note": fica só na conversa, nunca vai para a Meta).
export async function POST(request: Request) {
  return api(request, async (user) => {
    const corpo = await jsonBody(request);
    if (corpo.type === 'note') return addNote(corpo, user.id);
    const result = await sendMessage({ ...corpo, author: user.id });
    if (!result.duplicate) await queueApplicationEvent('message.sent', result.message.id);
    return result;
  }, true, 60);
}
export async function DELETE(request: Request) { return api(request, () => { const url = new URL(request.url); return discardFailedMessage(url.searchParams.get('phone'), url.searchParams.get('id')); }, true, 60); }
