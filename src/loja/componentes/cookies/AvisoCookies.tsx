"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { css } from "styled-system/css";
import { COOKIE, escreverConsentimento, lerConsentimento } from "@/loja/lib/rastreamento/nucleo";

// Aviso de cookies (LGPD). A escolha fica no cookie mk_consentimento ("v1.a1.m1"), lido pelo proxy da loja
// (src/loja/lib/rastreamento/nucleo.ts): com "Aceitar", a origem da visita (campanha, anúncio, busca) fica guardada
// por 90 dias e os identificadores de anúncio são mantidos; com "Só os necessários", ela vale só nesta visita e os
// identificadores de clique são descartados. Dá para mudar depois em Política de cookies.
const VALIDADE_S = 180 * 86_400;

const lerCookie = (nome: string) => document.cookie.split("; ").find((par) => par.startsWith(`${nome}=`))?.slice(nome.length + 1);

export function gravarConsentimento(escolha: { analitico: boolean; marketing: boolean }) {
  document.cookie = `${COOKIE.consentimento}=${escreverConsentimento(escolha)}; Max-Age=${VALIDADE_S}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  // Reaplica os cookies de origem já com a escolha (o proxy só os grava em navegação): não depende do próximo clique.
  void fetch("/api/consentimento", { method: "POST", credentials: "same-origin", keepalive: true }).catch(() => undefined);
}

export function AvisoCookies() {
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    if (!lerConsentimento(lerCookie(COOKIE.consentimento)).decidido) setAberto(true);
  }, []);
  if (!aberto) return null;
  const escolher = (aceitou: boolean) => {
    gravarConsentimento({ analitico: aceitou, marketing: aceitou });
    setAberto(false);
  };
  return (
    <section role="region" aria-label="Aviso de cookies" className={caixa}>
      <p className={texto}>
        Usamos cookies para a loja funcionar e, com a sua permissão, para saber por onde você chegou até nós e melhorar as nossas campanhas.{" "}
        <Link href="/politicas/cookies" className={link}>
          Política de cookies
        </Link>
      </p>
      <div className={acoes}>
        <button type="button" className={botaoSecundario} onClick={() => escolher(false)}>
          Só os necessários
        </button>
        <button type="button" className={botaoPrincipal} onClick={() => escolher(true)}>
          Aceitar
        </button>
      </div>
    </section>
  );
}

const caixa = css({
  position: "fixed",
  zIndex: "[60]",
  left: "4",
  bottom: "4",
  right: { base: "4", md: "auto" },
  maxW: { md: "[26rem]" },
  display: "flex",
  flexDirection: "column",
  gap: "3",
  p: "4",
  borderRadius: "[14px]",
  bg: "superficie",
  color: "texto",
  borderWidth: "1px",
  borderColor: "[rgb(29 31 27 / 0.1)]",
  boxShadow: "[0 12px 36px rgb(29 31 27 / 0.14)]",
  animation: "[subirSecao 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.8s backwards]",
});
const texto = css({ fontSize: "[13px]", lineHeight: "[1.5]", color: "textoSuave" });
const link = css({ color: "texto", textDecoration: "underline", textUnderlineOffset: "[3px]" });
const acoes = css({ display: "flex", gap: "2", justifyContent: "flex-end" });
const base = { h: "[2.25rem]", px: "4", borderRadius: "full", fontSize: "[13px]", fontWeight: "[600]", cursor: "pointer", transition: "[background-color 0.2s ease, border-color 0.2s ease]" } as const;
const botaoPrincipal = css({ ...base, bg: "marca", color: "sobreDestaque", _hover: { opacity: "[0.92]" } });
const botaoSecundario = css({ ...base, bg: "transparent", color: "texto", borderWidth: "1px", borderColor: "[rgb(29 31 27 / 0.18)]", _hover: { bg: "superficieSuave" } });
