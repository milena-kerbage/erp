"use client";

import { useSyncExternalStore } from "react";
import type { Pedido } from "@/loja/lib/pedidos/status";

// Pedidos criados pelo checkout de SIMULAÇÃO, guardados no navegador para aparecerem em
// "Meus pedidos" até a API de pedidos existir. Sem dado pessoal: nada de e-mail, documento ou
// endereço (só cidade/UF ou o local de retirada). Máximo de 10, o mais novo primeiro.
const CHAVE = "mk_pedidos";
const EVENTO = "mk:armazenamento";
const MAXIMO = 10;

function ler(): string {
  try {
    return window.localStorage.getItem(CHAVE) ?? "[]";
  } catch {
    return "[]";
  }
}

function gravar(pedidos: Pedido[]) {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(pedidos.slice(0, MAXIMO)));
  } catch {
    // sem storage: o pedido simulado só não aparece na lista
  }
  window.dispatchEvent(new Event(EVENTO));
}

function interpretar(bruto: string): Pedido[] {
  try {
    const valor = JSON.parse(bruto);
    return Array.isArray(valor) ? valor.filter((pedido) => typeof pedido?.numero === "string" && Array.isArray(pedido?.itens)) : [];
  } catch {
    return [];
  }
}

function assinar(aoMudar: () => void) {
  window.addEventListener(EVENTO, aoMudar);
  window.addEventListener("storage", aoMudar);
  return () => {
    window.removeEventListener(EVENTO, aoMudar);
    window.removeEventListener("storage", aoMudar);
  };
}

// null até ler o navegador (servidor e hidratação).
export function usePedidosSimulados(): Pedido[] | null {
  const bruto = useSyncExternalStore(assinar, ler, () => null);
  return bruto === null ? null : interpretar(bruto);
}

export function salvarPedidoSimulado(pedido: Pedido) {
  gravar([{ ...pedido, simulado: true }, ...interpretar(ler()).filter((atual) => atual.numero !== pedido.numero)]);
}

export function atualizarPedidoSimulado(numero: string, mudar: (pedido: Pedido) => Pedido) {
  gravar(interpretar(ler()).map((pedido) => (pedido.numero === numero ? mudar(pedido) : pedido)));
}
