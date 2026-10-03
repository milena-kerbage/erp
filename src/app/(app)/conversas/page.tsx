import type { Metadata } from "next";
import { Inbox } from "@/features/conversations/components/Inbox";

export const metadata: Metadata = {
  title: "Conversas",
};

/** Caixa de entrada; a conversa aberta fica na URL (`/conversas?c=lead-003`) para poder compartilhar. */
export default async function ConversationsPage({ searchParams }: PageProps<"/conversas">) {
  const { c } = await searchParams;
  return <Inbox selectedId={typeof c === "string" ? c : undefined} />;
}
