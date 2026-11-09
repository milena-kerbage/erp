import { atualizarItemMenu, removerItemMenu } from '@/lib/loja/gestao/menu';
import { corpoJson, escreverGestao, revisaoDaUrl } from '@/lib/loja/gestao/rotas';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
// PATCH {revisao, ...} (seção e pai não mudam); DELETE ?revisao=N (remove o item e o que está dentro).
export async function PATCH(request:Request,context:Context){return escreverGestao(request,['menu'],async actor=>atualizarItemMenu((await context.params).id,await corpoJson(request),actor));}
export async function DELETE(request:Request,context:Context){return escreverGestao(request,['menu'],async actor=>removerItemMenu((await context.params).id,revisaoDaUrl(request),actor));}
