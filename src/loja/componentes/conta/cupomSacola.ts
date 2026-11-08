"use client";

import type { PreferenciasCompra } from "@/loja/componentes/carrinho/estado";
import type { Cupom } from "@/loja/lib/carrinho/totais";
import { type CupomConta, cupomEfetivo, escolherCupom } from "@/loja/lib/contas/regras";
import { useConta } from "./estadoConta";

// Cupom da sacola e do pedido com a conta: logada e com o cupom de primeira compra disponível, ele
// entra sozinho (a cliente pode tirar). É só a PRÉVIA: o servidor confere e consome o cupom ao criar o
// pedido (src/lib/loja/contas.ts).

export type ContaDoCupom = { pronta: boolean; logada: boolean; cupom: CupomConta | null };

export function useContaDoCupom(): ContaDoCupom {
  const conta = useConta();
  if (conta.situacao !== "pronta") return { pronta: conta.situacao === "indisponivel", logada: false, cupom: null };
  return { pronta: true, logada: Boolean(conta.cliente), cupom: conta.cupom };
}

export type CupomDaSacola = { cupom?: Cupom; codigo?: string; automatico: boolean; boasVindas: boolean };

export function cupomDaSacola(preferencias: PreferenciasCompra, conta: ContaDoCupom, subtotalCentavos: number): CupomDaSacola {
  const codigo = cupomEfetivo(preferencias.cupom, preferencias.semCupomAutomatico === true, conta);
  if (!codigo) return { automatico: false, boasVindas: false };
  const escolha = escolherCupom(codigo, subtotalCentavos, conta);
  if (escolha.tipo === "invalido") return { automatico: false, boasVindas: false };
  return {
    cupom: escolha.cupom,
    codigo: escolha.cupom.codigo,
    automatico: !preferencias.cupom,
    boasVindas: escolha.tipo === "ok" && escolha.boasVindas,
  };
}
