"use client";

import { CopyIcon, ArrowSquareOutIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { TextField } from "@/components/ui/TextField";
import { Pill } from "@/features/settings/components/ui";
import { Actions, Note, Notice } from "@/features/whatsapp/components/shared";
import type { WhatsAppStatus } from "@/features/whatsapp/types";
import type { ManagerOverview } from "../types";
import { INTEGRATION_ACCESS_LABELS } from "../catalog";
import { ManagerCard, ManagerGrid, TabBody } from "./ui";

const labels: Record<string, string> = { base: "Origem pública", webhook: "Callback WhatsApp", privacy: "Política de privacidade", terms: "Termos de uso", deletion: "Instruções de exclusão", cookies: "Cookies", communications: "Política de comunicação", policies: "Central de políticas", dataDeletionCallback: "Callback de exclusão Meta" };

export function ManagerRoutesTab({ overview, status }: { overview: ManagerOverview | null; status: WhatsAppStatus | null }) {
  const base = overview?.environment?.publicBaseUrl || (typeof status?.urls.base === "string" ? status.urls.base : "");
  return <TabBody>
    {status?.urls.publicHttps === false && <Notice $error>A origem pública HTTPS ainda não está pronta. Endereços locais não serão acessíveis pelo callback da Meta.</Notice>}
    <ManagerGrid>{Object.entries(status?.urls || {}).filter((entry): entry is [string, string] => typeof entry[1] === "string").map(([key, value]) => <ManagerCard key={key}><TextField label={labels[key] || key} readOnly value={value} trailing={<CopyButton icon={CopyIcon} label={`Copiar ${labels[key] || key}`} text={value} size="sm" variant="ghost" />} />{!key.toLowerCase().includes("callback") && key !== "webhook" && <Button href={value} target="_blank" rel="noopener noreferrer" size="sm" variant="ghost" icon={ArrowSquareOutIcon}>Abrir página</Button>}</ManagerCard>)}</ManagerGrid>
    <Note>O GET do webhook responde ao challenge informado pela Meta. O POST recebe notificações assinadas. O callback de exclusão Meta recebe signed_request; a consulta usa o protocolo devolvido. As rotas operacionais exigem sessão, e as rotas de gestão exigem também a autorização de gestor.</Note>
    <ManagerGrid>{overview?.routes?.map((route) => {
      const url = base ? `${base}${route.path}` : route.path;
      return <ManagerCard key={route.id}><Actions><h4>{route.title}</h4><Pill $tone="blue">{route.method}</Pill></Actions><code>{route.path}</code><Note>{route.purpose}</Note><Note>Acesso: {INTEGRATION_ACCESS_LABELS[route.access]}</Note>{route.metaField && <Note>Campo no painel Meta: {route.metaField}</Note>}{route.testNote && <Note>{route.testNote}</Note>}<Actions><CopyButton icon={CopyIcon} label={`Copiar rota ${route.path}`} text={url} size="sm" />{route.method === "GET" && route.safeToOpen && <Button href={url} target="_blank" rel="noopener noreferrer" size="sm" variant="ghost" icon={ArrowSquareOutIcon}>Abrir</Button>}</Actions>{(route.requestExample || route.responseExample) && <details><summary>Exemplo de contrato</summary>{route.requestExample && <Note>Solicitação: <code>{typeof route.requestExample === "string" ? route.requestExample : JSON.stringify(route.requestExample, null, 2)}</code></Note>}{route.responseExample && <Note>Resposta: <code>{typeof route.responseExample === "string" ? route.responseExample : JSON.stringify(route.responseExample, null, 2)}</code></Note>}</details>}</ManagerCard>;
    })}</ManagerGrid>
  </TabBody>;
}
