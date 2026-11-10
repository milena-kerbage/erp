import { readBytes, limited } from '@/lib/whatsapp/core';
import { InstagramError } from '@/lib/instagram/config';
import { verifyWebhook } from '@/lib/instagram/crypto';
import { verifyChallenge, receiveWebhook } from '@/lib/instagram/webhook';
import { instagramError, instagramHeaders } from '@/lib/instagram/server';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(request: Request) {
  try { return new Response(verifyChallenge(new URL(request.url)), { headers: { ...instagramHeaders, 'Content-Type': 'text/plain; charset=utf-8' } }); }
  catch (error) { return instagramError(error); }
}
export async function POST(request: Request) {
  try {
    const bytes = await readBytes(request, 1024 * 1024);
    if (!verifyWebhook(bytes, request.headers.get('x-hub-signature-256'))) throw new InstagramError(403, 'Assinatura do webhook inválida.', 'INVALID_SIGNATURE');
    if (await limited('instagram-verified-webhook', 1000)) throw new InstagramError(429, 'Limite temporário de eventos atingido.');
    let payload;
    try { payload = JSON.parse(bytes.toString('utf8')); } catch { throw new InstagramError(400, 'JSON inválido.'); }
    await receiveWebhook(payload);
    return new Response('EVENT_RECEIVED', { headers: { ...instagramHeaders, 'Content-Type': 'text/plain; charset=utf-8' } });
  } catch (error) { return instagramError(error); }
}
