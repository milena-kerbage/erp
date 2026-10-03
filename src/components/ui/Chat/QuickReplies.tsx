"use client";

import {
  Fragment,
  useEffect,
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import styled from "@emotion/styled";
import { ChatTextIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconTile } from "@/components/ui/IconTile";
import { Surface } from "@/components/ui/Popover/styles";
import { usePopover, type PopoverTriggerProps } from "@/components/ui/Popover/usePopover";
import { SearchInput, SearchRow } from "@/components/ui/Select/styles";
import { transientOptions } from "@/lib/emotion/transient";
import type { IconSource } from "@/lib/icons";
import type { Tone } from "@/styles/theme";

export type QuickReply = {
  id: string;
  label: string;
  /** `{nome}` vira o primeiro nome de quem recebe. */
  text: string;
  /** Para que serve (aparece como etiqueta na prévia). */
  category?: string;
  icon?: IconSource;
  tone?: Tone;
};

type QuickRepliesProps = {
  replies: readonly QuickReply[];
  /** Primeiro nome de quem recebe (troca o `{nome}`). */
  recipientName: string;
  /** Posiciona junto a este elemento (ex.: a caixa de mensagem inteira). */
  anchorRef?: RefObject<HTMLElement | null>;
  onInsert: (text: string) => void;
  trigger: (props: PopoverTriggerProps & { open: boolean }) => ReactNode;
};

const NAME_TOKEN = "{nome}";

/* ---------- Estilos ---------- */

/** Categorias à esquerda e cartões à direita (no celular: pílulas em cima e cartões embaixo). */
const Body = styled.div`
  display: grid;
  grid-template-columns: 10.5rem minmax(0, 1fr);
  gap: ${({ theme }) => theme.spacing(2)};
  height: 21rem;
  min-height: 0;

  ${({ theme }) => theme.media.md} {
    display: flex;
    flex-direction: column;
    height: auto;
    min-height: 0;
    flex: 1;
  }
`;

const Categories = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 0;
  padding-right: ${({ theme }) => theme.spacing(2)};
  overflow-y: auto;
  border-right: 1px solid ${({ theme }) => theme.colors.border.faint};

  /* Celular: uma linha de pílulas que rola para o lado */
  ${({ theme }) => theme.media.md} {
    flex-direction: row;
    flex-shrink: 0;
    gap: ${({ theme }) => theme.spacing(1.5)};
    padding: ${({ theme }) => theme.spacing(0, 1, 1)};
    overflow-x: auto;
    overflow-y: hidden;
    border-right: 0;
    scrollbar-width: none;
    overscroll-behavior-x: contain;

    &::-webkit-scrollbar {
      display: none;
    }
  }
`;

const Category = styled("button", transientOptions)<{ $active: boolean; $tone: Tone }>`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  min-height: 2.25rem;
  padding: ${({ theme }) => theme.spacing(0, 2.5)};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme, $active, $tone }) => ($active ? theme.tones[$tone].soft : "transparent")};
  font-size: 0.8125rem;
  font-weight: ${({ theme, $active }) => ($active ? theme.fontWeights.semibold : theme.fontWeights.medium)};
  color: ${({ theme, $active, $tone }) => ($active ? theme.tones[$tone].fg : theme.colors.text.secondary)};
  text-align: left;
  white-space: nowrap;
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme, $active, $tone }) =>
      $active ? theme.tones[$tone].soft : theme.colors.interactive.hover};
  }

  > span:first-of-type {
    width: 0.5rem;
    height: 0.5rem;
    flex-shrink: 0;
    border-radius: 2px;
    background-color: ${({ theme, $tone }) => theme.tones[$tone].fg};
  }

  > span:last-of-type {
    margin-left: auto;
    font-size: 0.6875rem;
    font-weight: ${({ theme }) => theme.fontWeights.medium};
    color: ${({ theme }) => theme.colors.text.muted};
  }

  ${({ theme }) => theme.media.md} {
    min-height: 2rem;
    border: 1px solid ${({ theme, $active, $tone }) => ($active ? theme.tones[$tone].fg : theme.colors.border.subtle)};

    > span:last-of-type {
      margin-left: ${({ theme }) => theme.spacing(1)};
    }
  }
