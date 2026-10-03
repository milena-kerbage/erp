import {
  BabyIcon,
  ConfettiIcon,
  CrownSimpleIcon,
  DotsThreeCircleIcon,
  GlobeIcon,
  GoogleLogoIcon,
  GraduationCapIcon,
  HandshakeIcon,
  HeartIcon,
  InstagramLogoIcon,
  TicketIcon,
  WhatsappLogoIcon,
  type Icon,
} from "@phosphor-icons/react";
import type { Tone } from "@/styles/theme";

/** Opções dos campos de escolha do lead. EXEMPLOS: ajustar com o ateliê. */

export type ChoiceOption = {
  value: string;
  icon: Icon;
  tone: Tone;
};

export const eventTypes: ChoiceOption[] = [
  { value: "Casamento", icon: HeartIcon, tone: "rose" },
  { value: "Festa", icon: ConfettiIcon, tone: "peach" },
  { value: "Festa de 15 anos", icon: CrownSimpleIcon, tone: "lavender" },
  { value: "Formatura", icon: GraduationCapIcon, tone: "blue" },
  { value: "Batizado", icon: BabyIcon, tone: "teal" },
  { value: "Outro", icon: DotsThreeCircleIcon, tone: "neutral" },
];

export const leadSources: ChoiceOption[] = [
  { value: "Instagram", icon: InstagramLogoIcon, tone: "rose" },
  { value: "Indicação", icon: HandshakeIcon, tone: "green" },
  { value: "Site", icon: GlobeIcon, tone: "blue" },
  { value: "Google", icon: GoogleLogoIcon, tone: "yellow" },
  { value: "WhatsApp", icon: WhatsappLogoIcon, tone: "green" },
  { value: "Evento", icon: TicketIcon, tone: "lavender" },
  { value: "Outro", icon: DotsThreeCircleIcon, tone: "neutral" },
];

/** Opção de um valor salvo (valores antigos fora da lista viram "Outro"). */
export function findChoice(options: readonly ChoiceOption[], value: string | undefined) {
  if (!value) return undefined;
  return (
    options.find((option) => option.value === value) ?? {
      value,
      icon: DotsThreeCircleIcon,
      tone: "neutral" as Tone,
    }
  );
}

export const defaultTags = [
  "Noiva",
  "Madrinha",
  "Mãe da noiva",
  "Debutante",
  "Formatura",
  "Sob medida",
  "Aluguel",
  "Ajuste",
  "Véu",
  "Instagram",
  "Indicação",
];

/** "(21) 9 9888-7766", "+55 21..." → só dígitos com DDD. */
export function parsePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  return digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;
}

/** "R$ 6.400,50" ou "6400.50" → 6400.5 (ou null se não der para ler). */
export function parseBudget(input: string) {
  let text = input.replace(/[^\d.,]/g, "");
  // Ponto seguido de 1 ou 2 dígitos no fim é decimal, não milhar
  if (!text.includes(",")) text = text.replace(/\.(\d{1,2})$/, ",$1");
  const value = Number.parseFloat(text.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}
