import Link from "next/link";
import { css, cx } from "styled-system/css";
import { Abas } from "./Abas";
import type { CardGrade, Grade } from "./conteudo";
import { largura, margens, modulo, tituloSecao } from "./estilos";
import { Midia } from "./Midia";

// Grade de cards com abas (lululemon-referencia.md §3.5): título de 64 px à esquerda, abas à
// direita, 48 abaixo a grade de 12 colunas SEM espaço (4 × col-3 ou 6 × col-2; 2 colunas no
// celular e no tablet). Card: imagem 5:6 com zoom de 1.01 para 1.1 em 250 ms e rótulo 16/500
// centralizado com 16 de respiro.
export function GradeAbas({ grade }: { grade: Grade }) {
  const idTitulo = `titulo-${grade.id}`;
  return (
    <section aria-labelledby={idTitulo} className={cx(modulo, margens)}>
      <div className={largura}>
        <Abas
          titulo={
            <h2 id={idTitulo} className={cx(tituloSecao, css({ mr: { md: "6" } }))}>
              {grade.titulo}
            </h2>
          }
          rotulos={grade.abas.map((aba) => aba.rotulo)}
          paineis={grade.abas.map((aba) => (
            <ul key={aba.rotulo} className={grade.colunas === 4 ? grade4 : grade6}>
              {aba.cards.map((card) => (
                <li key={card.href}>
                  <CardColecao card={card} colunas={grade.colunas} />
                </li>
              ))}
            </ul>
          ))}
        />
      </div>
    </section>
  );
}

function CardColecao({ card, colunas }: { card: CardGrade; colunas: 4 | 6 }) {
  return (
    <Link href={card.href} className={cx("group", cardEstilo)}>
      <Midia
        {...card.midia}
        zoom
        sizes={colunas === 4 ? "(min-width: 992px) 25vw, 50vw" : "(min-width: 992px) 17vw, 50vw"}
        className={css({ aspectRatio: "[5 / 6]" })}
      />
      <span className={rotulo}>{card.rotulo}</span>
    </Link>
  );
}

const grade4 = css({ display: "grid", gridTemplateColumns: { base: "[repeat(2, minmax(0, 1fr))]", desktop: "[repeat(4, minmax(0, 1fr))]" } });
const grade6 = css({ display: "grid", gridTemplateColumns: { base: "[repeat(2, minmax(0, 1fr))]", desktop: "[repeat(6, minmax(0, 1fr))]" } });

const cardEstilo = css({
  display: "block",
  _focusVisible: { outline: "none", "& > span": { textDecoration: "underline", textUnderlineOffset: "[4px]" } },
});

const rotulo = css({
  display: "block",
  p: "4",
  bg: "fundo",
  fontSize: "md",
  fontWeight: "medium",
  lineHeight: "texto",
  color: "escuro",
  textAlign: "center",
});
