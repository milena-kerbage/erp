"use client";

import { useState } from "react";
import { CopyIcon, KeyIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { errorMessage, whatsappRequest } from "@/features/whatsapp/client";
import { Note, Notice, Stack } from "@/features/whatsapp/components/shared";

export function LocalBootstrapButton({ configured = false, onPrepared }: { configured?: boolean; onPrepared: () => Promise<void> }) {
  const [pending, setPending] = useState(false);
  const [key, setKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function prepare() {
    if (pending) return;
    setPending(true); setError(""); setSuccess("");
    try {
      const result = await whatsappRequest<{ created: boolean; key?: string; configured: boolean }>("management/bootstrap", { body: { action: "GENERATE_LOCAL_ENCRYPTION_KEY" } });
      if (!result.configured) throw new Error("O servidor não confirmou a configuração da criptografia local.");
      if (result.created && result.key) setKey(result.key);
      setSuccess(result.created ? "Chave de criptografia criada e guardada no ambiente local do servidor." : "A chave de criptografia local já está configurada.");
      await onPrepared();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setPending(false); }
  }
  return <Stack>{!configured && <><Button size="sm" variant="secondary" icon={KeyIcon} loading={pending} onClick={() => void prepare()}>Preparar criptografia local</Button><Note>Disponível somente neste ambiente de desenvolvimento local. O servidor prepara a chave privada em .env.local. Na Vercel, o administrador configura as variáveis de bootstrap pelo ambiente seguro da hospedagem.</Note></>}{error && <Notice $error role="alert">{error}</Notice>}{success && <Notice role="status">{success}</Notice>}<Dialog open={key !== null} onClose={() => setKey(null)} title="Chave de criptografia local preparada" description="Esta é a chave que protege as credenciais guardadas pelo ERP. Ela não é token de acesso, App Secret ou Verify Token da Meta. Copie agora para um cofre autorizado." footer={<Button onClick={() => setKey(null)}>Já guardei a chave</Button>}>{key && <TextField label="INTEGRATION_ENCRYPTION_KEY" readOnly value={key} trailing={<CopyButton icon={CopyIcon} label="Copiar chave de criptografia local" text={key} size="sm" variant="ghost" />} />}<Note>O servidor confirmou o armazenamento local. Não compartilhe esta chave nem publique .env.local. Preserve-a para decifrar os segredos existentes.</Note></Dialog></Stack>;
}
