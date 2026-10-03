"use client";

import { CaretDownIcon, ChatCircleDotsIcon, TrayIcon, UserCircleIcon } from "@phosphor-icons/react";
import { FilterBarButton, type FilterSection } from "@/components/ui/FilterBar";
import { IconTile } from "@/components/ui/IconTile";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/Menu";
import { Tooltip } from "@/components/ui/Tooltip";
import { useFunnels } from "@/features/settings/store";
import type { ConversationStatus } from "@/features/leads/types";
import { conversationStatuses, StatusIcon } from "../../status";
import { ConversationItem, type Conversation } from "./ConversationItem";
import { List, ListEmpty, ListFilters, ListHeader } from "./styles";

/** Funil das conversas: todos ou um (id do funil). */
export type FunnelFilter = "all" | string;
export type StatusFilter = ConversationStatus | "all";
export type Sort = "recent" | "oldest" | "unread";

const sortLabels: Record<Sort, string> = {
  recent: "Mais recentes",
  oldest: "Mais antigas",
  unread: "Não lidas primeiro",
};

export type ConversationFilters = {
  funnel: FunnelFilter;
  status: StatusFilter;
  sort: Sort;
  /** Só as conversas de quem está usando. */
  mine: boolean;
  /** Só as que têm mensagem não lida. */
  unread: boolean;
};

export const defaultConversationFilters: ConversationFilters = {
  funnel: "all",
  status: "all",
  sort: "recent",
  mine: false,
  unread: false,
};

type ConversationListProps = {
  /** Conversas já filtradas e ordenadas. */
  conversations: readonly Conversation[];
  selectedId?: string;
  /** Nome do recorte atual (lista acessível e vazio). */
  label: string;
  filters: ConversationFilters;
  onFiltersChange: (patch: Partial<ConversationFilters>) => void;
  /** Quantas conversas há em cada funil (chave "all" = todas). */
  funnelCounts: Record<string, number>;
  /** Quantas conversas há em cada andamento, dentro do funil e das situações. */
  statusCounts: Record<string, number>;
  query: string;
  onQueryChange: (query: string) => void;
};

/**
 * Lista de conversas com a barra do padrão das páginas: busca, filtros (andamento,
 * ordem, "só as minhas" e "só não lidas") e o funil ao lado.
 */
export function ConversationList({
  conversations,
  selectedId,
  label,
  filters,
  onFiltersChange,
  funnelCounts,
  statusCounts,
  query,
  onQueryChange,
}: ConversationListProps) {
  const { funnels, findFunnel } = useFunnels();
  const funnel = filters.funnel === "all" ? null : findFunnel(filters.funnel);
  const filtered =
    filters.status !== "all" || filters.sort !== "recent" || filters.mine || filters.unread || filters.funnel !== "all";

  const sections: FilterSection[] = [
    {
      kind: "single",
      id: "status",
      label: "Andamento",
      value: filters.status,
      defaultValue: "all",
      onChange: (status) => onFiltersChange({ status: status as StatusFilter }),
      options: [
        { value: "all", label: "Todos", count: statusCounts.all ?? 0 },
        ...conversationStatuses.map((option) => ({
          value: option.value,
          label: option.label,
          leading: <StatusIcon status={option.value} size={16} />,
          count: statusCounts[option.value] ?? 0,
        })),
      ],
    },
    {
      kind: "toggles",
      id: "situation",
      label: "Situação",
      items: [
        {
          id: "mine",
          label: "Só as minhas",
          leading: <UserCircleIcon size={16} aria-hidden />,
          checked: filters.mine,
          onChange: (mine) => onFiltersChange({ mine }),
        },
        {
          id: "unread",
          label: "Só não lidas",
          leading: <ChatCircleDotsIcon size={16} aria-hidden />,
          checked: filters.unread,
          onChange: (unread) => onFiltersChange({ unread }),
        },
      ],
    },
    {
      kind: "single",
      id: "sort",
      label: "Ordem",
      value: filters.sort,
      defaultValue: "recent",
      onChange: (sort) => onFiltersChange({ sort: sort as Sort }),
      options: (Object.keys(sortLabels) as Sort[]).map((option) => ({ value: option, label: sortLabels[option] })),
    },
  ];

  const funnelLabel = funnel ? funnel.name : "Todos os funis";

  return (
    <>
      <ListHeader>
        <ListFilters
          search={{ value: query, onChange: onQueryChange, placeholder: "Buscar conversa", label: "Buscar conversa" }}
          sections={sections}
          trailing={
            <Menu
              label="Funil das conversas"
              align="end"
              width="16rem"
              trigger={({ ...props }) => (
                <Tooltip label={`Funil: ${funnelLabel}`} side="bottom" disabled={props["aria-expanded"]}>
                  <FilterBarButton
                    type="button"
                    {...props}
                    $active={Boolean(funnel)}
                    aria-label={`Funil: ${funnelLabel}. Trocar`}
                  >
                    {funnel ? (
                      <IconTile icon={funnel.icon} tone={funnel.tone} size="sm" />
                    ) : (
                      <IconTile icon={TrayIcon} tone="neutral" size="sm" />
                    )}
                    <CaretDownIcon size={11} weight="bold" aria-hidden />
                  </FilterBarButton>
                </Tooltip>
              )}
            >
              <MenuLabel>Funil</MenuLabel>
              <MenuItem
                leading={<IconTile icon={TrayIcon} tone="neutral" />}
                meta={String(funnelCounts.all ?? 0)}
                selected={!funnel}
                onSelect={() => onFiltersChange({ funnel: "all" })}
              >
                Todos os funis
              </MenuItem>
              <MenuSeparator />
              {funnels.map((item) => (
                <MenuItem
                  key={item.id}
                  leading={<IconTile icon={item.icon} tone={item.tone} />}
                  meta={String(funnelCounts[item.id] ?? 0)}
                  selected={funnel?.id === item.id}
                  onSelect={() => onFiltersChange({ funnel: item.id })}
                >
                  {item.name}
                </MenuItem>
              ))}
            </Menu>
          }
        />
      </ListHeader>

      <List aria-label={label}>
        {conversations.length === 0 ? (
          <ListEmpty>
            {query
              ? "Nenhuma conversa encontrada."
              : filtered
                ? "Nenhuma conversa com esses filtros."
                : "Nenhuma conversa ainda."}
          </ListEmpty>
        ) : (
          conversations.map((conversation) => (
            <ConversationItem
              key={conversation.lead.id}
              conversation={conversation}
              selected={conversation.lead.id === selectedId}
            />
          ))
        )}
      </List>
    </>
  );
}
