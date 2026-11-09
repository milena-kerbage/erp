import { atualizarGrupo, obterGrupo, removerGrupo } from '@/lib/loja/gestao/opcoes';
import { corpoJson, escreverGestao, lerGestao, revisaoDaUrl } from '@/lib/loja/gestao/rotas';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
// PATCH {revisao, ...; opcoes substitui a lista (com id: mantém/edita; sem id: nova; ausente: removida)}; DELETE ?revisao=N (só fora de produtos).
export async function GET(request:Request,context:Context){return lerGestao(request,async()=>obterGrupo((await context.params).id));}
export async function PATCH(request:Request,context:Context){return escreverGestao(request,['catalogo'],async actor=>atualizarGrupo((await context.params).id,await corpoJson(request),actor));}
export async function DELETE(request:Request,context:Context){return escreverGestao(request,['catalogo'],async actor=>removerGrupo((await context.params).id,revisaoDaUrl(request),actor));}
