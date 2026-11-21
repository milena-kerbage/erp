import { arquivoDaImagem } from '@/lib/loja/gestao/imagens';
import { NUMERO_PEDIDO_SITE } from '@/lib/loja/contas';
import { erpErrorResponse, requireErpActor } from '@/lib/erp/server';
import { ApiError } from '@/lib/erp/access';
export const runtime='nodejs';
type Context={params:Promise<{numero:string;imagemId:string}>};
// GET: miniatura da foto de uma peça para o cartão do pedido na conversa (qualquer pessoa da equipe que atende).
// As fotos da loja saem de /api/catalogo/imagem no domínio www.; aqui é o mesmo arquivo, servido no domínio do ERP.
export async function GET(request:Request,context:Context){
  try{
    await requireErpActor(request,{});
    const {numero,imagemId}=await context.params;
    if(!NUMERO_PEDIDO_SITE.test(numero.toUpperCase())) throw new ApiError(404,'Pedido do site não encontrado.','NOT_FOUND');
    const foto=await arquivoDaImagem(imagemId,'mini',false);
    return new Response(new Uint8Array(foto.conteudo),{headers:{'Content-Type':foto.tipo,'Content-Length':String(foto.conteudo.length),'Cache-Control':'private, max-age=604800, immutable','ETag':foto.etag,'X-Content-Type-Options':'nosniff'}});
  }catch(error){return erpErrorResponse(error);}
}
