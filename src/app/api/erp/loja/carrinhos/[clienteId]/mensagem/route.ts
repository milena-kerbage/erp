import { mensagemDoCarrinho } from '@/lib/loja/gestao/carrinhos';
import { origemLojaDoErp } from '@/lib/loja/gestao/rotas';
import { erpApi } from '@/lib/erp/server';
export const runtime='nodejs';
type Context={params:Promise<{clienteId:string}>};
// POST: monta a mensagem de lembrete e o link wa.me (a equipe abre e envia; nada sai daqui) e marca lembrete_em → {mensagem, link, lembreteEm}.
export async function POST(request:Request,context:Context){return erpApi(request,{mutation:true,roles:['admin','manager']},async actor=>mensagemDoCarrinho((await context.params).clienteId,actor,origemLojaDoErp(request)));}
