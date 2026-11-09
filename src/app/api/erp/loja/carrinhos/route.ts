import { listarCarrinhosAbandonados } from '@/lib/loja/gestao/carrinhos';
import { GESTAO, lerGestao } from '@/lib/loja/gestao/rotas';
export const runtime='nodejs';
// Carrinhos abandonados (clientes logadas): ?horas=24 (1 a 720)&busca&minimoCentavos&lembrete=todos|sem|com&limit&offset → {carrinhos, horas, totalCentavos, pagination}.
export async function GET(request:Request){return lerGestao(request,async()=>listarCarrinhosAbandonados(new URL(request.url)),GESTAO);}
