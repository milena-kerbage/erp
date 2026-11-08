import { css } from "styled-system/css";

// Base visual da sacola (lululemon-sacola.md e lululemon-referencia.md §5): botões em pílula de 44
// (12 × 20, 14/500), links sublinhados de 14 com 4 de distância, controle redondo de 40 e o anel de
// foco triplo. Nas cores da marca.
const baseBotao = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "2",
  minH: "11",
  px: "5",
  py: "3",
  borderRadius: "pilula",
  borderWidth: "1px",
  borderColor: "transparent",
  fontFamily: "corpo",
  fontSize: "sm",
  fontWeight: "medium",
  lineHeight: "none",
  textAlign: "center",
  whiteSpace: "nowrap",
  cursor: "pointer",
  transitionProperty: "background-color, color, border-color",
  transitionDuration: "normal",
  transitionTimingFunction: "assinatura",
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
  _disabled: { opacity: "0.5", cursor: "not-allowed" },
  // Ícone nunca encolhe quando o texto é longo (ex.: "Fazer pedido pelo WhatsApp" em meia largura).
  "& svg": { flexShrink: "0" },
} as const;

export const botaoEscuro = css({ ...baseBotao, bg: "escuro", color: "fundo", _hover: { bg: "texto" } });
export const botaoClaro = css({ ...baseBotao, bg: "superficieSuave", color: "escuro", _hover: { bg: "placeholder" } });
export const botaoContorno = css({
  ...baseBotao,
  bg: "transparent",
  borderColor: "escuro",
  color: "escuro",
  _hover: { bg: "fundoSutil" },
});
export const largo = css({ w: "full" });

export const linkAcao = css({
  display: "inline",
  fontSize: "sm",
  lineHeight: "texto",
  color: "escuro",
  textDecoration: "underline",
  textDecorationThickness: "1px",
  textUnderlineOffset: "[4px]",
  cursor: "pointer",
  transitionProperty: "text-decoration-color",
  transitionDuration: "sublinhado",
  transitionTimingFunction: "assinatura",
  _hover: { textDecorationColor: "marca" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco", borderRadius: "xs" },
});

// Controle redondo de 40 (fechar), fundo suave.
export const controleRedondo = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: "0",
  w: "10",
  h: "10",
  borderRadius: "pilula",
  bg: "fundoSutil",
  color: "escuro",
  cursor: "pointer",
  transitionProperty: "background-color",
  transitionDuration: "normal",
  transitionTimingFunction: "assinatura",
  _hover: { bg: "superficieSuave" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

// Títulos: 36/39.6 (−4%) da página, 28 (−2%) de bloco, 40 (−4%) dos itens salvos.
export const tituloPagina = css({
  fontSize: "4xl",
  fontWeight: "normal",
  lineHeight: "titulo",
  letterSpacing: "titulo",
  color: "escuro",
});
export const tituloBloco = css({
  fontSize: "subtitulo",
  fontWeight: "normal",
  lineHeight: "bloco",
  letterSpacing: "bloco",
  color: "escuro",
});

// Escolha em pílula (tamanho, cor, bordado) no painel "Editar": 44 de altura, marcada em escuro.
export const opcaoPilula = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "2",
  minH: "11",
  px: "4",
  borderRadius: "pilula",
  borderWidth: "1px",
  borderColor: "borda",
  bg: "superficie",
  fontSize: "sm",
  color: "escuro",
  cursor: "pointer",
  transitionProperty: "border-color, background-color, color",
  transitionDuration: "normal",
  transitionTimingFunction: "assinatura",
  _hover: { borderColor: "escuro" },
  "&[aria-pressed=true]": { borderColor: "escuro", bg: "escuro", color: "fundo" },
  _disabled: { color: "desabilitado", textDecoration: "line-through", cursor: "not-allowed", _hover: { borderColor: "borda" } },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});
