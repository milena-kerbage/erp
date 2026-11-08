import Link from "next/link";
import { css, cx } from "styled-system/css";
import type { Produto } from "@/loja/lib/catalogo/exemplos";
import { CardProduto } from "./CardProduto";
import { Carrossel } from "./Carrossel";
import type { Acao } from "./conteudo";
import { botaoPrimario, modulo, rubrica, tituloSecao } from "./estilos";

// Carrossel de produtos: rubrica, título de 64 px e botão escuro à direita;
// trilho com snap de ponta a ponta, 4 cards inteiros + a "espiada" do 5º no desktop (recuo e
// espaço de 20), 1 card + ~88 px no celular (recuo e espaço de 12). Setas com contorno embaixo,
// à direita. A largura do card vem da fórmula da referência, em unidades do contêiner.
export function CarrosselProdutos({
  id,
  rubrica: etiqueta,
  titulo,
  acao,
  produtos,
}: {
  id: string;
  rubrica?: string;
  titulo: string;
  acao: Acao;
  produtos: Produto[];
}) {
  const idTitulo = `titulo-${id}`;
  return (
    <section aria-labelledby={idTitulo} className={cx(modulo, css({ containerType: "inline-size" }))}>
      <div className={cabecalho}>
        <div className={css({ maxW: "[821px]" })}>
          {etiqueta && <p className={rubrica}>{etiqueta}</p>}
          <h2 id={idTitulo} className={tituloSecao}>
            {titulo}
          </h2>
        </div>
        <Link href={acao.href} className={cx(botaoPrimario, css({ flexShrink: "0" }))}>
          {acao.rotulo}
        </Link>
      </div>
      <Carrossel rotulo={titulo} classeTrilho={trilho} classeSetas={setas}>
        {produtos.map((produto) => (
          <li key={produto.slug} className={item}>
            <CardProduto produto={produto} sizes="(min-width: 992px) 22vw, (min-width: 768px) 42vw, 72vw" />
          </li>
        ))}
      </Carrossel>
    </section>
  );
}

const cabecalho = css({
  display: "flex",
  flexDirection: { base: "column", md: "row" },
  alignItems: { base: "flex-start", md: "flex-end" },
  justifyContent: "space-between",
  gap: { base: "6", md: "8" },
  mx: { base: "3", md: "5", desktop: "10" },
  mb: { base: "8", desktop: "12" },
});

const trilho = css({
  gap: { base: "3", md: "5" },
  px: { base: "3", md: "5" },
  scrollPaddingInline: { base: "3", md: "5" },
});

// Celular: 100% − 112 (263 em 375). Tablet: 2 + espiada. Desktop: (100% − max(min(12%, 200px),
// 100%/4 × 0,3) − 3 × 20) / 4 (302 em 1440).
const item = css({
  w: {
    base: "[calc(100cqw - 112px)]",
    md: "[calc((100cqw - max(min(12cqw, 200px), 15cqw) - 20px) / 2)]",
    desktop: "[calc((100cqw - max(min(12cqw, 200px), 7.5cqw) - 60px) / 4)]",
  },
});

const setas = css({ px: { base: "3", md: "5", desktop: "10" } });
