import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/server";
import { currentMember } from "@/lib/erp/access";
import { ERPError, getLead } from "@/lib/erp/core";
import { LeadDetail } from "@/features/leads/components/LeadDetail";

/** Metadata and rendering share one request-local lookup, guarded before reading CRM data. */
const findLead = cache(async (id: string) => {
  try {
    const session = await getSession(false);
    if (!session) return { kind: "session-required" as const };
    await currentMember(session);
    const result = await getLead(id);
    return { kind: "found" as const, lead: result.lead };
  } catch (error) {
    if (error instanceof ERPError && (error.status === 404 || error.code === "INVALID_ID")) return { kind: "missing" as const };
    // The provider's authenticated API request presents a safe error and retry action.
    return { kind: "unavailable" as const };
  }
});

export async function generateMetadata({ params }: PageProps<"/leads/[id]">): Promise<Metadata> {
  const { id } = await params;
  const result = await findLead(id);
  return { title: result.kind === "found" ? result.lead.name : "Oportunidade" };
}

export default async function LeadPage({ params }: PageProps<"/leads/[id]">) {
  const { id } = await params;
  const result = await findLead(id);
  if (result.kind === "missing") notFound();
  return <LeadDetail leadId={id} />;
}
