"use client";

import Image, { type ImageProps } from "next/image";
import { css, cx } from "styled-system/css";

// next/image que entra com fade quando carrega (lululemon-animacoes-edicao.md §1: opacity em 500 ms).
// Até carregar fica transparente e a moldura mostra o brilho do esqueleto (brilhoAoCarregar). Sem
// JavaScript (scripting: none) a foto aparece direto.
export function ImagemSuave({ className, onLoad, ...props }: ImageProps) {
  return (
    <Image
      {...props}
      data-suave=""
      onLoad={(evento) => {
        evento.currentTarget.dataset.carregada = "";
        onLoad?.(evento);
      }}
      className={cx(suave, className)}
    />
  );
}

const suave = css({
  opacity: "0",
  transitionProperty: "opacity",
  transitionDuration: "gaveta",
  transitionTimingFunction: "padrao",
  "&[data-carregada]": { opacity: "1" },
  "@media (scripting: none)": { opacity: "1" },
});
