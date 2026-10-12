"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { erpRequest, errorMessage } from "@/features/erp/client";
import { useLeads } from "../store";
import type { Lead } from "../types";

type ArchivedLead = Lead & { archivedAt?: string };
export function ArchivedLeads({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { refresh } = useLeads();
  const [leads, setLeads] = useState<ArchivedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function load() {
    setLoading(true); setError(null);
    try { const snapshot = await erpRequest<{ leads: ArchivedLead[] }>("/leads?archived=true"); setLeads(snapshot.leads.filter(lead => lead.archivedAt)); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (open) void load(); }, [open]);
  async function restore(lead: ArchivedLead) {
    if (restoring) return;
    setRestoring(lead.id); setError(null);
    try { await erpRequest(`/leads/${encodeURIComponent(lead.id)}`, "PATCH", { revision: lead.revision, restore: true }); await load(); await refresh(); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { setRestoring(null); }
  }
  return <Dialog open={open} onClose={onClose} title="Oportunidades arquivadas" description="Recupere uma oportunidade para o quadro ativo preservando as notas e arquivos." footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}>
    {error && <p role="alert">{error}</p>}
    {loading ? <p role="status">Carregando arquivos…</p> : leads.length ? leads.map(lead => <div key={lead.id} style={{ display: "flex", gap: "1rem", alignItems: "center", justifyContent: "space-between" }}><div><strong>{lead.name}</strong><p>{lead.phone}</p></div><Button size="sm" loading={restoring === lead.id} disabled={restoring !== null && restoring !== lead.id} onClick={() => void restore(lead)}>Restaurar</Button></div>) : <p>Nenhuma oportunidade arquivada.</p>}
  </Dialog>;
}
