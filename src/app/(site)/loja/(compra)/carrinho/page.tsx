import type { Metadata } from "next";
import { PaginaCarrinho } from "@/loja/componentes/carrinho/PaginaCarrinho";
import { catalogoDaLoja, catalogoDaSacola } from "@/lib/loja/catalogo";

// Sacola (lululemon-sacola.md), no grupo (compra): cabeçalho mínimo e rodapé enxuto, como o checkout.
// A URL pública continua /carrinho. Os itens vivem no navegador até o carrinho existir na API; o
// servidor entrega só o essencial do catálogo para montar as linhas e os totais. Projetos de quarto e
// o quartinho personalizado ficam na mesma sacola (montados no navegador por lib/carrinho/linhas.ts).
// Página de sessão: fora do índice (seo.md).
export const metadata: Metadata = {
  title: "Sacola",
  robots: { index: false, follow: false },
  alternates: { canonical: "/carrinho" },
};

// O catálogo e os cupons de campanha vêm do cadastro do ERP (ou do de exemplo): src/lib/loja/catalogo.ts.
export default async function Carrinho() {
  const [catalogo, { maisVendidos: destaques, cupons }] = await Promise.all([catalogoDaSacola(), catalogoDaLoja()]);
  // Mais vendidos primeiro; o resto do catálogo completa as sugestões quando o mix acaba.
  const maisVendidos = [...new Set([...destaques, ...catalogo.map((produto) => produto.slug)])];
  return <PaginaCarrinho catalogo={catalogo} maisVendidos={maisVendidos} cupons={cupons} />;
}
