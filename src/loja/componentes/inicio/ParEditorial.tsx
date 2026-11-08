import Link from "next/link";
import { css, cx } from "styled-system/css";
import { Plus } from "@/loja/componentes/icones";
import type { Editorial } from "./conteudo";
import { botaoPrimario, controleClaro, textoGrande, tituloBloco } from "./estilos";
import { Midia } from "./Midia";

// Par editorial (lululemon-referencia.md §3.4): duas histórias lado a lado, de ponta a ponta e sem
// espaço entre elas. Mídia 1:1 com o botão redondo "ver peças" (40 px, claro, a 24 da borda) e o
// texto abaixo (40 de respiro, título 40/48, corpo 18, botão escuro 40 abaixo). Empilha no celular.
// Hover na mídia: zoom de 1.01 para 1.1 em 250 ms (cards de conteúdo da referência).
export function ParEditorial({ itens }: { itens: Editorial[] }) {
  return (
    <section aria-label="Para ela e para ele" className={css({ mb: { base: "16", desktop: "24" } })}>
      <ul className={css({ display: "grid", gridTemplateColumns: { base: "[repeat(1, minmax(0, 1fr))]", md: "[repeat(2, minmax(0, 1fr))]" }, rowGap: { base: "8", md: "0" } })}>
        {itens.map((item) => (
          <li key={item.id}>
            <div className={cx("group", css({ position: "relative" }))}>
              <Midia {...item.midia} zoom sizes="(min-width: 768px) 50vw, 100vw" className={css({ aspectRatio: "square" })} />
              <Link href={item.atalho.href} aria-label={item.atalho.rotulo} className={cx(controleClaro, atalho)}>
                <Plus size={24} weight="light" aria-hidden />
              </Link>
            </div>
            <div className={css({ pt: { base: "6", desktop: "10" }, px: { base: "3", md: "5", desktop: "10" } })}>
              <h2 className={tituloBloco}>{item.titulo}</h2>
              <p className={cx(textoGrande, css({ mt: "4" }))}>{item.texto}</p>
              <Link href={item.acao.href} className={cx(botaoPrimario, css({ mt: "10" }))}>
                {item.acao.rotulo}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

const atalho = css({ position: "absolute", right: "6", bottom: "6" });
