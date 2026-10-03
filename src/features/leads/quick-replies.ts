import {
  BellRingingIcon,
  CalendarCheckIcon,
  CalendarDotsIcon,
  HandWavingIcon,
  ReceiptIcon,
} from "@phosphor-icons/react";
import type { QuickReply } from "@/components/ui/Chat/Composer";

/**
 * Respostas rápidas do atendimento. `{nome}` vira o primeiro nome do lead.
 * EXEMPLOS: ajustar com os textos reais do ateliê.
 */
export const quickReplies: QuickReply[] = [
  {
    id: "boas-vindas",
    label: "Boas-vindas",
    category: "Primeiro contato",
    icon: HandWavingIcon,
    tone: "green",
    text: "Oi, {nome}! Que alegria receber sua mensagem 💚 Me conta um pouco sobre o que você imagina?",
  },
  {
    id: "data-evento",
    label: "Perguntar data do evento",
    category: "Primeiro contato",
    icon: CalendarDotsIcon,
    tone: "blue",
    text: "{nome}, para qual data é o evento? Assim já vejo nossa agenda de provas.",
  },
  {
    id: "agendar-visita",
    label: "Agendar visita ao ateliê",
    category: "Agenda",
    icon: CalendarCheckIcon,
    tone: "lavender",
    text: "Que tal virmos conversar pessoalmente no ateliê? Tenho horários na terça e na quinta à tarde. Qual fica melhor para você?",
  },
  {
    id: "orcamento-enviado",
    label: "Orçamento enviado",
    category: "Orçamento",
    icon: ReceiptIcon,
    tone: "peach",
    text: "{nome}, acabei de te enviar o orçamento. Qualquer dúvida sobre tecidos ou prazos, me chama por aqui!",
  },
  {
    id: "lembrete-prova",
    label: "Lembrete de prova",
    category: "Lembrete",
    icon: BellRingingIcon,
    tone: "rose",
    text: "Oi, {nome}! Passando para lembrar da sua prova amanhã. Se precisar remarcar, me avisa 😊",
  },
];
