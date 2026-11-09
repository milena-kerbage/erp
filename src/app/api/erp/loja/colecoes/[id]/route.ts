import { atualizarColecao, obterColecao, removerColecao } from '@/lib/loja/gestao/opcoes';
import { corpoJson, escreverGestao, lerGestao, revisaoDaUrl } from '@/lib/loja/gestao/rotas';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
// PATCH {revisao, ...; produtos: ids na nova ordem (reordenar = mandar a lista)}; DELETE ?revisao=N.
export async function GET(request:Request,context:Context){return lerGestao(request,async()=>obterColecao((await context.params).id));}
export async function PATCH(request:Request,context:Context){return escreverGestao(request,['catalogo'],async actor=>atualizarColecao((await context.params).id,await corpoJson(request),actor));}
export async function DELETE(request:Request,context:Context){return escreverGestao(request,['catalogo'],async actor=>removerColecao((await context.params).id,revisaoDaUrl(request),actor));}
