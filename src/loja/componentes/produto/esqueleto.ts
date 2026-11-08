import { css } from "styled-system/css";

// Esqueleto com brilho (lululemon-animacoes-edicao.md §1): bloco no tom de espera e uma faixa de luz
// que atravessa da esquerda para a direita (translateX −100% → 100% em 60% do ciclo de 2 s), em loop.
// Sem movimento com prefers-reduced-motion: fica só o bloco.
export const esqueleto = css({
  position: "relative",
  overflow: "hidden",
  bg: "placeholder",
  _after: {
    content: '""',
    position: "absolute",
    inset: "0",
    transform: "translateX(-100%)",
    bgImage: "[linear-gradient(90deg, transparent, color-mix(in srgb, token(colors.superficie) 55%, transparent), transparent)]",
    animation: "brilhoEsqueleto",
    _motionReduce: { display: "none" },
  },
});

// Moldura de foto: enquanto a imagem (ImagemSuave) não carrega, o brilho corre por cima do fundo.
export const brilhoAoCarregar = css({
  "&:has(img[data-suave]:not([data-carregada]))::after": {
    content: '""',
    position: "absolute",
    inset: "0",
    zIndex: "[1]",
    pointerEvents: "none",
    bgImage: "[linear-gradient(90deg, transparent, color-mix(in srgb, token(colors.superficie) 55%, transparent), transparent)]",
    animation: "brilhoEsqueleto",
  },
  "@media (prefers-reduced-motion: reduce)": { "&:has(img[data-suave]:not([data-carregada]))::after": { display: "none" } },
});
