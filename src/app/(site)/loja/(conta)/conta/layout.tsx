import type { Metadata } from "next";
import { css } from "styled-system/css";

// Minha conta: a conta da cliente vem do servidor (/api/conta/*, cookie httpOnly da loja); os favoritos, do navegador.
// Fora do índice: nada aqui é conteúdo público. Cada página monta a trilha e as abas (MolduraConta).
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function LayoutMinhaConta({ children }: LayoutProps<"/loja/conta">) {
  return (
    <div className={css({ maxW: "grade", mx: "auto", px: { base: "3", md: "5", desktop: "10" }, pb: "24" })}>{children}</div>
  );
}
