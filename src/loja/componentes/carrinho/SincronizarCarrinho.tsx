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
  // A última cópia enviada fica na sessão da aba (só um resumo, não a sacola): recarregar a página com a
  // mesma sacola não manda tudo de novo ao servidor.
  const enviado = useRef<string | null>(null);
  const logada = conta.situacao === "pronta" && Boolean(conta.cliente) && conta.gravacao;
  const corpo = itens === null ? null : JSON.stringify({ itens });
  const chave = corpo === null || conta.situacao !== "pronta" || !conta.cliente ? null : resumo(`${conta.cliente.id}|${corpo}`);

  useEffect(() => {
    if (enviado.current === null) enviado.current = lerEnviado();
    if (!logada || corpo === null || chave === enviado.current) return;
    const temporizador = window.setTimeout(() => {
      fetch("/api/carrinho/sincronizar", { method: "PUT", credentials: "same-origin", cache: "no-store", keepalive: true, headers: { "Content-Type": "application/json" }, body: corpo })
        .then((resposta) => {
          if (resposta.ok && chave) gravarEnviado((enviado.current = chave));
        })
        .catch(() => {});
    }, ESPERA_MS);
    return () => window.clearTimeout(temporizador);
  }, [logada, corpo, chave]);

  return null;
}

const CHAVE_ENVIADO = "mk_carrinho_enviado";
/** Resumo curto (djb2) da sacola enviada: compara sem guardar o conteúdo. */
function resumo(texto: string) {
  let hash = 5381;
  for (let i = 0; i < texto.length; i++) hash = ((hash << 5) + hash + texto.charCodeAt(i)) | 0;
  return `${texto.length}:${hash >>> 0}`;
}
function lerEnviado() {
  try { return sessionStorage.getItem(CHAVE_ENVIADO) ?? ""; } catch { return ""; }
}
function gravarEnviado(valor: string) {
  try { sessionStorage.setItem(CHAVE_ENVIADO, valor); } catch { /* aba privada: só envia de novo */ }
}
