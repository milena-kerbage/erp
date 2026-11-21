import { carregarAjustesInstagram } from '@/lib/instagram/ajustes';
import { listarConversas, naoLidas, sincronizarHistorico } from '@/lib/instagram/chat';
import { currentConnection } from '@/lib/instagram/store';
import { api, jsonBody } from '@/lib/whatsapp/server';
export const runtime = 'nodejs';
export const maxDuration = 60;
// Chat do Instagram para a equipe (sessão do ERP): lista, não lidas e sincronização do histórico do Direct.
export async function GET(request: Request) {
  return api(request, async () => {
    await carregarAjustesInstagram();
    const conexao = await currentConnection();
    if (new URL(request.url).searchParams.get('so') === 'naoLidas') return { naoLidas: conexao ? await naoLidas() : 0 };
    return { conectado: Boolean(conexao), username: conexao?.username ?? null, conversas: conexao ? await listarConversas() : [], naoLidas: conexao ? await naoLidas() : 0 };
  }, false, 240);
}
export async function POST(request: Request) {
  return api(request, async () => {
    await carregarAjustesInstagram();
    if ((await jsonBody(request)).acao !== 'sincronizar') return { ok: false };
    return sincronizarHistorico();
  }, true, 10);
}
