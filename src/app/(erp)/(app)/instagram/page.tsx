import type { Metadata } from "next";
import { ChatInstagram } from "@/features/instagram/ChatInstagram";

export const metadata: Metadata = {
  title: "Instagram",
};

/** Chat do Direct do Instagram do ateliê (a troca no topo da lista leva ao WhatsApp). */
export default function InstagramPage() {
  return <ChatInstagram />;
}
