import { css } from "styled-system/css";

// Base visual do painel do projeto e do montador: as MESMAS medidas do painel de compra da página de
// produto (produto/PainelCompra.tsx, lululemon-pdp.md §1.3 e §6), que não exporta os estilos. Blocos
// com 32 de espaço (24 no celular), rótulo 14/500 + valor 16, bolinhas 44/36, opções de 44 com borda
// de 4,8, cartões informativos de 112, botão escuro em pílula com o preço à direita e a pílula fixa.

export const secoes = css({
  display: "flex",
  flexDirection: "column",
  gap: { base: "6", desktop: "8" },
  pt: { base: "4", desktop: "0" },
  // Entrada ao abrir: cada bloco sobe 8 px e aparece (500 ms), escalonado a cada 50 ms.
  "& > *": { animation: "entrarPainel" },
  "& > :nth-child(2)": { animationDelay: "[50ms]" },
  "& > :nth-child(3)": { animationDelay: "[100ms]" },
  "& > :nth-child(4)": { animationDelay: "[150ms]" },
  "& > :nth-child(5)": { animationDelay: "[200ms]" },
  "& > :nth-child(n + 6)": { animationDelay: "[250ms]" },
});

export const trilha = css({ display: { base: "none", desktop: "block" }, fontSize: "sm", lineHeight: "texto", color: "escuro" });

