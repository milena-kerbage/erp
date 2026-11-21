import {
  DotsThreeCircleIcon,
  GlobeIcon,
  GoogleLogoIcon,
  HandshakeIcon,
  InstagramLogoIcon,
  StorefrontIcon,
  TicketIcon,
  WhatsappLogoIcon,
  type Icon,
} from "@phosphor-icons/react";
import type { Tone } from "@/styles/theme";

/** Vocabulário dos campos de escolha do lead; o valor escolhido é gravado na ficha, no banco. */

export type ChoiceOption = {
  value: string;
  icon: Icon;
  tone: Tone;
};

export const leadSources: ChoiceOption[] = [
  { value: "Instagram", icon: InstagramLogoIcon, tone: "rose" },
  { value: "Indicação", icon: HandshakeIcon, tone: "green" },
  { value: "Loja online", icon: StorefrontIcon, tone: "peach" },
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
  "Gestante",
  "Presente",
  "Chá de bebê",
  "Kit berço",
  "Kit maternidade",
  "Kit paninhos",
  "Kit cama kids",
  "Quartinho completo",
  "Personalizado",
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
