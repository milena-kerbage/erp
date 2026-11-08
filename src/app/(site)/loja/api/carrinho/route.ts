import { catalogoParaCarrinho } from "@/loja/lib/carrinho/catalogo";
import { MAIS_VENDIDOS_SLUGS } from "@/loja/lib/catalogo/exemplos";

// GET /api/carrinho → { precos: { slug: "199.90" }, maisVendidos: Sugestao[] }
// A confirmação "Adicionado à sacola" (na página de produto) usa para mostrar o subtotal da sacola
// inteira (os itens vivem no navegador) e para completar o "Combina com" quando a peça não tem
// complementos. Catálogo público e igual para todos: resposta estática, sem dado de quem pede.
export const dynamic = "force-static";

export async function GET() {
  const catalogo = catalogoParaCarrinho();
  const porSlug = new Map(catalogo.map((produto) => [produto.slug, produto]));
  const maisVendidos = MAIS_VENDIDOS_SLUGS.flatMap((slug) => {
    const produto = porSlug.get(slug);
    return produto
      ? [{ slug: produto.slug, nome: produto.nome, pix: produto.pix, preco: produto.preco, precisaEscolher: produto.precisaEscolher, foto: produto.foto }]
      : [];
  });
  return Response.json({ precos: Object.fromEntries(catalogo.map((produto) => [produto.slug, produto.preco])), maisVendidos });
}
