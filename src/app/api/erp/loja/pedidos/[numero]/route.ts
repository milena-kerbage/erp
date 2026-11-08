import { erpApi,jsonBodyERP } from '@/lib/erp/server';
import { atualizarPedidoLoja } from '@/lib/loja/contas';
export const runtime='nodejs';
type Context={params:Promise<{numero:string}>};
// Situação do pedido da loja ({revisao,status}); a cliente vê a mudança em Minha conta.
export async function PATCH(request:Request,context:Context){const {numero}=await context.params;return erpApi(request,{mutation:true,roles:['admin','manager']},async actor=>atualizarPedidoLoja(numero,await jsonBodyERP(request,4096),actor));}
