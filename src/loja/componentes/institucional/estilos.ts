import { css } from "styled-system/css";

// Base das páginas institucionais (ajuda, políticas, sobre, indique) e da conta: as mesmas margens da
// listagem (12/20/40), título de 36/56/64 com entreletra fechada como o topo da listagem, texto de
// 16–18 e pílulas de 44 (botões da sacola, carrinho/estilos.ts).

export const margens = css({ px: { base: "3", md: "5", desktop: "10" }, maxW: "grade", mx: "auto", w: "full" });

export const tituloInstitucional = css({
  mt: { base: "6", desktop: "12" },
  fontFamily: "titulo",
  fontSize: { base: "4xl", md: "secaoTablet", desktop: "secao" },
  fontWeight: "normal",
  lineHeight: "titulo",
  letterSpacing: "titulo",
  color: "escuro",
  textWrap: "balance",
});

export const lead = css({
  mt: { base: "4", desktop: "6" },
  maxW: "leitura",
  fontSize: { base: "md", md: "lg" },
  lineHeight: "relaxed",
  color: "textoSuave",
});

// Título de bloco dentro da página: 28/32/40 (−2%).
export const tituloSecao = css({
  fontFamily: "titulo",
  fontSize: { base: "subtitulo", md: "blocoTablet", desktop: "bloco" },
  fontWeight: "normal",
  lineHeight: "bloco",
  letterSpacing: "bloco",
  color: "escuro",
  textWrap: "balance",
});

// Texto corrido (políticas e temas de ajuda): coluna de leitura, h2 de bloco, h3 de 18, parágrafos de
// 16 com respiro, listas com marcador e links sublinhados.
export const prosa = css({
  maxW: "leitura",
  fontSize: "md",
  lineHeight: "relaxed",
  color: "texto",
  overflowWrap: "break-word",
  "& > :first-child": { mt: "0" },
  "& h2": {
    mt: { base: "12", md: "16" },
    mb: "4",
    fontFamily: "titulo",
    fontSize: { base: "2xl", md: "subtitulo" },
    fontWeight: "normal",
    lineHeight: "bloco",
    letterSpacing: "bloco",
    color: "escuro",
    scrollMarginTop: "[96px]",
  },
  "& h3": { mt: "8", mb: "2", fontSize: "lg", fontWeight: "medium", lineHeight: "texto", color: "escuro", scrollMarginTop: "[96px]" },
  "& p": { mt: "4" },
  "& h2 + p, & h3 + p": { mt: "0" },
  "& ul, & ol": { display: "grid", gap: "2", mt: "4", pl: "5" },
  "& ul": { listStyleType: "disc" },
  "& ol": { listStyleType: "decimal" },
  "& li::marker": { color: "textoSuave" },
  "& a": {
    color: "escuro",
    textDecoration: "underline",
    textDecorationThickness: "1px",
    textUnderlineOffset: "[4px]",
    _hover: { textDecorationColor: "marca" },
  },
  "& strong": { fontWeight: "medium", color: "escuro" },
});

// Cartão de link (central de ajuda e de políticas): contorno fino, 12 de canto, título de 18.
export const cartaoLink = css({
  display: "flex",
  flexDirection: "column",
  gap: "2",
  h: "full",
  p: { base: "5", md: "6" },
  borderWidth: "1px",
  borderColor: "borda",
  borderRadius: "cartao",
  bg: "superficie",
  color: "escuro",
  transitionProperty: "border-color, box-shadow",
  transitionDuration: "normal",
  transitionTimingFunction: "assinatura",
  _hover: { borderColor: "escuro" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

export const gradeCartoes = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", md: "repeat(2, minmax(0, 1fr))", desktop: "repeat(3, minmax(0, 1fr))" },
  gap: { base: "3", md: "5" },
});

// Caixa de destaque (contato, aviso): fundo de estúdio, canto de 16.
export const caixaDestaque = css({
  p: { base: "5", md: "8" },
  borderRadius: "bloco",
  bg: "fundoProduto",
  color: "texto",
});
