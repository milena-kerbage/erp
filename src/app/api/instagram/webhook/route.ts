import { readBytes, limited } from '@/lib/whatsapp/core';
import { InstagramError } from '@/lib/instagram/config';
import { verifyWebhook } from '@/lib/instagram/crypto';
import { verifyChallenge, receiveWebhook } from '@/lib/instagram/webhook';
import { instagramError, instagramHeaders } from '@/lib/instagram/server';
import { carregarAjustesInstagram } from '@/lib/instagram/ajustes';
import { completarPerfis } from '@/lib/instagram/chat';
import { after } from 'next/server';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(request: Request) {
  try { await carregarAjustesInstagram(); return new Response(verifyChallenge(new URL(request.url)), { headers: { ...instagramHeaders, 'Content-Type': 'text/plain; charset=utf-8' } }); }
  catch (error) { return instagramError(error); }
}
export async function POST(request: Request) {
  try {
    await carregarAjustesInstagram();
    const bytes = await readBytes(request, 1024 * 1024);
    if (!verifyWebhook(bytes, request.headers.get('x-hub-signature-256'))) throw new InstagramError(403, 'Assinatura do webhook inválida.', 'INVALID_SIGNATURE');
    if (await limited('instagram-verified-webhook', 1000)) throw new InstagramError(429, 'Limite temporário de eventos atingido.');
    let payload;
    try { payload = JSON.parse(bytes.toString('utf8')); } catch { throw new InstagramError(400, 'JSON inválido.'); }
    const { novosContatos } = await receiveWebhook(payload);
    // Nome, @ e foto de quem escreveu pela primeira vez, sem segurar a resposta à Meta.
    if (novosContatos.length) after(() => completarPerfis(novosContatos).catch(() => 0));
    return new Response('EVENT_RECEIVED', { headers: { ...instagramHeaders, 'Content-Type': 'text/plain; charset=utf-8' } });
  } catch (error) { return instagramError(error); }
}
