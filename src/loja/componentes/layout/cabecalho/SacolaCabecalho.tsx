"use client";

import Link from "next/link";
import { css } from "styled-system/css";
import { useQuantidadeNoCarrinho } from "@/loja/componentes/carrinho/estado";
import { Bag } from "@/loja/componentes/icones";

// Sacola do cabeçalho (lululemon-referencia.md §1.2 e §2.1): ícone de 16 em 32×32 no desktop,
// ícone de 24 em 48×48 no celular, com o selo de quantidade (círculo de 12 px, fonte de 7 px).
export function SacolaCabecalho() {
  const quantidade = useQuantidadeNoCarrinho();
  const rotulo = quantidade > 0 ? `Sacola com ${quantidade} ${quantidade === 1 ? "item" : "itens"}` : "Sacola vazia";
  return (
    <Link href="/carrinho" aria-label={rotulo} className={sacola}>
      <Bag aria-hidden className={css({ w: { base: "6", desktop: "4" }, h: { base: "6", desktop: "4" } })} />
      {quantidade > 0 && (
        <span aria-hidden className={selo}>
          {quantidade > 9 ? "9+" : quantidade}
        </span>
      )}
    </Link>
  );
}

const sacola = css({
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: "0",
  w: { base: "12", desktop: "8" },
  h: { base: "12", desktop: "8" },
  borderRadius: "pilula",
  color: "escuro",
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const selo = css({
  position: "absolute",
  top: { base: "[24px]", desktop: "[14px]" },
  right: { base: "[11px]", desktop: "[7px]" },
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minW: "3",
  h: "3",
  px: "[2px]",
  borderRadius: "pilula",
  bg: "promocao",
  color: "superficie",
  fontSize: "[7px]",
  fontWeight: "semibold",
  lineHeight: "none",
});
