"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { css } from "styled-system/css";
import { NOME_PROGRAMA } from "@/loja/lib/fastclub/regras";

// [A FAZER] as abas além de Pedidos entram com a área do cliente na API.
const ABAS = [
  { rotulo: "Pedidos", href: "/conta/pedidos" },
  { rotulo: NOME_PROGRAMA, href: "/conta/clube" },
  { rotulo: "Meus dados", href: "/conta/dados" },
  { rotulo: "Endereços", href: "/conta/enderecos" },
  { rotulo: "Notificações", href: "/conta/notificacoes" },
];

// Abas horizontais da conta (rolam no celular), a atual sublinhada.
export function NavConta() {
  const caminho = usePathname();
  return (
    <nav aria-label="Minha conta" className={css({ borderBottomWidth: "1px", borderColor: "borda" })}>
      <ul className={css({ display: "flex", gap: { base: "5", md: "8" }, overflowX: "auto", scrollbarWidth: "none" })}>
        {ABAS.map((aba) => {
          const atual = caminho === aba.href || caminho.startsWith(`${aba.href}/`);
          return (
            <li key={aba.href} className={css({ flexShrink: "0" })}>
              <Link href={aba.href} aria-current={atual ? "page" : undefined} className={aba_}>
                {aba.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const aba_ = css({
  display: "inline-flex",
  alignItems: "center",
  h: "12",
  fontSize: "md",
  color: "textoSuave",
  borderBottomWidth: "2px",
  borderColor: "transparent",
  mb: "[-1px]",
  _hover: { color: "escuro" },
  "&[aria-current=page]": { color: "escuro", fontWeight: "semibold", borderColor: "escuro" },
});
