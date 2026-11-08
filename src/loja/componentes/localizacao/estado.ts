"use client";

import { useSyncExternalStore } from "react";
import { COOKIE_LOCAL, desserializarLocal, type Local, serializarLocal, VALIDADE_LOCAL_S } from "@/loja/lib/localizacao/cep";

// Local escolhido pelo visitante, guardado em cookie (o servidor lê o mesmo cookie para frete e
// estoque). Vários seletores na página (barra do desktop e faixa do celular) ficam em sincronia
// pelo evento abaixo.
const EVENTO = "mk:local";

function lerCookie(): string | null {
  const prefixo = `${COOKIE_LOCAL}=`;
  const item = document.cookie.split("; ").find((parte) => parte.startsWith(prefixo));
  return item ? item.slice(prefixo.length) : null;
}

function assinar(aoMudar: () => void) {
  window.addEventListener(EVENTO, aoMudar);
  return () => window.removeEventListener(EVENTO, aoMudar);
}

// Retorna a string crua do cookie (estável entre leituras) e só então interpreta: o
// useSyncExternalStore exige o mesmo valor enquanto nada mudou.
export function useLocal(): Local | null {
  const bruto = useSyncExternalStore(assinar, lerCookie, () => null);
  return desserializarLocal(bruto);
}

export function salvarLocal(local: Local) {
  const seguro = window.location.protocol === "https:" ? "; Secure" : "";
  // biome-ignore lint/suspicious/noDocumentCookie: a Cookie Store API ainda não existe em todos os navegadores (Firefox); o valor já vem serializado e validado
  document.cookie = `${COOKIE_LOCAL}=${serializarLocal(local)}; Max-Age=${VALIDADE_LOCAL_S}; Path=/; SameSite=Lax${seguro}`;
  window.dispatchEvent(new Event(EVENTO));
}

// Lembrete da primeira visita: some ao informar o CEP ou ao tocar em "Agora não" (até fechar o navegador).
const CHAVE_LEMBRETE = "mk_lembrete_cep";

export function lembreteDispensado(): boolean {
  try {
    return window.sessionStorage.getItem(CHAVE_LEMBRETE) === "1";
  } catch {
    return false;
  }
}

export function dispensarLembrete() {
  try {
    window.sessionStorage.setItem(CHAVE_LEMBRETE, "1");
  } catch {
    // Navegação privada sem storage: o lembrete volta na próxima página, sem prejuízo.
  }
}
