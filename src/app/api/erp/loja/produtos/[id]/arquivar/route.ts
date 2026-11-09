import { arquivarProduto } from '@/lib/loja/gestao/produtos';
import { corpoJson, escreverGestao, origemLojaDoErp } from '@/lib/loja/gestao/rotas';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
// POST {revisao}: tira o produto da loja (status arquivado) → {produto}. Para voltar: PATCH {revisao, status: "ativo"}.
export async function POST(request:Request,context:Context){return escreverGestao(request,['catalogo'],async actor=>{const corpo=await corpoJson(request);return arquivarProduto((await context.params).id,corpo.revisao,actor,origemLojaDoErp(request));});}
