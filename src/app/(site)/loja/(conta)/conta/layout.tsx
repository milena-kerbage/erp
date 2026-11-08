import type { Metadata } from "next";
import { css } from "styled-system/css";
import { NavConta } from "@/loja/componentes/conta/NavConta";
import { RESPIRO_LATERAL } from "@/loja/componentes/layout/cabecalho/estilos";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Minha conta: abas no topo (referencia.md §3.9: Conta | Endereços | Pagamentos | Empresas…) e o
// conteúdo da aba embaixo, na largura da loja.
export default function LayoutMinhaConta({ children }: LayoutProps<"/loja/conta">) {
  return (
    <div className={css({ maxW: "conteudo", mx: "auto", px: RESPIRO_LATERAL, pt: { base: "5", lg: "8" }, pb: "24" })}>
      <NavConta />
      {children}
    </div>
  );
}
