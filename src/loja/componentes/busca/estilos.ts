import { css } from "styled-system/css";

// Campo de busca em pílula (lululemon-referencia.md §1.6 e lululemon-animacoes-edicao.md §4), usado
// na gaveta de busca e no topo da página de resultados: 40 de altura, borda de 1 px escura, lupa de
// 16 à esquerda com 8 de respiro, texto 16/500 e, com texto, o "×" de limpar à direita. Foco: anel triplo.
export const campoPilula = css({
  display: "flex",
  alignItems: "center",
  gap: "2",
  h: "10",
  pl: "4",
  pr: "1",
  borderWidth: "1px",
  borderColor: "escuro",
  borderRadius: "pilula",
  bg: "superficie",
  color: "escuro",
  _focusWithin: { boxShadow: "anelFoco" },
});

export const entradaBusca = css({
  flex: "1",
  minW: "0",
  h: "full",
  bg: "transparent",
  fontSize: "md",
  fontWeight: "medium",
  color: "escuro",
  outline: "none",
  _placeholder: { color: "textoSuave" },
  "&::-webkit-search-cancel-button": { display: "none" },
});

// "×" de limpar: alvo de 32 dentro da pílula (o anel de foco fica no próprio botão).
export const botaoLimpar = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: "0",
  w: "8",
  h: "8",
  borderRadius: "pilula",
  color: "escuro",
  cursor: "pointer",
  transition: "colors",
  transitionDuration: "normal",
  _hover: { bg: "fundoSutil" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

// Título dos blocos da gaveta ("Mais buscados", "Peças sugeridas"): 24/31.2 (20/26 no celular).
export const tituloBloco = css({ pb: "3", fontSize: { base: "xl", md: "2xl" }, fontWeight: "normal", lineHeight: "subtitulo", color: "escuro" });

// Termos de 16 px a ~38 px por linha; no hover (ou na opção ativa pelas setas) o texto anda 5 px.
// Primeira letra maiúscula, como na referência.
export const linhaTermo = css({
  display: "block",
  w: "full",
  py: "2",
  fontSize: "md",
  fontWeight: "normal",
  lineHeight: "texto",
  color: "escuro",
  textAlign: "left",
  cursor: "pointer",
  "& > span": {
    display: "inline-block",
    transition: "transform",
    transitionDuration: "normal",
    transitionTimingFunction: "in-out",
  },
  "& > span::first-letter": { textTransform: "uppercase" },
  "& b": { fontWeight: "semibold" },
  _hover: { "& > span": { transform: "translateX(5px)" } },
  "&[aria-selected=true] > span": { transform: "translateX(5px)", textDecoration: "underline", textUnderlineOffset: "[4px]" },
  _focusVisible: { outline: "none", "& > span": { textDecoration: "underline", textUnderlineOffset: "[4px]" } },
});
