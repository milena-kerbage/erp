import { atualizarCategoria, obterCategoria, removerCategoria } from '@/lib/loja/gestao/categorias';
import { corpoJson, escreverGestao, lerGestao, revisaoDaUrl } from '@/lib/loja/gestao/rotas';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
// PATCH {revisao, ...campos} (trocar slug ou mãe atualiza o caminho das filhas); DELETE ?revisao=N (só sem filhas e sem produtos).
export async function GET(request:Request,context:Context){return lerGestao(request,async()=>obterCategoria((await context.params).id));}
export async function PATCH(request:Request,context:Context){return escreverGestao(request,['catalogo','menu'],async actor=>atualizarCategoria((await context.params).id,await corpoJson(request),actor));}
export async function DELETE(request:Request,context:Context){return escreverGestao(request,['catalogo','menu'],async actor=>removerCategoria((await context.params).id,revisaoDaUrl(request),actor));}
