import Image from "next/image";
import Link from "next/link";
import { css } from "styled-system/css";
import { AcoesCompra } from "@/loja/componentes/compra/AcoesCompra";
import { RodapeCompra } from "@/loja/componentes/compra/RodapeCompra";
import { TransicaoPagina } from "@/loja/componentes/layout/TransicaoPagina";
import { EMPRESA } from "@/loja/lib/empresa";

// Grupo (compra): sacola e checkout sem distrações (lululemon-sacola.md §1): cabeçalho MÍNIMO de
// 56 com a logo à esquerda e a conta à direita (no checkout, também "Compra segura" e a volta à
// sacola), sem menu, busca nem faixa promocional; rodapé enxuto (Ajuda, Legal e Contato).
// [A FAZER] CSP com nonce (seguranca.md §5.1).
export default function LayoutCompra({ children }: LayoutProps<"/loja">) {
  return (
    <div className={css({ minH: "dvh", display: "flex", flexDirection: "column", bg: "fundo" })}>
      {/* Mesmo nome de transição do cabeçalho da loja: fica parado na troca de página. */}
      <header className={css({ borderBottomWidth: "1px", borderColor: "borda", bg: "fundo", viewTransitionName: "loja-cabecalho" })}>
        <div className={barra}>
          <Link href="/" aria-label={`${EMPRESA.nomeFantasia}, página inicial`} className={logo}>
            <Image
              src="/vitrine/marca/logotipo-horizontal-black.svg"
              alt=""
              width={160}
              height={40}
              priority
              className={css({ h: { base: "6", md: "7" }, w: "auto", maxW: "none" })}
            />
          </Link>
          <AcoesCompra />
        </div>
      </header>
      <main id="conteudo" className={css({ flex: "1" })}>
        <TransicaoPagina>{children}</TransicaoPagina>
      </main>
      <RodapeCompra />
    </div>
  );
}

// Margens da referência: 12 (celular), 20 (tablet), 40 (desktop), até 1440.
const barra = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "4",
  maxW: "sacola",
  mx: "auto",
  h: "cabecalhoCompra",
  px: { base: "3", md: "5", desktop: "10" },
});

const logo = css({
  display: "flex",
  alignItems: "center",
  minH: "10",
  borderRadius: "xs",
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});
