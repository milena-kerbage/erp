import { atualizarCupom, obterCupom } from '@/lib/loja/gestao/cupons';
import { corpoJson, escreverGestao, GESTAO, lerGestao } from '@/lib/loja/gestao/rotas';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
// PATCH {revisao, ...EntradaCupom}: editar, ativar ou desativar ({revisao, ativo:false}). Cupom usado não troca de código.
export async function GET(request:Request,context:Context){return lerGestao(request,async()=>obterCupom((await context.params).id),GESTAO);}
export async function PATCH(request:Request,context:Context){return escreverGestao(request,['cupons'],async actor=>atualizarCupom((await context.params).id,await corpoJson(request),actor));}
