"use client";

import { useEffect, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import { Carrossel } from "@/loja/componentes/inicio/Carrossel";
import { Midia } from "@/loja/componentes/inicio/Midia";
import type { Destaque, FotoGaleria } from "./dados";
import { FotoSlide } from "./FotoSlide";

// Split sticky (lululemon-pdp.md §1.6 item 7 e §6): título grande com a frase da linha; à esquerda, a
// foto grande sticky (metade da largura, altura da tela) que troca em crossfade conforme o destaque
// em leitura; à direita, a coluna estreita (~330) com os 3 destaques (foto 4:5, título 28, texto 16).
// Celular e tablet: a foto grande em largura total e os destaques num carrossel com espiada (~8%) e
// setas de contorno embaixo à direita.
// Movimento: a foto grande anda com a rolagem (parallax por view-timeline) e a foto de cada destaque
// aproxima de 1.01 para 1.1 em 250 ms no hover (lululemon-animacoes-edicao.md §1).
export function Destaques({ frase, destaques, fotos }: { frase: string; destaques: Destaque[]; fotos: FotoGaleria[] }) {
  const itens = useRef<Array<HTMLLIElement | null>>([]);
  const [ativo, setAtivo] = useState(0);
  const grandes = destaques.map((_, indice) => fotos[(indice + 1) % fotos.length]);

  useEffect(() => {
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) setAtivo(Number((entrada.target as HTMLElement).dataset.indice));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const item of itens.current) if (item) observador.observe(item);
    return () => observador.disconnect();
  }, []);

  return (
    <section aria-labelledby="titulo-destaques" className={secao}>
      <h2 id="titulo-destaques" className={titulo}>
        {frase}
      </h2>

      <div className={split}>
        <div className={esquerda}>
          {grandes.map((foto, indice) => (
            <div key={`grande-${destaques[indice].chave}`} data-ativo={indice === ativo || undefined} className={camada}>
              <FotoSlide foto={{ ...foto, principal: false }} sizes="(min-width: 992px) 50vw, 100vw" parallax className={css({ w: "full", h: "full" })} />
            </div>
          ))}
        </div>
        <ul className={direita}>
          {destaques.map((destaque, indice) => (
            <li
              key={destaque.chave}
              ref={(elemento) => {
                itens.current[indice] = elemento;
              }}
              data-indice={indice}
              className={css({ w: "[330px]", maxW: "full" })}
            >
              <Cartao destaque={destaque} />
            </li>
          ))}
        </ul>
      </div>

      <div className={celular}>
        <Carrossel rotulo="Destaques da peça" classeTrilho={trilho} classeSetas={css({ px: { base: "3", md: "5" } })}>
          {destaques.map((destaque) => (
            <li key={destaque.chave} className={itemCarrossel}>
              <Cartao destaque={destaque} />
            </li>
          ))}
        </Carrossel>
      </div>
    </section>
  );
}

function Cartao({ destaque }: { destaque: Destaque }) {
  return (
    <article className="group">
      <Midia tom={destaque.tom} icone={destaque.icone} zoom className={css({ aspectRatio: "[4 / 5]" })} />
      <h3 className={tituloCartao}>{destaque.titulo}</h3>
      <p className={textoCartao}>{destaque.texto}</p>
    </article>
  );
}

const secao = css({ my: { base: "16", desktop: "24" } });

const titulo = css({
  maxW: "[16ch]",
  px: { base: "3", md: "5", desktop: "6" },
  mb: { base: "8", desktop: "12" },
  fontSize: { base: "destaque", md: "secaoTablet", desktop: "secao" },
  fontWeight: "normal",
  lineHeight: { base: "subtitulo", md: "titulo" },
  letterSpacing: { md: "titulo" },
  color: "escuro",
  textWrap: "balance",
});

const split = css({ display: { base: "block", desktop: "grid" }, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" });

const esquerda = css({
  position: { base: "relative", desktop: "sticky" },
  top: "0",
  h: { base: "auto", desktop: "[100vh]" },
  aspectRatio: { base: "[5 / 6]", md: "[4 / 3]", desktop: "auto" },
  // clip (não hidden): não vira contêiner de rolagem, e a view-timeline do parallax segue a página.
  overflow: "clip",
  bg: "fundoProduto",
});

const camada = css({
  position: "absolute",
  inset: "0",
  opacity: "0",
  transitionProperty: "opacity",
  transitionDuration: "gaveta",
  transitionTimingFunction: "cruzar",
  "&[data-ativo]": { opacity: "1" },
});

const direita = css({
  display: { base: "none", desktop: "flex" },
  flexDirection: "column",
  alignItems: "center",
  gap: "40",
  py: "[20vh]",
});

const tituloCartao = css({ mt: { base: "4", desktop: "6" }, fontSize: { base: "destaque", desktop: "subtitulo" }, fontWeight: "normal", lineHeight: "subtitulo", color: "escuro" });

const textoCartao = css({ mt: "2", fontSize: { base: "sm", desktop: "md" }, lineHeight: "texto", color: "texto" });

const celular = css({ display: { base: "block", desktop: "none" }, mt: "8" });

const trilho = css({ gap: "3", px: { base: "3", md: "5" }, scrollPaddingInline: { base: "3", md: "5" } });

const itemCarrossel = cx(css({ w: { base: "[calc(92% - 12px)]", md: "[calc(46% - 12px)]" } }));
