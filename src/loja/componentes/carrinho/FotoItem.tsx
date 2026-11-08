import { FotoProjeto } from "@/loja/componentes/casas/FotoProjeto";
import { FotoProduto } from "@/loja/componentes/produto/FotoProduto";
import type { ProdutoCarrinho } from "@/loja/lib/carrinho/catalogo";

// Foto do item na sacola, na confirmação e no pedido: a do produto (com a 2ª no hover) ou, no projeto
// e no quartinho personalizado, a composição nos tons da paleta enquanto não há foto.
export function FotoItem({
  produto,
  sizes,
  className,
  segunda = false,
}: {
  produto: Pick<ProdutoCarrinho, "foto" | "segunda" | "paleta" | "tipo">;
  sizes: string;
  className?: string;
  segunda?: boolean;
}) {
  if (produto.tipo) return <FotoProjeto paleta={produto.paleta} foto={produto.foto} icone={produto.tipo === "projeto" ? "bebe" : "berco"} sizes={sizes} className={className} />;
  return <FotoProduto foto={produto.foto} segunda={segunda ? produto.segunda : undefined} sizes={sizes} className={className} />;
}
