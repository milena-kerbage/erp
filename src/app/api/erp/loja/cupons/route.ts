import { criarCupom, listarCupons } from '@/lib/loja/gestao/cupons';
import { corpoJson, escreverGestao, GESTAO, lerGestao } from '@/lib/loja/gestao/rotas';
export const runtime='nodejs';
// Cupons de campanha. GET ?busca → {cupons}; POST EntradaCupom (codigo, tipo, valor obrigatórios) → {cupom}.
export async function GET(request:Request){return lerGestao(request,async()=>listarCupons(new URL(request.url)),GESTAO);}
export async function POST(request:Request){return escreverGestao(request,['cupons'],async actor=>criarCupom(await corpoJson(request),actor));}
