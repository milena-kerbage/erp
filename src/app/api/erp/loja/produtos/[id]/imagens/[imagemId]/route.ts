import {requestedImageFormat} from '@/lib/storage/images';
import { arquivoDaImagem, editarImagem, removerImagem } from '@/lib/loja/gestao/imagens';
import { corpoJson, escreverGestao, LEITURA_CATALOGO, revisaoDaUrl } from '@/lib/loja/gestao/rotas';
import { requireErpActor, erpErrorResponse } from '@/lib/erp/server';
export const runtime='nodejs';
type Context={params:Promise<{id:string;imagemId:string}>};
// GET ?tamanho=mini|grande: prévia no ERP (qualquer situação do produto); PATCH {revisao, alt?, cor?, tipo?} e DELETE ?revisao=N → {imagens, revisao}.
export async function GET(request:Request,context:Context){
  try{
    await requireErpActor(request,{roles:LEITURA_CATALOGO});
    const {id,imagemId}=await context.params;
    const foto=await arquivoDaImagem(imagemId,new URL(request.url).searchParams.get('tamanho')==='grande'?'grande':'mini',false,id,requestedImageFormat(request));
    return new Response(new Uint8Array(foto.conteudo),{headers:{Vary:"Accept",'Content-Type':foto.tipo,'Content-Length':String(foto.conteudo.length),'Cache-Control':'private, max-age=86400','ETag':foto.etag,'X-Content-Type-Options':'nosniff'}});
  }catch(error){return erpErrorResponse(error);}
}
export async function PATCH(request:Request,context:Context){return escreverGestao(request,['catalogo'],async actor=>{const {id,imagemId}=await context.params;return editarImagem(id,imagemId,await corpoJson(request),actor);});}
export async function DELETE(request:Request,context:Context){return escreverGestao(request,['catalogo'],async actor=>{const {id,imagemId}=await context.params;return removerImagem(id,imagemId,revisaoDaUrl(request),actor);});}