export const linkTrilha = css({
  textDecoration: "none",
  _hover: { textDecoration: "underline", textUnderlineOffset: "[4px]" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

export const titulo = css({
  fontFamily: "corpo",
  fontSize: "subtitulo",
  fontWeight: "normal",
  lineHeight: { base: "bloco", desktop: "subtitulo" },
  letterSpacing: "bloco",
  color: "escuro",
  textWrap: "pretty",
});

export const preco = css({ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "2", mt: "2.5", fontSize: "sm", lineHeight: "texto", color: "escuro" });

export const seloPix = css({
  px: "2",
  borderRadius: "pilula",
  bg: "sucessoSuave",
  fontSize: "xs",
  fontWeight: "medium",
  lineHeight: "[20px]",
  color: "sucesso",
});

export const linhaRotulo = css({ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "2", lineHeight: "texto" });
export const rotulo = css({ fontSize: "sm", fontWeight: "medium", color: "escuro", "&[data-erro]": { color: "erro" } });
export const valor = css({ fontSize: "md", color: "escuro" });

// Bolinhas: alvo de 44 com 4 de respiro e círculo de 36; a escolhida ganha o anel escuro encostado.
export const amostras = css({ display: "flex", flexWrap: "wrap", gap: "2", mt: "3" });

export const amostra = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  w: "11",
  h: "11",
  p: "1",
  borderRadius: "pilula",
  outline: "[1px solid transparent]",
  outlineOffset: "[-1px]",
  transitionProperty: "outline-color",
  transitionDuration: "normal",
  transitionTimingFunction: "assinatura",
  "&[aria-current], &[aria-pressed=true]": { outlineColor: "escuro" },
  "&:is(button)": { cursor: "pointer" },
  "&:is(button):hover": { outlineColor: "contornoAmostra" },
  "&:is(button)[aria-pressed=true]:hover": { outlineColor: "escuro" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

export const circulo = css({ display: "block", w: "9", h: "9", borderRadius: "pilula", boxShadow: "[inset 0 0 0 1px token(colors.contornoAmostra)]" });

export const mensagemErro = css({ mt: "2", fontSize: "sm", lineHeight: "texto", color: "erro" });

// Opções em botão de 44: grade de 4 colunas no desktop (rótulos longos ocupam 2), fluxo no celular.
export const gradeOpcoes = css({
  display: { base: "flex", desktop: "grid" },
  flexWrap: "wrap",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "3",
  mt: "3",
});

export const botaoOpcao = css({
  w: { base: "opcaoTamanho", desktop: "auto" },
  h: "11",
  px: "1",
  borderRadius: "[4.8px]",
  borderWidth: "1px",
  borderColor: "borda",
  bg: "superficie",
  fontSize: "md",
  color: "escuro",
  textAlign: "center",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  cursor: "pointer",
  transitionProperty: "border-color",
  transitionDuration: "normal",
  _hover: { borderColor: "escuro" },
  "&[data-largo]": { w: { base: "auto", desktop: "auto" }, minW: "opcaoTamanho", px: "4", gridColumn: "span 2" },
  "&[aria-pressed=true]": { borderColor: "escuro", fontWeight: "semibold" },
  "[data-erro] > &": { borderColor: "erro" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

// Botão de 44 que ocupa a coluna inteira (grades de 2 ou 3 colunas iguais: tema, berço, bordado).
export const botaoOpcaoLargo = css({
  w: "full",
  h: "11",
  px: "3",
  borderRadius: "[4.8px]",
  borderWidth: "1px",
  borderColor: "borda",
  bg: "superficie",
  fontSize: "md",
  color: "escuro",
  textAlign: "center",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  cursor: "pointer",
  transitionProperty: "border-color",
  transitionDuration: "normal",
  _hover: { borderColor: "escuro" },
  "&[aria-pressed=true]": { borderColor: "escuro", fontWeight: "semibold" },
  "[data-erro] > &": { borderColor: "erro" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

// Cartão de opção (pacote, opcional): mesma borda dos botões de 44, conteúdo em 2 linhas e o valor à
// direita; o escolhido ganha a borda escura (e o check, no opcional).
const baseCartaoOpcao = {
  display: "grid",
  alignItems: "start",
  columnGap: "3",
  rowGap: "1",
  w: "full",
  minH: "11",
  px: "4",
  py: "3",
  borderRadius: "[4.8px]",
  borderWidth: "1px",
  borderColor: "borda",
  bg: "superficie",
  fontSize: "sm",
  lineHeight: "texto",
  color: "escuro",
  textAlign: "left",
  cursor: "pointer",
  transitionProperty: "border-color, box-shadow",
  transitionDuration: "normal",
  transitionTimingFunction: "assinatura",
  _hover: { borderColor: "escuro" },
  "&[aria-pressed=true]": { borderColor: "escuro", boxShadow: "[inset 0 0 0 1px token(colors.escuro)]" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
} as const;

export const cartaoOpcao = css({ ...baseCartaoOpcao, gridTemplateColumns: "[minmax(0, 1fr) auto]" });

// Opcional: caixinha de marcação à esquerda (3 colunas: caixa, nome, valor).
export const cartaoOpcional = css({ ...baseCartaoOpcao, gridTemplateColumns: "[20px minmax(0, 1fr) auto]" });

export const apoioCartao = css({ gridColumn: "1 / -1", fontSize: "sm", color: "textoSuave" });
export const apoioOpcional = css({ gridColumn: "2 / -1", fontSize: "sm", color: "textoSuave" });

export const linhaApoio = css({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "4",
  mt: "3",
  fontSize: "sm",
  lineHeight: "texto",
  color: "textoSuave",
});

export const linkSeta = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1",
  flexShrink: "0",
  fontSize: "sm",
  lineHeight: "texto",
  color: "escuro",
  textDecoration: "underline",
  textUnderlineOffset: "[4px]",
  textDecorationColor: "transparent",
  transitionProperty: "text-decoration-color",
  transitionDuration: "normal",
  _hover: { textDecorationColor: "escuro" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

// Divisória de pesponto (linha tracejada de costura, src/loja/estilos/pesponto.ts) no lugar da linha reta.
export const divisoria = css({
  h: "[1px]",
  m: "0",
  border: "none",
  bgImage: "[linear-gradient(token(colors.pesponto), token(colors.pesponto))]",
});

export const cartoes = css({ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: { base: "3", desktop: "4" }, minW: "0" });

// Cartões informativos (sem escolha): título, apoio e o status em verde.
export const cartaoInfo = css({
  display: "flex",
  flexDirection: "column",
  gap: "1",
  minH: "[112px]",
  p: "3",
  borderWidth: "1px",
  borderColor: "borda",
  borderRadius: "[4.8px]",
  fontSize: "sm",
  lineHeight: "texto",
});

// Botão principal: pílula de 44, escuro, texto à esquerda e preço à direita.
export const botaoCompra = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "3",
  minH: "11",
  px: "5",
  py: "3",
  borderRadius: "pilula",
  bg: "escuro",
  color: "fundo",
  fontSize: "sm",
  fontWeight: "medium",
  lineHeight: "[1.2]",
  textAlign: "left",
  cursor: "pointer",
  transitionProperty: "background-color",
  transitionDuration: "normal",
  transitionTimingFunction: "assinatura",
  _hover: { bg: "marcaContraste" },
  _active: { transform: "scale(0.99)" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

export const rotuloBotao = css({ minW: "0", textWrap: "balance" });
export const precoBotao = css({ flexShrink: "0", whiteSpace: "nowrap" });

export const pilulaBotao = css({ minW: "pilulaCompra", maxW: "[calc(100vw - 24px)]", gap: "6" });

export const parcelamento = css({ display: "flex", alignItems: "center", gap: "2", mt: "3", fontSize: "xs", lineHeight: "texto", color: "textoSuave" });

// Pílula fixa: sticky na base, centralizada; aparece quando o botão principal sai da tela por cima e
// some perto do rodapé (opacidade e visibilidade, 250 ms).
export const trilhoPilula = css({
  position: "sticky",
  bottom: "0",
  zIndex: "pilulaCompra",
  display: "flex",
  justifyContent: "center",
  w: "fit-content",
  minW: "pilulaCompra",
  mx: "auto",
  pb: "[calc(24px + env(safe-area-inset-bottom))]",
  opacity: "0",
  visibility: "hidden",
  transform: "translateY(8px)",
  transitionProperty: "opacity, visibility, transform",
  transitionDuration: "aparecer",
  transitionTimingFunction: "assinatura",
  "&[data-visivel]": { opacity: "1", visibility: "visible", transform: "none" },
});
