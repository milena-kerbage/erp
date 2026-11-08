import { revalidateTag } from 'next/cache';
import { erpApi,jsonBodyERP } from '@/lib/erp/server';
import { excluirAvaliacao,moderarAvaliacao,tagAvaliacoes } from '@/lib/loja/avaliacoes';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
// A página do produto (cache por tag) reflete na hora o que muda na loja: aprovação, recusa de uma publicada, resposta e exclusão.
const atualizarLoja=(produto:string)=>{try{revalidateTag(tagAvaliacoes(produto),{expire:0});}catch{/* fora de um handler do Next (testes) */}};
export async function PATCH(request:Request,context:Context){const {id}=await context.params;return erpApi(request,{mutation:true,roles:['admin','manager']},async actor=>{const result=await moderarAvaliacao(id,await jsonBodyERP(request),actor);if(result.publicadaMudou)atualizarLoja(result.avaliacao.produto);return {avaliacao:result.avaliacao};});}
export async function DELETE(request:Request,context:Context){const {id}=await context.params;return erpApi(request,{mutation:true,roles:['admin','manager']},async actor=>{const result=await excluirAvaliacao(id,Number(new URL(request.url).searchParams.get('revisao')),actor);if(result.estavaPublicada)atualizarLoja(result.produto);return {deleted:true};});}
