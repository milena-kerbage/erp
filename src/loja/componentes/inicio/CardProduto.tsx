import { coresDe, dividirNome, fotosDoProduto } from "@/loja/componentes/produto/dados";
import type { Produto } from "@/loja/lib/catalogo/exemplos";
import { CardProdutoCliente } from "./CardProdutoCliente";

// Card de produto dos carrosséis da home e da página de produto (lululemon-referencia.md §3.7). A parte
// de servidor só monta os dados (nome, preço, selo, fotos e as cores com os produtos-irmãos); a troca
// de cor no clique fica no CardProdutoCliente.
export function CardProduto({ produto, sizes }: { produto: Produto; sizes: string }) {
  const { base, variacao } = dividirNome(produto.nome);
  return (
    <CardProdutoCliente
      sizes={sizes}
      dados={{
        slug: produto.slug,
        nome: produto.nome,
        nomeBase: base,
        nomeVariacao: variacao,
        preco: produto.preco,
        selo: produto.selo,
        cores: coresDe(produto),
        fotos: fotosDoProduto(produto).slice(0, 4),
      }}
    />
  );
}
