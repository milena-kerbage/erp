// Leads e clientes numa tabela só: a categoria vem do funil. Quem está no funil "Clientes" é Cliente; o resto é Lead.
// Sem coluna nova no banco: o filtro vira filtro de funil (resolvido no servidor, antes da paginação).
import type { Lead } from "./types";

export const FUNIL_CLIENTES = "clientes";
export type Categoria = "cliente" | "lead";
export type FiltroCategoria = Categoria | "todas";

export const categoriaDo = (lead: Pick<Lead, "funnelId">): Categoria => (lead.funnelId === FUNIL_CLIENTES ? "cliente" : "lead");
export const ROTULO_CATEGORIA: Record<Categoria, string> = { cliente: "Cliente", lead: "Lead" };

/** Funis da consulta para a categoria escolhida, combinados com o filtro de funil da tela (vazio = todos). */
export function funisDaCategoria(categoria: FiltroCategoria, todos: readonly string[], escolhidos: readonly string[]): string[] {
  const base = escolhidos.length ? [...escolhidos] : [];
  if (categoria === "todas") return base;
  const daCategoria = todos.filter((id) => (categoria === "cliente" ? id === FUNIL_CLIENTES : id !== FUNIL_CLIENTES));
  const resultado = base.length ? base.filter((id) => daCategoria.includes(id)) : daCategoria;
  // Nenhum funil na interseção: pede um funil inexistente para a lista vir vazia (e não "todos").
  return resultado.length ? resultado : ["__nenhum__"];
}
