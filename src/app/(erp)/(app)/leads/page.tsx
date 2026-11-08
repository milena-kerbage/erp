import type { Metadata } from "next";
import { LeadsView } from "@/features/leads/components/LeadsView";

export const metadata: Metadata = {
  title: "Leads",
};

export default async function LeadsPage({ searchParams }: PageProps<"/leads">) {
  const { funil } = await searchParams;
  const funnelId = typeof funil === "string" ? funil : undefined;

  return <LeadsView funnelId={funnelId} />;
}
