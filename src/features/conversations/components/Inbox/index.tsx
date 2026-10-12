"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@emotion/react";
import { ArrowSquareOutIcon, CaretLeftIcon, ChatsCircleIcon } from "@phosphor-icons/react";
import { startNavigationProgress } from "@/components/layout/NavigationProgress";
import { Avatar } from "@/components/ui/Avatar";
import type { ComposerHandle } from "@/components/ui/Chat/Composer";
import { FieldTrigger } from "@/components/ui/Editable";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { MenuItem } from "@/components/ui/Menu";
import { Select } from "@/components/ui/Select";
import { NarrowOnly, WideOnly } from "@/styles/responsive";
import { LeadChat } from "@/features/leads/components/LeadDetail/LeadChat";
import { OwnerSelect } from "@/features/leads/components/OwnerSelect";
import { composerAttachments, useLeads } from "@/features/leads/store";
import { useFunnels, useWorkspace } from "@/features/settings/store";
import { conversationStatuses, findStatus } from "../../status";
import { Activity } from "./Activity";
import type { Conversation } from "./ConversationItem";
import { ConversationList, defaultConversationFilters, type ConversationFilters } from "./ConversationList";
import { ChatActions, ChatColumn, ListColumn, Placeholder, Root } from "./styles";

const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Caixa de entrada: todas as conversas dos leads (futuro WhatsApp) em um só
 * lugar, com caixas por funil/responsável, status do atendimento e a
 * atividade de cada lead acima das mensagens.
 */
