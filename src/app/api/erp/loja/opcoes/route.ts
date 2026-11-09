import { criarGrupo, listarGrupos } from '@/lib/loja/gestao/opcoes';
import { corpoJson, escreverGestao, lerGestao } from '@/lib/loja/gestao/rotas';
export const runtime='nodejs';
// Grupos de opções. GET → {grupos} (cada um com usadoEm: os produtos que o usam);POST {chave, nome, descricao?, tipo: escolha|personalizacao, minimo?, maximo?, opcoes: [{rotulo, acrescimoCentavos?, disponivel?}]} → {grupo}.
export async function GET(request:Request){return lerGestao(request,async()=>listarGrupos());}
export async function POST(request:Request){return escreverGestao(request,['catalogo'],async actor=>criarGrupo(await corpoJson(request),actor));}
