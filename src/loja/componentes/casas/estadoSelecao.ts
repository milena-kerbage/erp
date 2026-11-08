"use client";

import { useSyncExternalStore } from "react";

// Seleção de projetos, separada do carrinho de produtos: projeto não tem frete nem pagamento no site,
// então o que se guarda é o projeto e o pacote escolhido, e a finalização é um pedido de orçamento ao
// ateliê pelo WhatsApp, com todos os projetos juntos. PROVISÓRIO no navegador (localStorage), como o
// carrinho comum; sem dado pessoal. Leituras falham em silêncio (navegação privada sem storage).

export type ProjetoSelecionado = { slug: string; pacote: string };

const CHAVE = "mk_projetos";
const EVENTO = "mk:armazenamento";

function ler(): ProjetoSelecionado[] {
  try {
    const valor = JSON.parse(window.localStorage.getItem(CHAVE) ?? "[]");
    return Array.isArray(valor) ? valor.filter((item) => typeof item?.slug === "string" && typeof item?.pacote === "string") : [];
  } catch {
    return [];
  }
}

function gravar(itens: ProjetoSelecionado[]) {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(itens));
  } catch {
    // sem storage: segue sem persistir
  }
  window.dispatchEvent(new Event(EVENTO));
}

function assinar(aoMudar: () => void) {
  window.addEventListener(EVENTO, aoMudar);
  window.addEventListener("storage", aoMudar); // outra aba
  return () => {
    window.removeEventListener(EVENTO, aoMudar);
    window.removeEventListener("storage", aoMudar);
  };
}

// Um projeto entra uma vez só: adicionar de novo só troca o pacote.
export function adicionarProjeto(item: ProjetoSelecionado) {
  gravar([...ler().filter((atual) => atual.slug !== item.slug), item]);
}

// Devolve a posição que o projeto ocupava, para o "Desfazer" pôr de volta no mesmo lugar.
export function removerProjeto(slug: string): number {
  const itens = ler();
  const posicao = itens.findIndex((atual) => atual.slug === slug);
  gravar(itens.filter((atual) => atual.slug !== slug));
  return posicao;
}

export function restaurarProjeto(item: ProjetoSelecionado, posicao: number) {
  const itens = ler().filter((atual) => atual.slug !== item.slug);
  itens.splice(Math.max(0, Math.min(posicao, itens.length)), 0, item);
  gravar(itens);
}

// O snapshot é o texto bruto (estável entre leituras); a lista sai dele. null no servidor e antes
// de hidratar (a página mostra o esqueleto, sem piscar a "seleção vazia").
export function useProjetosSelecionados(): ProjetoSelecionado[] | null {
  const bruto = useSyncExternalStore(
    assinar,
    () => {
      try {
        return window.localStorage.getItem(CHAVE) ?? "[]";
      } catch {
        return "[]";
      }
    },
    () => null,
  );
  if (bruto === null) return null;
  try {
    const valor = JSON.parse(bruto);
    return Array.isArray(valor) ? valor : [];
  } catch {
    return [];
  }
}
