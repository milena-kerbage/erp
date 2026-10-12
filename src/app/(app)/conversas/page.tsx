import type { Metadata } from "next";
import { WhatsAppInbox } from "@/features/whatsapp/components/WhatsAppInbox";
import { normalizeWhatsAppPhone } from "@/features/whatsapp/client";

export const metadata: Metadata = {
  title: "Conversas",
};

/** A URL identifica o telefone real, no formato internacional, da conversa WhatsApp. */
export default async function ConversationsPage({ searchParams }: PageProps<"/conversas">) {
  const { phone } = await searchParams;
  const selectedPhone = typeof phone === "string" ? normalizeWhatsAppPhone(phone) : null;
  return <WhatsAppInbox selectedPhone={selectedPhone ?? undefined} invalidPhone={typeof phone === "string" && !selectedPhone} />;
}
