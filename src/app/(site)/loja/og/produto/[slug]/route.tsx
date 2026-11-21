import { notFound } from "next/navigation";
import type { NextRequest } from "next/server";
import { indiceDaLoja } from "@/lib/loja/catalogo";
import { fotoPrincipal } from "@/loja/lib/catalogo/fotos";
import { precoOuConsulta, semPreco } from "@/loja/lib/formatacao/moeda";
import { fotoParaModelo, gerarMidia, respostaMidia } from "@/loja/lib/seo/midia/gerar";

// GET /og/produto/{slug}: imagem de compartilhamento do produto (foto, nome, categoria e "a partir de").
// Só dados do catálogo: a rota não aceita texto livre.
export const runtime = "nodejs";

export async function GET(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const produto = (await indiceDaLoja()).buscarProduto((await ctx.params).slug);
  if (!produto) notFound();
  const pronta = produto.atributos.entrega?.some((valor) => /pronta/i.test(valor));
  const jpeg = await gerarMidia(
    {
      tipo: "produto",
      nome: produto.nome,
      categoria: produto.trilha.map((item) => item.rotulo).slice(-2).join(" · ") || "Enxoval de bebê",
      preco: precoOuConsulta(produto.preco),
      antesDoPreco: semPreco(produto.preco) ? undefined : "a partir de",
      precoDe: produto.precoDe && !semPreco(produto.precoDe) ? precoOuConsulta(produto.precoDe) : undefined,
      complemento: "5% OFF no Pix",
      selo: pronta ? "Pronta entrega" : produto.personalizacao ? "Pode ser personalizado" : "Entrega para todo o Brasil",
      imagem: await fotoParaModelo(fotoPrincipal(produto)?.src, request.nextUrl.origin),
    },
    "og",
  );
  return respostaMidia(jpeg);
}
