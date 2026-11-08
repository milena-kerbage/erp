"use client";

import { type KeyboardEvent, type ReactNode, useId, useRef, useState } from "react";
import { css } from "styled-system/css";

// Abas das grades de cards (lululemon-referencia.md §3.5): botões de 16 px com 24 entre eles
// (16 no celular) e sublinhado de 1 px que cresce da esquerda em 250 ms no hover e fica cheio na
// aba ativa. Troca imediata; os painéis das outras abas ficam no DOM, ocultos.
// O título vem de fora (Server Component) e fica à esquerda; as abas, à direita (abaixo no celular).
export function Abas({ titulo, rotulos, paineis }: { titulo: ReactNode; rotulos: string[]; paineis: ReactNode[] }) {
  const base = useId();
  const [ativa, setAtiva] = useState(0);
  const botoes = useRef<Array<HTMLButtonElement | null>>([]);

  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    const passo = evento.key === "ArrowRight" ? 1 : evento.key === "ArrowLeft" ? -1 : 0;
    if (!passo) return;
    evento.preventDefault();
    const proxima = (ativa + passo + rotulos.length) % rotulos.length;
    setAtiva(proxima);
    botoes.current[proxima]?.focus();
  }

  return (
    <>
      <div className={cabecalho}>
        {titulo}
        {rotulos.length > 1 && (
          <div role="tablist" aria-orientation="horizontal" onKeyDown={aoTeclar} className={lista}>
            {rotulos.map((rotulo, indice) => (
              <button
                key={rotulo}
                ref={(elemento) => {
                  botoes.current[indice] = elemento;
                }}
                type="button"
                role="tab"
                id={`${base}-aba-${indice}`}
                aria-selected={indice === ativa}
                aria-controls={`${base}-painel-${indice}`}
                tabIndex={indice === ativa ? 0 : -1}
                onClick={() => setAtiva(indice)}
                className={aba}
              >
                {rotulo}
              </button>
            ))}
          </div>
        )}
      </div>
      {paineis.map((painel, indice) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: a ordem dos painéis acompanha a das abas
          key={indice}
          role={rotulos.length > 1 ? "tabpanel" : undefined}
          id={`${base}-painel-${indice}`}
          aria-labelledby={rotulos.length > 1 ? `${base}-aba-${indice}` : undefined}
          hidden={indice !== ativa}
        >
          {painel}
        </div>
      ))}
    </>
  );
}

// Título à esquerda e abas à direita, alinhados pela base; no celular as abas descem.
const cabecalho = css({
  display: "flex",
  flexDirection: { base: "column", md: "row" },
  alignItems: { base: "flex-start", md: "flex-end" },
  justifyContent: "space-between",
  gap: { base: "4", md: "8" },
  mb: { base: "8", desktop: "12" },
});

const lista = css({
  display: "flex",
  flexShrink: "0",
  columnGap: { base: "4", md: "6" },
  p: "1",
  maxW: "full",
  overflowX: "auto",
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { display: "none" },
});

const aba = css({
  position: "relative",
  flexShrink: "0",
  minH: "6",
  pb: "1",
  fontSize: "md",
  lineHeight: "texto",
  color: "escuro",
  whiteSpace: "nowrap",
  cursor: "pointer",
  _after: {
    content: '""',
    position: "absolute",
    left: "0",
    right: "[100%]",
    bottom: "0",
    h: "[1px]",
    bg: "escuro",
    transitionProperty: "right",
    transitionDuration: "zoom",
    transitionTimingFunction: "in-out",
  },
  _hover: { _after: { right: "0" } },
  "&[aria-selected=true]::after": { right: "0" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco", borderRadius: "xs" },
});
