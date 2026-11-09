import { atualizarProduto, obterProduto, removerProduto } from '@/lib/loja/gestao/produtos';
import { corpoJson, escreverGestao, lerGestao, origemLojaDoErp, revisaoDaUrl } from '@/lib/loja/gestao/rotas';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
// GET → {produto}; PATCH {revisao, ...EntradaProduto} → {produto}; DELETE ?revisao=N (só rascunho ou arquivado) → {removido}.
export async function GET(request:Request,context:Context){return lerGestao(request,async()=>obterProduto((await context.params).id,origemLojaDoErp(request)));}
export async function PATCH(request:Request,context:Context){return escreverGestao(request,['catalogo'],async actor=>atualizarProduto((await context.params).id,await corpoJson(request),actor,origemLojaDoErp(request)));}
export async function DELETE(request:Request,context:Context){return escreverGestao(request,['catalogo'],async actor=>removerProduto((await context.params).id,revisaoDaUrl(request),actor));}
