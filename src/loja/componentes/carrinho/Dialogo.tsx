"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";
import { css, cx } from "styled-system/css";
import { X } from "@/loja/componentes/icones";
import { controleRedondo, tituloBloco } from "./estilos";

// Diálogo da sacola sobre o <dialog> nativo em modo modal: a página atrás fica inerte (o foco não
// sai do diálogo), Esc fecha e, ao fechar, o navegador devolve o foco ao botão que abriu.
// - "folha": sobe da base no celular (lululemon-sacola.md §4, "Remove") e vira diálogo central a partir de 768;
// - "gaveta": tela cheia no celular e gaveta da direita a partir de 768 (§8, "Added to Bag"), véu de .5.
// O conteúdo só existe aberto: cada abertura começa do zero (formulários e escolhas).
export function Dialogo({
  aberto,
  aoFechar,
  titulo,
  variante = "folha",
  classeTitulo,
  rodape,
  children,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  variante?: "folha" | "gaveta";
  classeTitulo?: string;
  rodape?: ReactNode; // fixo na base do painel (botões)
  children: ReactNode;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const elemento = dialogo.current;
    if (!elemento) return;
    if (aberto && !elemento.open) elemento.showModal();
    if (!aberto && elemento.open) elemento.close();
  }, [aberto]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: o clique só fecha ao tocar no véu; Esc já fecha o diálogo nativamente
    <dialog
      ref={dialogo}
      aria-labelledby={idTitulo}
      className={cx(base, variante === "folha" ? folha : gaveta)}
      onClose={aoFechar}
      onClick={(evento) => evento.target === evento.currentTarget && dialogo.current?.close()}
    >
      {aberto && (
        <div className={css({ display: "flex", flexDirection: "column", h: variante === "gaveta" ? "full" : "auto", maxH: "inherit" })}>
          <div className={cabecalho}>
            <h2 id={idTitulo} className={cx(tituloBloco, classeTitulo)}>
              {titulo}
            </h2>
            <button type="button" aria-label="Fechar" onClick={() => dialogo.current?.close()} className={controleRedondo}>
              <X size={16} aria-hidden />
            </button>
          </div>
          <div className={conteudo}>{children}</div>
          {rodape && <div className={rodapeEstilo}>{rodape}</div>}
        </div>
      )}
    </dialog>
  );
}

const base = css({
  position: "fixed",
  m: "0",
  p: "0",
  maxW: "none",
  borderWidth: "0",
  bg: "fundo",
  color: "texto",
  overflow: "hidden",
  _backdrop: { bg: "veuMenu", animation: "veuSacola" },
});

// Celular: presa na base. A partir de 768: centralizada pelas margens automáticas (inset 0 + altura do
// conteúdo), sem transform, para a animação de entrada não brigar com a centralização.
const folha = css({
  top: { base: "auto", md: "0" },
  bottom: "0",
  left: "0",
  right: "0",
  m: { base: "0", md: "auto" },
  w: { base: "full", md: "dialogoSacola" },
  h: "fit-content",
  maxH: { base: "[90dvh]", md: "[calc(100dvh - 48px)]" },
  borderTopRadius: "lg",
  borderBottomRadius: { base: "[0]", md: "lg" },
  _open: { animation: { base: "subirFolha", md: "surgir" } },
});

const gaveta = css({
  top: "0",
  bottom: "0",
  left: { base: "0", md: "auto" },
  right: "0",
  w: { base: "full", md: "gavetaSacola" },
  h: "dvh",
  maxH: "none",
  _open: { animation: { base: "subirFolha", md: "gavetaSacola" } },
});

const cabecalho = css({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "4",
  px: { base: "3", md: "6" },
  pt: { base: "3", md: "6" },
  pb: "4",
  "& > h2": { pt: "1" },
});

const conteudo = css({ flex: "1", minH: "0", overflowY: "auto", px: { base: "3", md: "6" }, pb: "6", overscrollBehavior: "contain" });

const rodapeEstilo = css({
  px: { base: "3", md: "6" },
  pt: "4",
  pb: "[calc(16px + env(safe-area-inset-bottom))]",
  borderTopWidth: "1px",
  borderColor: "borda",
  bg: "fundo",
});
