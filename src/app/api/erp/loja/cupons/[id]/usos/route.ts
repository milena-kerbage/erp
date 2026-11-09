import { usosDoCupom } from '@/lib/loja/gestao/cupons';
import { GESTAO, lerGestao } from '@/lib/loja/gestao/rotas';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
// GET ?limit&offset → {cupom, usos: [{pedidoNumero, clienteId, clienteNome, descontoCentavos, criadoEm}], pagination}.
export async function GET(request:Request,context:Context){return lerGestao(request,async()=>usosDoCupom((await context.params).id,new URL(request.url)),GESTAO);}
