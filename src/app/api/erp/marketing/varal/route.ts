import { painelVaral, salvarConfigVaral } from '@/lib/loja/varal';
import { corpoJson, escreverGestao, GESTAO, lerGestao } from '@/lib/loja/gestao/rotas';
export const runtime='nodejs';
// Varal de roupinhas (Marketing). GET ?busca&limit&offset → {config, resumo, jogadas, total}; PUT ConfigVaral → {config}.
export async function GET(request:Request){return lerGestao(request,async()=>painelVaral(new URL(request.url)),GESTAO);}
export async function PUT(request:Request){return escreverGestao(request,['cupons'],async actor=>salvarConfigVaral(await corpoJson(request),actor));}
