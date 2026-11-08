import type { Metadata } from "next";
import { css } from "styled-system/css";

// "Minha conta neste aparelho": sem login; os dados (favoritos e pedidos enviados) vêm do navegador.
// Fora do índice: nada aqui é conteúdo público. Cada página monta a trilha e as abas (MolduraConta).
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function LayoutMinhaConta({ children }: LayoutProps<"/loja/conta">) {
  return (
    <div className={css({ maxW: "grade", mx: "auto", px: { base: "3", md: "5", desktop: "10" }, pb: "24" })}>{children}</div>
  );
}
