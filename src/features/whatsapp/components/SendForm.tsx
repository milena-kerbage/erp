"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowClockwiseIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { errorMessage, whatsappRequest } from "../client";
import { templateKey, templatePreview, templateSupport } from "../templates";
import type { WhatsAppConversation, WhatsAppMessage, WhatsAppSendPayload, WhatsAppTemplate } from "../types";
import { Actions, ConfirmationLabel, formatWhatsAppDate, Note, Notice, Stack } from "./shared";

export function SendForm({ phone, conversation, ready, onSent }: { phone: string; conversation?: WhatsAppConversation; ready: boolean; onSent: () => void }) {
  const [kind, setKind] = useState<"text" | "template">("template");
  const [text, setText] = useState("");
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState("");
  const [selection, setSelection] = useState("");
  const [parameters, setParameters] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<WhatsAppMessage | null>(null);
  const retry = useRef<{ serialized: string; id: string } | null>(null);
  const expiresAt = Date.parse(conversation?.serviceWindowExpiresAt ?? "");
  const windowOpen = Number.isFinite(expiresAt) && expiresAt > Date.now();
  const authorized = conversation?.consent.status === "granted" && !conversation.optedOut;
  const template = templates.find((item) => templateKey(item) === selection);
  const support = template ? templateSupport(template) : null;
  const approvedTemplates = templates.filter((item) => item.status.toUpperCase() === "APPROVED");

  async function loadTemplates(signal?: AbortSignal) {
    setTemplateLoading(true);
    setTemplateError("");
    try {
      const data = await whatsappRequest<{ templates: WhatsAppTemplate[] }>("templates", { signal });
      setTemplates(data.templates);
    } catch (cause) {
      if (!signal?.aborted) setTemplateError(errorMessage(cause));
    } finally {
      if (!signal?.aborted) setTemplateLoading(false);
    }
  }

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    void loadTemplates(controller.signal);
    return () => controller.abort();
  }, [ready]);

  const hasContent = kind === "text" ? text.trim().length > 0 && windowOpen : Boolean(template && support?.supported && parameters.length === support.parameters && parameters.every((value) => value.trim().length > 0));
  const canSend = ready && authorized && confirmed && hasContent;

  async function send() {
    if (!canSend || sending) return;
    setSending(true);
    setError("");
    setResult(null);
    const content = kind === "text" ? { type: "text" as const, text: text.trim() } : {
      type: "template" as const,
      template: {
        name: template!.name,
        language: template!.language,
        ...(parameters.length ? { components: [{ type: "body" as const, parameters: parameters.map((value) => ({ type: "text" as const, text: value.trim() })) }] } : {}),
      },
    };
    const serialized = JSON.stringify({ phone, ...content });
    const id = retry.current?.serialized === serialized ? retry.current.id : crypto.randomUUID();
    retry.current = { serialized, id };
    const payload: WhatsAppSendPayload = { phone, clientRequestId: id, ...content };
    try {
      const data = await whatsappRequest<{ message: WhatsAppMessage }>("messages", { body: payload });
      setResult(data.message);
      if (data.message.status !== "failed") {
        setText("");
        setConfirmed(false);
        retry.current = null;
      }
      onSent();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSending(false);
    }
  }

  return (
    <Stack>
      {!ready && <Notice>A configuração do WhatsApp precisa estar completa para enviar. Consulte as configurações da integração.</Notice>}
      {!authorized && <Notice $error>Envio bloqueado: registre uma autorização válida para este número. Pedidos de parada impedem novos envios.</Notice>}
      <Note>
        {windowOpen ? `Janela de atendimento aberta até ${formatWhatsAppDate(conversation?.serviceWindowExpiresAt)}. Texto livre está disponível durante 24 horas após a última mensagem da pessoa.` : "A janela de atendimento está fechada ou ainda não foi aberta. Para iniciar ou retomar o contato, selecione um modelo aprovado pela Meta."}
      </Note>
      <Select label="Tipo de mensagem" value={kind} onChange={(value) => { setKind(value); setConfirmed(false); }} options={[
        { value: "template", label: "Modelo aprovado", description: "Iniciar ou retomar uma conversa com permissão" },
        { value: "text", label: "Texto livre", description: "Resposta dentro da janela de atendimento", disabled: !windowOpen },
      ]} />
      {kind === "text" ? <TextField label="Mensagem" multiline rows={3} value={text} maxLength={4096} onChange={(event) => { setText(event.target.value); setConfirmed(false); }} hint={`${text.length}/4096 caracteres. Este envio chega ao WhatsApp real do destinatário.`} /> : <>
        <Actions>
          <Note>Modelos e aprovação consultados na conta configurada.</Note>
          <Button size="sm" variant="ghost" icon={ArrowClockwiseIcon} loading={templateLoading} disabled={!ready || sending} onClick={() => void loadTemplates()}>Atualizar modelos</Button>
        </Actions>
        {templateError && <Notice $error role="alert">{templateError}</Notice>}
        <Select label="Modelo e idioma" value={selection || undefined} onChange={(value) => {
          setSelection(value);
          const selected = templates.find((item) => templateKey(item) === value);
          setParameters(Array(selected ? templateSupport(selected).parameters : 0).fill(""));
          setConfirmed(false);
        }} placeholder={templateLoading ? "Consultando a Meta…" : "Escolha um modelo"} options={approvedTemplates.map((item) => ({ value: templateKey(item), label: item.name, meta: item.language, description: templateSupport(item).supported ? item.category : templateSupport(item).reason, disabled: !templateSupport(item).supported }))} emptyMessage="Nenhum modelo aprovado compatível. Crie ou aprove um modelo no WhatsApp Manager." />
        {support && !support.supported && <Notice>{support.reason}</Notice>}
        {support?.supported && parameters.map((value, index) => <TextField key={index} label={`Variável {{${index + 1}}} do corpo`} value={value} maxLength={1024} onChange={(event) => { setParameters((current) => current.map((item, position) => position === index ? event.target.value : item)); setConfirmed(false); }} />)}
        {support?.body && <Notice aria-label="Prévia do corpo do modelo">{templatePreview(support.body, parameters)}</Notice>}
        <Note>Disponíveis nesta etapa: modelos simples com texto no corpo e variáveis numéricas. Modelos com mídia, autenticação ou parâmetros de cabeçalho/botões exigem implementação adicional.</Note>
      </>}
      <ConfirmationLabel>
        <Checkbox label={`Confirmo que o destinatário +${phone} autorizou esta finalidade e revisei o conteúdo. O envio é real.`} checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
        <span>Confirmo a autorização e o conteúdo para o destinatário +{phone}. O envio é real.</span>
      </ConfirmationLabel>
      <Actions>
        <Button icon={PaperPlaneTiltIcon} loading={sending} disabled={!canSend} onClick={() => void send()}>{sending ? "Enviando à Meta…" : "Enviar pelo WhatsApp"}</Button>
      </Actions>
      {error && <Notice $error role="alert">{error} Não reenvie por outra ferramenta enquanto o resultado estiver incerto. Repetir este envio com o mesmo conteúdo mantém a mesma referência de solicitação.</Notice>}
      {result && <Notice $error={result.status === "failed"} role="status">{result.status === "failed" ? `Falha no envio: ${result.error || "Verifique o status na conversa."}` : "Solicitação aceita pela API. A confirmação de envio, entrega e leitura será atualizada pelos webhooks da Meta."} Referência: {result.id}.</Notice>}
    </Stack>
  );
}
