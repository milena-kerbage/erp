import { css } from "styled-system/css";

// Base visual da home no modelo da shop.lululemon.com (lululemon-referencia.md §3.0 e §5):
// margens 12/20/40, ritmo de 64/96 entre módulos, títulos leves (peso 400) com entreletra fechada,
// botões em pílula de 44 px e controles redondos de 40 px. Cores e fontes da marca (Inter).

// Módulo contido: 64 px (celular) / 96 px (desktop) acima e abaixo. As margens colapsam, então a
// distância entre dois módulos é 64/96. Os de mídia em tela cheia não têm margem própria.
export const modulo = css({ my: { base: "16", desktop: "24" } });

// Margem lateral da página: 12 (celular), 20 (tablet), 40 (desktop), com conteúdo de até 1360 px.
export const margens = css({ px: { base: "3", md: "5", desktop: "10" } });
export const largura = css({ maxW: "grade", mx: "auto" });

// Escala de títulos (§5.7). Peso 400, sem caixa alta.
export const tituloHero = css({
  fontFamily: "titulo",
  fontWeight: "normal",
  fontSize: { base: "heroCelular", md: "secao", desktop: "7xl" },
  lineHeight: "titulo",
  letterSpacing: "titulo",
});

export const tituloSecao = css({
  fontFamily: "titulo",
  fontWeight: "normal",
  fontSize: { base: "4xl", md: "secaoTablet", desktop: "secao" },
  lineHeight: "titulo",
  letterSpacing: "titulo",
  color: "escuro",
  textWrap: "balance",
});

export const tituloBloco = css({
  fontFamily: "titulo",
  fontWeight: "normal",
  fontSize: { base: "subtitulo", md: "blocoTablet", desktop: "bloco" },
  lineHeight: "bloco",
  letterSpacing: "bloco",
  color: "escuro",
});

export const subtitulo = css({
  fontWeight: "normal",
  fontSize: { base: "2xl", desktop: "subtitulo" },
  lineHeight: "subtitulo",
});

export const tituloPequeno = css({
  fontWeight: "normal",
  fontSize: { base: "xl", desktop: "2xl" },
  lineHeight: "subtitulo",
  color: "escuro",
});

export const textoGrande = css({ fontSize: "lg", lineHeight: "texto", color: "texto" });

// Botões (§5.6): 44 de altura, 12×20 de respiro, pílula, 14/500.
const baseBotao = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "2",
  minH: "11",
  px: "5",
  py: "3",
  borderRadius: "pilula",
  fontFamily: "corpo",
  fontSize: "sm",
  fontWeight: "medium",
  lineHeight: "none",
  whiteSpace: "nowrap",
  cursor: "pointer",
  transitionProperty: "background-color, color, border-color",
  transitionDuration: "normal",
  transitionTimingFunction: "assinatura",
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
} as const;

// Primário: fundo escuro, nas seções claras.
export const botaoPrimario = css({ ...baseBotao, bg: "escuro", color: "fundo", _hover: { bg: "marcaContraste" } });

// Terciário: claro e com desfoque, sobre foto ou vídeo.
export const botaoTerciario = css({
  ...baseBotao,
  bg: "fundoSutil",
  color: "escuro",
  backdropFilter: "auto",
  backdropBlur: "botao",
  _hover: { bg: "superficieSuave" },
});

// Secundário: contorno de 1 px.
export const botaoSecundario = css({
  ...baseBotao,
  bg: "transparent",
  color: "escuro",
  borderWidth: "1px",
  borderColor: "escuro",
  _hover: { bg: "escuro", color: "fundo" },
});

// Link de texto dos cards de destaque: 14/500, sublinhado de 1 px a 4 px do texto; no hover o
// traço muda para a cor da marca.
export const linkTexto = css({
  display: "inline-block",
  fontSize: "sm",
  fontWeight: "medium",
  lineHeight: "texto",
  color: "escuro",
  textDecoration: "underline",
  textDecorationThickness: "1px",
  textUnderlineOffset: "[4px]",
  textDecorationColor: "escuro",
  transition: "colors",
  transitionDuration: "normal",
  _hover: { textDecorationColor: "marca" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco", borderRadius: "xs" },
});

// Controle redondo de 40 px (pausar, fechar, voltar). Ícone de 24 (16 no fechar).
const baseControle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: "0",
  w: "10",
  h: "10",
  borderRadius: "pilula",
  cursor: "pointer",
  transitionProperty: "background-color",
  transitionDuration: "normal",
  transitionTimingFunction: "assinatura",
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
} as const;

export const controleEscuro = css({ ...baseControle, bg: "controleEscuro", color: "superficie", _hover: { bg: "controleEscuroHover" } });
export const controleClaro = css({
  ...baseControle,
  bg: "controleClaro",
  color: "escuro",
  backdropFilter: "auto",
  backdropBlur: "botao",
  _hover: { bg: "superficie" },
});
export const controleSuave = css({ ...baseControle, bg: "fundoSutil", color: "escuro", _hover: { bg: "superficieSuave" } });

// Grupo de setas em pílula (72×40, botões de 32). "escuro" no hero; "contorno" nos carrosséis.
const baseGrupo = {
  display: "inline-flex",
  alignItems: "center",
  p: "1",
  borderRadius: "pilula",
  "& > button": {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    w: "8",
    h: "8",
    borderRadius: "pilula",
    cursor: "pointer",
    transitionProperty: "background-color, color",
    transitionDuration: "normal",
    _focusVisible: { outline: "none", boxShadow: "anelFoco" },
  },
} as const;

export const grupoSetasEscuro = css({
  ...baseGrupo,
  bg: "controleEscuro",
  color: "superficie",
  "& > button:disabled": { color: "desabilitado", cursor: "default" },
  "& > button:not(:disabled):hover": { bg: "controleEscuroHover" },
});

export const grupoSetasContorno = css({
  ...baseGrupo,
  borderWidth: "1px",
  borderColor: "escuro",
  color: "escuro",
  "& > button:disabled": { visibility: "hidden" },
  "& > button:not(:disabled):hover": { bg: "superficieSuave" },
});

// Scrim de baixo para cima sobre mídia (§3.3): escuro a 54% até transparente em 82%.
export const scrim = css({
  position: "absolute",
  inset: "0",
  pointerEvents: "none",
  bgImage: "[linear-gradient(to top, color-mix(in srgb, token(colors.escuro) 54%, transparent) 0%, transparent 82%)]",
});

// Trilho rolável com snap e sem barra de rolagem. `position: relative` torna o trilho o bloco de
// contenção dos filhos absolutos (ex.: texto só para leitor de tela): sem isso eles escapam do
// recorte do overflow e alargam a página no celular (o navegador reduz o zoom da página inteira).
export const trilhoSnap = css({
  position: "relative",
  display: "flex",
  overflowX: "auto",
  scrollSnapType: "x",
  scrollSnapStrictness: "mandatory",
  overscrollBehaviorX: "contain",
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { display: "none" },
  "& > *": { flexShrink: "0", scrollSnapAlign: "start" },
});
