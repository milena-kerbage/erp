"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowClockwiseIcon, DownloadSimpleIcon, WhatsappLogoIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Pill } from "@/features/settings/components/ui";
import { errorMessage, whatsappRequest } from "@/features/whatsapp/client";
import { Actions, formatWhatsAppDate, Note, Notice } from "@/features/whatsapp/components/shared";
import type { WhatsAppStatus } from "@/features/whatsapp/types";
import type { ManagerConfiguration, ManagerOverview } from "../types";
import { ManagerConfigTab } from "./ManagerConfigTab";
import { ManagerEventsTab } from "./ManagerEventsTab";
import { ManagerPrivacyTab } from "./ManagerPrivacyTab";
import { ManagerRoutesTab } from "./ManagerRoutesTab";
import { ManagerStepsTab } from "./ManagerStepsTab";
import { ManagerTestsTab } from "./ManagerTestsTab";
import { ManagerCard, ManagerGrid, ManagerSurface, PanelHeading } from "./ui";

type ManagerTab = "steps" | "configuration" | "tests" | "routes" | "events" | "privacy";
const tabs: { value: ManagerTab; label: string }[] = [{ value: "steps", label: "Etapas" }, { value: "configuration", label: "Configuração e credenciais" }, { value: "tests", label: "Testes" }, { value: "routes", label: "Rotas" }, { value: "events", label: "Eventos" }, { value: "privacy", label: "Privacidade e pendências" }];

