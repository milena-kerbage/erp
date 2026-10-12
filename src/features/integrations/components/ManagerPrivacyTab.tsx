"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowClockwiseIcon, ArrowSquareOutIcon, DownloadSimpleIcon, FloppyDiskIcon, TrashIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { Pill } from "@/features/settings/components/ui";
import { errorMessage, normalizeWhatsAppPhone, whatsappRequest } from "@/features/whatsapp/client";
import { DeleteContactDialog } from "@/features/whatsapp/components/DeleteContactDialog";
import { Actions, formatWhatsAppDate, Note, Notice } from "@/features/whatsapp/components/shared";
import type { ManagerDeletion } from "../types";
import { INTEGRATION_ERROR_GUIDE, INTEGRATION_EXTERNAL_LINKS } from "../catalog";
import { ManagerCard, ManagerGrid, TabBody } from "./ui";

const labels = { pending_review: "Revisão pendente", completed: "Revisão concluída", no_matching_data: "Sem dados vinculados" };

export function ManagerPrivacyTab({ onChanged }: { onChanged: () => Promise<void> }) {
  const [requests, setRequests] = useState<ManagerDeletion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reviewing, setReviewing] = useState<ManagerDeletion | null>(null);
  const [outcome, setOutcome] = useState<"completed" | "no_matching_data">("no_matching_data");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [deletingPhone, setDeletingPhone] = useState("");
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("");
    try { const data = await whatsappRequest<{ requests: ManagerDeletion[] }>("management/deletions", { signal }); if (!signal?.aborted) setRequests(data.requests); }
    catch (cause) { if (!signal?.aborted) setError(errorMessage(cause)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void refresh(controller.signal); return () => controller.abort(); }, [refresh]);

  async function review() {
    if (!reviewing || note.trim().length < 10 || saving) return;
    setSaving(true); setError("");
    try {
      await whatsappRequest("management/deletions", { body: { code: reviewing.code, outcome, note: note.trim() } });
      setReviewing(null); setNote(""); setSuccess("Resultado da revisão registrado. O titular pode consultar a situação pelo protocolo recebido.");
      await refresh(); await onChanged();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setSaving(false); }
  }

  return <TabBody>
    <ManagerCard><h4>Documentação para o gestor</h4><Note>Baixe os documentos completos pelo próprio painel, sem acesso ao repositório. Os arquivos são disponibilizados somente a gestores autorizados.</Note><Actions><Button href="/api/whatsapp/management/guide" size="sm" variant="secondary" icon={DownloadSimpleIcon}>Baixar manual do gestor</Button><Button href="/api/whatsapp/management/guide?document=technical" size="sm" variant="secondary" icon={DownloadSimpleIcon}>Baixar documentação técnica</Button><Button href="/api/whatsapp/management/guide?document=pending" size="sm" variant="secondary" icon={DownloadSimpleIcon}>Baixar pendências de implantação</Button></Actions></ManagerCard>
    <ManagerGrid>{INTEGRATION_EXTERNAL_LINKS.filter((link) => link.category === "privacy" || link.category === "documentation").map((link) => <ManagerCard key={link.id}><h4>{link.title}</h4><Note>{link.purpose}</Note><Button href={link.href} target="_blank" rel="noopener noreferrer" size="sm" variant="secondary" icon={ArrowSquareOutIcon}>Consultar fonte oficial</Button></ManagerCard>)}</ManagerGrid>
    <ManagerCard><h4>Exclusão operativa de dados WhatsApp</h4><Note>Use este procedimento depois de verificar a identidade e a legitimidade do pedido. Ele exclui os dados do contato neste módulo e mantém a referência de supressão. A ação não apaga automaticamente cópias externas, backups ou outros módulos do ERP.</Note><TextField label="Telefone verificado com país e DDD" inputMode="tel" value={phoneDraft} maxLength={24} onChange={(event) => setPhoneDraft(event.target.value)} placeholder="5511999999999" /><Actions><Button variant="secondary" size="sm" icon={TrashIcon} disabled={!normalizeWhatsAppPhone(phoneDraft)} onClick={() => setDeletingPhone(normalizeWhatsAppPhone(phoneDraft)!)}>Revisar exclusão deste contato</Button><Button href="/exclusao-de-dados" target="_blank" rel="noopener noreferrer" size="sm" variant="ghost">Ler instruções públicas</Button></Actions></ManagerCard>
    <Actions><h4>Pedidos recebidos pelo callback Meta</h4><Button size="sm" variant="secondary" icon={ArrowClockwiseIcon} loading={loading} onClick={() => void refresh()}>Atualizar pedidos</Button></Actions>
    <Notice>O identificador de uma solicitação Meta não é o número WhatsApp. A conclusão abaixo registra o resultado de uma revisão humana; não executa a exclusão do contato. Confirme os vínculos e realize as ações necessárias antes de declarar um pedido concluído.</Notice>
    <ManagerGrid>{requests.map((request) => <ManagerCard key={request.code}><Actions><h4>{labels[request.status] || request.status}</h4><Pill $tone={request.status === "pending_review" ? "peach" : "green"}>{request.status === "pending_review" ? "Ação necessária" : "Finalizado"}</Pill></Actions><code>{request.code}</code><Note>Recebido: {formatWhatsAppDate(request.requestedAt)}</Note>{request.completedAt && <Note>Concluído: {formatWhatsAppDate(request.completedAt)}</Note>}<Button size="sm" variant="secondary" disabled={request.status !== "pending_review"} onClick={() => { setReviewing(request); setOutcome("no_matching_data"); setNote(""); setError(""); }}>Registrar resultado da revisão</Button></ManagerCard>)}</ManagerGrid>
    {!requests.length && !loading && <Notice>Nenhuma solicitação de exclusão Meta registrada nesta consulta.</Notice>}
    {success && <Notice role="status">{success}</Notice>}{error && !reviewing && <Notice $error role="alert">{error}</Notice>}
    <details><summary>Guia de pendências e erros técnicos</summary><ManagerGrid>{INTEGRATION_ERROR_GUIDE.map((item) => <ManagerCard key={item.code}><h4>{item.status} · {item.code}</h4><Note>{item.meaning}</Note><Note>{item.action}</Note></ManagerCard>)}</ManagerGrid></details>
    <Dialog open={reviewing !== null} onClose={() => { if (!saving) setReviewing(null); }} title="Registrar resultado da solicitação Meta" description={reviewing ? `Protocolo: ${reviewing.code}` : undefined} footer={<><Button variant="ghost" disabled={saving} onClick={() => setReviewing(null)}>Cancelar</Button><Button icon={FloppyDiskIcon} loading={saving} disabled={note.trim().length < 10} onClick={() => void review()}>Registrar revisão concluída</Button></>}><Select label="Resultado verificado" value={outcome} onChange={setOutcome} options={[{ value: "no_matching_data", label: "Não foram encontrados dados vinculados", description: "Vínculos foram verificados e não correspondem a dados deste aplicativo" }, { value: "completed", label: "Procedimento de exclusão concluído", description: "As ações aplicáveis já foram executadas e conferidas" }]} /><TextField label="Evidência da revisão realizada" multiline rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} hint="10 a 500 caracteres. Registre o procedimento sem dados pessoais, tokens ou cópias de documentos." />{error && <Notice $error role="alert">{error}</Notice>}</Dialog>
    {deletingPhone && <DeleteContactDialog phone={deletingPhone} open onClose={() => setDeletingPhone("")} onDeleted={() => { setDeletingPhone(""); setPhoneDraft(""); setSuccess("Dados WhatsApp do contato excluídos e supressão aplicada pelo servidor."); void onChanged(); }} />}
  </TabBody>;
}
