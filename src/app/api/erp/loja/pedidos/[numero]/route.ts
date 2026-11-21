import { erpApi,jsonBodyERP } from '@/lib/erp/server';
import { atualizarPedidoLoja, pedidoParaConversa } from '@/lib/loja/contas';
import { catalogoDaSacola } from '@/lib/loja/catalogo';
import { ORIGEM_LOJA } from '@/lib/hosts';
export const runtime='nodejs';
type Context={params:Promise<{numero:string}>};
// GET: o pedido do site para o cartão da conversa (qualquer pessoa da equipe que atende), com a foto de cada peça.
export async function GET(request:Request,context:Context){const {numero}=await context.params;return erpApi(request,{},async()=>{
  const dados=await pedidoParaConversa(numero);
  const fotos=new Map((await catalogoDaSacola().catch(()=>[])).map(produto=>[produto.slug,produto.foto]));
  // A foto da loja (/api/catalogo/imagem/{id}, domínio www.) vira a miniatura servida aqui no ERP; arquivo do deploy (/vitrine/**) usa o endereço da loja.
  const noErp=(foto:{src:string;alt:string}|undefined)=>{
    if(!foto) return null;
    const cadastro=/^\/api\/catalogo\/imagem\/([A-Za-z0-9_-]{1,80})(?:\?|$)/.exec(foto.src);
    if(cadastro) return {alt:foto.alt,src:`/api/erp/loja/pedidos/${encodeURIComponent(dados.pedido.numero)}/foto/${cadastro[1]}`};
    return {alt:foto.alt,src:foto.src.startsWith('/')?`${ORIGEM_LOJA}${foto.src}`:foto.src};
  };
  return {...dados,pedido:{...dados.pedido,itens:dados.pedido.itens.map(item=>({...item,foto:item.slug?noErp(fotos.get(item.slug)):null}))}};
});}
// Situação do pedido da loja ({revisao,status}); a cliente vê a mudança em Minha conta.
export async function PATCH(request:Request,context:Context){const {numero}=await context.params;return erpApi(request,{mutation:true,roles:['admin','manager']},async actor=>atualizarPedidoLoja(numero,await jsonBodyERP(request,4096),actor));}
