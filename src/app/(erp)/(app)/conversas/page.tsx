import type { Metadata } from "next";
import { Conversas } from "@/features/whatsapp/conversas/Conversas";
import { normalizeWhatsAppPhone } from "@/features/whatsapp/client";

export const metadata: Metadata = {
  title: "WhatsApp",
};

/** A URL identifica o telefone real, no formato internacional, da conversa WhatsApp. */
export default async function ConversationsPage({ searchParams }: PageProps<"/conversas">) {
  const { phone, aba } = await searchParams;
  const selectedPhone = typeof phone === "string" ? normalizeWhatsAppPhone(phone) : null;
  // ?aba=aguardando (ou nao_lidas): o Painel abre a lista já no recorte.
  const abaInicial = aba === "aguardando" || aba === "nao_lidas" ? aba : undefined;
  return <Conversas telefoneInicial={selectedPhone ?? undefined} telefoneInvalido={typeof phone === "string" && !selectedPhone} abaInicial={abaInicial} />;
}
