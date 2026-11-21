import { notFound } from "next/navigation";
import type { NextRequest } from "next/server";
import { arvoreDaLoja, catalogoDaLoja } from "@/lib/loja/catalogo";
import { fotoPrincipal } from "@/loja/lib/catalogo/fotos";
import { filtrar, noCaminho } from "@/loja/lib/catalogo/listagem";
import { REGRAS_SEO } from "@/loja/lib/seo/config";
import { fotoParaModelo, gerarMidia, respostaMidia } from "@/loja/lib/seo/midia/gerar";
import { interpretarUrlListagem } from "@/loja/lib/seo/urls";

// GET /og/categoria/{caminho da categoria}: imagem de compartilhamento da listagem, com a foto da primeira peça.
// Só categorias que existem (o mesmo motor de URLs das páginas): a rota não aceita texto livre.
export const runtime = "nodejs";

export async function GET(request: NextRequest, ctx: { params: Promise<{ caminho: string[] }> }) {
  const segmentos = (await ctx.params).caminho;
  const [arvore, catalogo] = await Promise.all([arvoreDaLoja(), catalogoDaLoja()]);
  const caminho = `/${segmentos.join("/")}`;
  const resultado = interpretarUrlListagem(caminho, new URLSearchParams(), arvore.existentes, REGRAS_SEO);
  const categoria = resultado.tipo === "ok" ? arvore.buscarCategoria(resultado.listagem.categoria) : null;
  if (resultado.tipo !== "ok" || !categoria) notFound();
  const produtos = filtrar(noCaminho(catalogo.produtos, `/${categoria.chave}`), resultado.listagem.filtros);
  const capa = produtos.find((produto) => fotoPrincipal(produto));
  const titulo = arvore.rotuloFaceta(categoria.chave, caminho) ?? categoria.rotulo;
  const jpeg = await gerarMidia(
    {
      tipo: "categoria",
      etiqueta: produtos.length > 0 ? `${produtos.length} ${produtos.length === 1 ? "peça" : "peças"} no ateliê` : "Ateliê em Fortaleza",
      titulo,
      subtitulo: "Em percal 230 fios ou 400 fios egípcios, com entrega para todo o Brasil. Tudo pode ser personalizado.",
      imagem: await fotoParaModelo(capa && fotoPrincipal(capa)?.src, request.nextUrl.origin),
    },
    "og",
  );
  return respostaMidia(jpeg);
}
