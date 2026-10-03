"use client";

import { useMemo, useState, type MouseEvent, type ReactNode, type UIEvent } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@emotion/react";
import {
  ArrowDownIcon,
  ArrowsDownUpIcon,
  ArrowUpIcon,
  CalendarBlankIcon,
  CalendarDotsIcon,
  CardsIcon,
  CaretUpDownIcon,
  ChatCircleDotsIcon,
  ChatCircleIcon,
  CircleDashedIcon,
  ClockCounterClockwiseIcon,
  ClockIcon,
  DownloadSimpleIcon,
  PhoneIcon,
  TableIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { HeaderActions, MobileHeaderSlot } from "@/components/layout/Header/HeaderActions";
import { startNavigationProgress } from "@/components/layout/NavigationProgress";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { FieldTrigger } from "@/components/ui/Editable";
import { FilterBar, FilterBarButton, type FilterSection } from "@/components/ui/FilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconTile } from "@/components/ui/IconTile";
import { Select } from "@/components/ui/Select";
import { Tag, toneFor } from "@/components/ui/Tag";
import { useViewMode, ViewSwitch } from "@/components/ui/ViewSwitch";
import { useIsMobile } from "@/lib/useMediaQuery";
import { WideOnly } from "@/styles/responsive";
import { downloadCsv } from "@/lib/csv";
import { formatDate, formatDateTime, formatRelativeTime, parseDateOnly } from "@/lib/format";
import { formatBudget, formatPhone } from "@/features/leads/format";
import type { Funnel, FunnelStage } from "@/features/leads/funnels";
import { useFunnels, useTeam, useWorkspace } from "@/features/settings/store";
import { LeadModal } from "../LeadModal";
import { eventTypes, findChoice, leadSources } from "@/features/leads/options";
import { useLeads } from "@/features/leads/store";
import type { Lead, LeadDetails } from "@/features/leads/types";
import {
  Budget,
  CardFoot,
  CardGrid,
  CardHead,
  CardLine,
  CardName,
  ClientCardRoot,
  EmptyRow,
  Footer,
  HeadCount,
  Inline,
  Muted,
  NameLink,
  Pill,
  Root,
  SelectionInfo,
  SortButton,
  Table,
  TableScroll,
  Tags,
  Td,
  Th,
  Toolbar,
  Tr,
} from "./styles";

/** Quantas etiquetas aparecem antes do "+N". */
const MAX_TAGS = 2;

type Row = {
  lead: Lead;
  details: LeadDetails;
  funnel: Funnel;
  stage?: FunnelStage;
  stageIndex: number;
};

type SortKey = "name" | "event" | "stage" | "budget" | "contact" | "created" | "source" | "owner";
type SortState = { key: SortKey; direction: "asc" | "desc" };

const collator = new Intl.Collator("pt-BR");

/** Valor usado para ordenar cada coluna. */
const sortValue = (funnels: readonly Funnel[]): Record<SortKey, (row: Row) => string | number> => ({
  name: (row) => row.lead.name,
  event: (row) => row.details.eventDate ?? "9999",
  stage: (row) => funnels.findIndex((funnel) => funnel.id === row.funnel.id) * 100 + row.stageIndex,
  budget: (row) => row.lead.budget,
  contact: (row) => row.details.lastContactAt ?? "",
  created: (row) => row.lead.createdAt,
  source: (row) => row.details.source,
  owner: (row) => row.details.owner.name,
});

const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const DAY = 24 * 60 * 60 * 1000;

type CreatedFilter = "any" | "7" | "30" | "90";
type EventFilter = "any" | "30" | "90" | "none";

const sortLabels: Record<SortKey, string> = {
  name: "Nome",
  event: "Data do evento",
  stage: "Etapa",
  budget: "Orçamento",
  contact: "Último contato",
  created: "Criado",
  source: "Origem",
  owner: "Responsável",
};

/** Como cada direção se lê em cada coluna: [decrescente, crescente]. */
const sortDirections: Record<SortKey, [string, string]> = {
  name: ["Z a A", "A a Z"],
  source: ["Z a A", "A a Z"],
  owner: ["Z a A", "A a Z"],
  budget: ["maior primeiro", "menor primeiro"],
  stage: ["mais avançado", "mais no início"],
  event: ["mais distante", "mais próximo"],
  contact: ["mais recente", "mais antigo"],
  created: ["mais recente", "mais antigo"],
};

type View = "table" | "cards";
const VIEWS: readonly View[] = ["table", "cards"];

/** Etapa do lead como selo que abre a troca de etapa (sem sair da lista). */
function StageSelect({ row, onMove }: { row: Row; onMove: (stage: string) => void }) {
  const theme = useTheme();
  const { funnel, stage, stageIndex } = row;
  return (
    <Select
      label={`Etapa de ${row.lead.name}`}
      heading="Mover para"
      align="start"
      width="15rem"
      value={row.lead.stage}
      onChange={(id) => id !== row.lead.stage && onMove(id)}
      options={funnel.stages.map((item, position) => ({
        value: item.id,
        label: item.label,
        meta: `${position + 1}/${funnel.stages.length}`,
        leading: <CircleDashedIcon size={18} weight="bold" color={theme.tones[item.tone].fg} />,
      }))}
      trigger={({ open: _open, ...props }) => (
        <FieldTrigger
          type="button"
          {...props}
          $variant="badge"
          $tone={stage?.tone ?? "neutral"}
          aria-label={`Etapa: ${stage?.label}, ${stageIndex + 1} de ${funnel.stages.length}. Mover`}
        >
          <CircleDashedIcon weight="bold" aria-hidden />
          {stage?.label}
        </FieldTrigger>
      )}
    />
  );
}

type ClientsTableProps = {
  /** Só os leads deste funil (tabela dentro de Leads). */
  funnelId?: string;
  /** Dentro de outra tela: sem ações próprias no header e sempre em tabela. */
  embedded?: boolean;
  /** Controles da tela que embute a tabela, no fim da barra (ex.: visão e "novo" em Leads). */
  toolbarEnd?: ReactNode;
};

/** Todos os leads do sistema em tabela ou cards: ordenação, filtros, seleção e exportação. */
export function ClientsTable({ funnelId, embedded = false, toolbarEnd }: ClientsTableProps = {}) {
  const theme = useTheme();
  const router = useRouter();
  const { leads, details, unread, moveLead } = useLeads();
  const { funnels, findFunnel } = useFunnels();
  const { currentUser } = useWorkspace();
  const team = useTeam();
  const [savedView, setView] = useViewMode<View>("clientes", "table", VIEWS, "cards");
  // No celular a tabela larga não cabe: sempre em cartões (como no web-specular)
  const mobile = useIsMobile();
  const view: View = embedded && !mobile ? "table" : savedView;

  const [query, setQuery] = useState("");
  const [funnelFilter, setFunnelFilter] = useState<string[]>([]);
  /** Etapas como "funil:etapa" (só quando há um funil em foco). */
  const [stageFilter, setStageFilter] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [ownerFilter, setOwnerFilter] = useState<string[]>([]);
  const [createdFilter, setCreatedFilter] = useState<CreatedFilter>("any");
  const [eventFilter, setEventFilter] = useState<EventFilter>("any");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [staleOnly, setStaleOnly] = useState(false);
  const [sort, setSort] = useState<SortState>({ key: "created", direction: "desc" });
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [scrolled, setScrolled] = useState(false);
  /** Lead aberto no modal (Clientes); dentro de Leads, a linha abre a oportunidade. */
  const [openId, setOpenId] = useState<string | null>(null);

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const next = event.currentTarget.scrollLeft > 0;
    if (next !== scrolled) setScrolled(next);
  };

  const rows = useMemo<Row[]>(
    () =>
      leads
        .filter((lead) => details[lead.id] && (!funnelId || lead.funnelId === findFunnel(funnelId).id))
        .map((lead) => {
          const funnel = findFunnel(lead.funnelId);
          const stageIndex = funnel.stages.findIndex((stage) => stage.id === lead.stage);
          return { lead, details: details[lead.id], funnel, stage: funnel.stages[stageIndex], stageIndex };
        }),
    [leads, details, findFunnel, funnelId],
  );

  const search = normalize(query.trim());
  const digits = query.replace(/\D/g, "");
  const now = Date.now();
  const createdWithin = (row: Row) =>
    createdFilter === "any" || now - new Date(row.lead.createdAt).getTime() <= Number(createdFilter) * DAY;
  const eventWithin = (row: Row) => {
    if (eventFilter === "any") return true;
    if (eventFilter === "none") return !row.details.eventDate;
    if (!row.details.eventDate) return false;
    const until = parseDateOnly(row.details.eventDate).getTime() - now;
    return until >= -DAY && until <= Number(eventFilter) * DAY;
  };
  const stale = (row: Row) =>
    !row.details.lastContactAt || now - new Date(row.details.lastContactAt).getTime() >= 7 * DAY;

  const visible = rows
    .filter((row) => funnelFilter.length === 0 || funnelFilter.includes(row.funnel.id))
    .filter((row) => stageFilter.length === 0 || stageFilter.includes(`${row.funnel.id}:${row.lead.stage}`))
    .filter((row) => sourceFilter.length === 0 || sourceFilter.includes(row.details.source))
    .filter((row) => ownerFilter.length === 0 || ownerFilter.includes(row.details.owner.seed))
    .filter(createdWithin)
    .filter(eventWithin)
    .filter((row) => !unreadOnly || (unread[row.lead.id] ?? 0) > 0)
    .filter((row) => !staleOnly || stale(row))
    .filter(
      (row) =>
        !search ||
        normalize(`${row.lead.name} ${row.details.email ?? ""} ${row.lead.tags.join(" ")}`).includes(search) ||
        (digits.length >= 3 && row.lead.phone.includes(digits)),
    )
    .sort((a, b) => {
      const x = sortValue(funnels)[sort.key](a);
      const y = sortValue(funnels)[sort.key](b);
      const order = typeof x === "number" && typeof y === "number" ? x - y : collator.compare(String(x), String(y));
      return sort.direction === "asc" ? order : -order;
    });

  const filtered =
    query !== "" ||
    funnelFilter.length > 0 ||
    stageFilter.length > 0 ||
    sourceFilter.length > 0 ||
    ownerFilter.length > 0 ||
    createdFilter !== "any" ||
    eventFilter !== "any" ||
    unreadOnly ||
    staleOnly;

  const clearFilters = () => {
    setQuery("");
    setFunnelFilter([]);
    setStageFilter([]);
    setSourceFilter([]);
    setOwnerFilter([]);
    setCreatedFilter("any");
    setEventFilter("any");
    setUnreadOnly(false);
    setStaleOnly(false);
  };

  /** Funil cujas etapas aparecem no filtro: o da página ou o único escolhido. */
  const stageFunnel = funnelId
    ? findFunnel(funnelId)
    : funnelFilter.length === 1
      ? findFunnel(funnelFilter[0])
      : undefined;
  const countBy = (match: (row: Row) => boolean) => rows.filter(match).length;

  const filterSections: FilterSection[] = [
    ...(!funnelId
      ? [
          {
            kind: "multi" as const,
            id: "funnel",
            label: "Funil",
            value: funnelFilter,
            onChange: (next: string[]) => {
              setFunnelFilter(next);
              // Etapas só valem com um funil em foco
              setStageFilter((current) =>
                next.length === 1 ? current.filter((value) => value.startsWith(`${next[0]}:`)) : [],
              );
            },
            options: funnels.map((funnel) => ({
              value: funnel.id,
              label: funnel.name,
              leading: <IconTile icon={funnel.icon} tone={funnel.tone} size="sm" />,
              count: countBy((row) => row.funnel.id === funnel.id),
            })),
          },
        ]
      : []),
    ...(stageFunnel
      ? [
          {
            kind: "multi" as const,
            id: "stage",
            label: funnelId ? "Etapa" : `Etapa em ${stageFunnel.name}`,
            value: stageFilter,
            onChange: setStageFilter,
            options: stageFunnel.stages.map((stage) => ({
              value: `${stageFunnel.id}:${stage.id}`,
              label: stage.label,
              leading: <CircleDashedIcon size={16} weight="bold" color={theme.tones[stage.tone].fg} />,
              count: countBy((row) => row.funnel.id === stageFunnel.id && row.lead.stage === stage.id),
            })),
          },
        ]
      : []),
    {
      kind: "multi",
      id: "source",
      label: "Origem",
      value: sourceFilter,
      onChange: setSourceFilter,
      options: leadSources.map((option) => ({
        value: option.value,
        label: option.value,
        leading: <option.icon size={16} color={theme.tones[option.tone].fg} />,
        count: countBy((row) => row.details.source === option.value),
      })),
    },
    {
      kind: "multi",
      id: "owner",
      label: "Responsável",
      value: ownerFilter,
      onChange: setOwnerFilter,
      options: team.map((member) => ({
        value: member.seed,
        label: member.name,
        keywords: member.email,
        leading: <Avatar name={member.name} seed={member.seed} src={member.avatarUrl} size="xs" shape="circle" />,
        count: countBy((row) => row.details.owner.seed === member.seed),
      })),
    },
    {
      kind: "single",
      id: "event",
      label: "Data do evento",
      value: eventFilter,
      defaultValue: "any",
      onChange: (value) => setEventFilter(value as EventFilter),
      options: [
        { value: "30", label: "Nos próximos 30 dias", leading: <CalendarDotsIcon size={16} /> },
        { value: "90", label: "Nos próximos 90 dias", leading: <CalendarDotsIcon size={16} /> },
        { value: "none", label: "Sem data definida", leading: <CalendarBlankIcon size={16} /> },
        { value: "any", label: "Qualquer data", leading: <CalendarBlankIcon size={16} /> },
      ],
    },
    {
      kind: "single",
      id: "created",
      label: "Criado",
      value: createdFilter,
      defaultValue: "any",
      onChange: (value) => setCreatedFilter(value as CreatedFilter),
      options: [
        { value: "7", label: "Nos últimos 7 dias", leading: <CalendarBlankIcon size={16} /> },
        { value: "30", label: "Nos últimos 30 dias", leading: <CalendarBlankIcon size={16} /> },
        { value: "90", label: "Nos últimos 90 dias", leading: <CalendarBlankIcon size={16} /> },
        { value: "any", label: "Qualquer período", leading: <CalendarBlankIcon size={16} /> },
      ],
    },
    {
      kind: "toggles",
      id: "situation",
      label: "Situação",
      items: [
        {
          id: "unread",
          label: "Com mensagens não lidas",
          leading: <ChatCircleDotsIcon size={16} />,
          checked: unreadOnly,
          onChange: setUnreadOnly,
        },
        {
          id: "stale",
          label: "Sem contato há 7 dias",
          leading: <ClockCounterClockwiseIcon size={16} />,
          checked: staleOnly,
          onChange: setStaleOnly,
        },
      ],
    },
  ];
  const selectedVisible = visible.filter((row) => selected.has(row.lead.id));
  const allSelected = visible.length > 0 && selectedVisible.length === visible.length;

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((current) => {
      const next = new Set(current);
      for (const row of visible) {
        if (allSelected) next.delete(row.lead.id);
        else next.add(row.lead.id);
      }
      return next;
    });

  const onSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "name" || key === "source" || key === "owner" ? "asc" : "desc" },
    );

  /** Exporta os selecionados (ou tudo o que está na tela). */
  const exportCsv = () => {
    const list = selectedVisible.length > 0 ? selectedVisible : visible;
    downloadCsv(`clientes-${new Date().toISOString().slice(0, 10)}.csv`, [
      [
        "Nome",
        "Telefone",
        "E-mail",
        "Evento",
        "Data do evento",
        "Funil",
        "Etapa",
        "Orçamento",
        "Origem",
        "Responsável",
        "Etiquetas",
        "Último contato",
        "Criado em",
      ],
      ...list.map(({ lead, details: info, funnel, stage }) => [
        lead.name,
        formatPhone(lead.phone),
        info.email,
        info.eventType,
        info.eventDate && parseDateOnly(info.eventDate).toLocaleDateString("pt-BR"),
        funnel.name,
        stage?.label,
        String(lead.budget).replace(".", ","),
        info.source,
        info.owner.name,
        lead.tags.join(", "),
        info.lastContactAt && formatDateTime(info.lastContactAt),
        formatDateTime(lead.createdAt),
      ]),
    ]);
  };

  const openLead = (event: MouseEvent<HTMLElement>, id: string) => {
    // Clique na linha/card (menos em links, botões e seleção): em Clientes abre
    // a ficha em janela; dentro de Leads, a oportunidade.
    if ((event.target as HTMLElement).closest("a, button, input, label")) return;
    if (!embedded) {
      setOpenId(id);
      return;
    }
    startNavigationProgress();
    router.push(`/leads/${id}`);
  };

  /** O nome também abre a janela em Clientes (Ctrl/clique do meio ainda abre em outra aba). */
  const onNameClick = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (embedded || event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    setOpenId(id);
  };

  const move = (row: Row, stage: string) => moveLead(row.lead.id, stage, currentUser.name);

  const header = (key: SortKey, label: string, align?: "right") => {
    const active = sort.key === key;
    return (
      <Th
        $align={align}
        aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
        $sticky={key === "name" ? "name" : undefined}
        data-edge={key === "name" ? "" : undefined}
      >
        <SortButton type="button" $active={active} onClick={() => onSort(key)}>
          {label}
          {key === "name" && <HeadCount>({visible.length})</HeadCount>}
          {active ? (
            sort.direction === "asc" ? (
              <ArrowUpIcon size={12} weight="bold" aria-hidden />
            ) : (
              <ArrowDownIcon size={12} weight="bold" aria-hidden />
            )
          ) : (
            <CaretUpDownIcon size={12} weight="bold" aria-hidden />
          )}
        </SortButton>
      </Th>
    );
  };

  return (
    <Root data-flush>
      {!embedded && (
        <HeaderActions>
          <WideOnly>
            <ViewSwitch
              label="Visualização dos clientes"
              value={view}
              onChange={setView}
              options={[
                { value: "table", label: "Tabela", icon: TableIcon },
                { value: "cards", label: "Cards", icon: CardsIcon },
              ]}
            />
          </WideOnly>
          <Button variant="secondary" icon={DownloadSimpleIcon} onClick={exportCsv}>
            {selectedVisible.length > 0 ? `Exportar ${selectedVisible.length}` : "Exportar"}
          </Button>
        </HeaderActions>
      )}

      <Toolbar>
        <FilterBar
          search={{
            label: "Buscar clientes",
            placeholder: "Buscar por nome, telefone, e-mail ou etiqueta",
            shortPlaceholder: "Buscar clientes",
            value: query,
            onChange: setQuery,
          }}
          sections={filterSections}
          trailing={
            <>
              {toolbarEnd}
              {!embedded && <MobileHeaderSlot />}
              {view === "cards" && (
                <Select
                  label="Ordenar por"
                  heading="Ordenar por"
                  align="end"
                  width="16rem"
                  value={`${sort.key}:${sort.direction}`}
                  onChange={(value) => {
                    const [key, direction] = value.split(":") as [SortKey, "asc" | "desc"];
                    setSort({ key, direction });
                  }}
                  options={(Object.keys(sortLabels) as SortKey[]).flatMap((key) => [
                    { value: `${key}:desc`, label: sortLabels[key], meta: sortDirections[key][0] },
                    { value: `${key}:asc`, label: sortLabels[key], meta: sortDirections[key][1] },
                  ])}
                  trigger={({ open: _open, ...props }) => (
                    <FilterBarButton
                      type="button"
                      {...props}
                      aria-label={`Ordenar: ${sortLabels[sort.key]}, ${sortDirections[sort.key][sort.direction === "desc" ? 0 : 1]}`}
                    >
                      <ArrowsDownUpIcon size={17} aria-hidden />
                      {sortLabels[sort.key]}
                    </FilterBarButton>
                  )}
                />
              )}
              {selectedVisible.length > 0 && (
                <>
                  <SelectionInfo>
                    {selectedVisible.length} {selectedVisible.length === 1 ? "selecionado" : "selecionados"}
                  </SelectionInfo>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                    Limpar seleção
                  </Button>
                </>
              )}
            </>
          }
        />
      </Toolbar>

      <TableScroll data-scrolled={scrolled ? "" : undefined} onScroll={onScroll}>
        {view === "cards" ? (
          visible.length === 0 ? (
            <EmptyState
              icon={<UsersThreeIcon size={24} />}
              title="Nenhum cliente encontrado"
              description="Ajuste a busca ou os filtros para ver mais clientes."
            >
              {filtered && (
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Limpar busca e filtros
                </Button>
              )}
            </EmptyState>
          ) : (
            <CardGrid>
              {visible.map((row) => {
                const { lead, details: info, funnel } = row;
                const isSelected = selected.has(lead.id);
                const event = findChoice(eventTypes, info.eventType);
                const source = findChoice(leadSources, info.source);
                const extraTags = lead.tags.length - MAX_TAGS;
                return (
                  <ClientCardRoot
                    key={lead.id}
                    $selected={isSelected}
                    aria-label={lead.name}
                    onClick={(clickEvent) => openLead(clickEvent, lead.id)}
                  >
                    <CardHead>
                      <Avatar name={lead.name} src={lead.photoUrl} seed={lead.id} size="md" shape="circle" />
                      <CardName>
                        <NameLink href={`/leads/${lead.id}`} onClick={(clickEvent) => onNameClick(clickEvent, lead.id)}>
                          {lead.name}
                        </NameLink>
                        <Muted>
                          <Inline>
                            <PhoneIcon size={13} aria-hidden />
                            {formatPhone(lead.phone)}
                          </Inline>
                        </Muted>
                      </CardName>
                      <Checkbox
                        label={`Selecionar ${lead.name}`}
                        checked={isSelected}
                        onChange={() => toggle(lead.id)}
                      />
                    </CardHead>

                    <CardLine>
                      <IconTile icon={funnel.icon} tone={funnel.tone} size="sm" />
                      <StageSelect row={row} onMove={(stage) => move(row, stage)} />
                    </CardLine>

                    <CardLine>
                      {event ? (
                        <Inline>
                          <event.icon size={15} color={theme.tones[event.tone].fg} aria-hidden />
                          {event.value}
                          {info.eventDate && <Muted>{formatDate(parseDateOnly(info.eventDate).toISOString())}</Muted>}
                        </Inline>
                      ) : (
                        <Muted>Evento não informado</Muted>
                      )}
                    </CardLine>

                    {lead.tags.length > 0 && (
                      <Tags>
                        {lead.tags.slice(0, MAX_TAGS).map((tag) => (
                          <Tag key={tag} tone={toneFor(tag)}>
                            {tag}
                          </Tag>
                        ))}
                        {extraTags > 0 && (
                          <Tag variant="outline" title={lead.tags.slice(MAX_TAGS).join(", ")}>
                            +{extraTags}
                          </Tag>
                        )}
                      </Tags>
                    )}

                    <CardFoot>
                      <Budget>{formatBudget(lead.budget)}</Budget>
                      <Inline>
                        {source && (
                          <Pill $tone={source.tone} title={`Origem: ${source.value}`}>
                            <source.icon size={13} weight="bold" aria-hidden />
                            {source.value}
                          </Pill>
                        )}
                        <span title={`Responsável: ${info.owner.name}`}>
                          <Avatar
                            name={info.owner.name}
                            seed={info.owner.seed}
                            src={info.owner.avatarUrl}
                            size="xs"
                            shape="circle"
                          />
                        </span>
                      </Inline>
                    </CardFoot>
                  </ClientCardRoot>
                );
              })}
            </CardGrid>
          )
        ) : (
          <Table>
            <thead>
              <tr>
                <Th $sticky="check">
                  <Checkbox
                    label="Selecionar todos"
                    checked={allSelected}
                    indeterminate={selectedVisible.length > 0 && !allSelected}
                    onChange={toggleAll}
                  />
                </Th>
                {header("name", "Cliente")}
                <Th>Telefone</Th>
                {header("event", "Evento")}
                {header("stage", "Funil e etapa")}
                {header("budget", "Orçamento", "right")}
                {header("owner", "Responsável")}
                {header("source", "Origem")}
                <Th>Etiquetas</Th>
                {header("contact", "Último contato")}
                {header("created", "Criado")}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <EmptyRow colSpan={11}>
                    <EmptyState
                      icon={<UsersThreeIcon size={24} />}
                      title="Nenhum cliente encontrado"
                      description="Ajuste a busca ou os filtros para ver mais clientes."
                    >
                      {filtered && (
                        <Button variant="secondary" size="sm" onClick={clearFilters}>
                          Limpar busca e filtros
                        </Button>
                      )}
                    </EmptyState>
                  </EmptyRow>
                </tr>
              )}

              {visible.map((row) => {
                const { lead, details: info, funnel } = row;
                const isSelected = selected.has(lead.id);
                const event = findChoice(eventTypes, info.eventType);
                const source = findChoice(leadSources, info.source);
                const extraTags = lead.tags.length - MAX_TAGS;

                return (
                  <Tr
                    key={lead.id}
                    $selected={isSelected}
                    aria-selected={isSelected}
                    onClick={(clickEvent) => openLead(clickEvent, lead.id)}
                  >
                    <Td $sticky="check">
                      <Checkbox
                        label={`Selecionar ${lead.name}`}
                        checked={isSelected}
                        onChange={() => toggle(lead.id)}
                      />
                    </Td>
                    <Td $sticky="name" data-edge="">
                      <Inline>
                        <Avatar name={lead.name} src={lead.photoUrl} seed={lead.id} size="xs" shape="circle" />
                        <NameLink href={`/leads/${lead.id}`} onClick={(clickEvent) => onNameClick(clickEvent, lead.id)}>
                          {lead.name}
                        </NameLink>
                      </Inline>
                    </Td>
                    <Td $muted>
                      <Inline>
                        <PhoneIcon size={14} aria-hidden />
                        {formatPhone(lead.phone)}
                      </Inline>
                    </Td>
                    <Td>
                      {event ? (
                        <Inline>
                          <event.icon size={15} color={theme.tones[event.tone].fg} aria-hidden />
                          {event.value}
                          {info.eventDate && <Muted>{formatDate(parseDateOnly(info.eventDate).toISOString())}</Muted>}
                        </Inline>
                      ) : (
                        <Muted>Não informado</Muted>
                      )}
                    </Td>
                    <Td>
                      <Inline>
                        <IconTile icon={funnel.icon} tone={funnel.tone} size="sm" />
                        <StageSelect row={row} onMove={(stage) => move(row, stage)} />
                      </Inline>
                    </Td>
                    <Td $align="right">
                      <Budget>{formatBudget(lead.budget)}</Budget>
                    </Td>
                    <Td $muted>
                      <Inline>
                        <Avatar
                          name={info.owner.name}
                          seed={info.owner.seed}
                          src={info.owner.avatarUrl}
                          size="xs"
                          shape="circle"
                        />
                        {info.owner.name.split(" ")[0]}
                      </Inline>
                    </Td>
                    <Td>
                      {source && (
                        <Pill $tone={source.tone}>
                          <source.icon size={13} weight="bold" aria-hidden />
                          {source.value}
                        </Pill>
                      )}
                    </Td>
                    <Td>
                      <Tags>
                        {lead.tags.slice(0, MAX_TAGS).map((tag) => (
                          <Tag key={tag} tone={toneFor(tag)}>
                            {tag}
                          </Tag>
                        ))}
                        {extraTags > 0 && (
                          <Tag variant="outline" title={lead.tags.slice(MAX_TAGS).join(", ")}>
                            +{extraTags}
                          </Tag>
                        )}
                      </Tags>
                    </Td>
                    <Td $muted>
                      {info.lastContactAt ? (
                        <Inline>
                          <ChatCircleIcon size={14} aria-hidden />
                          {formatDateTime(info.lastContactAt)}
                        </Inline>
                      ) : (
                        <Muted>Sem contato</Muted>
                      )}
                    </Td>
                    <Td $muted>
                      <Inline title={formatDateTime(lead.createdAt)}>
                        <ClockIcon size={14} aria-hidden />
                        {formatRelativeTime(lead.createdAt)}
                      </Inline>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </TableScroll>

      <Footer>
        <span>
          Mostrando {visible.length} de {rows.length}{" "}
          {funnelId ? (rows.length === 1 ? "lead" : "leads") : rows.length === 1 ? "cliente" : "clientes"}
        </span>
        <span>
          {embedded
            ? "Clique na linha para abrir a oportunidade"
            : view === "cards"
              ? "Clique no card para ver a ficha"
              : "Clique na linha para ver a ficha"}
        </span>
      </Footer>

      {/* Sem key: a mesma janela fecha com a saída animada (a ficha se reinicia ao trocar de lead) */}
      {!embedded && <LeadModal leadId={openId} onClose={() => setOpenId(null)} />}
    </Root>
  );
}