export function IntegrationManagerPanel({ initialTab = "steps" }: { initialTab?: ManagerTab }) {
  const [active, setActive] = useState<ManagerTab>(initialTab);
  const [overview, setOverview] = useState<ManagerOverview | null>(null);
  const [configuration, setConfiguration] = useState<ManagerConfiguration | null>(null);
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string>();
  const [oauthOutcome, setOAuthOutcome] = useState("");

  const refresh = useCallback(async (includeConfiguration = false, signal?: AbortSignal) => {
    setLoading(true); setError("");
    const results = await Promise.allSettled([
      whatsappRequest<ManagerOverview>("management/overview", { signal }),
      whatsappRequest<WhatsAppStatus>("status", { signal }),
      ...(includeConfiguration ? [whatsappRequest<ManagerConfiguration>("management/config", { signal })] : []),
    ]);
    if (signal?.aborted) return;
    let failure = "";
    const [summary, current, settings] = results;
    if (summary.status === "fulfilled") setOverview(summary.value as ManagerOverview); else failure = errorMessage(summary.reason);
    if (current.status === "fulfilled") setStatus(current.value as WhatsAppStatus); else failure ||= errorMessage(current.reason);
    if (settings?.status === "fulfilled") setConfiguration(settings.value as ManagerConfiguration); else if (settings?.status === "rejected") failure ||= errorMessage(settings.reason);
    setError(failure); setLoading(false); setLastUpdated(new Date().toISOString());
  }, []);

  useEffect(() => { const controller = new AbortController(); void refresh(true, controller.signal); return () => controller.abort(); }, [refresh]);
  useEffect(() => {
    const outcome = new URLSearchParams(window.location.search).get("meta");
    if (["connected", "failed", "denied"].includes(outcome || "")) { setOAuthOutcome(outcome!); setActive("configuration"); }
  }, []);
  const onChanged = useCallback(() => refresh(false), [refresh]);
  const onSaved = useCallback(() => refresh(true), [refresh]);

  return <ManagerSurface aria-label="Painel de gestão da integração WhatsApp">
    <PanelHeading><div><h3>Gestão da integração WhatsApp</h3><Note>Prepare as etapas, guarde a configuração e acompanhe testes, rotas, eventos e pedidos de privacidade.</Note></div><Actions><Button href="/api/whatsapp/management/guide" variant="secondary" size="sm" icon={DownloadSimpleIcon}>Baixar manual do gestor</Button><Button href="/conversas" variant="secondary" size="sm" icon={WhatsappLogoIcon}>Conversas</Button><Button variant="ghost" size="sm" icon={ArrowClockwiseIcon} loading={loading} onClick={() => void refresh(false)}>Atualizar diagnóstico</Button></Actions></PanelHeading>
    <Actions><Pill $tone={status?.ready ? "green" : "peach"}>{loading ? "Consultando servidor" : status?.ready ? "Configuração local pronta" : "Configuração pendente"}</Pill>{overview?.progress && <Pill $tone="neutral">{overview.progress.complete}/{overview.progress.total} etapas</Pill>}<Note>Último webhook válido: {formatWhatsAppDate(status?.lastWebhookAt)}</Note>{lastUpdated && <Note>Consulta: {formatWhatsAppDate(lastUpdated)}</Note>}</Actions>
    {status?.checks?.length ? <details><summary>Detalhes do diagnóstico local</summary><ManagerGrid>{status.checks.map((check) => <ManagerCard key={check.key}><Actions><h4>{check.label}</h4><Pill $tone={check.configured ? "green" : "peach"}>{check.configured ? "Configurado" : "Pendente"}</Pill></Actions>{check.detail && <Note>{check.detail}</Note>}</ManagerCard>)}</ManagerGrid><Note>O diagnóstico local verifica presença e formato. Os testes com a Meta e o recebimento de uma mensagem real confirmam o funcionamento externo.</Note></details> : null}
    {error && <Notice $error role="alert">{error}</Notice>}
    {oauthOutcome && <Notice $error={oauthOutcome !== "connected"}>{oauthOutcome === "connected" ? "Retorno do fluxo de autorização Meta recebido. Confira a credencial armazenada e execute a inspeção do token; esse retorno não confirma toda a integração nem uma entrega real." : oauthOutcome === "denied" ? "O fluxo de autorização Meta não foi concluído. Confira a escolha realizada e tente novamente se quiser autorizar o aplicativo." : "O fluxo de autorização Meta informou uma falha. Confira configuração, permissões, URI de retorno e os eventos do gestor."}</Notice>}
    {!overview && !loading && <Notice>O painel administrativo exige uma sessão real e autorização de gestor no servidor. O administrador prepara uma vez a conexão Supabase, a chave de criptografia e a lista de e-mails de gestores na hospedagem. As credenciais da Meta são emitidas pela própria Meta.</Notice>}
    {(overview?.environment?.managementMode === "development" || status?.authMode === "development") && <Notice>Gestão local de desenvolvimento ativa no loopback. Antes de publicar, homologue o login obrigatório e a autorização de gestores. O fluxo OAuth da Meta exige uma sessão real do ERP.</Notice>}
    <Tabs label="Áreas da gestão de integrações" items={tabs} value={active} onChange={setActive}>
      {active === "steps" && (overview ? <ManagerStepsTab overview={overview} onChanged={onChanged} onBootstrapPrepared={onSaved} /> : <Note>Entre como gestor e prepare o bootstrap para carregar as etapas persistidas.</Note>)}
      <div hidden={active !== "configuration"}>{configuration ? <ManagerConfigTab configuration={configuration} overview={overview} onSaved={onSaved} /> : active === "configuration" && <Note>A configuração administrativa estará disponível depois do login autorizado e da preparação do banco e da chave de criptografia.</Note>}</div>
      {active === "tests" && overview && <ManagerTestsTab status={status} configuredAppId={configuration?.values.appId} initialResults={overview.recentTests || []} onChanged={onChanged} />}
      {active === "routes" && <ManagerRoutesTab overview={overview} status={status} />}
      {active === "events" && overview && <ManagerEventsTab />}
      {active === "privacy" && overview && <ManagerPrivacyTab onChanged={onChanged} />}
      {!overview && ["tests", "events", "privacy"].includes(active) && <Note>Esta área exige acesso de gestor validado pelo servidor.</Note>}
    </Tabs>
  </ManagerSurface>;
}
