"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { ContaCliente, PedidoLoja, RespostaConta } from "@/lib/loja/contas";
import { COOKIE_DICA_SESSAO, type CupomConta } from "@/loja/lib/contas/regras";

// Conta da cliente no navegador: o estado vem SEMPRE do servidor (/api/conta/eu, cookie httpOnly da
// loja); aqui só fica a cópia em memória da página, compartilhada pelo cabeçalho, pela sacola, pelo
// pedido e por Minha conta. Nada da conta vai para o localStorage.

export type { ContaCliente, PedidoLoja, RespostaConta };
export type EstadoConta =
  | { situacao: "carregando" }
  | { situacao: "pronta"; cliente: ContaCliente | null; cupom: CupomConta | null; gravacao: boolean }
  | { situacao: "indisponivel"; mensagem: string };

const CARREGANDO: EstadoConta = { situacao: "carregando" };
let estado: EstadoConta = CARREGANDO;
let pedido: Promise<void> | null = null;
const ouvintes = new Set<() => void>();

function publicar(novo: EstadoConta) {
  estado = novo;
  for (const ouvinte of ouvintes) ouvinte();
}

/** Erro das rotas de conta: mensagem pronta para a tela e as mensagens por campo. */
export class ErroApiConta extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly codigo: string,
    readonly campos: Record<string, string> = {},
  ) {
    super(message);
  }
}

export async function chamarConta<T>(caminho: string, opcoes: { metodo?: "GET" | "POST" | "PATCH"; corpo?: unknown } = {}): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(`/api/${caminho}`, {
      method: opcoes.metodo ?? (opcoes.corpo === undefined ? "GET" : "POST"),
      credentials: "same-origin",
      cache: "no-store",
      headers: opcoes.corpo === undefined ? undefined : { "Content-Type": "application/json" },
      body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
    });
  } catch {
    throw new ErroApiConta("Sem conexão. Confira a internet e tente de novo.", 0, "REDE");
  }
  const dados = (await resposta.json().catch(() => null)) as (T & { erro?: { codigo: string; mensagem: string; campos?: Record<string, string> } }) | null;
  if (!resposta.ok || !dados) {
    const erro = dados?.erro;
    throw new ErroApiConta(erro?.mensagem ?? "Não foi possível concluir agora. Tente de novo.", resposta.status, erro?.codigo ?? "ERRO", erro?.campos ?? {});
  }
  return dados;
}

/**
 * Visita anônima em produção (sem o cookie de dica): já se sabe que não há conta, sem chamar o servidor.
 * Em desenvolvimento sempre pergunta, porque a resposta também diz se as contas gravam (`gravacao`).
 */
function visitaAnonima() {
  if (process.env.NODE_ENV !== "production" || typeof document === "undefined") return false;
  return !document.cookie.split(";").some((parte) => parte.trim() === `${COOKIE_DICA_SESSAO}=1`);
}

export function recarregarConta(): Promise<void> {
  if (visitaAnonima()) {
    publicar({ situacao: "pronta", cliente: null, cupom: null, gravacao: true });
    pedido = Promise.resolve();
    return pedido;
  }
  pedido = chamarConta<RespostaConta & { cliente: ContaCliente | null; gravacao: boolean }>("conta/eu")
    .then((dados) => publicar({ situacao: "pronta", cliente: dados.cliente, cupom: dados.cupom, gravacao: dados.gravacao !== false }))
    .catch((erro: unknown) => publicar({ situacao: "indisponivel", mensagem: erro instanceof Error ? erro.message : "Contas indisponíveis." }));
  return pedido;
}

/** Depois de entrar, criar a conta, salvar os dados ou redefinir a senha: a resposta já traz a conta. */
export function definirConta(resposta: { cliente: ContaCliente | null; cupom: CupomConta | null }) {
  const gravacao = estado.situacao === "pronta" ? estado.gravacao : true;
  publicar({ situacao: "pronta", cliente: resposta.cliente, cupom: resposta.cupom, gravacao });
}

export async function sairDaConta() {
  await chamarConta("conta/sair", { corpo: {} });
  definirConta({ cliente: null, cupom: null });
}

function assinar(aoMudar: () => void) {
  ouvintes.add(aoMudar);
  return () => ouvintes.delete(aoMudar);
}

/** Estado da conta (carrega uma vez por página; o servidor e a hidratação veem "carregando"). */
export function useConta(): EstadoConta {
  const atual = useSyncExternalStore(assinar, () => estado, () => CARREGANDO);
  useEffect(() => {
    if (estado.situacao === "carregando" && !pedido) void recarregarConta();
  }, []);
  return atual;
}

/** Atalho: a cliente logada (ou null quando deslogada; undefined enquanto carrega). */
export function useCliente(): ContaCliente | null | undefined {
  const conta = useConta();
  if (conta.situacao === "carregando") return undefined;
  return conta.situacao === "pronta" ? conta.cliente : null;
}
