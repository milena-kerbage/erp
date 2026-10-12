"use client";

import { ERP_ROUTE_CATALOG } from "@/lib/erp/catalog";
import { useEffect, useState } from "react";
import styled from "@emotion/styled";
import {
  CheckCircleIcon,
  CodeIcon,
  CopyIcon,
  DotsThreeIcon,
  DownloadSimpleIcon,
  KeyIcon,
  LinkIcon,
  PaperPlaneTiltIcon,
  PlusIcon,
  TrashIcon,
  WarningCircleIcon,
  WebhooksLogoIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CopyButton } from "@/components/ui/CopyButton";
import { Dialog } from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/IconButton";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Tag } from "@/components/ui/Tag";
import { TextField } from "@/components/ui/TextField";
import { copyText } from "@/lib/clipboard";
import { formatDate, formatRelativeTime } from "@/lib/format";
import { useWorkspace } from "../store";
import type { ApiKey, ApiScope, Webhook, WebhookEvent } from "../types";
import { Mono, Muted, Page, PageHeader, Pill, Section, Table, TableCard, usePending } from "./ui";
import { Notice, Note } from "@/features/whatsapp/components/shared";

const WHATSAPP_API_PATH = "/api/whatsapp";

const scopes: Record<ApiScope, { label: string; description: string }> = {
  read: { label: "Leitura", description: "Consulta leads, registros operacionais e relatórios autorizados do ERP" },
  write: { label: "Leitura e escrita", description: "Também cria e altera leads e registros nas rotas de escrita autorizadas do ERP" },
};

const webhookEvents: { value: WebhookEvent; label: string; description: string }[] = [
  { value: "lead.created", label: "Lead criado", description: "Alguém entrou por qualquer canal" },
  { value: "lead.stage_changed", label: "Lead mudou de etapa", description: "Movido no quadro ou na oportunidade" },
  { value: "message.received", label: "Mensagem recebida", description: "A cliente escreveu numa conversa" },
  { value: "message.sent", label: "Mensagem enviada", description: "A equipe respondeu" },
  { value: "conversation.resolved", label: "Conversa resolvida", description: "Atendimento encerrado" },
];

const eventLabel = (value: WebhookEvent) => webhookEvents.find((event) => event.value === value)?.label ?? value;

/* ---------- Estilos ---------- */

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(3)};
  margin-bottom: ${({ theme }) => theme.spacing(3)};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Hooks = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};
`;

const Hook = styled.li`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(3, 3, 3, 4)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
`;

const HookTexts = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1.5)};
  min-width: 0;

  code {
    overflow: hidden;
    color: ${({ theme }) => theme.colors.text.primary};
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  > div {
    display: flex;
    flex-wrap: wrap;
    gap: ${({ theme }) => theme.spacing(1)};
  }
`;

const Empty = styled.div`
  padding: ${({ theme }) => theme.spacing(6, 4)};
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radii.lg};
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
  text-align: center;
`;

const CodeLabel = styled.span`
  display: block;
  margin-bottom: ${({ theme }) => theme.spacing(1.5)};
  font-size: 0.8125rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

/** Bloco de código claro, no mesmo tom das superfícies. */
const Code = styled.pre`
  overflow-x: auto;
  padding: ${({ theme }) => theme.spacing(3, 3.5)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme }) => theme.colors.background.surface};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.75rem;
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

