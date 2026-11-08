"use client";

import Image from "next/image";
import { useState } from "react";
import { css } from "styled-system/css";
import type { Cor, Foto } from "@/loja/lib/casas/catalogo";
import { PlaceholderProjeto } from "./PlaceholderProjeto";

// Galeria da página do projeto no padrão da PDP da Adidas, igual à de produtos (produto/Galeria.tsx):
// quadrados colados em 2 colunas com 3 px entre eles; a 1ª imagem abre em largura total e, quando a
// conta das demais é ímpar, a última também ocupa as 2 colunas. No celular, uma por vez (arrasta),
// com contador e barra de progresso. Enquanto não há fotos, mostra 3 quadros de placeholder
// (ambiente, berço e detalhes) com a paleta do projeto.
const QUADROS_PLACEHOLDER = ["ambiente", "berço", "detalhes"];

export function GaleriaProjeto({ nome, fotos, paleta }: { nome: string; fotos: Foto[]; paleta: Cor[] }) {
  const [atual, setAtual] = useState(0);
  const total = fotos.length || QUADROS_PLACEHOLDER.length;
  const sobraUma = (total - 1) % 2 === 1;

  return (
    <div className={css({ position: "relative" })}>
      <ul
        aria-label={`Imagens de ${nome}`}
        className={grade}
        onScroll={(evento) => {
          const elemento = evento.currentTarget;
          const indice = Math.round(elemento.scrollLeft / elemento.clientWidth);
          if (indice !== atual) setAtual(indice);
        }}
      >
        {Array.from({ length: total }, (_, indice) => {
          const foto = fotos[indice];
          const largo = indice === 0 || (sobraUma && indice === total - 1);
          return (
            <li key={foto?.src ?? QUADROS_PLACEHOLDER[indice]} data-largo={largo || undefined} className={item}>
              <div className={moldura}>
                {foto ? (
                  <Image
                    src={foto.src}
                    alt={foto.alt}
                    fill
                    preload={indice === 0}
                    // Ao lado do painel de 480 px: largura total ou meia (2 colunas).
                    sizes={largo ? "(min-width: 1024px) calc(100vw - 480px), 100vw" : "(min-width: 1024px) calc((100vw - 480px) / 2), 100vw"}
                    className={css({ objectFit: "cover" })}
                  />
                ) : (
                  <PlaceholderProjeto
                    nome={`${nome}, ${QUADROS_PLACEHOLDER[indice]}`}
                    paleta={indice === 0 ? paleta : undefined}
                    tom={indice}
                    tamanho={indice === 0 ? 96 : 64}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p aria-hidden className={contador}>
        {atual + 1} / {total}
      </p>
      <div aria-hidden className={trilhoProgresso}>
        <div className={barraProgresso} style={{ width: `${100 / total}%`, transform: `translateX(${atual * 100}%)` }} />
      </div>
    </div>
  );
}

const grade = css({
  display: { base: "flex", lg: "grid" },
  gridTemplateColumns: { lg: "repeat(2, minmax(0, 1fr))" },
  gap: { lg: "[3px]" },
  overflowX: { base: "auto", lg: "visible" },
  scrollSnapType: "x",
  scrollSnapStrictness: "mandatory",
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { display: "none" },
});

const item = css({
  flexShrink: "0",
  w: { base: "full", lg: "auto" },
  scrollSnapAlign: "start",
  lg: { "&[data-largo]": { gridColumn: "1 / -1" } },
});

// Celular: 4:3 em todas (carrossel uniforme). Desktop: quadrado, ou 16:10 nas largas.
const moldura = css({
  position: "relative",
  aspectRatio: { base: "[4 / 3]", lg: "square" },
  bg: "placeholder",
  lg: { "[data-largo] > &": { aspectRatio: "[16 / 10]" } },
});

const contador = css({
  display: { base: "block", lg: "none" },
  position: "absolute",
  right: "3",
  bottom: "4",
  px: "2",
  py: "1",
  borderRadius: "sm",
  bg: "[rgba(0, 0, 0, 0.55)]",
  color: "fundo",
  fontSize: "xs",
  fontVariantNumeric: "tabular-nums",
});

const trilhoProgresso = css({ display: { base: "block", lg: "none" }, h: "1", bg: "borda" });

const barraProgresso = css({ h: "full", bg: "escuro", transition: "transform", transitionDuration: "normal" });
