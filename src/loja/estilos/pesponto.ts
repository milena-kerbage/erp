import { css } from "styled-system/css";

// Divisórias finas contínuas (1 px) no fundo do próprio elemento. O nome "pesponto" ficou da versão
// tracejada, revertida a pedido: hoje é uma linha reta na cor do token `pesponto` (igual a `borda`).

// Valores escritos por extenso em cada css(): o Panda extrai os estilos estaticamente.
export const pespontoTopo = css({
  bgImage: "[linear-gradient(token(colors.pesponto), token(colors.pesponto))]",
  bgSize: "[100% 1px]",
  bgRepeat: "no-repeat",
  bgPosition: "top",
});
export const pespontoBase = css({
  bgImage: "[linear-gradient(token(colors.pesponto), token(colors.pesponto))]",
  bgSize: "[100% 1px]",
  bgRepeat: "no-repeat",
  bgPosition: "bottom",
});
export const pespontoTopoEscuro = css({
  bgImage: "[linear-gradient(token(colors.pespontoSobreEscuro), token(colors.pespontoSobreEscuro))]",
  bgSize: "[100% 1px]",
  bgRepeat: "no-repeat",
  bgPosition: "top",
});
export const pespontoBaseEscuro = css({
  bgImage: "[linear-gradient(token(colors.pespontoSobreEscuro), token(colors.pespontoSobreEscuro))]",
  bgSize: "[100% 1px]",
  bgRepeat: "no-repeat",
  bgPosition: "bottom",
});
