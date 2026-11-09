import "server-only";
import type { Sugestao } from "@/loja/componentes/carrinho/ConfirmacaoCarrinho";
import { MODULOS } from "@/loja/lib/casas/modulos";
import { indiceDaLoja } from "@/lib/loja/catalogo";
import { condicoesDePagamento, type Produto } from "@/loja/lib/catalogo/exemplos";
import { type Foto, fotoPrincipal } from "@/loja/lib/catalogo/fotos";

// Dados do catálogo que o montador ("Monte o seu quartinho") recebe do servidor: as peças parecidas
// de cada módulo (modal "Ver peças parecidas") e as sugestões da confirmação "Adicionado ao seu
// enxoval". Só o essencial de cada produto vai para o navegador.

export type PecaParecida = { slug: string; nome: string; preco: number; foto?: Foto; categoria: string };

const MAXIMO_PARECIDAS = 6;

function paraPeca(produto: Produto): PecaParecida {
  return {
    slug: produto.slug,
    nome: produto.nome,
    preco: Number(produto.preco),
    foto: fotoPrincipal(produto),
    categoria: produto.trilha.at(-1)?.rotulo ?? "",
  };
}

// Pela categoria da peça do módulo: a própria peça, as da mesma categoria, as "Você também poderá
// gostar" dela e, para completar, as da mesma seção do catálogo (ex.: /quarto).
export async function pecasParecidas(): Promise<Record<string, PecaParecida[]>> {
  const { catalogo, buscarProduto, buscarVarios } = await indiceDaLoja();
  const todos = catalogo.produtos;
  return Object.fromEntries(
    MODULOS.map((modulo) => {
      const base = modulo.produto ? buscarProduto(modulo.produto) : null;
      if (!base) return [modulo.id, []];
      const raiz = base.caminho.split("/")[1];
      const candidatos = [
        base,
        ...todos.filter((produto) => produto.caminho === base.caminho),
        ...buscarVarios(base.semelhantes),
        ...todos.filter((produto) => produto.caminho.split("/")[1] === raiz),
      ];
      const unicos = [...new Map(candidatos.map((produto) => [produto.slug, produto])).values()];
      return [modulo.id, unicos.slice(0, MAXIMO_PARECIDAS).map(paraPeca)];
    }),
  );
}

// Confirmação "Adicionado ao seu enxoval": peças avulsas do catálogo que completam o quarto.
export async function sugestoesDoMontador(): Promise<Sugestao[]> {
  const { buscarVarios } = await indiceDaLoja();
  return buscarVarios(MODULOS.flatMap((modulo) => modulo.produto ?? []))
    .slice(0, 8)
    .map((produto) => ({
      slug: produto.slug,
      nome: produto.nome,
      pix: condicoesDePagamento(produto.preco)?.pix ?? produto.preco,
      precisaEscolher: Boolean(produto.variacao),
      foto: fotoPrincipal(produto),
    }));
}