export function Inbox({ selectedId }: { selectedId?: string }) {
  const theme = useTheme();
  const { leads, details, messages, unread, statuses, markRead, sendMessage, setConversationStatus, updateDetails } =
    useLeads();
  const composerRef = useRef<ComposerHandle>(null);
  const router = useRouter();
  const backToList = useCallback(() => {
    startNavigationProgress();
    router.push("/conversas");
  }, [router]);
  const { funnels, findFunnel } = useFunnels();
  const { currentUser: teamMember } = useWorkspace();

  const [filters, setFilters] = useState<ConversationFilters>(defaultConversationFilters);
  const changeFilters = useCallback(
    (patch: Partial<ConversationFilters>) => setFilters((current) => ({ ...current, ...patch })),
    [],
  );
  const [query, setQuery] = useState("");

  // Toda conversa com mensagens (e a aberta, mesmo sem mensagens ainda).
  const conversations = useMemo<Conversation[]>(
    () =>
      leads
        .filter((lead) => (messages[lead.id]?.length ?? 0) > 0 || lead.id === selectedId)
        .map((lead) => {
          const list = messages[lead.id] ?? [];
          const last = list[list.length - 1];
          return {
            lead,
            last,
            unread: unread[lead.id] ?? 0,
            status: statuses[lead.id] ?? "open",
            at: last?.at ?? lead.createdAt,
          };
        }),
    [leads, messages, unread, statuses, selectedId],
  );

  // "Só as minhas" e "só não lidas" valem para tudo (inclusive as contagens)
  const inSituation = (conversation: Conversation) =>
    (!filters.mine || details[conversation.lead.id]?.owner.seed === teamMember.seed) &&
    (!filters.unread || conversation.unread > 0);
  const situated = conversations.filter(inSituation);
  const funnelCounts: Record<string, number> = {
    all: situated.length,
    ...Object.fromEntries(
      funnels.map((funnel) => [funnel.id, situated.filter((item) => item.lead.funnelId === funnel.id).length]),
    ),
  };

  const inBox = situated.filter((item) => filters.funnel === "all" || item.lead.funnelId === filters.funnel);
  const statusCounts = {
    all: inBox.length,
    ...Object.fromEntries(
      conversationStatuses.map((option) => [option.value, inBox.filter((item) => item.status === option.value).length]),
    ),
  };

  const search = normalize(query.trim());
  const digits = query.replace(/\D/g, "");
  const visible = inBox
    .filter((item) => filters.status === "all" || item.status === filters.status)
    .filter(
      (item) =>
        !search ||
        normalize(`${item.lead.name} ${item.last?.text ?? ""}`).includes(search) ||
        (digits.length >= 3 && item.lead.phone.includes(digits)),
    )
    .sort((a, b) => {
      if (filters.sort === "unread" && a.unread > 0 !== b.unread > 0) return a.unread > 0 ? -1 : 1;
      return filters.sort === "oldest" ? a.at.localeCompare(b.at) : b.at.localeCompare(a.at);
    });

  const listLabel = filters.funnel === "all" ? "Todas as conversas" : `Conversas de ${findFunnel(filters.funnel).name}`;

  const lead = leads.find((item) => item.id === selectedId);
  const leadDetails = lead ? details[lead.id] : undefined;
  const selectedMessages = lead ? messages[lead.id] : undefined;

  // Abrir a conversa (ou chegar mensagem com ela aberta) marca como lida.
  useEffect(() => {
    if (selectedId) markRead(selectedId);
  }, [selectedId, selectedMessages?.length, markRead]);

  return (
    <Root data-flush data-open={lead ? "" : undefined} data-chat-open={lead ? "" : undefined}>
      <ListColumn aria-label="Conversas" data-pane="list">
        <ConversationList
          conversations={visible}
          selectedId={selectedId}
          label={listLabel}
          filters={filters}
          onFiltersChange={changeFilters}
          funnelCounts={funnelCounts}
          statusCounts={statusCounts}
          query={query}
          onQueryChange={setQuery}
        />
      </ListColumn>

      <ChatColumn aria-label={lead ? `Conversa com ${lead.name}` : "Conversa"} data-pane="chat">
        {lead && leadDetails ? (
          <LeadChat
            key={lead.id}
            lead={lead}
            messages={selectedMessages ?? []}
            composerRef={composerRef}
            onSend={(payload) =>
              sendMessage(lead.id, {
                kind: "note",
                text: payload.text,
                attachments: composerAttachments(payload),
                author: teamMember,
              })
            }
            prelude={<Activity lead={lead} history={leadDetails.history} />}
            dock
            onDockClose={backToList}
            dockCloseLabel="Voltar às conversas"
            back={
              <NarrowOnly>
                <IconButton
                  href="/conversas"
                  icon={CaretLeftIcon}
                  label="Voltar às conversas"
                  variant="ghost"
                  tooltip={false}
                />
              </NarrowOnly>
            }
            menuItems={
              <MenuItem icon={ArrowSquareOutIcon} href={`/leads/${lead.id}`}>
                Abrir oportunidade
              </MenuItem>
            }
            actions={
              <ChatActions>
                <WideOnly>
                  <OwnerSelect
                    value={leadDetails.owner}
                    align="end"
                    onChange={(owner) => updateDetails(lead.id, { owner }, teamMember.name)}
                    trigger={({ open: _open, ...props }) => (
                      <FieldTrigger
                        type="button"
                        {...props}
                        $variant="pill"
                        aria-label={`Responsável: ${leadDetails.owner.name}. Trocar`}
                      >
                        <Avatar
                          name={leadDetails.owner.name}
                          seed={leadDetails.owner.seed}
                          src={leadDetails.owner.avatarUrl}
                          size="xs"
                          shape="circle"
                        />
                        {leadDetails.owner.name.split(" ")[0]}
                      </FieldTrigger>
                    )}
                  />
                </WideOnly>

                <Select
                  label="Status da conversa"
                  heading="Andamento da conversa"
                  align="end"
                  width="16rem"
                  value={statuses[lead.id] ?? "open"}
                  onChange={(value) => setConversationStatus(lead.id, value, teamMember.name)}
                  options={conversationStatuses.map((option) => ({
                    value: option.value,
                    label: option.label,
                    description: option.description,
                    leading: <option.icon size={18} weight="bold" color={theme.tones[option.tone].fg} />,
                  }))}
                  trigger={({ open: _open, ...props }) => {
                    const current = findStatus(statuses[lead.id] ?? "open");
                    return (
                      <FieldTrigger
                        type="button"
                        {...props}
                        $variant="badge"
                        $tone={current.tone}
                        aria-label={`Status: ${current.label}. Trocar`}
                      >
                        <current.icon weight="bold" aria-hidden />
                        {current.label}
                      </FieldTrigger>
                    );
                  }}
                />

                <WideOnly>
                  <IconButton
                    href={`/leads/${lead.id}`}
                    icon={ArrowSquareOutIcon}
                    label="Abrir oportunidade"
                    tooltip="bottom"
                  />
                </WideOnly>
              </ChatActions>
            }
          />
        ) : (
          <Placeholder>
            <EmptyState
              icon={<ChatsCircleIcon size={24} />}
              title="Selecione uma conversa"
              description="Escolha alguém na lista para ver as mensagens, a atividade e responder."
            />
          </Placeholder>
        )}
      </ChatColumn>
    </Root>
  );
}
