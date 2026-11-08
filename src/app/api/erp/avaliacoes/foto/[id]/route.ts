import { requireErpActor,erpErrorResponse,erpNoStore } from '@/lib/erp/server';
import { fotoDaAvaliacao } from '@/lib/loja/avaliacoes';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
// Foto de avaliação em qualquer situação (pendente inclusive), só para a moderação autenticada.
export async function GET(request:Request,context:Context){try{await requireErpActor(request,{roles:['admin','manager']});const {id}=await context.params;const foto=await fotoDaAvaliacao(id,new URL(request.url).searchParams.get('tamanho')==='grande'?'grande':'mini',false);return new Response(new Uint8Array(foto.conteudo),{headers:{...erpNoStore,'Content-Type':foto.tipo,'Content-Disposition':'inline'}});}catch(error){return erpErrorResponse(error);}}
