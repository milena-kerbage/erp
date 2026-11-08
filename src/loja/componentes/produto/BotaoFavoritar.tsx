"use client";

import { css, cx } from "styled-system/css";
import { useFavorito } from "@/loja/componentes/carrinho/estado";
import { Heart } from "@/loja/componentes/icones";

// Coração: redondo com borda ("painel"), solto no canto do card do carrinho ("card") ou ao lado do
// nome, como na Lululemon ("linha": contorno de 24 no título da página de produto e no card da
// listagem, sem caixa visível). Fica cheio quando está nos favoritos.
export function BotaoFavoritar({ slug, nome, variante }: { slug: string; nome: string; variante: "painel" | "card" | "linha" }) {
  const [ativo, alternar] = useFavorito(slug);
  return (
    <button
      type="button"
      aria-pressed={ativo}
      aria-label={ativo ? `Remover ${nome} dos favoritos` : `Adicionar ${nome} aos favoritos`}
      onClick={(evento) => {
        evento.preventDefault(); // no card, o botão fica dentro do link do produto
        evento.stopPropagation();
        alternar();
      }}
      className={cx(base, variante === "painel" ? painel : variante === "card" ? card : linha)}
    >
      <Heart size={variante === "card" ? 20 : 24} weight={ativo ? "fill" : "regular"} />
    </button>
  );
}

const base = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: "0",
  color: "escuro",
  cursor: "pointer",
});

const painel = css({
  w: "14",
  h: "14",
  borderRadius: "full",
  borderWidth: "1px",
  borderColor: "escuro",
  bg: "fundo",
  _hover: { bg: "superficieSuave" },
});

const card = css({
  position: "absolute",
  top: "2",
  right: "2",
  w: "8",
  h: "8",
  borderRadius: "full",
  _hover: { bg: "[rgba(255, 255, 255, 0.7)]" },
});

// 24 × 24 alinhado ao topo do título; o alvo de toque cresce para 40 sem mexer no layout.
const linha = css({
  position: "relative",
  w: "6",
  h: "6",
  borderRadius: "full",
  transition: "transform",
  transitionDuration: "controle",
  _after: { content: '""', position: "absolute", inset: "[-8px]" },
  _hover: { transform: "scale(1.08)" },
  _active: { transform: "scale(0.94)" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
  _motionReduce: { _hover: { transform: "none" } },
});
