import type { ReactNode } from "react";
import { css } from "styled-system/css";

// Barra de ações da listagem (modelo da pílula flutuante da listagem da Lululemon): fixa no centro da
// base, com a visualização da grade e o botão de filtros. Só as páginas de listagem (produtos e
// Projetos) a montam; não há barra global de atendimento.
// Desenho: uma caixa de vidro (fundo claro a 78%, desfoque de 12 px, fio de 0,6 px) com um fio
// vertical no meio de cada vão, recuo de 3 px e botões "fantasma" redondos de 36 × 36.
export function BarraAcoes({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className={trilho}>
      <nav aria-label={rotulo} className={barra}>
        {children}
      </nav>
    </div>
  );
}

const VIDRO = "rgba(251, 251, 252, 0.78)";
const FIO = "rgba(60, 60, 67, 0.12)";
const PREENCHIMENTO_HOVER = "rgba(116, 116, 128, 0.08)";
const PREENCHIMENTO_ATIVO = "rgba(120, 120, 128, 0.16)";

// Trilho de largura total só para centralizar a barra (sem translate, que a animação usa). Com um
// diálogo aberto (filtros), a barra sai de cena.
const trilho = css({
  position: "fixed",
  insetX: "0",
  bottom: "[calc(24px + env(safe-area-inset-bottom))]",
  zIndex: "[25]",
  display: "flex",
  justifyContent: "center",
  pointerEvents: "none",
  transition: "all",
  transitionDuration: "normal",
  "body:has(dialog[open]) &": { opacity: "0", transform: "translateY(12px)" },
});

const barra = css({
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: "1.5",
  p: "[3px]",
  borderRadius: "full",
  bg: `[${VIDRO}]`,
  backdropFilter: "auto",
  backdropBlur: "[12px]",
  borderWidth: "[0.6px]",
  borderColor: `[${FIO}]`,
  boxShadow: "[0 4px 16px rgba(0, 0, 0, 0.08)]",
  pointerEvents: "auto",
  animation: "subirDoca",
  // Fio vertical no meio do vão antes de cada item (menos o primeiro), sem ocupar lugar no layout.
  "& > :not(:first-child)::before": {
    content: '""',
    position: "absolute",
    left: "[-3.3px]",
    top: "2",
    bottom: "2",
    w: "[0.6px]",
    bg: `[${FIO}]`,
    pointerEvents: "none",
  },
});

// Grupo de botões dentro da caixa (sem fundo próprio: o vidro é da barra).
export const pilulaBarra = css({
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: "0.5",
});

// Botão fantasma da barra: hover com preenchimento leve; pressionado, afunda; a opção ativa
// (visualização escolhida) fica com o preenchimento mais forte. Hover só onde há mouse.
const fantasma = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  w: "9",
  h: "9",
  borderRadius: "full",
  color: "escuro",
  cursor: "pointer",
  transition: "all",
  transitionDuration: "normal",
  "@media (hover: hover)": { "&:hover": { bg: `[${PREENCHIMENTO_HOVER}]` } },
  _active: { transform: "scale(0.94)" },
  _focusVisible: { outline: "[2px solid token(colors.foco)]", outlineOffset: "[2px]" },
  "&[aria-pressed=true], &[aria-expanded=true]": {
    bg: `[${PREENCHIMENTO_ATIVO}]`,
    "@media (hover: hover)": { "&:hover": { bg: `[${PREENCHIMENTO_ATIVO}]` } },
  },
} as const;

export const botaoPilula = css(fantasma);

export const botaoRedondo = css(fantasma);
