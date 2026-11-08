"use client";

import { useSyncExternalStore } from "react";

// Carrinho e favoritos PROVISÓRIOS no navegador (localStorage) até o carrinho existir na API.
// O formato já é o que o backend vai receber: produto, variação escolhida e quantidade.
// Leituras falham em silêncio (navegação privada sem storage): o site continua funcionando.

// O formato do item (produto, projeto ou quartinho personalizado) e a validação ficam em
// src/loja/lib/carrinho/item.ts, puros e testados; aqui só a leitura e a gravação no navegador.
// Import relativo com extensão: este arquivo também roda no `node --test`.
import { type ItemCarrinho, itensDaSelecaoAntiga, limparItem, MAX_QUANTIDADE, mesmoItem } from "../../lib/carrinho/item.ts";

export { chaveItem, ROTULO_PERSONALIZACAO, tipoDe } from "../../lib/carrinho/item.ts";
export type { ItemCarrinho, Personalizacao, TipoItem } from "../../lib/carrinho/item.ts";

const CARRINHO = "mk_carrinho";
const FAVORITOS = "mk_favoritos";
const EVENTO = "mk:armazenamento";

function ler(chave: string): string {
  try {
    return window.localStorage.getItem(chave) ?? "[]";
  } catch {
    return "[]";
  }
}

function gravar(chave: string, valor: unknown) {
  try {
    window.localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // sem storage: segue sem persistir
  }
  window.dispatchEvent(new Event(EVENTO));
}

function interpretar<T>(bruto: string): T[] {
  try {
    const valor = JSON.parse(bruto);
    return Array.isArray(valor) ? valor : [];
  } catch {
    return [];
  }
}


function assinar(aoMudar: () => void) {
  window.addEventListener(EVENTO, aoMudar);
  window.addEventListener("storage", aoMudar); // outra aba
  return () => {
    window.removeEventListener(EVENTO, aoMudar);
    window.removeEventListener("storage", aoMudar);
  };
}

export function adicionarAoCarrinho(novo: ItemCarrinho) {
  const item = limparItem(novo);
  if (!item) return;
  const itens = itensValidos(ler(CARRINHO));
  const igual = itens.find((atual) => mesmoItem(atual, item));
  if (igual) igual.quantidade = Math.min(MAX_QUANTIDADE, igual.quantidade + item.quantidade);
  else itens.push(item);
  gravar(CARRINHO, itens);
}

// Seleção de projetos antiga (`mk_projetos`): na primeira visita depois da mudança, os projetos vão
// para a sacola com o pacote escolhido e a chave antiga sai do navegador.
const SELECAO_ANTIGA = "mk_projetos";

export function migrarSelecaoAntiga() {
  let bruto: string | null = null;
  try {
    bruto = window.localStorage.getItem(SELECAO_ANTIGA);
    if (bruto === null) return;
    window.localStorage.removeItem(SELECAO_ANTIGA);
  } catch {
    return;
  }
  let antigos: unknown = [];
  try {
    antigos = JSON.parse(bruto);
  } catch {
    // seleção ilegível: só some
  }
  const itens = itensValidos(ler(CARRINHO));
  for (const item of itensDaSelecaoAntiga(antigos)) if (!itens.some((atual) => mesmoItem(atual, item))) itens.push(item);
  gravar(CARRINHO, itens);
}

export function useQuantidadeNoCarrinho(): number {
  const bruto = useSyncExternalStore(
    assinar,
    () => ler(CARRINHO),
    () => "[]",
  );
  return interpretar<ItemCarrinho>(bruto).reduce((soma, item) => soma + (Number(item.quantidade) || 0), 0);
}

export function useFavorito(slug: string): [boolean, () => void] {
  const bruto = useSyncExternalStore(
    assinar,
    () => ler(FAVORITOS),
    () => "[]",
  );
  const favoritos = interpretar<string>(bruto);
  const ativo = favoritos.includes(slug);
  const alternar = () => gravar(FAVORITOS, ativo ? favoritos.filter((item) => item !== slug) : [...favoritos, slug]);
  return [ativo, alternar];
}


// Itens válidos (quantidade inteira entre 1 e 999, só os campos do tipo): o storage pode ter sido
// editado à mão.
function itensValidos(bruto: string): ItemCarrinho[] {
  return interpretar<unknown>(bruto).flatMap((item) => limparItem(item) ?? []);
}

// null enquanto a página ainda não leu o navegador (no servidor e na hidratação): a tela mostra
// um esqueleto em vez de piscar "carrinho vazio".
export function useItensCarrinho(): ItemCarrinho[] | null {
  const bruto = useSyncExternalStore(
    assinar,
    () => ler(CARRINHO),
    () => null,
  );
  return bruto === null ? null : itensValidos(bruto);
}

export function useFavoritos(): string[] {
  const bruto = useSyncExternalStore(
    assinar,
    () => ler(FAVORITOS),
    () => "[]",
  );
  return interpretar<string>(bruto).filter((slug) => typeof slug === "string");
}

