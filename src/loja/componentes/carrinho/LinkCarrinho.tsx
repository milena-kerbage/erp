"use client";

import Link from "next/link";
import { css } from "styled-system/css";
import { Bag } from "@/loja/componentes/icones";
import { useQuantidadeNoCarrinho } from "./estado";

// Ícone do carrinho no cabeçalho com a quantidade dentro da sacola, como na Nike.
export function LinkCarrinho({ className }: { className: string }) {
  const quantidade = useQuantidadeNoCarrinho();
  const rotulo = quantidade > 0 ? `Carrinho com ${quantidade} ${quantidade === 1 ? "item" : "itens"}` : "Carrinho vazio";
  return (
    <Link href="/carrinho" aria-label={rotulo} className={className}>
      <span className={css({ position: "relative", display: "inline-flex" })}>
        <Bag size={24} />
        {quantidade > 0 && (
          <span aria-hidden className={numero}>
            {quantidade > 99 ? "99+" : quantidade}
          </span>
        )}
      </span>
    </Link>
  );
}

// Número centralizado no corpo da sacola (abaixo da alça).
const numero = css({
  position: "absolute",
  insetX: "0",
  top: "[9px]",
  fontSize: "[9px]",
  fontWeight: "bold",
  lineHeight: "none",
  textAlign: "center",
  color: "escuro",
});
