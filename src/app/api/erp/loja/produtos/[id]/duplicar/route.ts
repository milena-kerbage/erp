import { duplicarProduto } from '@/lib/loja/gestao/produtos';
import { corpoJson, escreverGestao, origemLojaDoErp } from '@/lib/loja/gestao/rotas';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
// POST {slug?, sku?, nome?} (corpo opcional): cópia em rascunho (dados, relações, opções e fotos) → {produto}.
export async function POST(request:Request,context:Context){return escreverGestao(request,['catalogo'],async actor=>duplicarProduto((await context.params).id,request.headers.get('content-type')?await corpoJson(request):{},actor,origemLojaDoErp(request)));}
