"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { FieldGrid } from "@/features/settings/components/ui";
import { useFunnels } from "@/features/settings/store";
import { useLeads } from "../store";
import { maskPhone } from "@/lib/masks";

export function NewLeadForm({ open, onClose, funnelId, stageId }: { open: boolean; onClose: () => void; funnelId?: string; stageId?: string }) {
  const { funnels, findFunnel } = useFunnels();
  const { createLead, loading, error } = useLeads();
  const initial = findFunnel(funnelId);
  const [draft, setDraft] = useState({ name: "", phone: "", email: "", budget: "0", funnelId: initial.id, stage: stageId ?? initial.stages[0]?.id ?? "", city: "", source: "Cadastro manual", tags: "" });
  const [saving, setSaving] = useState(false);
  const funnel = findFunnel(draft.funnelId);
  const valid = draft.name.trim().length >= 2 && /^(?:\d{10,15})$/.test(draft.phone.replace(/\D/g, "")) && Number.isFinite(Number(draft.budget)) && Number(draft.budget) >= 0 && (!draft.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email));
  async function save() {
    if (!valid || saving || loading) return;
    setSaving(true);
    try {
      const lead = await createLead({ name: draft.name.trim(), phone: draft.phone.replace(/\D/g, ""), budget: Number(draft.budget), funnelId: funnel.id, stage: draft.stage, tags: draft.tags.split(",").map(tag => tag.trim()).filter(Boolean) }, { email: draft.email.trim(), city: draft.city.trim(), source: draft.source.trim() });
      if (lead) onClose();
    } finally { setSaving(false); }
  }
  return <Dialog open={open} onClose={saving ? () => {} : onClose} title="Novo lead" description="Cadastre a oportunidade no banco de dados do ateliê." width="32rem" footer={<><Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button><Button onClick={() => void save()} loading={saving} disabled={!valid || loading}>Cadastrar lead</Button></>}>
    {error && <p role="alert">{error}</p>}
    <TextField label="Nome completo" value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} />
    <FieldGrid><TextField label="Telefone com DDD ou código do país" inputMode="tel" mask={maskPhone} value={draft.phone} onChange={event => setDraft({ ...draft, phone: event.target.value })} /><TextField label="E-mail (opcional)" type="email" value={draft.email} onChange={event => setDraft({ ...draft, email: event.target.value })} /></FieldGrid>
    <FieldGrid><Select label="Funil" value={funnel.id} onChange={id => { const next = findFunnel(id); setDraft({ ...draft, funnelId: next.id, stage: next.stages[0]?.id ?? "" }); }} options={funnels.map(item => ({ value: item.id, label: item.name }))} /><Select label="Etapa" value={draft.stage} onChange={stage => setDraft({ ...draft, stage })} options={funnel.stages.map(item => ({ value: item.id, label: item.label }))} /></FieldGrid>
    <FieldGrid><TextField label="Orçamento (R$)" type="number" min="0" step="0.01" value={draft.budget} onChange={event => setDraft({ ...draft, budget: event.target.value })} /><TextField label="Cidade (opcional)" value={draft.city} onChange={event => setDraft({ ...draft, city: event.target.value })} /></FieldGrid>
    <TextField label="Origem" value={draft.source} onChange={event => setDraft({ ...draft, source: event.target.value })} />
    <TextField label="Etiquetas (separadas por vírgula)" value={draft.tags} onChange={event => setDraft({ ...draft, tags: event.target.value })} />
  </Dialog>;
}
