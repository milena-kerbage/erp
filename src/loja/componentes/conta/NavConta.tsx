"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { css } from "styled-system/css";
import { useCliente } from "./estadoConta";

// Abas de Minha conta. Dados pessoais e Segurança só aparecem com a cliente logada.
const ABAS = [
  { rotulo: "Visão geral", href: "/conta" },
  { rotulo: "Pedidos", href: "/conta/pedidos" },
  { rotulo: "Favoritos", href: "/conta/favoritos" },
  { rotulo: "Dados pessoais", href: "/conta/dados", logada: true },
  { rotulo: "Segurança", href: "/conta/seguranca", logada: true },
];

// Abas horizontais (rolam no celular), a atual sublinhada. O caminho público chega por reescrita do
// proxy (/conta → /loja/conta): lido depois de montar, para o HTML do servidor não divergir.
export function NavConta() {
  const caminho = usePathname();
  const [atual, setAtual] = useState<string | null>(null);
  const cliente = useCliente();
  const abas = ABAS.filter((aba) => !aba.logada || cliente);

  useEffect(() => {
    const publico = caminho.replace(/^\/loja(?=\/)/, "");
    setAtual(
      ABAS.map((aba) => aba.href)
        .filter((href) => publico === href || (href !== "/conta" && publico.startsWith(`${href}/`)))
        .at(-1) ?? null,
    );
  }, [caminho]);

  return (
    <nav aria-label="Minha conta" className={css({ borderBottomWidth: "1px", borderColor: "borda" })}>
      <ul className={css({ display: "flex", gap: { base: "5", md: "8" }, overflowX: "auto", scrollbarWidth: "none" })}>
        {abas.map((aba) => (
          <li key={aba.href} className={css({ flexShrink: "0" })}>
            <Link href={aba.href} aria-current={atual === aba.href ? "page" : undefined} className={estiloAba}>
              {aba.rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const estiloAba = css({
  display: "inline-flex",
  alignItems: "center",
  h: "12",
  fontSize: "md",
  color: "textoSuave",
  borderBottomWidth: "2px",
  borderColor: "transparent",
  mb: "[-1px]",
  _hover: { color: "escuro" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco", borderRadius: "xs" },
  "&[aria-current=page]": { color: "escuro", fontWeight: "semibold", borderColor: "escuro" },
});
