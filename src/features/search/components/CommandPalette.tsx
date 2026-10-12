"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useTheme } from "@emotion/react";
import styled from "@emotion/styled";
import {
  ArrowElbowDownLeftIcon,
  ChatCircleTextIcon,
  CircleDashedIcon,
  ClockCounterClockwiseIcon,
  KanbanIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  PlusIcon,
  SunIcon,
  UserPlusIcon,
  GearSixIcon,
  SquaresFourIcon,
  UserFocusIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { startNavigationProgress } from "@/components/layout/NavigationProgress";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { IconTile } from "@/components/ui/IconTile";
import { navigation, type NavModule } from "@/config/navigation";
import { transientOptions } from "@/lib/emotion/transient";
import { formatRelativeTime } from "@/lib/format";
import { usePresence } from "@/lib/presence";
import { useSheetDrag } from "@/lib/sheetDrag";
import { useSheet } from "@/lib/sheets";
import { useIsMobile } from "@/lib/useMediaQuery";
import { useAccessibility } from "@/providers/accessibility";
import { EASE_OUT, fadeIn, rise } from "@/styles/animations";
import type { Tone } from "@/styles/theme";
import { backdropExit, DOCK_SPACE, sheetExit, sheetStyles } from "@/styles/sheet";
import { formatBudget, formatPhone } from "@/features/leads/format";
import { useLeads } from "@/features/leads/store";
import { useFunnels, useWorkspace } from "@/features/settings/store";
import {
  excerpt,
  normalize,
  groupLabels,
  Highlight,
  scopeGroups,
  scoreResult,
  type SearchGroup,
  type SearchResult,
  type SearchScope,
} from "../search";

const RECENT_KEY = "mk_search_recent";
const PER_GROUP = 5;

type Recent = Pick<SearchResult, "id" | "group" | "title" | "subtitle" | "href">;

type Section = { key: string; label: string; items: SearchResult[]; total?: number };

/** Filtro que o "Ver todos" de cada grupo aplica. */
const scopeOfGroup: Partial<Record<SearchGroup, SearchScope>> = {
  leads: "leads",
  messages: "messages",
  team: "team",
  pages: "pages",
};

/** Onde buscar: cada filtro com ícone e cor próprios (pílulas que rolam para o lado no celular). */
const scopes: { value: SearchScope; label: string; icon?: typeof UserFocusIcon; tone: Tone }[] = [
  { value: "all", label: "Tudo", tone: "neutral" },
  { value: "leads", label: "Leads e clientes", icon: UserFocusIcon, tone: "blue" },
  { value: "messages", label: "Conversas", icon: ChatCircleTextIcon, tone: "teal" },
  { value: "team", label: "Equipe", icon: UsersThreeIcon, tone: "lavender" },
  { value: "pages", label: "Páginas e ações", icon: SquaresFourIcon, tone: "peach" },
];

const settingsPages = [
  { label: "Usuários", href: "/configuracoes/usuarios", keywords: "equipe permissões convite" },
  { label: "Funis e etapas", href: "/configuracoes/funis", keywords: "kanban etapas ordem cores" },
  { label: "Preferências", href: "/configuracoes/preferencias", keywords: "horário notificações ausência" },
  { label: "Perfil", href: "/configuracoes/perfil", keywords: "foto senha conta" },
  { label: "Acessibilidade", href: "/configuracoes/acessibilidade", keywords: "modo escuro tema contraste texto" },
  { label: "Integrações", href: "/configuracoes/integracoes", keywords: "whatsapp instagram google meta" },
  { label: "API e webhooks", href: "/configuracoes/api", keywords: "chave token desenvolvedor" },
];

/* ---------- Estilos ---------- */

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndex.modal};
  display: flex;
  justify-content: center;
  padding: 12vh ${({ theme }) => theme.spacing(4)} ${({ theme }) => theme.spacing(4)};

  /* No celular: folha que sobe de baixo */
  ${({ theme }) => theme.media.md} {
    bottom: var(--keyboard-inset, 0px);
    align-items: flex-end;
    padding: 0;
  }
  background-color: ${({ theme }) => theme.colors.overlay};
  animation: ${fadeIn} 140ms ease-out;

  &[data-closing] {
    ${backdropExit};
  }
