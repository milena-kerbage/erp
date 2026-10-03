import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LeadDetail } from "@/features/leads/components/LeadDetail";
import { mockLeads } from "@/features/leads/mock";

// TODO: buscar na API quando o back-end existir.
const findLead = (id: string) => mockLeads.find((lead) => lead.id === id);

export async function generateMetadata({ params }: PageProps<"/leads/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: findLead(id)?.name ?? "Lead" };
}

export default async function LeadPage({ params }: PageProps<"/leads/[id]">) {
  const { id } = await params;
  if (!findLead(id)) notFound();

  return <LeadDetail leadId={id} />;
}
