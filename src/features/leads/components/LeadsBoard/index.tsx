"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTheme } from "@emotion/react";
import styled from "@emotion/styled";
import {
  ArrowCounterClockwiseIcon,
  ChatCircleDotsIcon,
  ClockCounterClockwiseIcon,
  PlusIcon,
  UserFocusIcon,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar, type FilterSection } from "@/components/ui/FilterBar";
import { IconButton } from "@/components/ui/IconButton";
import { KanbanBoard, KanbanColumn } from "@/components/ui/Kanban";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import { useDockPagerRegistration, type DockPager } from "@/lib/dock";
import { useIsMobile } from "@/lib/useMediaQuery";
import { formatMoneyShort } from "@/features/dashboard/metrics";
import { leadSources } from "../../options";
import { sortLeads } from "../../format";
import { useFunnels, useTeam, useWorkspace } from "@/features/settings/store";
import { useLeads } from "../../store";
import { LeadCard } from "../LeadCard";

type LeadsBoardProps = {
  funnelId?: string;
  /** Controles da tela no fim da barra do topo (visão, "novo lead"). */
  toolbarEnd?: ReactNode;
};

const DAY = 86_400_000;

const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Barra do topo e, embaixo, o quadro ocupando o resto da altura. */
const Screen = styled.div`
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(4)};
  min-height: 0;

  ${({ theme }) => theme.media.md} {
    gap: ${({ theme }) => theme.spacing(3)};
  }
`;

const Empty = styled.div`
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
`;

/**
 * Funil de leads em kanban: uma coluna por etapa. No celular é uma etapa por
 * vez (a coluna para no centro), o dock mostra "‹ 2/5 ›" e o lead muda de etapa
 * pelo "Mover para" do card (arrastar fica só no computador).
 */
