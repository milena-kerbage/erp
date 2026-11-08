"use client";

import { css, cx } from "styled-system/css";
import { botao } from "styled-system/recipes";

// Erro inesperado numa rota. Nunca mostrar detalhe técnico (seguranca.md §1, OWASP A10);
// o digest identifica o erro nos logs do servidor.
export default function ErroDaPagina({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className={css({ minH: "[60dvh]", display: "grid", placeItems: "center", p: "6", textAlign: "center" })}>
      <div>
        <h1 className={css({ fontSize: "2xl", fontWeight: "extrabold" })}>Algo deu errado</h1>
        <p className={css({ mt: "3", color: "textoSuave" })}>Tente novamente em instantes.</p>
        {error.digest ? (
          <p className={css({ mt: "2", fontSize: "xs", color: "textoSuave", fontFamily: "mono" })}>Código: {error.digest}</p>
        ) : null}
        <button type="button" onClick={reset} className={cx(botao({ variante: "secundario" }), css({ mt: "6" }))}>
          Tentar de novo
        </button>
      </div>
    </main>
  );
}
