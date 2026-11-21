import { carregarAjustesInstagram } from '@/lib/instagram/ajustes';
import { enviarTexto, marcarLidas, mensagensDe } from '@/lib/instagram/chat';
import { api, jsonBody } from '@/lib/whatsapp/server';
import { getSession } from '@/lib/auth/server';
export const runtime = 'nodejs';
export const maxDuration = 30;
// Uma conversa do Direct: mensagens (GET), resposta em texto (POST) e leitura (PATCH).
export async function GET(request: Request, context: { params: Promise<{ igsid: string }> }) {
  return api(request, async () => { await carregarAjustesInstagram(); return { mensagens: await mensagensDe((await context.params).igsid) }; }, false, 240);
}
export async function POST(request: Request, context: { params: Promise<{ igsid: string }> }) {
  return api(request, async (usuario) => {
    await carregarAjustesInstagram();
    const corpo = await jsonBody(request), sessao = await getSession(false);
    return enviarTexto((await context.params).igsid, typeof corpo.texto === 'string' ? corpo.texto : '', sessao?.name || usuario.id);
  }, true, 60);
}
export async function PATCH(request: Request, context: { params: Promise<{ igsid: string }> }) {
  return api(request, async () => marcarLidas((await context.params).igsid), true, 240);
}
