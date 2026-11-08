import type { Metadata } from "next";
import { PaginaCarrinho } from "@/loja/componentes/carrinho/PaginaCarrinho";
import { AvisoCarrinhoCasas } from "@/loja/componentes/casas/AvisoCarrinhoCasas";
import { catalogoParaCarrinho } from "@/loja/lib/carrinho/catalogo";
import { MAIS_VENDIDOS_SLUGS } from "@/loja/lib/catalogo/exemplos";

// Sacola (lululemon-sacola.md), no grupo (compra): cabeçalho mínimo e rodapé enxuto, como o checkout.
// A URL pública continua /carrinho. Os itens vivem no navegador até o carrinho existir na API; o
// servidor entrega só o essencial do catálogo para montar as linhas e os totais.
// Página de sessão: fora do índice (seo.md).
export const metadata: Metadata = {
  title: "Sacola",
  robots: { index: false, follow: false },
  alternates: { canonical: "/carrinho" },
};

export default function Carrinho() {
  const catalogo = catalogoParaCarrinho();
  // Mais vendidos primeiro; o resto do catálogo completa as sugestões quando o mix acaba.
  const maisVendidos = [...new Set([...MAIS_VENDIDOS_SLUGS, ...catalogo.map((produto) => produto.slug)])];
  return (
    <>
      <AvisoCarrinhoCasas />
      <PaginaCarrinho catalogo={catalogo} maisVendidos={maisVendidos} />
    </>
  );
}
