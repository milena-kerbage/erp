import { erpApi } from '@/lib/erp/server';
import { listarParaModeracao } from '@/lib/loja/avaliacoes';
import { buscarProduto } from '@/loja/lib/catalogo/exemplos';
export const runtime='nodejs';
// Moderação das avaliações da loja (admin e gestão, só com sessão): ?status=pendente|aprovada|recusada|todas&produto=slug&limit&offset.
export async function GET(request:Request) {
  return erpApi(request,{roles:['admin','manager']},async()=>{
    const result=await listarParaModeracao(new URL(request.url));
    const nome=(slug:string)=>buscarProduto(slug)?.nome || slug;
    return {...result,avaliacoes:result.avaliacoes.map(item=>({...item,produtoNome:nome(item.produto)})),produtos:result.produtos.map(item=>({...item,nome:nome(item.slug)}))};
  });
}
