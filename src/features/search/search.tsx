"use client";

import { Fragment, type ReactNode } from "react";

/** Grupos de resultado, na ordem em que aparecem. */
export type SearchGroup = "actions" | "leads" | "messages" | "funnels" | "team" | "pages";

export type SearchScope = "all" | "leads" | "messages" | "pages" | "team";

export type SearchResult = {
  id: string;
  group: SearchGroup;
  title: string;
  subtitle?: string;
  /** Texto extra considerado na busca (não aparece). */
  keywords?: string;
  href?: string;
  run?: () => void;
  leading: ReactNode;
  meta?: ReactNode;
  /** Módulo em produção (aparece apagado). */
  locked?: boolean;
  /** Menor = mais relevante (definido na hora de buscar). */
  score?: number;
};

export const groupLabels: Record<SearchGroup, string> = {
  actions: "Ações rápidas",
  leads: "Leads e clientes",
  messages: "Nas conversas",
  funnels: "Funis e etapas",
  team: "Equipe",
  pages: "Páginas",
};

export const scopeGroups: Record<SearchScope, readonly SearchGroup[]> = {
  all: ["actions", "leads", "messages", "funnels", "team", "pages"],
  leads: ["leads"],
  messages: ["messages"],
  pages: ["pages", "actions"],
  team: ["team"],
};

/** Sem acentos e em minúsculas, para comparar. */
export const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Relevância de um resultado para a busca: 0 começa com o termo, 1 alguma
 * palavra começa com ele, 2 contém no título, 3 só nas palavras-chave. null
 * quando não bate.
 */
export function scoreResult(result: SearchResult, query: string, digits: string): number | null {
  const q = normalize(query);
  const title = normalize(result.title);
  if (title.startsWith(q)) return 0;
  if (title.split(/\s+/).some((word) => word.startsWith(q))) return 1;
  if (title.includes(q)) return 2;
  const rest = normalize(`${result.subtitle ?? ""} ${result.keywords ?? ""}`);
  if (rest.includes(q)) return 3;
  if (digits.length >= 3 && rest.replace(/\D/g, "").includes(digits)) return 3;
  return null;
}

/** Texto com o trecho buscado destacado (respeita acentos do original). */
export function Highlight({ text, query }: { text: string; query: string }) {
  const q = normalize(query.trim());
  if (!q) return <>{text}</>;

  // Mapa de posições: texto normalizado → original
  let flat = "";
  const map: number[] = [];
  for (let index = 0; index < text.length; index++) {
    for (const char of normalize(text[index])) {
      flat += char;
      map.push(index);
    }
  }

  const found = flat.indexOf(q);
  if (found < 0) return <>{text}</>;
  const start = map[found];
  const end = map[found + q.length - 1] + 1;

  return (
    <Fragment>
      {text.slice(0, start)}
      <mark>{text.slice(start, end)}</mark>
      {text.slice(end)}
    </Fragment>
  );
}

/** Trecho de uma mensagem em volta do termo (para mostrar onde apareceu). */
export function excerpt(text: string, query: string, radius = 38) {
  const found = normalize(text).indexOf(normalize(query));
  if (found < 0) return text.slice(0, radius * 2);
  const start = Math.max(0, found - radius);
  const end = Math.min(text.length, found + query.length + radius);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}
