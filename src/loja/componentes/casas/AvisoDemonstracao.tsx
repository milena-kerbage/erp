import { css, cx } from "styled-system/css";
import { Info } from "@/loja/componentes/icones";
import { AVISO_PRECOS } from "@/loja/lib/casas/catalogo";

// Aviso de preços de demonstração em UMA linha discreta ("Valores de demonstração ⓘ"): o texto
// completo abre por baixo ao tocar/clicar (<details>, acessível e sem JavaScript). Substitui o
// parágrafo longo que se repetia na listagem, na página do projeto e na seleção.
export function AvisoDemonstracao({ complemento, className }: { complemento?: string; className?: string }) {
  return (
    <details className={cx(css({ fontSize: "xs", lineHeight: "texto", color: "textoSuave" }), className)}>
      <summary
        className={css({
          display: "inline-flex",
          alignItems: "center",
          gap: "1",
          cursor: "pointer",
          listStyle: "none",
          borderRadius: "xs",
          "&::-webkit-details-marker": { display: "none" },
          _hover: { color: "escuro" },
          _focusVisible: { outline: "none", boxShadow: "anelFoco" },
        })}
      >
        Valores de demonstração
        <Info size={14} aria-hidden />
      </summary>
      <p className={css({ mt: "2", maxW: "[52ch]" })}>
        {AVISO_PRECOS}
        {complemento ? ` ${complemento}` : ""}
      </p>
    </details>
  );
}
