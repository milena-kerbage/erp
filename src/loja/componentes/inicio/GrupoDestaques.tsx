import Link from "next/link";
import { css, cx } from "styled-system/css";
import { Carrossel } from "./Carrossel";
import type { Destaque } from "./conteudo";
import { linkTexto, textoGrande, tituloPequeno, tituloSecao } from "./estilos";
import { Midia } from "./Midia";

// Grupo de cards de destaque (lululemon-referencia.md §3.9): de ponta a ponta, 3 × col-4 sem espaço
// em 2 linhas (32 entre elas). Mídia 1:1 com zoom no hover; texto com 24/16/12 de respiro, título 24,
// corpo 18 e link sublinhado 14/500. No celular vira carrossel de 1 por vez, com setas.
export function GrupoDestaques({ itens }: { itens: Destaque[] }) {
  return (
    <section aria-labelledby="titulo-destaques" className={css({ mt: { base: "16", desktop: "24" } })}>
      <h2 id="titulo-destaques" className={cx(tituloSecao, css({ mx: { base: "3", md: "5", desktop: "10" }, mb: { base: "8", desktop: "12" } }))}>
        Do ateliê para a sua casa
      </h2>
      <Carrossel rotulo="Destaques do ateliê" classeTrilho={trilho} classeSetas={setas}>
        {itens.map((item) => (
          <li key={item.id} className={css({ w: { base: "full", desktop: "auto" } })}>
            <CardDestaque item={item} />
          </li>
        ))}
      </Carrossel>
    </section>
  );
}

function CardDestaque({ item }: { item: Destaque }) {
  const midia = <Midia {...item.midia} zoom sizes="(min-width: 992px) 34vw, 100vw" className={css({ aspectRatio: "square", mx: "[-1px]" })} />;
  return (
    <article className={css({ display: "flex", flexDirection: "column", h: "full" })}>
      <Link href={item.acao.href} tabIndex={-1} aria-hidden className={cx("group", css({ display: "block" }))}>
        {midia}
      </Link>
      <div className={css({ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2", pt: "6", px: "4", pb: "3" })}>
        <h3 className={tituloPequeno}>{item.titulo}</h3>
        <p className={textoGrande}>{item.texto}</p>
        <Link href={item.acao.href} className={cx(linkTexto, css({ mt: "2" }))}>
          {item.acao.rotulo}
        </Link>
      </div>
    </article>
  );
}

// Celular: trilho de 1 por vez, sem espaço nem espiada. Desktop: grade de 3 colunas, 32 entre linhas.
const trilho = css({
  display: { desktop: "grid" },
  gridTemplateColumns: { desktop: "[repeat(3, minmax(0, 1fr))]" },
  rowGap: { desktop: "8" },
  // clip (e não visible): as mídias têm mx -1px para esconder a emenda entre cards; sem recorte, o
  // pixel da última coluna alargava a página (1441 em 1440) e criava rolagem horizontal.
  overflowX: { desktop: "clip" },
});

const setas = css({ display: { desktop: "none" }, px: "3" });
