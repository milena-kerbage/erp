import { verifyEffectiveChallenge, effectiveSignatureValid, receiveWebhook, readBytes, limited, WhatsAppError } from '@/lib/whatsapp/core';
import { errorResponse, noStore } from '@/lib/whatsapp/server';
import { queueApplicationEvent } from '@/lib/erp/dispatch';
import { after } from 'next/server';
import { aplicarOrigensNoCRM } from '@/lib/whatsapp/origemCrm';
import type { OrigemDetectada } from '@/lib/whatsapp/origem';
import { sincronizarHistorico } from '@/lib/whatsapp/conexao';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(request: Request) {
  try { return new Response(await verifyEffectiveChallenge(new URL(request.url)), {headers: {...noStore, 'Content-Type': 'text/plain; charset=utf-8'}}); }
  catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    // Lotes do histórico do celular (coexistência) são maiores que mensagens comuns; a Vercel aceita até 4,5 MB.
    const bytes = await readBytes(request, 4 * 1024 * 1024);
    if (!await effectiveSignatureValid(bytes, request.headers.get('x-hub-signature-256'))) throw new WhatsAppError(403, 'Assinatura do webhook inválida.', 'INVALID_SIGNATURE');
    // O limite é aplicado após validar HMAC, para terceiros não consumirem a cota da Meta.
    if (await limited('verified-webhook', 1000)) throw new WhatsAppError(429, 'Limite temporário de eventos atingido.', 'RATE_LIMITED');
    let payload: unknown; try { payload = JSON.parse(bytes.toString('utf8')); } catch { throw new WhatsAppError(400, 'JSON inválido.', 'INVALID_JSON'); }
    const messageIds:string[]=[];
    // Conversas que chegaram por anúncio (Click to WhatsApp) ou pelo botão do site: a origem segue para o lead no CRM.
    const origens:OrigemDetectada[]=[];
    await receiveWebhook(payload,Date.now(),messageIds,origens);
    if (origens.length) after(() => aplicarOrigensNoCRM(origens).catch(() => null));
    for (const id of messageIds) await queueApplicationEvent('message.received',id);
    // Coexistência: no horário, pede à Meta os contatos e o histórico do celular (pedido único; sem rotina agendada na hospedagem).
    after(() => sincronizarHistorico('webhook', true).catch(() => null));
    return new Response('EVENT_RECEIVED', {headers: {...noStore, 'Content-Type': 'text/plain; charset=utf-8'}});
  } catch (error) { return errorResponse(error); }
}
