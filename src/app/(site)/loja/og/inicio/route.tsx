import type { NextRequest } from "next/server";
import { indiceDaLoja } from "@/lib/loja/catalogo";
import { fotoPrincipal } from "@/loja/lib/catalogo/fotos";
import { fotoParaModelo, gerarMidia, respostaMidia } from "@/loja/lib/seo/midia/gerar";

// GET /og/inicio: imagem de compartilhamento da loja (início e páginas sem imagem própria), com a foto do
// primeiro "mais vendido" que tiver foto. Texto fixo: não aceita nada da URL.
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { colecao, catalogo } = await indiceDaLoja();
  const destaque = [...colecao("mais-vendidos"), ...catalogo.produtos].find((produto) => fotoPrincipal(produto));
  const jpeg = await gerarMidia(
    {
      tipo: "padrao",
      etiqueta: "Ateliê em Fortaleza",
      titulo: "Enxoval e quarto de bebê",
      subtitulo: "Kit berço, paninhos e maternidade em percal 230 fios ou 400 fios egípcios. Tudo pode ser personalizado.",
      imagem: await fotoParaModelo(destaque && fotoPrincipal(destaque)?.src, request.nextUrl.origin),
    },
    "og",
  );
  return respostaMidia(jpeg);
}
