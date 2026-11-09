import { reordenarImagens } from '@/lib/loja/gestao/imagens';
import { corpoJson, escreverGestao } from '@/lib/loja/gestao/rotas';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
// PUT {revisao, ids}: todas as fotos na nova ordem (a 1ª é a do card) → {imagens, revisao}.
export async function PUT(request:Request,context:Context){return escreverGestao(request,['catalogo'],async actor=>reordenarImagens((await context.params).id,await corpoJson(request),actor));}
