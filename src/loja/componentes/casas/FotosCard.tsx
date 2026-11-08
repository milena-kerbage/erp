"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { css } from "styled-system/css";
import { ArrowLeft, ArrowRight } from "@/loja/componentes/icones";
import type { Cor, Foto } from "@/loja/lib/casas/catalogo";
import { PlaceholderProjeto } from "./PlaceholderProjeto";

// Fotos do card de projeto como na listagem da Lululemon: ao passar o mouse aparece, no canto de baixo
// à direita, uma pílula branca com as setas ← → para ir passando as fotos ali mesmo, e um traço preto na base da foto marca em qual delas se está (a largura é
// 1/n da foto e ele desliza junto). No celular é um carrossel com scroll-snap (arrasta) e o traço
// fica sempre visível. As setas são botões focáveis; a foto é um link fora da ordem do Tab (o nome
// do card já é o link principal). Sem fotos (ainda não há), mostra o placeholder com a paleta.
export function FotosCard({
  href,
  nome,
  fotos,
  sizes,
  carregarCedo,
  paleta,
  tom = 0,
}: {
  href: string;
  nome: string;
  fotos: Foto[];
  sizes: string;
  carregarCedo: boolean;
  paleta?: Cor[];
  tom?: number;
}) {
  const trilho = useRef<HTMLUListElement>(null);
  const [atual, setAtual] = useState(0);

  if (fotos.length === 0) {
    return (
      <Link href={href} tabIndex={-1} className={css({ position: "relative", display: "block", aspectRatio: "[5 / 6]" })}>
        <PlaceholderProjeto nome={nome} paleta={paleta} tom={tom} />
      </Link>
    );
  }

  function irPara(indice: number) {
    const elemento = trilho.current;
    if (!elemento) return;
    const destino = (indice + fotos.length) % fotos.length;
    elemento.scrollTo({ left: destino * elemento.clientWidth, behavior: "smooth" });
  }

  return (
    <div data-fotos-card className={css({ position: "relative" })}>
      <ul
        ref={trilho}
        aria-label={`Fotos de ${nome}`}
        className={trilhoEstilo}
        onScroll={(evento) => {
          const elemento = evento.currentTarget;
          const indice = Math.round(elemento.scrollLeft / elemento.clientWidth);
          if (indice !== atual) setAtual(indice);
        }}
      >
        {fotos.map((foto, indice) => (
          <li key={foto.src} className={slide}>
            <Link href={href} tabIndex={-1} className={css({ position: "absolute", inset: "0", display: "block" })}>
              <Image
                src={foto.src}
                alt={foto.alt}
                fill
                sizes={sizes}
                loading={carregarCedo && indice === 0 ? "eager" : "lazy"}
                className={css({ objectFit: "cover" })}
              />
            </Link>
          </li>
        ))}
      </ul>

      {fotos.length > 1 && (
        <>
          {/* biome-ignore lint/a11y/useSemanticElements: par de setas sobre a foto (fieldset quebraria o layout) */}
          <div role="group" aria-label={`Fotos de ${nome}`} className={pilulaSetas}>
            <button type="button" aria-label={`Foto anterior de ${nome}`} onClick={() => irPara(atual - 1)} className={seta}>
              <ArrowLeft size={20} aria-hidden />
            </button>
            <button type="button" aria-label={`Próxima foto de ${nome}`} onClick={() => irPara(atual + 1)} className={seta}>
              <ArrowRight size={20} aria-hidden />
            </button>
          </div>
          <span aria-hidden className={progresso} style={{ width: `${100 / fotos.length}%`, transform: `translateX(${atual * 100}%)` }} />
        </>
      )}
    </div>
  );
}

// 5:6 como o card de produto da listagem; as fotos ocupam o quadro todo.
const trilhoEstilo = css({
  display: "flex",
  aspectRatio: "[5 / 6]",
  overflowX: "auto",
  scrollSnapType: "x",
  scrollSnapStrictness: "mandatory",
  scrollbarWidth: "none",
  bg: "fundo",
  "&::-webkit-scrollbar": { display: "none" },
});

const slide = css({
  position: "relative",
  flex: "[0 0 100%]",
  scrollSnapAlign: "start",
  bg: "placeholder",
});

// Pílula das setas (Lululemon: 96 × 40, branca, 16 px do canto): só no hover/foco, no desktop.
const pilulaSetas = css({
  position: "absolute",
  right: "4",
  bottom: "4",
  display: { base: "none", md: "inline-flex" },
  alignItems: "center",
  h: "10",
  px: "1",
  borderRadius: "full",
  bg: "fundo",
  opacity: "0",
  transform: "translateY(4px)",
  transition: "all",
  transitionDuration: "normal",
  "[data-fotos-card]:hover &": { opacity: "1", transform: "none" },
  "&:focus-within": { opacity: "1", transform: "none" },
});

const seta = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  w: "11",
  h: "8",
  borderRadius: "full",
  color: "escuro",
  cursor: "pointer",
  transition: "colors",
  transitionDuration: "rapida",
  _hover: { bg: "superficieSuave" },
  _focusVisible: { outline: "[2px solid token(colors.foco)]", outlineOffset: "[-2px]" },
});

// Traço de posição na base da foto: 2 px, preto, 1/n da largura, desliza para a foto atual.
const progresso = css({
  position: "absolute",
  left: "0",
  bottom: "0",
  h: "[2px]",
  bg: "escuro",
  pointerEvents: "none",
  transition: "all",
  transitionDuration: "lenta",
  opacity: { base: "1", md: "0" },
  "[data-fotos-card]:hover &, [data-fotos-card]:focus-within &": { opacity: "1" },
});