`;

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  width: min(42rem, 100%);
  max-height: min(34rem, 76vh);
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii["2xl"]};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
  animation: ${rise} 220ms ${EASE_OUT};

  ${({ theme }) => theme.media.md} {
    position: relative;
    width: 100%;
    height: calc(var(--app-height, 100dvh) * 0.88);
    max-height: calc(var(--app-height, 100dvh) * 0.88);
    padding-top: ${({ theme }) => theme.spacing(4)};
    ${({ theme }) => sheetStyles(theme)};

    [data-closing] > & {
      ${sheetExit};
    }
  }
`;

const InputRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
  flex-shrink: 0;
  height: 3.5rem;
  padding: ${({ theme }) => theme.spacing(0, 4)};
  color: ${({ theme }) => theme.colors.text.muted};

  /* Celular: linha embaixo do campo e as pílulas com respiro abaixo dela */
  ${({ theme }) => theme.media.md} {
    height: 3rem;
    margin-bottom: ${({ theme }) => theme.spacing(3)};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};

    input {
      font-size: 0.9375rem !important;
    }
  }

  input {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: 0;
    outline: none;
    background: transparent;
    font-size: ${({ theme }) => theme.fontSizes.md};
    color: ${({ theme }) => theme.colors.text.primary};

    &::placeholder {
      color: ${({ theme }) => theme.colors.text.muted};
    }

    &::-webkit-search-cancel-button {
      display: none;
    }
  }
`;

const Kbd = styled.kbd`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 2px;
  height: 1.375rem;
  padding: ${({ theme }) => theme.spacing(0, 1.5)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.xs};
  background-color: ${({ theme }) => theme.colors.background.surface};
  font-family: inherit;
  font-size: 0.6875rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const EscButton = styled.button`
  display: inline-flex;

  ${({ theme }) => theme.media.md} {
    display: none;
  }
`;

/** Uma linha só: o que não cabe rola para o lado (sem barra), com a borda direita esmaecendo. */
const Scopes = styled.div`
  display: flex;
  flex-shrink: 0;
  gap: ${({ theme }) => theme.spacing(1.5)};
  padding: ${({ theme }) => theme.spacing(0, 4, 3)};
  overflow-x: auto;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  scrollbar-width: none;
  overscroll-behavior-x: contain;
  scroll-padding-inline: ${({ theme }) => theme.spacing(4)};
  mask-image: linear-gradient(to right, #000 calc(100% - 2rem), transparent);

  &::-webkit-scrollbar {
    display: none;
  }
`;

const ScopeChip = styled("button", transientOptions)<{ $active: boolean; $tone: Tone }>`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1.5)};
  height: 2rem;
  padding: ${({ theme }) => theme.spacing(0, 3)};
  border: 1px solid ${({ theme, $active, $tone }) => ($active ? theme.tones[$tone].fg : "transparent")};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme, $active, $tone }) => ($active ? theme.tones[$tone].soft : theme.tones[$tone].bg)};
  font-size: 0.8125rem;
  font-weight: ${({ theme, $active }) => ($active ? theme.fontWeights.semibold : theme.fontWeights.medium)};
  color: ${({ theme, $tone }) => theme.tones[$tone].fg};
  white-space: nowrap;
  transition:
    background-color ${({ theme }) => theme.transitions.fast},
    border-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme, $tone }) => theme.tones[$tone].soft};
  }
`;

const Results = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  margin-right: 4px;
  padding: ${({ theme }) => theme.spacing(1.5, 1, 1.5, 1.5)};
  overflow-y: auto;
  overscroll-behavior: contain;

  &::-webkit-scrollbar-track {
    margin-block: 8px;
  }

  ${({ theme }) => theme.media.md} {
    margin-right: 0;
    padding: ${({ theme }) => theme.spacing(1.5, 2)} ${DOCK_SPACE};
  }
`;

const GroupHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing(2.5, 2.5, 1.5)};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.muted};

  button {
    font: inherit;
    color: inherit;

    &:hover {
      color: ${({ theme }) => theme.colors.text.primary};
    }
  }
`;

const Option = styled("div", transientOptions)<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
  min-height: 3rem;
  padding: ${({ theme }) => theme.spacing(1.5, 2.5)};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme, $active }) => ($active ? theme.colors.interactive.hover : "transparent")};
  cursor: pointer;

  > kbd {
    visibility: ${({ $active }) => ($active ? "visible" : "hidden")};
  }

  ${({ theme }) => theme.media.md} {
    > kbd {
      display: none;
    }
  }