/** A chave completa, mostrada uma única vez. */
const SecretBox = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  padding: ${({ theme }) => theme.spacing(2, 2, 2, 3)};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme }) => theme.colors.background.surface};

  code {
    flex: 1;
    overflow-wrap: anywhere;
    font-family: ${({ theme }) => theme.fonts.mono};
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const Warning = styled.p`
  display: flex;
  gap: ${({ theme }) => theme.spacing(2)};
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.tones.peach.fg};

  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const EventList = styled.fieldset`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2.5)};
  margin: 0;
  padding: 0;
  border: 0;

  legend {
    margin-bottom: ${({ theme }) => theme.spacing(2)};
    font-size: 0.8125rem;
    font-weight: ${({ theme }) => theme.fontWeights.medium};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  label {
    display: flex;
    align-items: flex-start;
    gap: ${({ theme }) => theme.spacing(2.5)};
    cursor: pointer;

    input {
      margin-top: 2px;
    }
  }

  span {
    display: flex;
    flex-direction: column;
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  small {
    font-size: ${({ theme }) => theme.fontSizes.xs};
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

/* ---------- Tela ---------- */

/** Chaves de API, webhooks e o básico da documentação. */
export function ApiSettings() {
  const [baseUrl, setBaseUrl] = useState(WHATSAPP_API_PATH);
  useEffect(() => setBaseUrl(`${window.location.origin}${WHATSAPP_API_PATH}`), []);
  const { apiKeys, createApiKey, revokeApiKey, webhooks, addWebhook, updateWebhook, removeWebhook, testWebhook, currentUser, loading, error } = useWorkspace();

  // Criar chave: primeiro nome/permissão, depois a chave completa (uma vez só).
  const [keyDialog, setKeyDialog] = useState(false);
  const [keyDraft, setKeyDraft] = useState<{ name: string; scope: ApiScope }>({ name: "", scope: "read" });
  const [secret, setSecret] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<ApiKey | null>(null);
  const [creatingKey, runCreateKey] = usePending();
  const [addingHook, runAddHook] = usePending();
  const [testing, setTesting] = useState<string | null>(null);
  const [testingHook, setTestingHook] = useState<Webhook | null>(null);
  const [hookSecret, setHookSecret] = useState<string | null>(null);

  const [hookDialog, setHookDialog] = useState(false);
  const [hookDraft, setHookDraft] = useState<{ url: string; events: WebhookEvent[] }>({ url: "", events: [] });
  const [removingHook, setRemovingHook] = useState<Webhook | null>(null);

  const urlValid = /^https:\/\/[^\s/$.?#].[^\s]*$/i.test(hookDraft.url.trim());

  const closeKey = () => {
    setKeyDialog(false);
    setSecret(null);
    setKeyDraft({ name: "", scope: "read" });
  };

  const closeHook = () => {
    setHookDialog(false);
    setHookDraft({ url: "", events: [] });
  };

  const toggleEvent = (value: WebhookEvent) =>
    setHookDraft((current) => ({
      ...current,
      events: current.events.includes(value)
        ? current.events.filter((event) => event !== value)
        : [...current.events, value],
    }));

  return (
    <Page>
      <PageHeader
        title="API e webhooks"
        description="Para o site, formulários e automações conversarem com o sistema."
      />

      <div>
        <Section title="API oficial do WhatsApp" icon={WhatsappLogoIcon} description="Endpoints reais para diagnóstico, contatos, histórico, modelos, consentimento, envio e leitura. A sessão do sistema controla o acesso.">
          <TextField label="Endereço base da API WhatsApp" readOnly value={baseUrl} trailing={<CopyButton icon={CopyIcon} label="Copiar endereço da API WhatsApp" text={baseUrl} variant="ghost" size="sm" />} />
          <Note>GET /status · GET /conversations · GET /messages?phone=… · GET /templates · POST /messages · POST /consent · POST /read · GET /media?messageId=…</Note>
          <Note>Webhook público da Meta: GET e POST /api/whatsapp/webhook. A verificação do callback e a assinatura das notificações são validadas no servidor.</Note>
          <Button href="/configuracoes/whatsapp" variant="secondary" icon={WhatsappLogoIcon}>Diagnóstico, URLs e teste de envio</Button>
        </Section>
        <Section title="API do ERP" icon={CodeIcon} description="Dados persistidos do ateliê para sites e automações com chave Bearer.">
          <TextField label="Endereço base da API do ERP" readOnly value={baseUrl.replace(WHATSAPP_API_PATH, "/api/erp")} trailing={<CopyButton icon={CopyIcon} label="Copiar endereço da API do ERP" text={baseUrl.replace(WHATSAPP_API_PATH, "/api/erp")} variant="ghost" size="sm" />} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <Button variant="secondary" size="sm" icon={DownloadSimpleIcon} href="/api/erp/documentation" download="erp-backend.md">Baixar manual técnico</Button>
            <Button variant="secondary" size="sm" icon={DownloadSimpleIcon} href="/api/erp/documentation?document=operation" download="manual-operacao-erp.md">Baixar guia de operação</Button>
          </div>
          <details>
            <summary style={{ cursor: "pointer", fontWeight: 600, padding: "0.5rem 0" }}>Todas as rotas ERP ({ERP_ROUTE_CATALOG.length})</summary>
            <Note>O catálogo descreve os métodos, papéis e suporte à chave Bearer de cada rota. Substitua os identificadores entre chaves pelos registros reais. A sessão e a autorização continuam sendo verificadas no servidor.</Note>
            <TableCard>
              <Table>
                <thead><tr><th>Rota</th><th>Métodos</th><th>Permissão</th><th>Autenticação</th><th>Uso</th></tr></thead>
                <tbody>{ERP_ROUTE_CATALOG.map(route => <tr key={route.path}><td><Mono>{route.path}</Mono></td><td><Mono>{route.methods}</Mono></td><td style={{ whiteSpace: "normal", minWidth: "10rem" }}>{route.roles}</td><td>{route.bearer ? "Sessão ou Bearer" : route.path === "/api/auth/accept-invitation" ? "Token do convite" : "Sessão"}</td><td style={{ whiteSpace: "normal", minWidth: "20rem", maxWidth: "30rem", lineHeight: 1.5 }}>{route.purpose}</td></tr>)}</tbody>
              </Table>
            </TableCard>
            <Button variant="ghost" size="sm" icon={CodeIcon} href="/api/erp" target="_blank" rel="noopener noreferrer">Abrir catálogo JSON</Button>
          </details>
          <Note>Rotas com chave Bearer: GET /api/erp/leads · POST /api/erp/leads · PATCH ou DELETE /api/erp/leads/&#123;id&#125; · POST /api/erp/leads/&#123;id&#125;/notes · GET e POST /api/erp/records/&#123;module&#125; · PATCH ou DELETE /api/erp/records/&#123;module&#125;/&#123;id&#125; · GET /api/erp/reports</Note>
          <Note>Relatórios e dados financeiros exigem perfil de administração ou gestão. Workspace, perfil, equipe, emissão de chaves e gestão de webhooks exigem uma sessão; a gestão da equipe, chaves e webhooks exige administração. A chave não autentica as rotas /api/whatsapp.</Note>
          <Note>Operações de escrita usam revision para evitar sobrescrever edições de outra pessoa. Guarde a chave inteira somente em seu servidor; ela é exibida uma vez na criação.</Note>
        </Section>
        <Section title="Sobre as demais ferramentas" description="Integrações autenticadas com o backend do ERP.">
          <Notice>As chaves abaixo autenticam /api/erp com Authorization: Bearer. A permissão Leitura consulta dados; Escrita permite as operações autorizadas do ERP. O envio do WhatsApp continua protegido pela sessão e credenciais da Meta. Webhooks são armazenados no servidor e os testes mostram a resposta real do destino.</Notice>
        </Section>
        <Section
          title="Chaves de API"
          icon={KeyIcon}
          description="Cada chave dá acesso aos dados do ateliê. Trate como senha e revogue as que não usa mais."
          plain
        >
          <Toolbar>
            {apiKeys.length} {apiKeys.length === 1 ? "chave ativa" : "chaves ativas"}
            <Button variant="secondary" size="sm" icon={PlusIcon} disabled={loading || currentUser.permission !== "admin"} onClick={() => setKeyDialog(true)}>
              Criar chave
            </Button>
          </Toolbar>
          {apiKeys.length > 0 ? (
            <TableCard>
              <Table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Chave</th>
                    <th>Permissão</th>
                    <th>Criada</th>
                    <th>Último uso</th>
                    <th aria-label="Ações" />
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((key) => (
                    <tr key={key.id}>
                      <td>{key.name}</td>
                      <td>
                        <Mono>
                          {key.prefix}••••{key.last4}
                        </Mono>
                      </td>
                      <td>
                        <Pill $tone={key.scope === "write" ? "peach" : "blue"}>{scopes[key.scope].label}</Pill>
                      </td>
                      <td>
                        <Muted title={`por ${key.createdBy}`}>{formatDate(key.createdAt)}</Muted>
                      </td>
                      <td>
                        <Muted>{key.lastUsedAt ? formatRelativeTime(key.lastUsedAt) : "Nunca usada"}</Muted>
                      </td>
                      <td>
                        <IconButton
                          icon={TrashIcon}
                          label={`Revogar ${key.name}`}
                          variant="ghost"
                          size="sm"
                          tooltip="left"
                          onClick={() => setRevoking(key)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableCard>
          ) : (
            <Empty>Nenhuma chave ainda. Crie uma para conectar o site ou uma automação.</Empty>
          )}
        </Section>

        <Section
          title="Webhooks"
          icon={WebhooksLogoIcon}
          description="Eventos assinados e persistidos para outras ferramentas quando algo acontece. A entrega depende da liberação do destino e do processamento da fila."
          plain
        >
          <Notice>Antes de testar ou entregar eventos externamente, libere o host do destino na variável ERP_WEBHOOK_ALLOWED_HOSTS da hospedagem. Use somente destinos HTTPS públicos sob seu controle.</Notice>
          <Note>O corpo contém id, event, occurredAt e data.entityId. O cabeçalho X-MK-Signature-256 contém sha256= seguido do HMAC SHA-256 do corpo bruto usando o segredo do webhook. O evento informa o identificador da entidade e não inclui o conteúdo privado das mensagens.</Note>
          <Toolbar>
            {webhooks.filter((hook) => hook.active).length} de {webhooks.length} ativos
            <Button variant="secondary" size="sm" icon={PlusIcon} disabled={loading || currentUser.permission !== "admin"} onClick={() => setHookDialog(true)}>
              Adicionar webhook
            </Button>
          </Toolbar>
          {webhooks.length > 0 ? (
            <Hooks>
              {webhooks.map((hook) => (
                <Hook key={hook.id}>
                  <Switch
                    checked={hook.active}
                    label={hook.active ? `Pausar ${hook.url}` : `Ativar ${hook.url}`}
                    onChange={(active) => updateWebhook(hook.id, { active })}
                  />
                  <HookTexts>
                    <Mono title={hook.url}>{hook.url}</Mono>
                    <div>
                      {hook.events.map((event) => (
                        <Tag key={event}>{eventLabel(event)}</Tag>
                      ))}
                    </div>
                  </HookTexts>
                  {testing === hook.id ? (
                    <Pill $tone="neutral" $outline>
                      Enviando teste...
                    </Pill>
                  ) : hook.lastDelivery ? (
                    <Pill $tone={hook.lastDelivery.status >= 200 && hook.lastDelivery.status < 300 ? "green" : "rose"} title={`Resposta ${hook.lastDelivery.status}`}>
                      {hook.lastDelivery.status >= 200 && hook.lastDelivery.status < 300 ? (
                        <CheckCircleIcon size={12} weight="bold" aria-hidden />
                      ) : (
                        <WarningCircleIcon size={12} weight="bold" aria-hidden />
                      )}
                      {hook.lastDelivery.status || "Sem resposta"} / {formatRelativeTime(hook.lastDelivery.at)}
                    </Pill>
                  ) : (
                    <Muted>Sem entregas</Muted>
                  )}
                  <Menu
                    label={`Opções do webhook ${hook.url}`}
                    align="end"
                    width="14rem"
                    trigger={(props) => (
                      <IconButton {...props} icon={DotsThreeIcon} label="Opções" variant="ghost" size="sm" tooltip={false} />
                    )}
                  >
                    <MenuItem
                      icon={PaperPlaneTiltIcon}
                      disabled={!hook.active}
                      onSelect={() => setTestingHook(hook)}
                    >
                      Enviar teste
                    </MenuItem>

                    <MenuSeparator />
                    <MenuItem icon={TrashIcon} muted onSelect={() => setRemovingHook(hook)}>
                      Excluir
                    </MenuItem>
                  </Menu>
                </Hook>
              ))}
            </Hooks>
          ) : (
            <Empty>Nenhum webhook. Adicione um endereço para receber os avisos.</Empty>
          )}
        </Section>

        <Section
          title="Documentação da API WhatsApp"
          icon={CodeIcon}
          description="Verifique a configuração usando a sessão autenticada. Tokens da Meta ficam somente no servidor."
        >
          <TextField
            label="Endereço base"
            icon={LinkIcon}
            readOnly
            value={baseUrl}
            trailing={<CopyButton icon={CopyIcon} label="Copiar endereço" text={baseUrl} variant="ghost" size="sm" />}
          />
          <div>
            <CodeLabel>Exemplo: consultar configuração com uma sessão de teste</CodeLabel>
            <Code>{`curl --cookie cookies.txt '${baseUrl}/status'`}</Code>
            <Note>cookies.txt representa a sessão obtida no login do ambiente de teste. Não compartilhe cookies ou tokens. Utilize a página WhatsApp Business para testes guiados e as políticas públicas para os procedimentos de privacidade.</Note>
          </div>
        </Section>
      </div>

      {/* Criar chave */}
      <Dialog
        open={keyDialog}
        onClose={closeKey}
        title={secret ? "Chave criada" : "Criar chave de API"}
        description={secret ? undefined : "Dê um nome que lembre onde ela vai ser usada."}
        footer={
          secret ? (
            <Button onClick={closeKey}>Concluir</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={closeKey}>
                Cancelar
              </Button>
              <Button
                icon={KeyIcon}
                disabled={keyDraft.name.trim().length < 2}
                loading={creatingKey}
                onClick={() => runCreateKey(async () => { const created = await createApiKey(keyDraft.name.trim(), keyDraft.scope); if (created) setSecret(created); })}
              >
                Criar chave
              </Button>
            </>
          )
        }
      >
        {secret ? (
          <>
            {error && <Notice role="alert">{error}</Notice>}
            <SecretBox>
              <code>{secret}</code>
              <CopyButton icon={CopyIcon} label="Copiar chave" text={secret} variant="ghost" size="sm" />
            </SecretBox>
            <Warning>
              <WarningCircleIcon size={16} weight="bold" aria-hidden />
              Copie agora. Por segurança, a chave completa não aparece de novo.
            </Warning>
          </>
        ) : (
          <>
            <TextField
              label="Nome"
              icon={KeyIcon}
              placeholder="Ex.: Formulário do site"
              value={keyDraft.name}
              onChange={(event) => setKeyDraft({ ...keyDraft, name: event.target.value })}
            />
            <Select
              label="Permissão"
              heading="O que a chave pode fazer"
              width="trigger"
              value={keyDraft.scope}
              onChange={(scope) => setKeyDraft({ ...keyDraft, scope })}
              options={(Object.keys(scopes) as ApiScope[]).map((scope) => ({
                value: scope,
                label: scopes[scope].label,
                description: scopes[scope].description,
              }))}
            />
          </>
        )}
      </Dialog>

      {/* Revogar chave */}
      <Dialog
        open={revoking !== null}
        onClose={() => setRevoking(null)}
        title="Revogar chave?"
        description={`O que usa "${revoking?.name}" para de funcionar na hora.`}
        width="24rem"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRevoking(null)}>
              Voltar
            </Button>
            <Button
              variant="danger"
              icon={TrashIcon}
              onClick={async () => {
                if (revoking && await revokeApiKey(revoking.id)) setRevoking(null);
              }}
            >
              Revogar
            </Button>
          </>
        }
      />

      {/* Adicionar webhook */}
      <Dialog
        open={hookDialog}
        onClose={closeHook}
        title="Adicionar webhook"
        description="Enviamos um POST com os dados do evento, assinado com um segredo."
        width="30rem"
        footer={
          <>
            <Button variant="ghost" onClick={closeHook}>
              Cancelar
            </Button>
            <Button
              icon={WebhooksLogoIcon}
              disabled={!urlValid || hookDraft.events.length === 0}
              loading={addingHook}
              onClick={() =>
                runAddHook(async () => {
                  const created = await addWebhook({ url: hookDraft.url.trim(), events: hookDraft.events });
                  if (created) { closeHook(); setHookSecret(created); }
                })
              }
            >
              Adicionar
            </Button>
          </>
        }
      >
        <TextField
          label="Endereço"
          icon={LinkIcon}
          inputMode="url"
          placeholder="https://..."
          value={hookDraft.url}
          mask={(value) => value.replace(/\s/g, "")}
          error={hookDraft.url && !urlValid ? "Use um endereço completo com https://" : undefined}
          onChange={(event) => setHookDraft({ ...hookDraft, url: event.target.value })}
        />
        <EventList>
          <legend>Eventos</legend>
          {webhookEvents.map((event) => (
            <label key={event.value}>
              <Checkbox
                label={event.label}
                checked={hookDraft.events.includes(event.value)}
                onChange={() => toggleEvent(event.value)}
              />
              <span>
                {event.label}
                <small>{event.description}</small>
              </span>
            </label>
          ))}
        </EventList>
      </Dialog>

      {/* Excluir webhook */}
      <Dialog
        open={removingHook !== null}
        onClose={() => setRemovingHook(null)}
        title="Excluir webhook?"
        description="Esse endereço deixa de receber os avisos."
        width="24rem"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemovingHook(null)}>
              Voltar
            </Button>
            <Button
              variant="danger"
              icon={TrashIcon}
              onClick={async () => {
                if (removingHook && await removeWebhook(removingHook.id)) setRemovingHook(null);
              }}
            >
              Excluir
            </Button>
          </>
        }
      />
      <Dialog open={hookSecret !== null} onClose={() => setHookSecret(null)} title="Segredo do webhook" description="Guarde agora no serviço que recebe os eventos. O servidor não mostra este segredo novamente." footer={<Button onClick={() => setHookSecret(null)}>Guardei o segredo</Button>}>
        {error && <Notice role="alert">{error}</Notice>}
        <TextField label="Segredo de assinatura" readOnly value={hookSecret ?? ""} trailing={<CopyButton icon={CopyIcon} label="Copiar segredo" text={hookSecret ?? ""} variant="ghost" size="sm" />} />
        <Note>Valide a assinatura HMAC SHA-256 do corpo recebido no seu destino.</Note>
      </Dialog>
      <Dialog open={testingHook !== null} onClose={() => setTestingHook(null)} title="Enviar teste real?" description={`O servidor enviará um evento de teste para ${testingHook?.url ?? ""}. Confira que você controla esse destino.`} footer={<><Button variant="ghost" onClick={() => setTestingHook(null)}>Cancelar</Button><Button loading={testing !== null} onClick={async () => { if (!testingHook || testing) return; setTesting(testingHook.id); try { if (await testWebhook(testingHook.id)) setTestingHook(null); } finally { setTesting(null); } }}>Enviar teste</Button></>}>{error && <Notice role="alert">{error}</Notice>}</Dialog>
    </Page>
  );
}
