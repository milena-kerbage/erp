import { criarCategoria, listarCategorias } from '@/lib/loja/gestao/categorias';
import { corpoJson, escreverGestao, lerGestao } from '@/lib/loja/gestao/rotas';
export const runtime='nodejs';
// Categorias da loja (árvore). GET → {categorias (lista na ordem da árvore), arvore}; POST {paiId?, slug, nome, descricao?, imagem?, ordem?, ativa?, seoTitulo?, seoDescricao?} → {categoria}.
export async function GET(request:Request){return lerGestao(request,async()=>listarCategorias());}
export async function POST(request:Request){return escreverGestao(request,['catalogo','menu'],async actor=>criarCategoria(await corpoJson(request),actor));}