`;

const OptionTexts = styled.span`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1px;
  min-width: 0;

  strong,
  small {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  strong {
    font-size: ${({ theme }) => theme.fontSizes.sm};
    font-weight: ${({ theme }) => theme.fontWeights.medium};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  small {
    font-size: ${({ theme }) => theme.fontSizes.xs};
    color: ${({ theme }) => theme.colors.text.muted};
  }

  mark {
    border-radius: 3px;
    background-color: ${({ theme }) => theme.tones.yellow.soft};
    color: inherit;
  }
`;

const OptionMeta = styled.span`
  ${({ theme }) => theme.media.md} {
    [data-wide-only] {
      display: none;
    }
  }

  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;

/** Ícone redondo dos resultados que não são pessoas. */
const IconBubble = styled.span`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Pill = styled("span", transientOptions)<{ $tone: import("@/styles/theme").Tone }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 1.25rem;
  padding: ${({ theme }) => theme.spacing(0, 1.5)};
  border-radius: ${({ theme }) => theme.radii.sm};
  background-color: ${({ theme, $tone }) => theme.tones[$tone].soft};
  color: ${({ theme, $tone }) => theme.tones[$tone].fg};
  font-size: 0.6875rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1.5)};
  padding: ${({ theme }) => theme.spacing(12, 4)};
  text-align: center;

  strong {
    font-size: ${({ theme }) => theme.fontSizes.sm};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  span {
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.text.muted};
  }

  svg {
    margin-bottom: ${({ theme }) => theme.spacing(1)};
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const Footer = styled.div`
  /* Atalhos de teclado não fazem sentido no celular */
  ${({ theme }) => theme.media.md} {
    display: none !important;
  }

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(2.5, 4)};
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};

  > span {
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing(3)};
  }

  > span > span {
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing(1)};
  }