`;

/** Cartões em colunas: dá para comparar as respostas antes de escolher. */
const Cards = styled.ul`
  display: grid;
  grid-auto-rows: min-content;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing(2)};
  min-height: 0;
  padding: 2px;
  overflow-y: auto;
  overscroll-behavior: contain;
  outline: none;

  ${({ theme }) => theme.media.md} {
    flex: 1;
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Card = styled("li", transientOptions)<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};
  padding: ${({ theme }) => theme.spacing(3)};
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.border.strong : theme.colors.border.subtle)};
  border-radius: ${({ theme }) => theme.radii.lg};
  background-color: ${({ theme, $active }) => ($active ? theme.colors.background.surface : theme.palette.neutral[0])};
  cursor: pointer;
  transition:
    border-color ${({ theme }) => theme.transitions.fast},
    background-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme, $active }) => ($active ? theme.colors.border.strong : theme.colors.border.default)};
  }
`;

const CardHead = styled.span`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  min-width: 0;

  > strong {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    font-size: 0.8125rem;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: ${({ theme }) => theme.colors.text.primary};
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;

/** Texto da resposta: 3 linhas no cartão; inteiro no selecionado. */
const CardText = styled("p", transientOptions)<{ $open: boolean }>`
  display: -webkit-box;
  overflow: hidden;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: pre-wrap;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: ${({ $open }) => ($open ? "unset" : 3)};

  mark {
    padding: 0 2px;
    border-radius: 3px;
    background-color: ${({ theme }) => theme.colors.chat.audioAccent};
    color: inherit;
  }
`;

const CardFoot = styled.span`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(2)};
  margin-top: auto;

  > small {
    font-size: 0.6875rem;
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const Hints = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1)};
  padding: ${({ theme }) => theme.spacing(2, 1, 0)};
  font-size: 0.6875rem;
  color: ${({ theme }) => theme.colors.text.muted};

  kbd {
    display: inline-flex;
    align-items: center;
    height: 1.25rem;
    padding: ${({ theme }) => theme.spacing(0, 1.5)};
    border: 1px solid ${({ theme }) => theme.colors.border.subtle};
    border-radius: ${({ theme }) => theme.radii.xs};
    background-color: ${({ theme }) => theme.palette.neutral[0]};
    font-family: inherit;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  ${({ theme }) => theme.media.md} {
    display: none;
  }
`;

const Empty = styled.li`
  grid-column: 1 / -1;
  padding: ${({ theme }) => theme.spacing(8, 2)};
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
  text-align: center;
`;

const Count = styled.span`
  flex-shrink: 0;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;

/* ---------- Componente ---------- */

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Texto com o nome destacado onde havia `{nome}`. */
function Filled({ text, name }: { text: string; name: string }) {
  const parts = text.split(NAME_TOKEN);
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part}
          {index < parts.length - 1 && <mark>{name}</mark>}
        </Fragment>
      ))}
    </>
  );
}

const ALL = "__all__";

/**
 * Respostas rápidas em colunas: categorias à esquerda e cartões lado a lado
 * com o texto já com o nome da pessoa. Tocar no cartão só seleciona (mostra o
 * texto inteiro); quem insere é o botão "Usar resposta" (ou Enter).
 */
export function QuickReplies({ replies, recipientName, anchorRef, onInsert, trigger }: QuickRepliesProps) {
  const popover = usePopover({ side: "top", align: "end", offset: 10, role: "dialog", anchorRef });
  const { open, position, contentRef, close } = popover;
  const listId = useId();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);
  const [activeIndex, setActiveIndex] = useState(0);

  /** Categorias na ordem em que aparecem, com cor e contagem. */
  const categories = useMemo(() => {
    const map = new Map<string, { tone: Tone; count: number }>();
    for (const reply of replies) {
      const key = reply.category ?? "Outras";
      const entry = map.get(key) ?? { tone: reply.tone ?? "neutral", count: 0 };
      entry.count += 1;
      map.set(key, entry);
    }
    return [...map.entries()].map(([name, entry]) => ({ name, ...entry }));
  }, [replies]);

  const filtered = useMemo(() => {
    const search = normalize(query.trim());
    return replies.filter(
      (reply) =>
        (category === ALL || (reply.category ?? "Outras") === category) &&
        (!search || normalize(`${reply.label} ${reply.category ?? ""} ${reply.text}`).includes(search)),
    );
  }, [replies, query, category]);

  const active = filtered[activeIndex];
  const optionId = (index: number) => `${listId}-${index}`;

  // Ao abrir: busca limpa, todas as categorias, primeira resposta em destaque.
  const ready = open && position !== null;
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCategory(ALL);
    setActiveIndex(0);
  }, [open]);
  useEffect(() => {
    // No celular o teclado cobriria a folha: foco só com mouse/teclado
    if (ready && window.matchMedia("(hover: hover)").matches) contentRef.current?.querySelector("input")?.focus();
  }, [ready, contentRef]);

  // Mantém o destacado à vista (rola só a lista)
  useEffect(() => {
    if (!ready) return;
    const card = document.getElementById(optionId(activeIndex));
    const list = card?.parentElement;
    if (!card || !list) return;
    if (card.offsetTop < list.scrollTop) list.scrollTop = card.offsetTop - 4;
    else if (card.offsetTop + card.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = card.offsetTop + card.offsetHeight - list.clientHeight + 4;
    // optionId depende só do listId (estável)
  }, [activeIndex, ready]);

  const insert = (reply: QuickReply | undefined) => {
    if (!reply) return;
    close();
    onInsert(reply.text.replaceAll(NAME_TOKEN, recipientName));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const move = (delta: number) => {
      event.preventDefault();
      if (filtered.length === 0) return;
      setActiveIndex((current) => (current + delta + filtered.length) % filtered.length);
    };

    if (event.key === "ArrowDown") move(1);
    if (event.key === "ArrowUp") move(-1);
    if (event.key === "Enter" && (event.target as HTMLElement).tagName !== "BUTTON") {
      event.preventDefault();
      insert(active);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    }
  };

  return (
    <>
      {trigger({ ...popover.triggerProps, open })}
      {open &&
        createPortal(
          <Surface
            ref={contentRef}
            id={popover.contentId}
            role="dialog"
            aria-label="Respostas rápidas"
            $side={position?.side ?? "top"}
            $width="44rem"
            $ready={position !== null}
            style={position ? { top: position.top, left: position.left } : { top: 0, left: 0 }}
            onKeyDown={handleKeyDown}
          >
            <SearchRow>
              <MagnifyingGlassIcon size={16} aria-hidden />
              <SearchInput
                type="search"
                role="combobox"
                aria-label="Buscar resposta rápida"
                aria-expanded
                aria-controls={listId}
                aria-activedescendant={active ? optionId(activeIndex) : undefined}
                aria-autocomplete="list"
                placeholder="Buscar resposta rápida..."
                autoComplete="off"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
              />
              <Count>
                {filtered.length}/{replies.length}
              </Count>
            </SearchRow>

            <Body>
              <Categories role="radiogroup" aria-label="Categorias">
                <Category
                  type="button"
                  role="radio"
                  aria-checked={category === ALL}
                  $active={category === ALL}
                  $tone="neutral"
                  onClick={() => {
                    setCategory(ALL);
                    setActiveIndex(0);
                  }}
                >
                  <span aria-hidden />
                  Todas
                  <span>{replies.length}</span>
                </Category>
                {categories.map((item) => (
                  <Category
                    key={item.name}
                    type="button"
                    role="radio"
                    aria-checked={category === item.name}
                    $active={category === item.name}
                    $tone={item.tone}
                    onClick={() => {
                      setCategory(item.name);
                      setActiveIndex(0);
                    }}
                  >
                    <span aria-hidden />
                    {item.name}
                    <span>{item.count}</span>
                  </Category>
                ))}
              </Categories>

              <Cards id={listId} role="listbox" aria-label="Respostas rápidas">
                {filtered.length === 0 && <Empty role="presentation">Nenhuma resposta encontrada.</Empty>}
                {filtered.map((reply, index) => {
                  const selected = index === activeIndex;
                  return (
                    <Card
                      key={reply.id}
                      id={optionId(index)}
                      role="option"
                      aria-selected={selected}
                      $active={selected}
                      onClick={() => setActiveIndex(index)}
                    >
                      <CardHead>
                        <IconTile icon={reply.icon ?? ChatTextIcon} tone={reply.tone ?? "neutral"} size="sm" />
                        <strong>{reply.label}</strong>
                        {category === ALL && reply.category && <Badge tone={reply.tone ?? "neutral"}>{reply.category}</Badge>}
                      </CardHead>
                      <CardText $open={selected}>
                        <Filled text={reply.text} name={recipientName} />
                      </CardText>
                      <CardFoot>
                        <small>{selected ? "Selecionada" : "Toque para ver inteira"}</small>
                        <Button
                          size="sm"
                          variant={selected ? "primary" : "secondary"}
                          onClick={(event) => {
                            event.stopPropagation();
                            insert(reply);
                          }}
                        >
                          Usar resposta
                        </Button>
                      </CardFoot>
                    </Card>
                  );
                })}
              </Cards>
            </Body>

            <Hints>
              <kbd>↑</kbd>
              <kbd>↓</kbd>
              escolher / <kbd>Enter</kbd> usar a selecionada
            </Hints>
          </Surface>,
          document.body,
        )}
    </>
  );
}
