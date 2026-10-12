import { verifyEffectiveChallenge, effectiveSignatureValid, receiveWebhook, readBytes, limited, WhatsAppError } from '@/lib/whatsapp/core';
import { errorResponse, noStore } from '@/lib/whatsapp/server';
import { queueApplicationEvent } from '@/lib/erp/dispatch';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(request: Request) {
  try { return new Response(await verifyEffectiveChallenge(new URL(request.url)), {headers: {...noStore, 'Content-Type': 'text/plain; charset=utf-8'}}); }
  catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const bytes = await readBytes(request, 1024 * 1024);
    if (!await effectiveSignatureValid(bytes, request.headers.get('x-hub-signature-256'))) throw new WhatsAppError(403, 'Assinatura do webhook inválida.', 'INVALID_SIGNATURE');
    // O limite é aplicado após validar HMAC, para terceiros não consumirem a cota da Meta.
    if (await limited('verified-webhook', 1000)) throw new WhatsAppError(429, 'Limite temporário de eventos atingido.', 'RATE_LIMITED');
    let payload: unknown; try { payload = JSON.parse(bytes.toString('utf8')); } catch { throw new WhatsAppError(400, 'JSON inválido.', 'INVALID_JSON'); }
    const messageIds:string[]=[];
    await receiveWebhook(payload,Date.now(),messageIds);
    for (const id of messageIds) await queueApplicationEvent('message.received',id);
    return new Response('EVENT_RECEIVED', {headers: {...noStore, 'Content-Type': 'text/plain; charset=utf-8'}});
  } catch (error) { return errorResponse(error); }
}
