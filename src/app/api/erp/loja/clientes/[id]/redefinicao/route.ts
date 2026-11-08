import { after } from 'next/server';
import { erpApi } from '@/lib/erp/server';
import { detalheClienteLoja, emitirRedefinicao } from '@/lib/loja/contas';
import { emailDeContasLigado, enviarRedefinicaoPorEmail } from '@/lib/loja/emailContas';
import { origemDaLoja } from '@/loja/lib/contas/servidor';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
// Gera o link de redefinição de senha da cliente (2 horas, uso único). O link aparece UMA vez para a vendedora
// copiar e mandar pelo WhatsApp. O envio por e-mail está preparado e desligado (LOJA_EMAIL_REDEFINICAO + SMTP_*).
export async function POST(request:Request,context:Context){const {id}=await context.params;return erpApi(request,{mutation:true,roles:['admin','manager']},async actor=>{
  const resultado=await emitirRedefinicao(id,actor,origemDaLoja(request));
  const email=emailDeContasLigado();
  if(email){const {cliente}=await detalheClienteLoja(id);after(()=>enviarRedefinicaoPorEmail({para:cliente.email,nome:cliente.nome,link:resultado.link}));}
  return {...resultado,emailEnviado:false,emailAgendado:email};
});}
