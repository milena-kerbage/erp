import type { Metadata } from "next";
import { ChatInstagram } from "@/features/instagram/ChatInstagram";

export const metadata: Metadata = {
  title: "Instagram",
};

/** Chat do Direct do Instagram do ateliê (a troca no topo da lista leva ao WhatsApp). `?conversa=<id>` abre direto nela. */
export default async function InstagramPage({ searchParams }: PageProps<"/instagram">) {
  const { conversa } = await searchParams;
  return <ChatInstagram conversaInicial={typeof conversa === "string" && /^\d{5,40}$/.test(conversa) ? conversa : undefined} />;
}
