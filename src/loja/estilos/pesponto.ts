import { css } from "styled-system/css";

// "Pesponto": a assinatura de ateliê da loja. Uma linha tracejada fina, como a costura aparente de um
// lençol, no lugar de algumas linhas retas (divisórias, bordas de seção, sublinhado do menu). Desenhada
// com degradê repetido (traço de 6 px, vão de 4 px) e não com `border-style: dashed`, cujo traço muda
// de navegador para navegador. Fica no fundo do próprio elemento: combina com qualquer cor de fundo.
// Use com `cx(...)`; as classes só mexem em background-image/size/position/repeat.

// Valores escritos por extenso em cada css(): o Panda extrai os estilos estaticamente.
export const pespontoTopo = css({
  bgImage: "[repeating-linear-gradient(90deg, token(colors.pesponto) 0 6px, transparent 6px 10px)]",
  bgSize: "[100% 1px]",
  bgRepeat: "no-repeat",
  bgPosition: "top",
});
export const pespontoBase = css({
  bgImage: "[repeating-linear-gradient(90deg, token(colors.pesponto) 0 6px, transparent 6px 10px)]",
  bgSize: "[100% 1px]",
  bgRepeat: "no-repeat",
  bgPosition: "bottom",
});
export const pespontoTopoEscuro = css({
  bgImage: "[repeating-linear-gradient(90deg, token(colors.pespontoSobreEscuro) 0 6px, transparent 6px 10px)]",
  bgSize: "[100% 1px]",
  bgRepeat: "no-repeat",
  bgPosition: "top",
});
export const pespontoBaseEscuro = css({
  bgImage: "[repeating-linear-gradient(90deg, token(colors.pespontoSobreEscuro) 0 6px, transparent 6px 10px)]",
  bgSize: "[100% 1px]",
  bgRepeat: "no-repeat",
  bgPosition: "bottom",
});
