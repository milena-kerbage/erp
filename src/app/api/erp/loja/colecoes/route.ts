import { criarColecao, listarColecoes } from '@/lib/loja/gestao/opcoes';
import { corpoJson, escreverGestao, lerGestao } from '@/lib/loja/gestao/rotas';
export const runtime='nodejs';
// Coleções (mais-vendidos, pronta-entrega, kits…). GET → {colecoes}; POST {slug, nome, descricao?, onde?=home|listagem|ambos, ordem?, ativa?, produtos?: ids} → {colecao}.
export async function GET(request:Request){return lerGestao(request,async()=>listarColecoes());}
export async function POST(request:Request){return escreverGestao(request,['catalogo'],async actor=>criarColecao(await corpoJson(request),actor));}
