import { imagensDaLoja } from '@/lib/loja/gestao/categorias';
import { lerGestao } from '@/lib/loja/gestao/rotas';
export const runtime='nodejs';
// GET → {imagens: [{caminho, emUso}]}: arquivos /vitrine/… aceitos como imagem de categoria e do menu (os da pasta pública e os já usados).
export async function GET(request:Request){return lerGestao(request,async()=>imagensDaLoja());}
