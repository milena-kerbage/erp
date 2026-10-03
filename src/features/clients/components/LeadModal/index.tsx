"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@emotion/react";
import styled from "@emotion/styled";
import {
  ArrowSquareOutIcon,
  ChatsCircleIcon,
  CircleDashedIcon,
  CopySimpleIcon,
  PhoneIcon,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Dialog } from "@/components/ui/Dialog";
import { FieldTrigger } from "@/components/ui/Editable";
import { IconTile } from "@/components/ui/IconTile";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { startNavigationProgress } from "@/components/layout/NavigationProgress";
import { copyText } from "@/lib/clipboard";
import { WideOnly } from "@/styles/responsive";
import type { DockAction } from "@/lib/dock";
import { formatRelativeTime, formatTime } from "@/lib/format";
import { formatBudget, formatPhone } from "@/features/leads/format";
import { CampaignTab, DetailsTab, FilesTab } from "@/features/leads/components/LeadDetail/LeadProfile";
import { OwnerSelect } from "@/features/leads/components/OwnerSelect";
import { filesToAttachments, useLeads } from "@/features/leads/store";
import { useFunnels, useWorkspace } from "@/features/settings/store";

type Tab = "details" | "campaign" | "files" | "chat";

/* ---------- Estilos ---------- */

const Summary = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};

  > div {
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing(1.5)};
    min-width: 0;
    padding: ${({ theme }) => theme.spacing(3, 3.5)};
  }

  > div + div {
    border-left: 1px solid ${({ theme }) => theme.colors.border.subtle};
  }

  /* Celular: 2×2 */
  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(2, minmax(0, 1fr));

    > div:nth-of-type(odd) {
      border-left: 0;
    }

    > div:nth-of-type(n + 3) {
      border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
    }
  }

  small {
    font-size: ${({ theme }) => theme.fontSizes.xs};
    color: ${({ theme }) => theme.colors.text.muted};
  }

  strong {
    font-size: ${({ theme }) => theme.fontSizes.md};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1, 2)};
  min-width: 0;
`;

const Identity = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};

  /* Celular: o nome já está no título; o resumo ocupa a largura */
  ${({ theme }) => theme.media.md} {
    > span:first-of-type {
      display: none;
    }
  }
`;

const Contact = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1.5)};
  white-space: nowrap;
`;

/**
 * Resumo e abas ficam parados; só o conteúdo da aba rola (com folga embaixo
 * para o rodapé flutuante e a barra de rolagem longe da borda).
 */
const Sheet = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;

  > div {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  [role="tabpanel"] {
    flex: 1;
    min-height: 0;
    margin-right: -16px;
    padding-right: 16px;
    padding-bottom: 6.5rem;
    overflow-y: auto;

    &::-webkit-scrollbar-track {
      margin-top: 8px;
      margin-bottom: 24px;
    }
  }
`;

/** Na janela larga, os campos da ficha ficam em duas colunas. */
const TabBody = styled.div`
  dl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: ${({ theme }) => theme.spacing(6)};
  }

  /* Celular: um campo por linha */
  ${({ theme }) => theme.media.md} {
    dl {
      grid-template-columns: minmax(0, 1fr);
    }
  }
`;

const Messages = styled.ol`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};
  padding-top: ${({ theme }) => theme.spacing(4)};
`;

const Message = styled.li`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: ${({ theme }) => theme.spacing(2.5, 3)};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme }) => theme.colors.interactive.hover};
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.primary};

  small {
    font-size: ${({ theme }) => theme.fontSizes.xs};
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const Empty = styled.p`
  padding: ${({ theme }) => theme.spacing(8, 2)};
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
  text-align: center;
