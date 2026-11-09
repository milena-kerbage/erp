import { criarItemMenu, obterMenu } from '@/lib/loja/gestao/menu';
import { corpoJson, escreverGestao, lerGestao } from '@/lib/loja/gestao/rotas';
export const runtime='nodejs';
// Menu do cabeçalho. GET → {menu (árvore), tons, icones}; POST {paiId?, secao, rotulo, href, descricao?, imagem?, tom?, icone?, painel?, externo?, destaque?, soBotao?, ordem?, ativo?} → {item}.
export async function GET(request:Request){return lerGestao(request,async()=>obterMenu());}
export async function POST(request:Request){return escreverGestao(request,['menu'],async actor=>criarItemMenu(await corpoJson(request),actor));}
