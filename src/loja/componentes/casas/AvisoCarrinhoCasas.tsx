"use client";

import Link from "next/link";
import { css } from "styled-system/css";
import { Baby } from "@/loja/componentes/icones";
import { RESPIRO_LATERAL } from "@/loja/componentes/layout/cabecalho/estilos";
import { useProjetosSelecionados } from "./estadoSelecao";

// No carrinho de produtos: avisa que há projetos na seleção de projetos (são listas separadas: o
// projeto termina num pedido de orçamento, não no pagamento). Nome mantido por compatibilidade
// (importado pela rota /carrinho).
export function AvisoCarrinhoCasas() {
  const total = useProjetosSelecionados()?.length ?? 0;
  if (total === 0) return null;
  return (
    <div className={css({ px: RESPIRO_LATERAL, pt: "4" })}>
      <Link href="/projetos/selecao" className={aviso}>
        <Baby size={18} aria-hidden />
        Você tem {total} {total === 1 ? "projeto" : "projetos"} de quarto na sua seleção.
        <span className={css({ fontWeight: "semibold", textDecoration: "underline", textUnderlineOffset: "3px" })}>
          Ver seleção de projetos
        </span>
      </Link>
    </div>
  );
}

export { AvisoCarrinhoCasas as AvisoSelecaoProjetos };

const aviso = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "2",
  px: "4",
  py: "3",
  borderRadius: "campo",
  bg: "superficieSuave",
  fontSize: "sm",
  color: "escuro",
});
