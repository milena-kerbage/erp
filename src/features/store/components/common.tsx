"use client";
import { Pill } from "@/features/operations/components/ui";
import type { StatusPedido } from "@/loja/lib/contas/regras";

/** Pedido da loja como o ERP recebe (src/lib/loja/contas.ts, PedidoErp). */
export type StoreOrder = {
  numero: string; criadoEm: string; status: StatusPedido; statusRotulo: string; quantidade: number;
  itens: { nome: string; codigo?: string; quantidade: number; detalhes: string[]; precoCentavos: number; tipo?: string; modulos?: { nome: string; detalhe?: string; precoCentavos: number }[] }[];
  subtotalCentavos: number; descontoCentavos: number; totalCentavos: number; cupom: { codigo: string; percentual: number } | null;
  retirar: boolean; local: string; observacoes: string; mensagem: string;
  clienteId?: string | null; nome?: string; email?: string; whatsapp?: string; whatsappFormatado?: string; anonimizado?: boolean; revisao?: number;
};

export const dateTime = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Fortaleza" }).format(new Date(value));
export const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
/** Conversa no WhatsApp com a cliente (número salvo só com DDD: entra o 55 do Brasil). */
export const whatsappHref = (digits: string, text?: string) => `https://wa.me/55${digits.replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

const tones: Record<StatusPedido, "peach" | "blue" | "teal" | "green" | "rose"> = { enviado_whatsapp: "peach", pagamento_confirmado: "blue", despachado: "teal", entregue: "green", cancelado: "rose" };
export function OrderStatusPill({ status, label }: { status: StatusPedido; label: string }) {
  return <Pill $tone={tones[status] ?? "neutral"}>{label}</Pill>;
}
