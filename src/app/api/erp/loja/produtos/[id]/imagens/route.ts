import { enviarImagem, imagensDoProduto } from '@/lib/loja/gestao/imagens';
import { escreverGestao, lerGestao, lerUploadImagem } from '@/lib/loja/gestao/rotas';
export const runtime='nodejs';
export const maxDuration=30;
type Context={params:Promise<{id:string}>};
// GET → {imagens}; POST multipart (arquivo, revisao, alt?, cor?, tipo?=principal|detalhe|aplicacao): JPEG/PNG/WebP até 3 MiB, recomprimida em WebP → {imagens, revisao} (revisão nova do produto).
export async function GET(request:Request,context:Context){return lerGestao(request,async()=>({imagens:await imagensDoProduto((await context.params).id)}));}
export async function POST(request:Request,context:Context){return escreverGestao(request,['catalogo'],async actor=>enviarImagem((await context.params).id,await lerUploadImagem(request),actor));}
