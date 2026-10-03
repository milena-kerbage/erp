"use client";

import { useState } from "react";
import styled from "@emotion/styled";
import {
  CheckCircleIcon,
  CodeIcon,
  CopyIcon,
  DotsThreeIcon,
  KeyIcon,
  LinkIcon,
  PaperPlaneTiltIcon,
  PlusIcon,
  TrashIcon,
  WarningCircleIcon,
  WebhooksLogoIcon,
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

const BASE_URL = "https://app.ateliemilenakerbage.com.br/api/v1";

const scopes: Record<ApiScope, { label: string; description: string }> = {
  read: { label: "Leitura", description: "Consulta leads, clientes e conversas" },
  write: { label: "Leitura e escrita", description: "Também cria e atualiza leads (ex.: formulário do site)" },
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
  const { apiKeys, createApiKey, revokeApiKey, webhooks, addWebhook, updateWebhook, removeWebhook } = useWorkspace();

  // Criar chave: primeiro nome/permissão, depois a chave completa (uma vez só).
  const [keyDialog, setKeyDialog] = useState(false);
  const [keyDraft, setKeyDraft] = useState<{ name: string; scope: ApiScope }>({ name: "", scope: "read" });
  const [secret, setSecret] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<ApiKey | null>(null);
  const [creatingKey, runCreateKey] = usePending();
  const [addingHook, runAddHook] = usePending();
  const [testing, setTesting] = useState<string | null>(null);

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
        <Section
          title="Chaves de API"
          icon={KeyIcon}
          description="Cada chave dá acesso aos dados do ateliê. Trate como senha e revogue as que não usa mais."
          plain
        >
          <Toolbar>
            {apiKeys.length} {apiKeys.length === 1 ? "chave ativa" : "chaves ativas"}
            <Button variant="secondary" size="sm" icon={PlusIcon} onClick={() => setKeyDialog(true)}>
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
          description="Avisos em tempo real para outras ferramentas (planilhas, automações) quando algo acontece."
          plain
        >
          <Toolbar>
            {webhooks.filter((hook) => hook.active).length} de {webhooks.length} ativos
            <Button variant="secondary" size="sm" icon={PlusIcon} onClick={() => setHookDialog(true)}>
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
                    <Pill $tone={hook.lastDelivery.status < 300 ? "green" : "rose"} title={`Resposta ${hook.lastDelivery.status}`}>
                      {hook.lastDelivery.status < 300 ? (
                        <CheckCircleIcon size={12} weight="bold" aria-hidden />
                      ) : (
                        <WarningCircleIcon size={12} weight="bold" aria-hidden />
                      )}
                      {hook.lastDelivery.status} / {formatRelativeTime(hook.lastDelivery.at)}
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
                      onSelect={() => {
                        // TODO: disparo real pelo back-end; por enquanto simula o envio de teste
                        setTesting(hook.id);
                        window.setTimeout(() => {
                          updateWebhook(hook.id, { lastDelivery: { at: new Date().toISOString(), status: 200 } });
                          setTesting(null);
                        }, 900);
                      }}
                    >
                      Enviar teste
                    </MenuItem>
                    <MenuItem icon={CopyIcon} onSelect={() => void copyText(hook.secret)}>
                      Copiar segredo
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
          title="Documentação"
          icon={CodeIcon}
          description="Endereço base e um exemplo para começar. A API pública entra junto com o back-end."
        >
          <TextField
            label="Endereço base"
            icon={LinkIcon}
            readOnly
            value={BASE_URL}
            trailing={<CopyButton icon={CopyIcon} label="Copiar endereço" text={BASE_URL} variant="ghost" size="sm" />}
          />
          <div>
            <CodeLabel>Exemplo: listar os leads</CodeLabel>
            <Code>{`curl ${BASE_URL}/leads \\
  -H "Authorization: Bearer mk_live_sua_chave"`}</Code>
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
                onClick={() => runCreateKey(() => setSecret(createApiKey(keyDraft.name.trim(), keyDraft.scope)))}
              >
                Criar chave
              </Button>
            </>
          )
        }
      >
        {secret ? (
          <>
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
              onClick={() => {
                if (revoking) revokeApiKey(revoking.id);
                setRevoking(null);
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
                runAddHook(() => {
                  addWebhook({ url: hookDraft.url.trim(), events: hookDraft.events });
                  closeHook();
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
              onClick={() => {
                if (removingHook) removeWebhook(removingHook.id);
                setRemovingHook(null);
              }}
            >
              Excluir
            </Button>
          </>
        }
      />
    </Page>
  );
}
