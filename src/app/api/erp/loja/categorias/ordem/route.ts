import { ordenarCategorias } from '@/lib/loja/gestao/categorias';
import { corpoJson, escreverGestao } from '@/lib/loja/gestao/rotas';
export const runtime='nodejs';
// PUT {paiId: string|null, ids: string[]}: as categorias de um nível na nova ordem → {categorias, arvore}.
export async function PUT(request:Request){return escreverGestao(request,['catalogo','menu'],async actor=>ordenarCategorias(await corpoJson(request),actor));}
