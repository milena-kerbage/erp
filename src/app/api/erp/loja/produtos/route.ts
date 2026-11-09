import { criarProduto, listarProdutosGestao } from '@/lib/loja/gestao/produtos';
import { corpoJson, escreverGestao, lerGestao, origemLojaDoErp } from '@/lib/loja/gestao/rotas';
export const runtime='nodejs';
// GET ?status=todos|rascunho|ativo|arquivado&categoria=<id>&disponibilidade=pronta_entrega|sob_encomenda&colecao=<id>&ordenar=ordem|nome|preco|-preco|recentes|sku&busca&limit&offset → {produtos, contagem, pagination}.
// POST EntradaProduto (slug, sku, nome, precoCentavos e categoriaId obrigatórios; nasce em rascunho) → {produto}.
export async function GET(request:Request){return lerGestao(request,async()=>listarProdutosGestao(new URL(request.url)));}
export async function POST(request:Request){return escreverGestao(request,['catalogo'],async actor=>criarProduto(await corpoJson(request),actor,origemLojaDoErp(request)));}
