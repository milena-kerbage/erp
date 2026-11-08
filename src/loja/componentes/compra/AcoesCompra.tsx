"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { css } from "styled-system/css";
import { MenuConta } from "@/loja/componentes/conta/MenuConta";
import { ArrowLeft, WhatsappLogo } from "@/loja/componentes/icones";

// Lado direito do cabeçalho mínimo da compra: a conta sempre (como a sacola da referência) e, só no
// pedido (/checkout), "Pedido pelo WhatsApp" e a volta para a sacola. O caminho público (/checkout) chega por
// reescrita do proxy: lido depois de montar, para o HTML do servidor não divergir (docs do
// usePathname, "Avoid hydration mismatch with rewrites").
export function AcoesCompra() {
  const caminho = usePathname();
  const [noCheckout, setNoCheckout] = useState(false);

  useEffect(() => {
    setNoCheckout(caminho.endsWith("/checkout"));
  }, [caminho]);

  return (
    <div className={css({ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: { base: "2", md: "5" } })}>
      {noCheckout && (
        <>
          <p className={seguro}>
            <WhatsappLogo size={16} aria-hidden /> Pedido pelo WhatsApp
          </p>
          <Link href="/carrinho" className={voltar}>
            <ArrowLeft size={16} aria-hidden /> Voltar à sacola
          </Link>
        </>
      )}
      <MenuConta variante="compra" />
    </div>
  );
}

const seguro = css({
  display: { base: "none", md: "inline-flex" },
  alignItems: "center",
  gap: "2",
  fontSize: "sm",
  fontWeight: "medium",
  color: "textoSuave",
});

const voltar = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "2",
  minH: "10",
  fontSize: "sm",
  fontWeight: "medium",
  color: "escuro",
  textDecoration: "underline",
  textUnderlineOffset: "[4px]",
  _focusVisible: { outline: "none", boxShadow: "anelFoco", borderRadius: "xs" },
});

