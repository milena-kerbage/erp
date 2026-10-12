"use client";

import { useState } from "react";
import { ArrowSquareOutIcon, FloppyDiskIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { Pill } from "@/features/settings/components/ui";
import { errorMessage, whatsappRequest } from "@/features/whatsapp/client";
import { Actions, formatWhatsAppDate, Note, Notice } from "@/features/whatsapp/components/shared";
import type { ManagerOverview, ManagerStage, ManagerStageStatus } from "../types";
import { INTEGRATION_CHECKLIST_STEPS } from "../catalog";
import { ManagerCard, ManagerGrid, ProgressBar, TabBody } from "./ui";
import { LocalBootstrapButton } from "./LocalBootstrapButton";

const labels: Record<ManagerStageStatus, string> = { pending: "Pendente", in_progress: "Em andamento", complete: "Concluída", blocked: "Bloqueada" };

export function ManagerStepsTab({ overview, onChanged, onBootstrapPrepared }: { overview: ManagerOverview; onChanged: () => Promise<void>; onBootstrapPrepared: () => Promise<void> }) {
  const [editing, setEditing] = useState<ManagerStage | null>(null);
  const [stageStatus, setStageStatus] = useState<ManagerStageStatus>("pending");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const total = overview.progress.total;
  const complete = overview.progress.complete;

  async function save() {
    if (!editing || saving) return;
    setSaving(true); setError("");
    try {
      await whatsappRequest("management/checklist", { method: "PUT", body: { id: editing.id, status: stageStatus, note: note.trim() } });
      setEditing(null); setSuccess("Etapa atualizada e registrada no servidor.");
      await onChanged();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setSaving(false); }
  }

  return <TabBody>
    <Actions><strong>{complete} de {total} etapas concluídas</strong><Note>O progresso acompanha as evidências registradas. Concluir uma etapa manual não substitui a validação técnica.</Note></Actions>
    <ProgressBar max={Math.max(total, 1)} value={complete} aria-label="Progresso das etapas de implantação" />
    {overview.bootstrap.length > 0 && <ManagerGrid>{overview.bootstrap.map((item) => <ManagerCard key={item.key}><Actions><h4>{item.label}</h4><Pill $tone={item.ready ? "green" : "peach"}>{item.ready ? "Pronto" : "Preparar na hospedagem"}</Pill></Actions><code>{item.key}</code>{item.detail && <Note>{item.detail}</Note>}{item.key === "INTEGRATION_ENCRYPTION_KEY" && overview.environment?.localBootstrapAvailable && <LocalBootstrapButton configured={item.ready} onPrepared={onBootstrapPrepared} />}</ManagerCard>)}</ManagerGrid>}
    <Notice>As contas, aprovações, credenciais e domínio pertencem aos provedores externos. Use o painel para guardar a configuração, executar os testes e registrar a conclusão de cada dependência real.</Notice>
    <ManagerGrid>{overview.stages.map((stage, index) => { const guidance = INTEGRATION_CHECKLIST_STEPS.find((item) => item.id === stage.id); const href = stage.externalUrl || guidance?.actionHref; return <ManagerCard key={stage.id}><Actions><h4>{index + 1}. {stage.title}</h4><Pill $tone={stage.status === "complete" ? "green" : stage.status === "blocked" ? "rose" : "neutral"}>{labels[stage.status] || stage.status}</Pill></Actions><Note>{stage.description}</Note>{guidance && <><Note><strong>Responsável:</strong> {guidance.owner}</Note><Note><strong>Evidência esperada:</strong> {guidance.evidence}</Note></>}{stage.note && <Note><strong>Registro:</strong> {stage.note}</Note>}{stage.updatedAt && <Note>Atualizada: {formatWhatsAppDate(stage.updatedAt)}</Note>}<Actions>{href && <Button href={href} target={href.startsWith("https:") ? "_blank" : undefined} rel={href.startsWith("https:") ? "noopener noreferrer" : undefined} size="sm" variant="secondary" icon={ArrowSquareOutIcon}>{href.startsWith("https:") ? "Abrir painel oficial" : "Abrir tela"}</Button>}<Button size="sm" variant="ghost" onClick={() => { setEditing(stage); setStageStatus(stage.status); setNote(stage.note || ""); setError(""); }}>Atualizar etapa</Button></Actions></ManagerCard>; })}</ManagerGrid>
    {success && <Notice role="status">{success}</Notice>}{error && !editing && <Notice $error role="alert">{error}</Notice>}
    <Dialog open={editing !== null} onClose={() => { if (!saving) setEditing(null); }} title={editing?.title || "Atualizar etapa"} description={editing?.description} footer={<><Button variant="ghost" disabled={saving} onClick={() => setEditing(null)}>Cancelar</Button><Button icon={FloppyDiskIcon} disabled={stageStatus === "complete" && note.trim().length < 5} loading={saving} onClick={() => void save()}>Guardar etapa e evidência</Button></>}>
      <Select label="Situação" value={stageStatus} onChange={setStageStatus} options={(Object.keys(labels) as ManagerStageStatus[]).map((value) => ({ value, label: labels[value] }))} />
      <TextField label="Evidência ou próximo passo" multiline rows={3} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ex.: conta criada, número de protocolo ou pendência aguardando o responsável." hint="Concluir uma etapa exige evidência com pelo menos 5 caracteres. Não inclua senhas, tokens, códigos de verificação nem dados de clientes." />
      {error && <Notice $error role="alert">{error}</Notice>}
    </Dialog>
  </TabBody>;
}
