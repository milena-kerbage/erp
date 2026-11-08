import { defineRecipe } from "@pandacss/dev";

// Botão/link de ação no desenho dos controles do ERP (src/styles/mixins.ts): cantos de 8 px,
// Inter, variante cheia em sálvia e de contorno.
export const receitaBotao = defineRecipe({
  className: "botao",
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "2",
    fontFamily: "corpo",
    fontWeight: "medium",
    borderRadius: "md",
    borderWidth: "1px",
    borderColor: "transparent",
    cursor: "pointer",
    textDecoration: "none",
    whiteSpace: "nowrap",
    transitionProperty: "background-color, color, border-color",
    transitionDuration: "rapida",
    transitionTimingFunction: "padrao",
    _disabled: { opacity: 0.5, cursor: "not-allowed" },
  },
  variants: {
    variante: {
      // CTA de compra: sálvia da marca.
      primario: { bg: "marca", color: "sobreDestaque", _hover: { bg: "marcaContraste" } },
      escuro: { bg: "escuro", color: "fundo", _hover: { bg: "texto" } },
      contorno: { bg: "transparent", color: "escuro", borderColor: "escuro", _hover: { bg: "escuro", color: "fundo" } },
      secundario: { bg: "superficie", color: "texto", borderColor: "borda", _hover: { bg: "superficieSuave" } },
      fantasma: { bg: "transparent", color: "texto", _hover: { bg: "superficieSuave" } },
    },
    tamanho: {
      p: { h: "9", px: "4", fontSize: "sm" },
      m: { h: "12", px: "5", fontSize: "md" },
      g: { h: "14", px: "7", fontSize: "lg" },
    },
    largo: { true: { w: "full" } },
  },
  defaultVariants: { variante: "primario", tamanho: "m" },
});