`;

/* ---------- Dados ---------- */

function readRecent(): Recent[] {
  try {
    return JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveRecent(items: Recent[]) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, 6)));
  } catch {
    /* sem acesso ao armazenamento */
  }
}

/** Tudo o que dá para achar: leads, mensagens, funis, equipe, páginas e ações. */
function useSearchData(query: string) {
  const theme = useTheme();
  const { leads, details, messages } = useLeads();
  const { funnels, findFunnel } = useFunnels();
  const { members } = useWorkspace();
  const { settings, update } = useAccessibility();

  return useMemo<SearchResult[]>(() => {
    const dark = settings.appearance === "dark";
    const results: SearchResult[] = [];

    /* Ações rápidas */
    results.push(
      {
        id: "action:theme",
        group: "actions",
        title: dark ? "Voltar para o modo claro" : "Ativar o modo escuro",
        keywords: "tema aparência escuro claro noite",
        run: () => update({ appearance: dark ? "light" : "dark" }),
        leading: <IconBubble>{dark ? <SunIcon size={17} /> : <MoonIcon size={17} />}</IconBubble>,
      },
      {
        id: "action:invite",
        group: "actions",
        title: "Convidar pessoa para a equipe",
        keywords: "usuário novo acesso",
        href: "/configuracoes/usuarios",
        leading: (
          <IconBubble>
            <UserPlusIcon size={17} />
          </IconBubble>
        ),
      },
      {
        id: "action:funnel",
        group: "actions",
        title: "Criar ou editar funis e etapas",
        keywords: "novo funil kanban",
        href: "/configuracoes/funis",
        leading: (
          <IconBubble>
            <PlusIcon size={17} />
          </IconBubble>
        ),
      },
      {
        id: "action:board",
        group: "actions",
        title: "Abrir o quadro de leads",
        keywords: "kanban vendas",
        href: "/leads",
        leading: (
          <IconBubble>
            <KanbanIcon size={17} />
          </IconBubble>
        ),
      },
    );

    /* Leads e clientes */
    for (const lead of leads) {
      const info = details[lead.id];
      const funnel = findFunnel(lead.funnelId);
      const stage = funnel.stages.find((item) => item.id === lead.stage);
      results.push({
        id: `lead:${lead.id}`,
        group: "leads",
        title: lead.name,
        subtitle: [formatPhone(lead.phone), info?.email, funnel.name].filter(Boolean).join(" / "),
        keywords: `${lead.phone} ${lead.tags.join(" ")} ${info?.city ?? ""} ${info?.instagram ?? ""} ${info?.source ?? ""} ${info?.eventType ?? ""} ${stage?.label ?? ""}`,
        href: `/leads/${lead.id}`,
        leading: <Avatar name={lead.name} src={lead.photoUrl} seed={lead.id} size="sm" shape="circle" />,
        meta: (
          <>
            {stage && (
              <Pill $tone={stage.tone}>
                <CircleDashedIcon size={11} weight="bold" aria-hidden />
                {stage.label}
              </Pill>
            )}
            <span data-wide-only="">{formatBudget(lead.budget)}</span>
          </>
        ),
      });
    }

    /* Mensagens (só com termo: mostra o trecho onde apareceu) */
    if (query.trim().length >= 2) {
      const needle = normalize(query.trim());
      for (const lead of leads) {
        for (const message of messages[lead.id] ?? []) {
          // Só o texto da mensagem conta (não o nome de quem conversa)
          if (!message.text || !normalize(message.text).includes(needle)) continue;
          results.push({
            id: `message:${lead.id}:${message.id}`,
            group: "messages",
            title: excerpt(message.text, query.trim()),
            subtitle: `${message.direction === "in" ? lead.name : message.author.name}${message.kind === "note" ? " (nota interna)" : ""} / histórico demonstrativo de ${lead.name}`,
            keywords: message.text,
            href: `/leads/${lead.id}`,
            leading: (
              <IconBubble>
                <ChatCircleTextIcon size={17} />
              </IconBubble>
            ),
            meta: formatRelativeTime(message.at),
          });
        }
      }
    }

    /* Funis e etapas */
    for (const funnel of funnels) {
      const count = leads.filter((lead) => lead.funnelId === funnel.id).length;
      results.push({
        id: `funnel:${funnel.id}`,
        group: "funnels",
        title: funnel.name,
        subtitle: `Funil com ${funnel.stages.length} etapas`,
        href: `/leads?funil=${funnel.id}`,
        leading: <IconTile icon={funnel.icon} tone={funnel.tone} size="lg" />,
        meta: `${count} ${count === 1 ? "lead" : "leads"}`,
      });
      for (const stage of funnel.stages) {
        const inStage = leads.filter((lead) => lead.funnelId === funnel.id && lead.stage === stage.id).length;
        results.push({
          id: `stage:${funnel.id}:${stage.id}`,
          group: "funnels",
          title: stage.label,
          subtitle: `Etapa do funil ${funnel.name}`,
          href: `/leads?funil=${funnel.id}`,
          leading: (
            <IconBubble>
              <CircleDashedIcon size={17} weight="bold" color={theme.tones[stage.tone].fg} />
            </IconBubble>
          ),
          meta: `${inStage} ${inStage === 1 ? "lead" : "leads"}`,
        });
      }
    }

    /* Equipe */
    for (const member of members) {
      results.push({
        id: `member:${member.id}`,
        group: "team",
        title: member.name,
        subtitle: [member.role, member.email].filter(Boolean).join(" / "),
        href: "/configuracoes/usuarios",
        leading: <Avatar name={member.name} seed={member.seed} src={member.avatarUrl} size="sm" shape="circle" />,
        meta: member.status === "invited" ? <Badge tone="peach">Convite pendente</Badge> : undefined,
      });
    }

    /* Páginas */
    for (const module of [...navigation.main, ...navigation.secondary] as readonly NavModule[]) {
      results.push({
        id: `page:${module.href}`,
        group: "pages",
        title: module.label,
        subtitle: module.soon ? "Em produção" : "Página",
        locked: Boolean(module.soon),
        keywords: module.soon?.description,
        href: module.href,
        leading: (
          <IconBubble>
            <module.icon size={17} />
          </IconBubble>
        ),
        meta: module.soon ? <Badge tone="peach">Produção</Badge> : undefined,
      });
    }
    for (const page of settingsPages) {
      results.push({
        id: `page:${page.href}`,
        group: "pages",
        title: page.label,
        subtitle: "Configurações",
        keywords: page.keywords,
        href: page.href,
        leading: (
          <IconBubble>
            <GearSixIcon size={17} />
          </IconBubble>
        ),
      });
    }

    return results;
  }, [leads, details, messages, funnels, findFunnel, members, settings.appearance, update, query, theme]);
}

/* ---------- Componente ---------- */

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  /** Termo já digitado ao abrir (ex.: vindo da busca do menu no celular). */
  initialQuery?: string;
};

/** Busca de tudo no sistema, com teclado completo e buscas recentes. */
export function CommandPalette({ open, onClose, initialQuery = "" }: CommandPaletteProps) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const mobile = useIsMobile();
  // Fechou: sai suave (fica na tela o tempo da saída)
  const { present, closing } = usePresence(open);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<Recent[]>([]);
  const data = useSearchData(query);
  useSheet(open, onClose, "search");
  useSheetDrag(panelRef, onClose, open);

  // Ao abrir: campo limpo, foco, recentes lidos.
  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    setScope("all");
    setActive(0);
    setRecent(readRecent());
    const opener = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => opener?.focus?.();
  }, [open]);

  /** Grupos visíveis, já filtrados, ordenados e limitados. */
  const sections = useMemo<Section[]>(() => {
    const trimmed = query.trim();
    const digits = trimmed.replace(/\D/g, "");
    const allowed = scopeGroups[scope];

    if (!trimmed) {
      // Sem termo: recentes, ações e as páginas liberadas
      const byId = new Map(data.map((item) => [item.id, item]));
      const recentItems = recent
        .map((item) => byId.get(item.id))
        .filter((item): item is SearchResult => Boolean(item) && allowed.includes(item!.group));
      const suggestions: Section[] = [];
      if (recentItems.length) suggestions.push({ key: "recent", label: "Recentes", items: recentItems });
      for (const group of allowed) {
        if (group === "messages" || group === "funnels") continue;
        const items = data
          .filter((item) => item.group === group && !recentItems.includes(item))
          .filter((item) => group !== "pages" || item.subtitle !== "Em produção")
          .slice(0, group === "leads" ? 4 : PER_GROUP);
        if (items.length) suggestions.push({ key: group, label: groupLabels[group], items });
      }
      return suggestions;
    }

    const found: Section[] = [];
    for (const group of allowed) {
      const scored = data
        .filter((item) => item.group === group)
        .map((item) => ({ ...item, score: scoreResult(item, trimmed, digits) ?? -1 }))
        .filter((item) => item.score >= 0)
        .sort((a, b) => a.score - b.score || a.title.localeCompare(b.title, "pt-BR"));
      if (scored.length)
        found.push({
          key: group,
          label: groupLabels[group],
          items: scored.slice(0, scope === "all" ? PER_GROUP : 20),
          total: scored.length,
        });
    }
    return found;
  }, [data, query, scope, recent]);

  const flat = sections.flatMap((section) => section.items);
  const total = flat.length;

  useEffect(() => setActive(0), [query, scope]);

  useEffect(() => {
    const list = resultsRef.current;
    const row = document.getElementById(`${listId}-${active}`);
    if (!list || !row) return;
    const top = row.offsetTop;
    if (top < list.scrollTop + 8) list.scrollTop = top - 36;
    else if (top + row.offsetHeight > list.scrollTop + list.clientHeight - 8)
      list.scrollTop = top + row.offsetHeight - list.clientHeight + 8;
  }, [active, listId]);

  if (!present) return null;

  const choose = (item: SearchResult | undefined) => {
    if (!item) return;
    const next: Recent[] = [
      { id: item.id, group: item.group, title: item.title, subtitle: item.subtitle, href: item.href },
      ...readRecent().filter((entry) => entry.id !== item.id),
    ];
    saveRecent(next);
    onClose();
    if (item.run) item.run();
    if (item.href) {
      startNavigationProgress();
      router.push(item.href);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (total === 0) return;
      setActive((current) => (current + (event.key === "ArrowDown" ? 1 : -1) + total) % total);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      choose(flat[active]);
    }
  };

  let index = -1;
  const option = (item: SearchResult): ReactNode => {
    index += 1;
    const position = index;
    return (
      <Option
        key={`${item.id}-${position}`}
        id={`${listId}-${position}`}
        role="option"
        aria-selected={position === active}
        data-locked={item.locked || undefined}
        data-active={position === active || undefined}
        $active={position === active}
        onPointerMove={() => position !== active && setActive(position)}
        onClick={() => choose(item)}
      >
        {item.leading}
        <OptionTexts>
          <strong>
            <Highlight text={item.title} query={query} />
          </strong>
          {item.subtitle && (
            <small>
              <Highlight text={item.subtitle} query={query} />
            </small>
          )}
        </OptionTexts>
        {item.meta && <OptionMeta>{item.meta}</OptionMeta>}
        <Kbd aria-hidden>
          <ArrowElbowDownLeftIcon size={11} weight="bold" />
        </Kbd>
      </Option>
    );
  };

  return createPortal(
    <Backdrop
      data-closing={closing ? "" : undefined}
      onPointerDown={(event) => {
        if (!closing && event.target === event.currentTarget) onClose();
      }}
    >
      <Panel ref={panelRef} role="dialog" aria-modal="true" aria-label="Buscar no sistema" onKeyDown={handleKeyDown}>
        <InputRow>
          <MagnifyingGlassIcon size={20} aria-hidden />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-activedescendant={total ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            placeholder={
              mobile ? "Buscar no sistema" : "Buscar leads, clientes, conversas, etapas, pessoas e páginas..."
            }
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <EscButton type="button" onClick={onClose} aria-label="Fechar busca">
            <Kbd>Esc</Kbd>
          </EscButton>
        </InputRow>

        <Scopes role="radiogroup" aria-label="Onde buscar">
          {scopes.map((item) => (
            <ScopeChip
              key={item.value}
              type="button"
              role="radio"
              aria-checked={scope === item.value}
              $active={scope === item.value}
              $tone={item.tone}
              onClick={(event) => {
                setScope(item.value);
                // Traz a pílula escolhida para a vista (só rola a linha, nunca a tela)
                const chip = event.currentTarget;
                const row = chip.parentElement;
                if (row) {
                  const left = chip.offsetLeft - row.offsetLeft;
                  if (left < row.scrollLeft) row.scrollTo({ left: left - 16, behavior: "smooth" });
                  else if (left + chip.offsetWidth > row.scrollLeft + row.clientWidth)
                    row.scrollTo({ left: left + chip.offsetWidth - row.clientWidth + 32, behavior: "smooth" });
                }
                inputRef.current?.focus({ preventScroll: true });
              }}
            >
              {item.icon && <item.icon size={15} weight="bold" aria-hidden />}
              {item.label}
            </ScopeChip>
          ))}
        </Scopes>

        <Results ref={resultsRef} id={listId} role="listbox" aria-label="Resultados">
          {total === 0 ? (
            <Empty>
              <MagnifyingGlassIcon size={26} aria-hidden />
              <strong>Nada encontrado para “{query.trim()}”</strong>
              <span>Tente pelo telefone, e-mail, etiqueta, cidade ou um trecho da conversa.</span>
            </Empty>
          ) : (
            sections.map((section) => (
              <div key={section.key} role="group" aria-label={section.label}>
                <GroupHead>
                  <span>
                    {section.key === "recent" && (
                      <ClockCounterClockwiseIcon size={12} aria-hidden style={{ marginRight: 4, verticalAlign: -1 }} />
                    )}
                    {section.label}
                    {section.total !== undefined &&
                      section.total > section.items.length &&
                      ` (${section.items.length} de ${section.total})`}
                  </span>
                  {section.key === "recent" && (
                    <button
                      type="button"
                      onClick={() => {
                        saveRecent([]);
                        setRecent([]);
                        inputRef.current?.focus();
                      }}
                    >
                      Limpar
                    </button>
                  )}
                  {section.total !== undefined &&
                    section.total > section.items.length &&
                    scope === "all" &&
                    scopeOfGroup[section.key as SearchGroup] && (
                      <button
                        type="button"
                        onClick={() => {
                          setScope(scopeOfGroup[section.key as SearchGroup] ?? "all");
                          inputRef.current?.focus();
                        }}
                      >
                        Ver todos
                      </button>
                    )}
                </GroupHead>
                {section.items.map(option)}
              </div>
            ))
          )}
        </Results>

        <Footer>
          <span>
            <span>
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              navegar
            </span>
            <span>
              <Kbd>
                <ArrowElbowDownLeftIcon size={11} weight="bold" />
              </Kbd>
              abrir
            </span>
            <span>
              <Kbd>Esc</Kbd>
              fechar
            </span>
          </span>
          <span>
            {query.trim() ? `${total} ${total === 1 ? "resultado" : "resultados"}` : "Comece a digitar para buscar"}
          </span>
        </Footer>
      </Panel>
    </Backdrop>,
    document.body,
  );
}

export type { SearchGroup };
