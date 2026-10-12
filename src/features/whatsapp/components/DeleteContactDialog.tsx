"use client";

import { useState } from "react";
import { TrashIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { errorMessage, whatsappRequest } from "../client";
import { Note, Notice } from "./shared";

export function DeleteContactDialog({ phone, open, onClose, onDeleted }: { phone: string; open: boolean; onClose: () => void; onDeleted: () => void }) {
  const [confirmation, setConfirmation] = useState("");
  const [verification, setVerification] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function close() {
    if (pending) return;
    setConfirmation("");
    setVerification("");
    setError("");
    onClose();
  }

  async function remove() {
    if (pending || confirmation !== "EXCLUIR" || verification.trim().length < 10) return;
    setPending(true);
    setError("");
    try {
      await whatsappRequest("contacts", { method: "DELETE", body: { phone, confirmation, identityVerification: verification.trim() } });
      setConfirmation("");
      setVerification("");
      onDeleted();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return <Dialog open={open} onClose={close} title="Excluir dados WhatsApp deste contato" description={`Destinatário: +${phone}. Verifique a identidade e a legitimidade do pedido antes de executar.`} footer={<><Button variant="ghost" disabled={pending} onClick={close}>Cancelar</Button><Button variant="danger" icon={TrashIcon} loading={pending} disabled={confirmation !== "EXCLUIR" || verification.trim().length < 10} onClick={() => void remove()}>Excluir dados do contato</Button></>}>
    <Notice>Esta ação remove deste módulo o contato, o histórico de mensagens, os registros de consentimento e os registros de envio associados. O sistema mantém uma referência de supressão para impedir novos contatos sem autorização. A ação não exclui mensagens dos dispositivos de clientes nem dados que a Meta ou outras áreas do ERP conservem.</Notice>
    <TextField label="Como a identidade e o pedido foram verificados" multiline rows={3} maxLength={500} value={verification} onChange={(event) => setVerification(event.target.value)} placeholder="Ex.: pedido recebido pelo mesmo número e confirmação registrada no protocolo …" hint="Registre uma descrição objetiva com 10 a 500 caracteres, sem cópias de documentos ou dados sensíveis." />
    <TextField label="Digite EXCLUIR para confirmar" autoComplete="off" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
    {error && <Notice $error role="alert">{error}</Notice>}
    <Note>Consulte as <a href="/exclusao-de-dados" target="_blank" rel="noopener noreferrer">instruções de exclusão de dados</a> para o procedimento completo e o atendimento dos demais sistemas.</Note>
  </Dialog>;
}
