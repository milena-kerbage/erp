import { erpApi,jsonBodyERP } from '@/lib/erp/server';
import { atualizarPedidoLoja, pedidoParaConversa } from '@/lib/loja/contas';
import { catalogoDaSacola } from '@/lib/loja/catalogo';
export const runtime='nodejs';
type Context={params:Promise<{numero:string}>};
// GET: o pedido do site para o cartão da conversa (qualquer pessoa da equipe que atende), com a foto de cada peça.
export async function GET(request:Request,context:Context){const {numero}=await context.params;return erpApi(request,{},async()=>{
  const dados=await pedidoParaConversa(numero);
  const fotos=new Map((await catalogoDaSacola().catch(()=>[])).map(produto=>[produto.slug,produto.foto]));
  return {...dados,pedido:{...dados.pedido,itens:dados.pedido.itens.map(item=>({...item,foto:item.slug?fotos.get(item.slug)??null:null}))}};
});}
// Situação do pedido da loja ({revisao,status}); a cliente vê a mudança em Minha conta.
export async function PATCH(request:Request,context:Context){const {numero}=await context.params;return erpApi(request,{mutation:true,roles:['admin','manager']},async actor=>atualizarPedidoLoja(numero,await jsonBodyERP(request,4096),actor));}
