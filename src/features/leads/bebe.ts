import { BabyIcon, GenderFemaleIcon, GenderMaleIcon, QuestionIcon } from "@phosphor-icons/react";
import type { ChoiceOption } from "./options";
import type { LeadDetails } from "./types";
import { parseDateOnly } from "@/lib/format";

/**
 * No ateliê não há "evento": o que importa é o bebê do enxoval — nome, se é menina ou menino e a data do
 * nascimento (prevista, enquanto está no futuro; a de verdade, depois). A data fica em `eventDate`, o mesmo
 * campo que os filtros de prazo da tabela e o CRM já usam.
 */
export const babySexes: ChoiceOption[] = [
  { value: "Menina", icon: GenderFemaleIcon, tone: "rose" },
  { value: "Menino", icon: GenderMaleIcon, tone: "blue" },
  { value: "Surpresa", icon: QuestionIcon, tone: "lavender" },
];

export const BabyNeutralIcon = BabyIcon;

const DIA = 86_400_000;

/** "nasce em 6 semanas", "nasce em 4 dias", "nasceu há 2 meses"… (a partir de hoje). */
export function quandoNasce(data: string, hoje = new Date()): string {
  const alvo = parseDateOnly(data).getTime();
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime();
  const dias = Math.round((alvo - base) / DIA);
  if (dias === 0) return "nasce hoje";
  const n = Math.abs(dias);
  const prazo = n < 14 ? `${n} ${n === 1 ? "dia" : "dias"}` : n < 70 ? `${Math.round(n / 7)} semanas` : `${Math.round(n / 30.4)} meses`;
  return dias > 0 ? `nasce em ${prazo}` : `nasceu há ${prazo}`;
}

/** Já nasceu (a data é de hoje para trás). */
export const jaNasceu = (data: string, hoje = new Date()) =>
  parseDateOnly(data).getTime() <= new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime();

/** Uma linha sobre o bebê para listas e tabelas: "Helena · Menina", "Menino" ou "Bebê". */
export function resumoDoBebe(details: Pick<LeadDetails, "babyName" | "babySex" | "eventDate">) {
  const partes = [details.babyName, details.babySex].filter(Boolean);
  if (!partes.length && !details.eventDate) return undefined;
  return partes.join(" · ") || "Bebê";
}
