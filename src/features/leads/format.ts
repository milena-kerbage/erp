import type { Lead, LeadSort } from "./types";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const currencyCents = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

/** "R$ 4.850" para valores redondos; mostra centavos só quando existem. */
export function formatBudget(value: number) {
  return (Number.isInteger(value) ? currency : currencyCents).format(value);
}

/** "11987654321" → "(11) 98765-4321". */
export function formatPhone(digits: string) {
  const d = digits.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digits;
}

export const sortLabels: Record<LeadSort, string> = {
  recent: "Mais recentes",
  oldest: "Mais antigos",
  "budget-desc": "Maior orçamento",
  "budget-asc": "Menor orçamento",
  name: "Nome (A–Z)",
};

const byName = new Intl.Collator("pt-BR", { sensitivity: "base" });

export function sortLeads(leads: Lead[], sort: LeadSort) {
  const sorted = [...leads];
  switch (sort) {
    case "recent":
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "oldest":
      return sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case "budget-desc":
      return sorted.sort((a, b) => b.budget - a.budget);
    case "budget-asc":
      return sorted.sort((a, b) => a.budget - b.budget);
    case "name":
      return sorted.sort((a, b) => byName.compare(a.name, b.name));
  }
}
