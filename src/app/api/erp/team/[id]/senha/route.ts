import { erpApi } from '@/lib/erp/server';
import { gerarLinkNovaSenha } from '@/lib/erp/access';
export const runtime='nodejs';
// Link de nova senha gerado pela administração (sem e-mail configurado no servidor). Vale 24 h e uma única vez.
export async function POST(request:Request,context:{params:Promise<{id:string}>}) {return erpApi(request,{mutation:true,roles:['admin']},async actor=>gerarLinkNovaSenha((await context.params).id,actor,process.env.AUTH_ORIGIN || new URL(request.url).origin));}
