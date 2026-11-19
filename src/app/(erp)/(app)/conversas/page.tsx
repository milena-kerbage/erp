import type { Metadata } from "next";
import { Conversas } from "@/features/whatsapp/conversas/Conversas";
import { normalizeWhatsAppPhone } from "@/features/whatsapp/client";

export const metadata: Metadata = {
  title: "Conversas",
};

/** A URL identifica o telefone real, no formato internacional, da conversa WhatsApp. */
export default async function ConversationsPage({ searchParams }: PageProps<"/conversas">) {
  const { phone } = await searchParams;
  const selectedPhone = typeof phone === "string" ? normalizeWhatsAppPhone(phone) : null;
  return <Conversas telefoneInicial={selectedPhone ?? undefined} telefoneInvalido={typeof phone === "string" && !selectedPhone} />;
}
