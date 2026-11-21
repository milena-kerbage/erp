import { carregarAjustesInstagram } from '@/lib/instagram/ajustes';
import { apagarDoErp, enviarTexto, marcarLidas, mensagensDe, reagir } from '@/lib/instagram/chat';
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
    const corpo = await jsonBody(request), sessao = await getSession(false), igsid = (await context.params).igsid;
    if (corpo.acao === 'reagir') return reagir(igsid, typeof corpo.mid === 'string' ? corpo.mid : '');
    return enviarTexto(igsid, typeof corpo.texto === 'string' ? corpo.texto : '', sessao?.name || usuario.id, fetch, Date.now(), typeof corpo.respondendo === 'string' ? corpo.respondendo : undefined);
  }, true, 60);
}
export async function PATCH(request: Request, context: { params: Promise<{ igsid: string }> }) {
  return api(request, async () => marcarLidas((await context.params).igsid), true, 240);
}
export async function DELETE(request: Request, context: { params: Promise<{ igsid: string }> }) {
  return api(request, async () => apagarDoErp((await context.params).igsid, new URL(request.url).searchParams.get('id') || ''), true, 60);
}
