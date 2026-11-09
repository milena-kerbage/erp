"use client";

import { useEffect, useRef } from "react";
import { useConta } from "@/loja/componentes/conta/estadoConta";
import { useItensCarrinho } from "./estado";

// Carrinho sincronizado (só com a cliente LOGADA): a sacola continua no navegador e, a cada mudança, uma
// cópia vai para o servidor com debounce de 2 s (PUT /api/carrinho/sincronizar). Base dos "carrinhos
// abandonados" do ERP; sem conta, nada sai do aparelho. Falhas são silenciosas (a sacola local manda).
// Avisado na Política de privacidade, seção #conta. Não desenha nada.
const ESPERA_MS = 2000;

export function SincronizarCarrinho() {
  const conta = useConta();
  const itens = useItensCarrinho();
  const enviado = useRef<string | null>(null);
  const logada = conta.situacao === "pronta" && Boolean(conta.cliente) && conta.gravacao;
  const corpo = itens === null ? null : JSON.stringify({ itens });

  useEffect(() => {
    if (!logada || corpo === null || corpo === enviado.current) return;
    const temporizador = window.setTimeout(() => {
      fetch("/api/carrinho/sincronizar", { method: "PUT", credentials: "same-origin", cache: "no-store", keepalive: true, headers: { "Content-Type": "application/json" }, body: corpo })
        .then((resposta) => {
          if (resposta.ok) enviado.current = corpo;
        })
        .catch(() => {});
    }, ESPERA_MS);
    return () => window.clearTimeout(temporizador);
  }, [logada, corpo]);

  return null;
}