export function alterarQuantidade(alvo: ItemCarrinho, quantidade: number) {
  const nova = Math.min(MAX_QUANTIDADE, Math.max(1, Math.trunc(quantidade) || 1));
  gravar(
    CARRINHO,
    itensValidos(ler(CARRINHO)).map((item) => (mesmoItem(item, alvo) ? { ...item, quantidade: nova } : item)),
  );
}

// Devolve a posição para o "Desfazer" recolocar o item no mesmo lugar.
export function removerDoCarrinho(alvo: ItemCarrinho): number {
  const itens = itensValidos(ler(CARRINHO));
  const posicao = itens.findIndex((item) => mesmoItem(item, alvo));
  gravar(
    CARRINHO,
    itens.filter((item) => !mesmoItem(item, alvo)),
  );
  return posicao;
}

export function restaurarNoCarrinho(item: ItemCarrinho, posicao: number) {
  const itens = itensValidos(ler(CARRINHO)).filter((atual) => !mesmoItem(atual, item));
  itens.splice(Math.max(0, Math.min(posicao, itens.length)), 0, item);
  gravar(CARRINHO, itens);
}

// "Editar" da sacola: troca tamanho, cor (outro slug), bordado e quantidade da linha (no projeto, o
// pacote e os opcionais; no quartinho, o conjunto refeito no montador), no mesmo lugar. Se a nova
// escolha já existe em outra linha, as duas viram uma só (quantidades somadas). Pura: testada em
// tests/loja/carrinho.test.mjs.
export function editarItens(itens: ItemCarrinho[], alvo: ItemCarrinho, novo: ItemCarrinho): ItemCarrinho[] {
  const posicao = itens.findIndex((item) => mesmoItem(item, alvo));
  const limpo = limparItem(novo);
  if (posicao < 0 || !limpo) return itens;
  const quantidade = limpo.quantidade;
  const outra = itens.findIndex((item, indice) => indice !== posicao && mesmoItem(item, limpo));
  if (outra < 0) return itens.map((item, indice) => (indice === posicao ? limpo : item));
  const somada = { ...itens[outra], quantidade: Math.min(MAX_QUANTIDADE, itens[outra].quantidade + quantidade) };
  return itens.flatMap((item, indice) => (indice === posicao ? [] : indice === outra ? [somada] : [item]));
}

export function atualizarItem(alvo: ItemCarrinho, novo: ItemCarrinho) {
  gravar(CARRINHO, editarItens(itensValidos(ler(CARRINHO)), alvo, novo));
}

export function salvarNosFavoritos(slug: string) {
  const favoritos = interpretar<string>(ler(FAVORITOS));
  if (!favoritos.includes(slug)) gravar(FAVORITOS, [...favoritos, slug]);
}

export function tirarDosFavoritos(slug: string) {
  gravar(
    FAVORITOS,
    interpretar<string>(ler(FAVORITOS)).filter((item) => item !== slug),
  );
}

// Escolhas que o carrinho passa para o checkout (sem dado pessoal): forma de entrega, modalidade
// do frete e cupom. Dados do comprador e do cartão nunca vão para o storage.
// `semCupomAutomatico`: a cliente logada tirou o cupom de primeira compra que a sacola aplica sozinha (fica guardado).
export type PreferenciasCompra = { entrega: "endereco" | "retirada"; frete: "normal" | "expressa"; cupom?: string; semCupomAutomatico?: boolean };

const PREFERENCIAS = "mk_compra";
const PADRAO: PreferenciasCompra = { entrega: "endereco", frete: "normal" };

function preferenciasValidas(bruto: string | null): PreferenciasCompra {
  try {
    const valor = JSON.parse(bruto ?? "{}");
    return {
      entrega: valor?.entrega === "retirada" ? "retirada" : "endereco",
      frete: valor?.frete === "expressa" ? "expressa" : "normal",
      cupom: typeof valor?.cupom === "string" && valor.cupom.length <= 30 ? valor.cupom : undefined,
      ...(valor?.semCupomAutomatico === true ? { semCupomAutomatico: true } : {}),
    };
  } catch {
    return PADRAO;
  }
}

function lerPreferencias(): string | null {
  try {
    return window.localStorage.getItem(PREFERENCIAS);
  } catch {
    return null;
  }
}

export function usePreferenciasCompra(): PreferenciasCompra {
  const bruto = useSyncExternalStore(assinar, lerPreferencias, () => null);
  return preferenciasValidas(bruto);
}

export function salvarPreferenciasCompra(parcial: Partial<PreferenciasCompra>) {
  gravar(PREFERENCIAS, { ...preferenciasValidas(lerPreferencias()), ...parcial });
}

// Depois do pedido confirmado: carrinho e cupom zerados.
export function esvaziarCarrinho() {
  gravar(CARRINHO, []);
  salvarPreferenciasCompra({ cupom: undefined, semCupomAutomatico: undefined });
}
