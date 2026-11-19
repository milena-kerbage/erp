import { conversations, resolveConversations, updateConversation } from '@/lib/whatsapp/core';
import { api, boundedQuery, jsonBody } from '@/lib/whatsapp/server';
export const runtime = 'nodejs';
const ABAS = ['todas', 'nao_lidas', 'aguardando', 'minhas', 'favoritas', 'fixadas', 'resolvidas', 'arquivadas'];
const lista = (url: URL, nome: string) => url.searchParams.getAll(nome).flatMap(item => item.split('|')).map(item => item.slice(0, 100)).slice(0, 30);
// Lista (recortes, filtros, busca no histórico, página) e organização da conversa (fixar, situação, responsável, não lida,
// favoritar, etiquetas, fechar em massa).
export async function GET(request: Request) {
  return api(request, async (user) => {
    const url = new URL(request.url), aba = url.searchParams.get('aba') || 'todas';
    return conversations({
      userId: user.id, aba: ABAS.includes(aba) ? aba : 'todas', busca: url.searchParams.get('q') || '', etiqueta: url.searchParams.get('etiqueta') || '',
      periodo: url.searchParams.get('periodo') || '', resposta: url.searchParams.get('resposta') || '', janela: url.searchParams.get('janela') || '',
      situacoes: lista(url, 'situacao'), etiquetas: lista(url, 'etiquetas').filter(Boolean), soFixadas: url.searchParams.get('fixadas') === '1',
      // "" é "sem responsável": por isso o filtro só vale quando o parâmetro veio.
      responsaveis: url.searchParams.has('responsavel') ? lista(url, 'responsavel') : [],
      limit: boundedQuery(url, 'limit', 60, 200), offset: boundedQuery(url, 'offset', 0, 100_000),
    });
  }, false, 240);
}
export async function POST(request: Request) {
  return api(request, async (user) => {
    const corpo = await jsonBody(request);
    if (Array.isArray(corpo.resolver)) return resolveConversations(corpo.resolver, user.id, user.name);
    const bool = (valor: unknown) => (typeof valor === 'boolean' ? valor : undefined);
    return { conversation: await updateConversation(corpo.phone, { fixar: bool(corpo.fixar), arquivar: bool(corpo.arquivar), naoLida: bool(corpo.naoLida), favoritar: bool(corpo.favoritar), etiquetas: corpo.etiquetas, situacao: corpo.situacao, responsavel: corpo.responsavel, responsavelNome: corpo.responsavelNome }, user.id, user.name) };
  }, true, 120);
}
