import { css, cx } from "styled-system/css";
import { CardPropagandaCasa, type PropagandaCasa, propagandasDeCasas } from "@/loja/componentes/casas/PropagandaCasa";
import { coresDe, dividirNome, fotosDoProduto } from "@/loja/componentes/produto/dados";
import type { Produto } from "@/loja/lib/catalogo/exemplos";
import type { BlocoEditorial as Bloco } from "@/loja/lib/catalogo/edicoes";
import { intercalarBlocos, intercalarPropagandas, type LadoBloco } from "@/loja/lib/catalogo/listagem";
import { ESTILOS, type Propaganda } from "@/loja/lib/catalogo/propagandas";
import { BlocoEditorial } from "./BlocoEditorial";
import { CardListagem, type DadosCard } from "./CardListagem";
import { CardPropaganda } from "./CardPropaganda";

const COLUNAS_DESKTOP = 3; // a posição das propagandas segue a grade padrão de 3 colunas do desktop

// Grade da Lululemon: cards colados (1 px) e propagandas sortidas (posição, intervalo, ordem e
// estilo) a partir da semente da página: cada categoria tem seu arranjo, estável entre visitas.
// As propagandas vêm escolhidas pelo contexto da página (escolherPropagandas, em Resultado); a
// área Projetos (quartinho completo) ocupa algumas posições nas categorias de quarto e kit berço.
// Blocos editoriais (edição do mês e categorias principais, src/loja/lib/catalogo/edicoes.ts): 2
// colunas × 1 card, a cada 2 linhas, alternando o lado (intercalarBlocos). Propaganda que leva ao
// mesmo lugar de um bloco sai da lista, para a página não repetir o convite.
export function GradeListagem({
  produtos,
  semente,
  propagandas: todasPropagandas,
  blocos = [],
  primeiraLinhaBlocos = 0,
}: {
  produtos: Produto[];
  semente: string;
  propagandas: Propaganda[];
  blocos?: Bloco[];
  primeiraLinhaBlocos?: number;
}) {
  const destinosBlocos = new Set(blocos.map((bloco) => bloco.href).filter(Boolean));
  const propagandas = todasPropagandas.filter((propaganda) => !destinosBlocos.has(propaganda.href));
  const lados: LadoBloco[] = blocos.map((bloco, indice) => bloco.lado ?? (indice % 2 === 0 ? "esquerda" : "direita"));
  const celulas = intercalarBlocos(intercalarPropagandas(produtos, COLUNAS_DESKTOP, propagandas.length, semente), COLUNAS_DESKTOP, lados, {
    primeiraLinha: primeiraLinhaBlocos,
  });
  const casas = propagandasDeCasas(semente, celulas); // Projetos: só nas categorias que a área Projetos escolhe
  return (
    <ul className={grade}>
      {celulas.map((celula) => {
        if (celula.tipo === "produto") {
          return (
            <li key={celula.item.slug} className={celulaGrade}>
              <CardListagem dados={dadosDoCard(celula.item)} />
            </li>
          );
        }
        if (celula.tipo === "bloco") {
          const bloco = blocos[celula.indice];
          return (
            <li key={`bloco-${bloco.id}`} className={cx(celulaGrade, celula.lado === "esquerda" ? blocoEsquerda : blocoDireita)}>
              <BlocoEditorial bloco={bloco} prioridade={celula.indice === 0 && primeiraLinhaBlocos === 0} />
            </li>
          );
        }
        return (
          <li key={`propaganda-${celula.indice}`} className={cx(celulaGrade, css({ gridColumn: { base: "1 / -1", md: "auto" } }))}>
            {casas.has(celula.indice) ? (
              <CardPropagandaCasa {...(casas.get(celula.indice) as PropagandaCasa)} estilo={celula.estilo} />
            ) : (
              <CardPropaganda
                propaganda={propagandas[celula.indice]}
                estilo={propagandas[celula.indice].estilo ?? ESTILOS[celula.estilo % ESTILOS.length]}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Só o que o card precisa (o produto inteiro não vai para o navegador): nome dividido, cores e até 4
// fotos para o hover e as setas.
function dadosDoCard(produto: Produto): DadosCard {
  const { base, variacao } = dividirNome(produto.nome);
  return {
    slug: produto.slug,
    nome: produto.nome,
    nomeBase: base,
    nomeVariacao: variacao,
    preco: produto.preco,
    selo: produto.selo,
    cores: coresDe(produto),
    fotos: fotosDoProduto(produto).slice(0, 4),
  };
}

// Grade de borda a borda com divisória de 1 px entre as colunas (desenhada pela sombra de cada célula
// no vão de 1 px). Densidade (pílula "Ver"): padrão = 2 (celular) / 2 (tablet) / 3 (desktop);
// grande = 1 coluna no celular; pequena = 3 / 3 / 4.
const grade = css({
  display: "grid",
  gridTemplateColumns: { base: "repeat(2, minmax(0, 1fr))", desktop: "repeat(3, minmax(0, 1fr))" },
  gridAutoFlow: "dense",
  columnGap: "[1px]",
  rowGap: "0",
  "[data-densidade=grande] &": {
    gridTemplateColumns: { base: "repeat(1, minmax(0, 1fr))", md: "repeat(2, minmax(0, 1fr))", desktop: "repeat(3, minmax(0, 1fr))" },
  },
  "[data-densidade=pequena] &": {
    gridTemplateColumns: { base: "repeat(3, minmax(0, 1fr))", desktop: "repeat(4, minmax(0, 1fr))" },
  },
});

const celulaGrade = css({ minW: "0", boxShadow: "[1px 0 0 0 token(colors.borda)]" });

// Bloco editorial: largura total quando a grade tem 1 ou 2 colunas (celular e tablet na densidade
// padrão/grande, com proporção própria) e 2 colunas, do lado sorteado, quando tem 3 ou 4 (desktop e a
// densidade "pequena"): "1 / span 2" à esquerda, as 2 últimas ("-3 / -1") à direita.
const blocoEsquerda = css({
  gridColumn: { base: "1 / -1", desktop: "[1 / span 2]" },
  "[data-densidade=pequena] &": { gridColumn: "[1 / span 2]" },
});

const blocoDireita = css({
  gridColumn: { base: "1 / -1", desktop: "[-3 / -1]" },
  "[data-densidade=pequena] &": { gridColumn: "[-3 / -1]" },
});
