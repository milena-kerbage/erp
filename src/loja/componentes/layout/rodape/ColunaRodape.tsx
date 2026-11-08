"use client";

import { useId, useState, type ReactNode } from "react";
import { css } from "styled-system/css";
import { CaretDown } from "@/loja/componentes/icones";

// Coluna do rodapé. A partir de 768 px é uma coluna fixa: título 14/500
// com 12 de margem e a lista embaixo. No celular vira acordeão: linha de 64 px com divisória, ícone
// que gira e altura animada (grid-template-rows 0fr → 1fr, 300 ms, cubic-bezier(.5,0,0,1)).
// Fechado, o conteúdo fica `visibility: hidden` (fora do Tab e do leitor de tela) depois da animação.
// O conteúdo vem do servidor (children): só o estado aberto/fechado roda no navegador.
export function ColunaRodape({ titulo, abertoInicial = false, children }: { titulo: string; abertoInicial?: boolean; children: ReactNode }) {
  const [aberto, setAberto] = useState(abertoInicial);
  const id = useId();
  return (
    <div className={coluna} data-aberto={aberto || undefined}>
      <h2 className={tituloFixo}>{titulo}</h2>
      <h2 className={css({ display: { base: "block", md: "none" } })}>
        <button type="button" aria-expanded={aberto} aria-controls={id} onClick={() => setAberto((valor) => !valor)} className={gatilho}>
          {titulo}
          <CaretDown size={16} aria-hidden className={icone} />
        </button>
      </h2>
      <div id={id} className={painel}>
        <div className={painelInterno}>
          <div className={css({ pb: { base: "6", md: "0" } })}>{children}</div>
        </div>
      </div>
    </div>
  );
}

// Celular: divisória de pesponto (linha tracejada de costura, src/loja/estilos/pesponto.ts) na base
// de cada acordeão. A partir de 768 as colunas ficam sem divisória.
const coluna = css({
  minW: "0",
  bgImage: {
    base: "[repeating-linear-gradient(90deg, token(colors.pespontoSobreEscuro) 0 6px, transparent 6px 10px)]",
    md: "none",
  },
  bgSize: "[100% 1px]",
  bgRepeat: "no-repeat",
  bgPosition: "bottom",
});

const tituloFixo = css({
  display: { base: "none", md: "block" },
  mb: "3",
  fontSize: "sm",
  fontWeight: "medium",
  lineHeight: "texto",
  color: "superficie",
});

const gatilho = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  w: "full",
  h: "16",
  fontSize: "md",
  fontWeight: "medium",
  lineHeight: "texto",
  color: "superficie",
  textAlign: "left",
  cursor: "pointer",
  _focusVisible: { outline: "[2px solid]", outlineColor: "superficie", outlineOffset: "[-2px]" },
});

const icone = css({
  flexShrink: "0",
  transition: "transform",
  transitionDuration: "acordeao",
  transitionTimingFunction: "assinatura",
  "[data-aberto] &": { transform: "rotate(180deg)" },
});

const painel = css({
  display: "grid",
  gridTemplateRows: { base: "[0fr]", md: "[1fr]" },
  transitionProperty: { base: "grid-template-rows", md: "none" },
  transitionDuration: "acordeao",
  transitionTimingFunction: "assinatura",
  "[data-aberto] > &": { gridTemplateRows: "[1fr]" },
});

// Ao fechar, `visibility` só muda depois dos 300 ms (o conteúdo continua visível enquanto encolhe).
const painelInterno = css({
  minH: "0",
  overflow: { base: "hidden", md: "visible" },
  visibility: { base: "hidden", md: "visible" },
  transitionProperty: "visibility",
  transitionDuration: "[0s]",
  transitionDelay: { base: "acordeao", md: "[0s]" },
  "[data-aberto] &": { visibility: "visible", transitionDelay: "[0s]" },
});
