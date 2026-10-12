"use client";

import { useState } from "react";
import { ShieldCheckIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Pill } from "@/features/settings/components/ui";
import { errorMessage, whatsappRequest } from "../client";
import type { WhatsAppConsent } from "../types";
import { Actions, formatWhatsAppDate, Note, Notice, Stack } from "./shared";

export function ConsentPanel({ phone, consent, onSaved }: { phone: string; consent?: WhatsAppConsent; onSaved: () => void }) {
  const [source, setSource] = useState("");
  const [pending, setPending] = useState<"granted" | "revoked" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function save(status: "granted" | "revoked") {
    if (source.trim().length < 5 || pending) return;
    setPending(status);
    setError("");
    setSuccess("");
    try {
      await whatsappRequest("consent", { body: { phone, status, source: source.trim() } });
      setSuccess(status === "granted" ? "Autorização registrada. Envie apenas mensagens cobertas pela permissão recebida." : "Autorização revogada. Novos envios estão bloqueados para este número.");
      setSource("");
      onSaved();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(null);
    }
  }

  return (
    <Stack>
      <Actions>
        <ShieldCheckIcon size={18} aria-hidden />
        <Pill $tone={consent?.status === "granted" ? "green" : consent?.status === "revoked" ? "rose" : "neutral"}>
          {consent?.status === "granted" ? "Envio autorizado" : consent?.status === "revoked" ? "Autorização revogada" : "Sem autorização registrada"}
        </Pill>
      </Actions>
      {consent?.source && <Note>Último registro: {consent.source} · {formatWhatsAppDate(consent.updatedAt)}</Note>}
      <TextField
        label="Origem e evidência da autorização ou da revogação"
        multiline
        rows={2}
        maxLength={500}
        placeholder="Ex.: formulário de agendamento, aceito em 12/10/2026, autorização para confirmações e acompanhamento do pedido, registro nº …"
        value={source}
        onChange={(event) => setSource(event.target.value)}
        hint="Registre a evidência real, a data e a finalidade autorizada. Ter o número da pessoa não é suficiente. Não inclua documentos ou dados sensíveis."
      />
      <Actions>
        <Button size="sm" icon={ShieldCheckIcon} disabled={source.trim().length < 5 || pending !== null} loading={pending === "granted"} onClick={() => void save("granted")}>Registrar autorização obtida</Button>
        <Button size="sm" variant="secondary" disabled={source.trim().length < 5 || pending !== null} loading={pending === "revoked"} onClick={() => void save("revoked")}>Registrar pedido de parada</Button>
      </Actions>
      {error && <Notice $error role="alert">{error}</Notice>}
      {success && <Notice role="status">{success}</Notice>}
    </Stack>
  );
}
