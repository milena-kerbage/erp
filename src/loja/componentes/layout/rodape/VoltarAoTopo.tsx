"use client";

import type { ReactNode } from "react";

// "Voltar ao topo" do rodapé: rola até o início (sem animação com movimento reduzido) e leva o foco ao
// primeiro link do cabeçalho, para quem navega pelo teclado continuar de lá.
export function VoltarAoTopo({ className, children }: { className?: string; children: ReactNode }) {
  function voltar() {
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduzido ? "auto" : "smooth" });
    document.querySelector<HTMLElement>("header a[href]")?.focus({ preventScroll: true });
  }
  return (
    <button type="button" onClick={voltar} className={className}>
      {children}
    </button>
  );
}
