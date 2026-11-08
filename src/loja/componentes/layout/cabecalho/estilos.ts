import { css } from "styled-system/css";

// Medidas compartilhadas pelo cabeçalho e pelas páginas da loja.
// Cabeçalho: pílula flutuante translúcida (sálvia-linho) a partir de 992 px, a 16 px do topo da página,
// e barra clara de 56 px que some ao descer no celular. Não há faixa promocional acima dele.

// Respiro lateral das páginas internas (listagem, produto, carrinho, conta). Mantido como estava:
// as páginas internas não fazem parte desta reconstrução. A home usa as margens 12/20/40 da referência.
export const RESPIRO_LATERAL = { base: "4", md: "9", xl: "12" } as const;

// Fora da home, a pílula flutuante (16 de recuo + 48) não pode cobrir o conteúdo: o <main> reserva
// os 64 px do topo a partir de 992 px, como as páginas sem hero da referência. No celular o
// cabeçalho ocupa o próprio espaço (sticky, em fluxo). A home anula a reserva no hero (margem negativa).
export const reservaDoCabecalho = css({ pt: { desktop: "16" } }); // 64 px = sizes.topoCabecalho

// Anel de foco triplo da referência (§1.7), nas cores da marca.
export const focoTriplo = css({
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});
