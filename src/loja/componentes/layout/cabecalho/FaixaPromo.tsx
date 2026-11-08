"use client";

import { type ReactNode, useEffect, useState } from "react";
import { css } from "styled-system/css";
import { X } from "@/loja/componentes/icones";

const CHAVE = "milena:faixa-promo-fechada";

// Faixa promocional escura acima do cabeçalho (lululemon-referencia.md §1.1): 33 px no desktop
// (texto à esquerda, 40 de recuo, fechar de 32 a 32 px da borda) e 2 linhas (50 px) no celular.
// Rola junto com a página. Fechada, some até o fim da sessão.
export function FaixaPromo({ children }: { children: ReactNode }) {
  const [fechada, setFechada] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(CHAVE) === "1") setFechada(true);
    } catch {
      // sem sessionStorage (modo privado): a faixa só fecha nesta página
    }
  }, []);

  if (fechada) return null;

  function fechar() {
    setFechada(true);
    try {
      sessionStorage.setItem(CHAVE, "1");
    } catch {
      // idem
    }
  }

  return (
    <aside data-faixa-promo aria-label="Aviso" className={faixa}>
      <p className={texto}>{children}</p>
      <button type="button" aria-label="Fechar aviso" onClick={fechar} className={fecharBotao}>
        <X aria-hidden className={css({ w: { base: "6", desktop: "4" }, h: { base: "6", desktop: "4" } })} />
      </button>
    </aside>
  );
}

const faixa = css({
  position: "relative",
  display: "flex",
  alignItems: "center",
  minH: { base: "[50px]", desktop: "8" },
  py: "2",
  pl: { base: "3", desktop: "10" },
  pr: { base: "12", desktop: "20" },
  bg: "escuro",
  color: "superficie",
});

const texto = css({
  fontSize: "xs",
  lineHeight: "texto",
  fontWeight: "normal",
  lineClamp: "2",
  "& a": { textDecoration: "underline", textUnderlineOffset: "[2px]", _hover: { textDecoration: "none" } },
  "& a:focus-visible": { outline: "none", boxShadow: "anelFoco" },
});

const fecharBotao = css({
  position: "absolute",
  top: "[50%]",
  transform: "translateY(-50%)",
  right: { base: "0", desktop: "8" },
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  w: { base: "11", desktop: "8" },
  h: { base: "12", desktop: "8" },
  color: "superficie",
  cursor: "pointer",
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});
