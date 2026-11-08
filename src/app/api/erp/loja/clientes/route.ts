import { erpApi } from '@/lib/erp/server';
import { avatarDaCliente } from '@/lib/loja/avatar';
import { listarClientesLoja } from '@/lib/loja/contas';
export const runtime='nodejs';
// Clientes da loja (contas criadas no site; admin e gestão, só com sessão): ?busca=nome|e-mail|WhatsApp&limit&offset.
// Cada cliente vem com o avatar ilustrado (DiceBear, gerado no servidor a partir do id).
export async function GET(request:Request){return erpApi(request,{roles:['admin','manager']},async()=>{const resultado=await listarClientesLoja(new URL(request.url));return {...resultado,clientes:resultado.clientes.map(cliente=>({...cliente,avatar:avatarDaCliente(cliente.id)}))};});}
