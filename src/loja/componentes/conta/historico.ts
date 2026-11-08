"use client";

import { useSyncExternalStore } from "react";
import {
  CHAVE_HISTORICO,
  interpretarHistorico,
  type PedidoEnviado,
  registrarNoHistorico,
  removerDoHistorico,
} from "@/loja/lib/pedidos/historico";

// Pedidos enviados pelo WhatsApp neste aparelho, no localStorage (regras em lib/pedidos/historico.ts).
// Mesmo evento da sacola e dos favoritos (carrinho/estado.ts): outra aba ou outro componente que
// grave avisa os demais. Sem storage (navegação privada), a lista só fica vazia.
const EVENTO = "mk:armazenamento";

function ler(): string {
  try {
    return window.localStorage.getItem(CHAVE_HISTORICO) ?? "[]";
  } catch {
    return "[]";
  }
}

function gravar(pedidos: PedidoEnviado[]) {
  try {
    if (pedidos.length === 0) window.localStorage.removeItem(CHAVE_HISTORICO);
    else window.localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(pedidos));
  } catch {
    // sem storage: o histórico só não é guardado
  }
  window.dispatchEvent(new Event(EVENTO));
}

function assinar(aoMudar: () => void) {
  window.addEventListener(EVENTO, aoMudar);
  window.addEventListener("storage", aoMudar);
  return () => {
    window.removeEventListener(EVENTO, aoMudar);
    window.removeEventListener("storage", aoMudar);
  };
}

// null até ler o navegador (no servidor e na hidratação): a tela mostra um esqueleto.
export function usePedidosEnviados(): PedidoEnviado[] | null {
  const bruto = useSyncExternalStore(assinar, ler, () => null);
  return bruto === null ? null : interpretarHistorico(bruto);
}

export function registrarPedidoEnviado(pedido: PedidoEnviado) {
  gravar(registrarNoHistorico(interpretarHistorico(ler()), pedido));
}

export function apagarPedidoEnviado(numero: string) {
  gravar(removerDoHistorico(interpretarHistorico(ler()), numero));
}

export function apagarHistorico() {
  gravar([]);
}