export function LeadsBoard({ funnelId, toolbarEnd }: LeadsBoardProps) {
  const theme = useTheme();
  const { findFunnel } = useFunnels();
  const { currentUser: teamMember } = useWorkspace();
  const team = useTeam();
  const funnel = findFunnel(funnelId);
  const { leads: allLeads, details, unread, moveLead: move } = useLeads();
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [owners, setOwners] = useState<string[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [staleOnly, setStaleOnly] = useState(false);

  /* Busca e filtros da barra do topo */
  const inFunnel = allLeads.filter((lead) => lead.funnelId === funnel.id);
  const search = normalize(query.trim());
  const digits = query.replace(/\D/g, "");
  const now = Date.now();
  const leads = inFunnel.filter((lead) => {
    const info = details[lead.id];
    if (sources.length && !sources.includes(info?.source ?? "")) return false;
    if (owners.length && !owners.includes(info?.owner.seed ?? "")) return false;
    if (unreadOnly && !(unread[lead.id] > 0)) return false;
    if (staleOnly) {
      const last = info?.lastContactAt ?? lead.createdAt;
      if (now - new Date(last).getTime() < 7 * DAY) return false;
    }
    if (!search) return true;
    return (
      normalize(`${lead.name} ${lead.tags.join(" ")} ${info?.email ?? ""} ${info?.city ?? ""}`).includes(search) ||
      (digits.length >= 3 && lead.phone.includes(digits))
    );
  });
  const filtering = Boolean(search) || sources.length > 0 || owners.length > 0 || unreadOnly || staleOnly;
  const clearAll = () => {
    setQuery("");
    setSources([]);
    setOwners([]);
    setUnreadOnly(false);
    setStaleOnly(false);
  };

  const countOf = (match: (lead: (typeof inFunnel)[number]) => boolean) => inFunnel.filter(match).length;
  const sections: FilterSection[] = [
    {
      kind: "multi",
      id: "source",
      label: "Origem",
      value: sources,
      onChange: setSources,
      options: leadSources.map((option) => ({
        value: option.value,
        label: option.value,
        leading: <option.icon size={16} color={theme.tones[option.tone].fg} />,
        count: countOf((lead) => details[lead.id]?.source === option.value),
      })),
    },
    {
      kind: "multi",
      id: "owner",
      label: "Responsável",
      value: owners,
      onChange: setOwners,
      options: team.map((member) => ({
        value: member.seed,
        label: member.name,
        keywords: member.email,
        leading: <Avatar name={member.name} seed={member.seed} src={member.avatarUrl} size="xs" shape="circle" />,
        count: countOf((lead) => details[lead.id]?.owner.seed === member.seed),
      })),
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
  const mobile = useIsMobile();
  const railRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [visible, setVisible] = useState(0);

  const columns = useMemo(
    () =>
      funnel.stages.map((stage) => {
        // Mais recentes primeiro (sem ordenação por etapa)
        const stageLeads = sortLeads(
          leads.filter((lead) => lead.stage === stage.id),
          "recent",
        );
        return {
          stage,
          leads: stageLeads,
          total: stageLeads.reduce((sum, lead) => sum + lead.budget, 0),
        };
      }),
    [funnel, leads],
  );

  /* Etapa à vista: a coluna mais perto do centro da faixa */
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || !mobile) return;
    const read = () => {
      const middle = rail.scrollLeft + rail.clientWidth / 2;
      const items = [...rail.querySelectorAll<HTMLElement>(":scope > section")];
      let nearest = 0;
      let distance = Infinity;
      items.forEach((item, index) => {
        const gap = Math.abs(item.offsetLeft + item.offsetWidth / 2 - middle);
        if (gap < distance) {
          distance = gap;
          nearest = index;
        }
      });
      setVisible((current) => (current === nearest ? current : nearest));
    };
    read();
    rail.addEventListener("scroll", read, { passive: true });
    return () => rail.removeEventListener("scroll", read);
  }, [mobile, funnel.id]);

  // Trocou de funil: volta para a primeira etapa
  useEffect(() => {
    railRef.current?.scrollTo({ left: 0 });
    setVisible(0);
  }, [funnel.id]);

  const goTo = useCallback((index: number) => {
    const rail = railRef.current;
    const item = rail?.querySelectorAll<HTMLElement>(":scope > section")[index];
    if (!rail || !item) return;
    rail.scrollTo({ left: item.offsetLeft + item.offsetWidth / 2 - rail.clientWidth / 2, behavior: "smooth" });
  }, []);

  const count = funnel.stages.length;
  const pager = useMemo<DockPager | null>(
    () =>
      mobile && count > 1
        ? {
            current: visible + 1,
            total: count,
            label: funnel.stages[visible]?.label ?? "",
            onPrev: () => goTo(Math.max(0, visible - 1)),
            onNext: () => goTo(Math.min(count - 1, visible + 1)),
          }
        : null,
    [mobile, count, visible, funnel.stages, goTo],
  );
  useDockPagerRegistration(pager);

  const moveLead = (id: string, stage: string) => {
    const lead = allLeads.find((item) => item.id === id);
    if (!lead || lead.stage === stage) return;

    move(id, stage, teamMember.name);
    const label = funnel.stages.find((item) => item.id === stage)?.label;
    setAnnouncement(`${lead.name} foi para ${label}.`);
  };

  // TODO: abrir o formulário de novo lead.
  const addLead = (stage: string) => void stage;

  return (
    <Screen>
      <FilterBar
        search={{ label: "Buscar leads", placeholder: "Buscar leads", value: query, onChange: setQuery }}
        sections={sections}
        trailing={toolbarEnd}
      />

      {filtering && leads.length === 0 ? (
        <Empty>
          <EmptyState
            icon={<UserFocusIcon size={24} />}
            title="Nenhum lead encontrado"
            description="Nada bateu com a busca ou os filtros neste funil. Tente outro nome, telefone ou etiqueta, ou limpe tudo."
          >
            <Button variant="secondary" size="sm" icon={ArrowCounterClockwiseIcon} onClick={clearAll}>
              Limpar busca e filtros
            </Button>
          </EmptyState>
        </Empty>
      ) : (
        <KanbanBoard label={`Funil ${funnel.name}`} railRef={railRef}>
          {columns.map(({ stage, leads: stageLeads, total }) => (
            <KanbanColumn
              key={`${funnel.id}:${stage.id}`}
              title={stage.label}
              tone={stage.tone}
              count={stageLeads.length}
              meta={total > 0 ? formatMoneyShort(total) : undefined}
              addLabel="Adicionar lead"
              onAdd={() => addLead(stage.id)}
              onDropItem={mobile ? undefined : (id) => moveLead(id, stage.id)}
              actions={
                <>
                  <IconButton
                    icon={PlusIcon}
                    label={`Adicionar lead em ${stage.label}`}
                    variant="ghost"
                    size="sm"
                    tooltip="bottom"
                    onClick={() => addLead(stage.id)}
                  />
                </>
              }
            >
              {stageLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  stages={funnel.stages}
                  dragging={draggingId === lead.id}
                  draggable={!mobile}
                  onMove={(target) => moveLead(lead.id, target)}
                  onDragStart={() => setDraggingId(lead.id)}
                  onDragEnd={() => setDraggingId(null)}
                />
              ))}
            </KanbanColumn>
          ))}
        </KanbanBoard>
      )}

      <VisuallyHidden role="status" aria-live="polite">
        {announcement}
      </VisuallyHidden>
    </Screen>
  );
}
