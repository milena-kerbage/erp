import { conversations, updateConversation } from '@/lib/whatsapp/core';
import { api, boundedQuery, jsonBody } from '@/lib/whatsapp/server';
export const runtime = 'nodejs';
const ABAS = ['todas', 'nao_lidas', 'favoritas', 'fixadas', 'arquivadas'];
// Lista (abas, etiqueta, busca no histórico, página) e organização da conversa (fixar, arquivar, não lida, favoritar, etiquetas).
export async function GET(request: Request) {
  return api(request, async (user) => {
    const url = new URL(request.url), aba = url.searchParams.get('aba') || 'todas';
    return conversations({ userId: user.id, aba: ABAS.includes(aba) ? aba : 'todas', busca: url.searchParams.get('q') || '', etiqueta: url.searchParams.get('etiqueta') || '', limit: boundedQuery(url, 'limit', 60, 200), offset: boundedQuery(url, 'offset', 0, 100_000) });
  }, false, 240);
}
export async function POST(request: Request) {
  return api(request, async (user) => {
    const corpo = await jsonBody(request);
    const bool = (valor: unknown) => (typeof valor === 'boolean' ? valor : undefined);
    return { conversation: await updateConversation(corpo.phone, { fixar: bool(corpo.fixar), arquivar: bool(corpo.arquivar), naoLida: bool(corpo.naoLida), favoritar: bool(corpo.favoritar), etiquetas: corpo.etiquetas }, user.id) };
  }, true, 120);
}
