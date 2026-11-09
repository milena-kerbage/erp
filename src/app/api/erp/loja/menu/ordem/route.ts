import { ordenarMenu } from '@/lib/loja/gestao/menu';
import { corpoJson, escreverGestao } from '@/lib/loja/gestao/rotas';
export const runtime='nodejs';
// PUT {paiId: string|null, ids}: itens do mesmo nível (ou de uma seção) na nova ordem → {menu, tons, icones}.
export async function PUT(request:Request){return escreverGestao(request,['menu'],async actor=>ordenarMenu(await corpoJson(request),actor));}
