import { painelDaLoja, periodoDaUrl } from '@/lib/loja/gestao/painel';
import { horasDaUrl } from '@/lib/loja/gestao/carrinhos';
import { GESTAO, lerGestao } from '@/lib/loja/gestao/rotas';
export const runtime='nodejs';
// Painel do e-commerce: ?periodo=7d|30d|90d&horas=24 → PainelLoja (src/lib/loja/gestao/tipos.ts).
export async function GET(request:Request){return lerGestao(request,async()=>{const url=new URL(request.url);return painelDaLoja(periodoDaUrl(url),Date.now(),horasDaUrl(url));},GESTAO);}
