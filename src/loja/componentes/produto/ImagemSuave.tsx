"use client";

import type {ImageProps} from "next/image";
import {ImagemNativa as Image} from "./ImagemNativa";
import { css, cx } from "styled-system/css";
import { ehFotoDoCatalogo } from "@/loja/lib/catalogo/fotos";

// next/image que entra com fade quando carrega (lululemon-animacoes-edicao.md §1: opacity em 500 ms).
// Até carregar fica transparente e a moldura mostra o brilho do esqueleto (brilhoAoCarregar). Sem
// JavaScript (scripting: none) a foto aparece direto.
export function ImagemSuave({ className, onLoad, ...props }: ImageProps) {
  return (
    <Image
      {...props}
      unoptimized={props.unoptimized ?? ehFotoDoCatalogo(props.src)}
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
