import {erpApi} from '@/lib/erp/server';
import {dashboardSummary} from '@/lib/erp/dashboard';
import {conversations} from '@/lib/whatsapp/core';
export const runtime='nodejs';
// Resumo do mês para o Painel, com os números reais do atendimento no WhatsApp (conversas esperando a equipe e
// não lidas). O WhatsApp fora do ar ou sem conexão não derruba o Painel: os dois números vêm zerados.
export async function GET(request:Request){return erpApi(request,{},async actor=>{
  const resumo=await dashboardSummary(Date.now(),Number(new URL(request.url).searchParams.get('offset')??180));
  let atendimento={aguardando:0,naoLidas:0};
  try{const lista=await conversations({userId:actor.id});if(!Array.isArray(lista)&&lista.counts)atendimento={aguardando:lista.counts.aguardando,naoLidas:lista.counts.nao_lidas};}catch{/* sem WhatsApp configurado */}
  return {...resumo,atendimento};
});}