`;

/* ---------- Componente ---------- */

/**
 * Ficha do cliente em janela (Clientes): resumo, dados editáveis, campanha,
 * arquivos e as últimas mensagens, sem sair da lista.
 */
export function LeadModal({ leadId, onClose }: { leadId: string | null; onClose: () => void }) {
  const theme = useTheme();
  const { leads, details, messages, updateLead, updateDetails, moveLead, addAttachments, removeAttachment } =
    useLeads();
  const { findFunnel } = useFunnels();
  const { currentUser } = useWorkspace();
  const [tab, setTab] = useState<Tab>("details");
  // Abriu outro lead: volta para a primeira aba
  const [tabLead, setTabLead] = useState(leadId);
  if (leadId && leadId !== tabLead) {
    setTabLead(leadId);
    setTab("details");
  }
  const router = useRouter();
  const target = leads.find((item) => item.id === leadId);

  // Celular: os botões do rodapé vão para o dock flutuante
  const dockActions = useMemo<DockAction[] | undefined>(() => {
    if (!target) return undefined;
    const go = (href: string) => {
      startNavigationProgress();
      router.push(href);
    };
    return [
      {
        id: "copy",
        icon: CopySimpleIcon,
        label: "Copiar telefone",
        onClick: () => void copyText(formatPhone(target.phone)),
      },
      { id: "chat", icon: ChatsCircleIcon, label: "Ver conversa", onClick: () => go(`/conversas?c=${target.id}`) },
      {
        id: "open",
        icon: ArrowSquareOutIcon,
        label: "Abrir oportunidade",
        text: "Abrir",
        primary: true,
        onClick: () => go(`/leads/${target.id}`),
      },
    ];
  }, [target, router]);

  const lead = leads.find((item) => item.id === leadId);
  const info = lead ? details[lead.id] : undefined;
  if (!lead || !info) return <Dialog open={false} onClose={onClose} title="" />;

  const funnel = findFunnel(lead.funnelId);
  const stageIndex = funnel.stages.findIndex((stage) => stage.id === lead.stage);
  const stage = funnel.stages[stageIndex];
  const phone = formatPhone(lead.phone);
  const history = messages[lead.id] ?? [];
  const last = history[history.length - 1];
  const knownTags = [...new Set(leads.flatMap((item) => item.tags))];

  return (
    <Dialog
      open
      onClose={onClose}
      width="60rem"
      height="48rem"
      scroll="content"
      floatingFooter
      dockActions={dockActions}
      title={lead.name}
      description={
        <Row>
          <Contact>
            <PhoneIcon size={13} aria-hidden />
            {phone}
          </Contact>
          {info.email && (
            <span>
              <WideOnly>/ </WideOnly>
              {info.email}
            </span>
          )}
        </Row>
      }
      footer={
        <>
          <CopyButton icon={PhoneIcon} label="Copiar telefone" text={phone} />
          <Button variant="secondary" icon={ChatsCircleIcon} href={`/conversas?c=${lead.id}`}>
            Ver conversa
          </Button>
          <Button iconEnd={ArrowSquareOutIcon} href={`/leads/${lead.id}`}>
            Abrir oportunidade
          </Button>
        </>
      }
    >
      {/* Outro lead: o conteúdo recomeça do zero (a janela continua a mesma) */}
      <Fragment key={lead.id}>
        <Identity>
          <Avatar name={lead.name} src={lead.photoUrl} seed={lead.id} size="lg" shape="circle" />
          <Summary style={{ flex: 1 }}>
            <div>
              <small>Funil e etapa</small>
              <Row>
                <IconTile icon={funnel.icon} tone={funnel.tone} size="sm" />
                <Select
                  label={`Etapa de ${lead.name}`}
                  heading="Mover para"
                  align="start"
                  width="15rem"
                  value={lead.stage}
                  onChange={(id) => id !== lead.stage && moveLead(lead.id, id, currentUser.name)}
                  options={funnel.stages.map((item, position) => ({
                    value: item.id,
                    label: item.label,
                    meta: `${position + 1}/${funnel.stages.length}`,
                    leading: <CircleDashedIcon size={18} weight="bold" color={theme.tones[item.tone].fg} />,
                  }))}
                  trigger={({ open: _open, ...props }) => (
                    <FieldTrigger type="button" {...props} $variant="badge" $tone={stage?.tone ?? "neutral"}>
                      <CircleDashedIcon weight="bold" aria-hidden />
                      {stage?.label}
                    </FieldTrigger>
                  )}
                />
              </Row>
            </div>
            <div>
              <small>Orçamento</small>
              <strong>{formatBudget(lead.budget)}</strong>
            </div>
            <div>
              <small>Responsável</small>
              <OwnerSelect
                value={info.owner}
                onChange={(owner) => updateDetails(lead.id, { owner }, currentUser.name)}
                trigger={({ open: _open, ...props }) => (
                  <FieldTrigger
                    type="button"
                    {...props}
                    $variant="pill"
                    aria-label={`Responsável: ${info.owner.name}. Trocar`}
                  >
                    <Avatar
                      name={info.owner.name}
                      seed={info.owner.seed}
                      src={info.owner.avatarUrl}
                      size="xs"
                      shape="circle"
                    />
                    {info.owner.name.split(" ")[0]}
                  </FieldTrigger>
                )}
              />
            </div>
            <div>
              <small>Última mensagem</small>
              <strong style={{ fontSize: "0.875rem" }}>{last ? formatRelativeTime(last.at) : "Nenhuma"}</strong>
            </div>
          </Summary>
        </Identity>

        <Sheet>
          <Tabs
            label="Informações do cliente"
            value={tab}
            onChange={setTab}
            items={[
              { value: "details", label: "Detalhes" },
              { value: "campaign", label: "Campanha" },
              {
                value: "files",
                label: "Arquivos",
                count: info.attachments.length,
              },
              { value: "chat", label: "Conversa", count: history.length },
            ]}
          >
            <TabBody>
              {tab === "details" && (
                <DetailsTab
                  lead={lead}
                  details={info}
                  knownTags={knownTags}
                  onUpdateLead={(patch) => updateLead(lead.id, patch)}
                  onUpdateDetails={(patch) => updateDetails(lead.id, patch, currentUser.name)}
                />
              )}
              {tab === "campaign" && (
                <CampaignTab
                  details={info}
                  onUpdateDetails={(patch) => updateDetails(lead.id, patch, currentUser.name)}
                />
              )}
              {tab === "files" && (
                <FilesTab
                  details={info}
                  onAddFiles={(files) => addAttachments(lead.id, filesToAttachments(files), currentUser.name)}
                  onRemoveFile={(id) => removeAttachment(lead.id, id)}
                />
              )}
              {tab === "chat" &&
                (history.length === 0 ? (
                  <Empty>Nenhuma mensagem com {lead.name.split(" ")[0]} ainda.</Empty>
                ) : (
                  <Messages aria-label="Últimas mensagens">
                    {history.slice(-5).map((message) => (
                      <Message key={message.id}>
                        <small>
                          {message.direction === "in" ? lead.name.split(" ")[0] : message.author.name.split(" ")[0]}
                          {message.kind === "note" ? " (nota interna)" : ""} / {formatTime(message.at)}
                        </small>
                        {message.text || (message.attachments?.length ? "Anexo" : "")}
                      </Message>
                    ))}
                  </Messages>
                ))}
            </TabBody>
          </Tabs>
        </Sheet>
      </Fragment>
    </Dialog>
  );
}
