"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Cupom } from "@/loja/lib/carrinho/totais";
import type { ResultadoVaral } from "@/loja/lib/varal/regras";

// O prêmio do varal guardado no aparelho: a cliente fecha a janela, sai da página ou volta outro dia e o cupom
// continua ali (na página do varal e na lista de cupons da sacola). Só o resultado dela; o e-mail não é guardado.

const CHAVE = "mk-varal";
const EVENTO = "mk-varal-mudou";

function ler(): string | null {
  try { return window.localStorage.getItem(CHAVE); } catch { return null; }
}

export function guardarResultadoVaral(resultado: ResultadoVaral) {
  try { window.localStorage.setItem(CHAVE, JSON.stringify(resultado)); } catch { /* sem armazenamento: vale só nesta visita */ }
  window.dispatchEvent(new Event(EVENTO));
}

function assinar(avisar: () => void) {
  window.addEventListener(EVENTO, avisar);
  window.addEventListener("storage", avisar);
  return () => { window.removeEventListener(EVENTO, avisar); window.removeEventListener("storage", avisar); };
}

/** O resultado guardado (null enquanto a página carrega no servidor ou se a cliente ainda não jogou). */
export function useResultadoVaral(): ResultadoVaral | null {
  const bruto = useSyncExternalStore(assinar, ler, () => null);
  return useMemo(() => {
    if (!bruto) return null;
    try {
      const valor = JSON.parse(bruto) as ResultadoVaral;
      return typeof valor?.codigo === "string" && typeof valor?.premio === "string" && typeof valor?.validoAte === "string" ? valor : null;
    } catch { return null; }
  }, [bruto]);
}

export const varalVencido = (resultado: ResultadoVaral, agora = Date.now()) => Date.parse(resultado.validoAte) <= agora;

/** O cupom do varal no formato da sacola (aparece na lista de cupons dela). */
export function cupomDoVaral(resultado: ResultadoVaral): Cupom {
  return {
    codigo: resultado.codigo,
    percentual: resultado.tipo === "percentual" ? resultado.valor : 0,
    ...(resultado.tipo === "valor" ? { valorCentavos: resultado.valor } : {}),
    minimoCentavos: resultado.minimoCentavos,
    descricao: `Seu mimo do varal: ${resultado.premio}`,
    fim: Date.parse(resultado.validoAte),
    exibir: true,
  };
}

/**
 * Os cupons da loja mais o cupom que esta cliente ganhou no varal (enquanto vale). O servidor não manda os cupons
 * do varal na lista pública (são pessoais), então a sacola só conhece o dela por aqui; no pedido, o servidor confere.
 */
export function useCuponsComVaral(cupons: Cupom[]): Cupom[] {
  const resultado = useResultadoVaral();
  return useMemo(() => {
    if (!resultado || varalVencido(resultado) || cupons.some((cupom) => cupom.codigo === resultado.codigo)) return cupons;
    return [...cupons, cupomDoVaral(resultado)];
  }, [cupons, resultado]);
}
