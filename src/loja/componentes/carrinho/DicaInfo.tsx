"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import { Info } from "@/loja/componentes/icones";

// Ícone ⓘ do resumo (lululemon-sacola.md §6): abre um balão com a explicação. Botão com
// aria-expanded e aria-controls; Esc fecha e devolve o foco ao ícone; clicar fora também fecha.
export function DicaInfo({ rotulo, children, alinhar = "inicio" }: { rotulo: string; children: ReactNode; alinhar?: "inicio" | "centro" }) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  const caixa = useRef<HTMLSpanElement>(null);
  const botao = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (evento: PointerEvent) => {
      if (!caixa.current?.contains(evento.target as Node)) setAberto(false);
    };
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape") return;
      setAberto(false);
      botao.current?.focus();
    };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  return (
    <span ref={caixa} className={css({ position: "relative", display: "inline-flex", verticalAlign: "middle" })}>
      <button
        ref={botao}
        type="button"
        aria-label={rotulo}
        aria-expanded={aberto}
        aria-controls={id}
        onClick={() => setAberto((valor) => !valor)}
        className={gatilho}
      >
        <Info size={16} aria-hidden />
      </button>
      <span
        id={id}
        role="note"
        hidden={!aberto}
        className={cx(balao, alinhar === "centro" ? centro : inicio)}
      >
        {children}
      </span>
    </span>
  );
}

const gatilho = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  w: "6",
  h: "6",
  borderRadius: "pilula",
  color: "textoSuave",
  cursor: "pointer",
  _hover: { color: "escuro" },
  _expanded: { color: "escuro" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const balao = css({
  position: "absolute",
  top: "[calc(100% + 8px)]",
  zIndex: "[5]",
  w: "[min(280px, calc(100vw - 32px))]",
  px: "4",
  py: "3",
  borderRadius: "md",
  borderWidth: "1px",
  borderColor: "borda",
  bg: "superficie",
  boxShadow: "media",
  fontSize: "sm",
  fontWeight: "normal",
  lineHeight: "texto",
  color: "texto",
  textAlign: "left",
  whiteSpace: "normal",
  animation: "surgir",
});

const inicio = css({ left: "[-8px]" });
const centro = css({ left: "[50%]", translate: "[-50% 0]" });
