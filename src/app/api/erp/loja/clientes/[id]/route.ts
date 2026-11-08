import { erpApi } from '@/lib/erp/server';
import { avatarDaCliente } from '@/lib/loja/avatar';
import { detalheClienteLoja } from '@/lib/loja/contas';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
// Detalhe da cliente da loja: dados básicos e opcionais, pedidos, cupom de primeira compra, o último link de redefinição e o avatar.
export async function GET(request:Request,context:Context){const {id}=await context.params;return erpApi(request,{roles:['admin','manager']},async()=>{const detalhe=await detalheClienteLoja(id);return {...detalhe,cliente:{...detalhe.cliente,avatar:avatarDaCliente(detalhe.cliente.id)}};});}
