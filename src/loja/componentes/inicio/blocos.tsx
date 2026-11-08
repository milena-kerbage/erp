import type { ReactNode } from "react";
import { css, cx } from "styled-system/css";
import { tituloSecao } from "./estilos";
import { Midia } from "./Midia";

// Peças usadas também fora da home (listagem, produto, conta, checkout, área Projetos).
// Mesma API de antes da reconstrução da home.

// Bloco no lugar da foto: a mídia de espera da home (degradê da marca, trama e ícone de traço fino).
// `rotulo` fica só para leitura do código (qual foto entra ali); não aparece na tela.
export function Imagem({
  tom = "claro",
  className,
}: {
  rotulo?: string;
  tom?: "claro" | "forte";
  rotuloNoCentro?: boolean;
  className?: string;
}) {
  return <Midia tom={tom === "forte" ? "salviaClara" : "linho"} className={cx(css({ display: "flex", flexShrink: "0" }), className)} />;
}

// Título de seção (64 px, peso 400, entreletra fechada) com complemento em cinza e, à direita,
// abas ou um botão (lululemon-referencia.md §3.5).
export function TituloSecao({ id, titulo, complemento, acao }: { id: string; titulo: string; complemento?: string; acao?: ReactNode }) {
  return (
    <div className={cabecalhoSecao}>
      <h2 id={id} className={cx(tituloSecao, css({ mr: { desktop: "6" } }))}>
        {titulo}
        {complemento && <span className={css({ color: "textoSuave" })}> {complemento}</span>}
      </h2>
      {acao && <div className={css({ flexShrink: "0" })}>{acao}</div>}
    </div>
  );
}

const cabecalhoSecao = css({
  display: "flex",
  flexDirection: { base: "column", md: "row" },
  alignItems: { base: "flex-start", md: "flex-end" },
  justifyContent: "space-between",
  gap: { base: "5", md: "8" },
  mb: { base: "8", desktop: "12" },
});

export { tituloSecao };

// Legenda centralizada sob as imagens coladas (16 px, peso 500).
export const legenda = css({
  display: "block",
  mt: "4",
  fontSize: "md",
  fontWeight: "medium",
  color: "escuro",
  textAlign: "center",
});
