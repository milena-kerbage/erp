// Item da sacola (o que fica no localStorage `mk_carrinho` até o carrinho existir na API). Produtos,
// projetos de quarto e o quartinho personalizado ficam na MESMA sacola e no mesmo pedido pelo WhatsApp.
// Puro (sem React nem navegador): roda no `node --test` (tests/loja/carrinho.test.mjs).

import { buscarProjeto, OPCIONAIS, opcionaisValidos, pacoteValido } from "../casas/catalogo.ts";
import { idQuartinho, normalizarQuartinho, type Quartinho } from "../casas/modulos.ts";

// `personalizacao`: peça que aceita bordado com o nome, escolhida "com" ou "sem" bordado na página de
// produto (o nome o ateliê confirma pelo WhatsApp). Opcional: itens antigos e peças sem bordado não
// têm o campo. O mesmo produto com e sem bordado são linhas diferentes.
export type Personalizacao = "com" | "sem";
export const ROTULO_PERSONALIZACAO: Record<Personalizacao, string> = { com: "Com bordado do nome", sem: "Sem bordado" };

// `tipo` ausente = produto (itens gravados antes dos projetos entrarem na sacola continuam valendo).
// - produto: `slug` do catálogo, `variacao` (tamanho) e `personalizacao`;
// - projeto: `slug` do projeto, `pacote` e `opcionais` (ids de OPCIONAIS);
// - personalizado: o quartinho do "Monte o seu" (`quartinho`); o `slug` é o idQuartinho dele.
export type TipoItem = "produto" | "projeto" | "personalizado";
export type ItemCarrinho = {
  tipo?: TipoItem;
  slug: string;
  variacao?: string;
  quantidade: number;
  personalizacao?: Personalizacao;
  pacote?: string;
  opcionais?: string[];
  quartinho?: Quartinho;
};

export const MAX_QUANTIDADE = 999;

export function tipoDe(item: Pick<ItemCarrinho, "tipo">): TipoItem {
  return item.tipo === "projeto" || item.tipo === "personalizado" ? item.tipo : "produto";
}

// Linha da sacola: a mesma peça com a mesma escolha é uma linha só (a quantidade soma).
export function chaveItem(item: Omit<ItemCarrinho, "quantidade">): string {
  const tipo = tipoDe(item);
  if (tipo === "projeto") return `projeto|${item.slug}|${item.pacote ?? ""}|${[...(item.opcionais ?? [])].sort().join(",")}`;
  if (tipo === "personalizado") return `personalizado|${item.slug}`;
  return `produto|${item.slug}|${item.variacao ?? ""}|${item.personalizacao ?? ""}`;
}

export function mesmoItem(a: Omit<ItemCarrinho, "quantidade">, b: Omit<ItemCarrinho, "quantidade">): boolean {
  return chaveItem(a) === chaveItem(b);
}

const limitar = (quantidade: unknown) => Math.min(MAX_QUANTIDADE, Math.max(1, Math.trunc(Number(quantidade) || 1)));

// Item válido e só com os campos do tipo (o storage pode ter sido editado à mão). null = descartar.
export function limparItem(bruto: unknown): ItemCarrinho | null {
  if (!bruto || typeof bruto !== "object") return null;
  const item = bruto as Record<string, unknown>;
  const quantidade = limitar(item.quantidade);
  if (item.tipo === "personalizado") {
    const quartinho = normalizarQuartinho(item.quartinho);
    if (quartinho.modulos.length === 0) return null;
    return { tipo: "personalizado", slug: idQuartinho(quartinho), quantidade, quartinho };
  }
  if (typeof item.slug !== "string" || !item.slug) return null;
  if (item.tipo === "projeto") {
    const projeto = buscarProjeto(item.slug);
    const pedidos = Array.isArray(item.opcionais) ? item.opcionais.filter((id): id is string => typeof id === "string") : [];
    // Projeto que saiu do catálogo: a linha fica (a sacola avisa que está indisponível).
    const opcionais = projeto ? opcionaisValidos(projeto, pedidos) : OPCIONAIS.map((opcional) => opcional.id).filter((id) => pedidos.includes(id));
    return {
      tipo: "projeto",
      slug: item.slug,
      quantidade,
      pacote: pacoteValido(typeof item.pacote === "string" ? item.pacote : undefined),
      ...(opcionais.length > 0 ? { opcionais } : {}),
    };
  }
  return {
    slug: item.slug,
    ...(typeof item.variacao === "string" && item.variacao ? { variacao: item.variacao } : {}),
    quantidade,
    ...(item.personalizacao === "com" || item.personalizacao === "sem" ? { personalizacao: item.personalizacao } : {}),
  };
}

// Seleção de projetos antiga (`mk_projetos`, antes de os projetos entrarem na sacola): cada projeto
// vira um item de projeto com o pacote escolhido.
export function itensDaSelecaoAntiga(bruto: unknown): ItemCarrinho[] {
  if (!Array.isArray(bruto)) return [];
  return bruto.flatMap((antigo) => {
    const item = limparItem({ ...(antigo && typeof antigo === "object" ? antigo : {}), tipo: "projeto", quantidade: 1 });
    return item && buscarProjeto(item.slug) ? [item] : [];
  });
}
