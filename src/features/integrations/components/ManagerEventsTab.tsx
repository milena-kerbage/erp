"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/features/settings/components/ui";
import { errorMessage, whatsappRequest } from "@/features/whatsapp/client";
import { Actions, formatWhatsAppDate, Note, Notice } from "@/features/whatsapp/components/shared";
import type { ManagerEvent } from "../types";
import { ManagerCard, TabBody } from "./ui";

const levelLabels: Record<ManagerEvent["level"], string> = { info: "Informação", warning: "Atenção", error: "Falha", success: "Concluído" };
const kindLabels: Record<string, string> = { configuration: "Configurações administrativas", database: "Banco de dados", webhook: "Assinatura do webhook", "public-routes": "Rotas públicas", meta: "Acesso aos ativos Meta", templates: "Modelos da conta", token: "Inspeção do token", retention: "Prévia da retenção", "deletion-review": "Revisão de exclusão", oauth: "Autorização Meta", "token-extension": "Duração do token de usuário" };

export function ManagerEventsTab() {
  const [events, setEvents] = useState<ManagerEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("");
    try { const data = await whatsappRequest<{ events: ManagerEvent[] }>("management/events", { signal }); if (!signal?.aborted) setEvents(data.events); }
    catch (cause) { if (!signal?.aborted) setError(errorMessage(cause)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void refresh(controller.signal); return () => controller.abort(); }, [refresh]);
  return <TabBody>
    <Actions><Button size="sm" variant="secondary" icon={ArrowClockwiseIcon} loading={loading} onClick={() => void refresh()}>Atualizar eventos</Button><Note>Auditoria administrativa e resultados técnicos. Conteúdo de mensagens e valores de credenciais não são exibidos neste registro.</Note></Actions>
    {error && <Notice $error role="alert">{error}</Notice>}
    {events.map((event) => <ManagerCard key={event.id}><Actions><h4>{kindLabels[event.kind] || event.kind}</h4><Pill $tone={event.level === "error" ? "rose" : event.level === "warning" ? "peach" : event.level === "success" ? "green" : "neutral"}>{levelLabels[event.level] || event.level}</Pill><Note>{formatWhatsAppDate(event.createdAt)}</Note></Actions><Note>{event.message}</Note></ManagerCard>)}
    {!events.length && !loading && <Notice>Nenhum evento administrativo registrado nesta consulta.</Notice>}
  </TabBody>;
}
