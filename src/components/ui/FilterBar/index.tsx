"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, FunnelSimpleXIcon, MagnifyingGlassIcon, SlidersHorizontalIcon, XIcon } from "@phosphor-icons/react";
import { GroupLabel, RowLabel, RowText, Separator, Surface } from "@/components/ui/Popover/styles";
import { usePopover } from "@/components/ui/Popover/usePopover";
import type { DockAction } from "@/lib/dock";
import { useIsMobile } from "@/lib/useMediaQuery";
import { WideOnly } from "@/styles/responsive";
import { Switch } from "@/components/ui/Switch";
import {
  ActiveCount,
  Bar,
  Check,
  Chip,
  ChipRemove,
  Chips,
  Clear,
  Kbd,
  MenuEmpty,
  MenuList,
  MenuRow,
  MenuSearch,
  RowCount,
  Search,
  SearchInput,
  SquareButton,
} from "./styles";

export { SquareButton as FilterBarButton } from "./styles";

export type FilterChoice = {
  value: string;
  label: string;
  /** Ícone, avatar ou marcador à esquerda. */
  leading?: ReactNode;
  /** Quantos itens caem nesse filtro (aparece à direita). */
  count?: number;
  /** Texto extra considerado na busca do menu. */
  keywords?: string;
};

type Toggle = {
  id: string;
  label: string;
  leading?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/**
 * - `multi`: marca várias (nenhuma marcada = todas).
 * - `single`: uma só; `defaultValue` é o "qualquer" (não conta como filtro).
 * - `toggles`: liga/desliga (ex.: "Só com mensagens não lidas").
 */
export type FilterSection =
  | {
      kind: "multi";
      id: string;
      label: string;
      options: FilterChoice[];
      value: readonly string[];
      onChange: (value: string[]) => void;
    }
  | {
      kind: "single";
      id: string;
      label: string;
      options: FilterChoice[];
      value: string;
      defaultValue: string;
      onChange: (value: string) => void;
    }
  | { kind: "toggles"; id: string; label: string; items: Toggle[] };

type FilterBarProps = {
  search: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    /** Celular: versão curta do placeholder (a longa seria cortada). */
    shortPlaceholder?: string;
    /** Nome acessível do campo. */
    label: string;
  };
  sections?: FilterSection[];
  /** Depois do botão de filtros (ex.: ordenação, seleção). */
  trailing?: ReactNode;
  className?: string;
};

/** Um item navegável do menu (linha de opção ou de liga/desliga). */
type Item = {
  key: string;
  section: FilterSection;
  label: string;
  leading?: ReactNode;
  count?: number;
  checked: boolean;
  toggle: () => void;
};

const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Está digitando em algum campo (aí o "/" é texto, não atalho). */
function isTyping(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

/** Filtros ativos, um chip por grupo (ou por liga/desliga). */
function activeChips(sections: readonly FilterSection[]) {
  const chips: { key: string; label: string; value: string; remove: () => void }[] = [];
  for (const section of sections) {
    if (section.kind === "multi" && section.value.length > 0) {
      const first = section.options.find((option) => option.value === section.value[0]);
      chips.push({
        key: section.id,
        label: section.label,
        value: `${first?.label ?? section.value[0]}${section.value.length > 1 ? ` +${section.value.length - 1}` : ""}`,
        remove: () => section.onChange([]),
      });
    }
    if (section.kind === "single" && section.value !== section.defaultValue) {
      const current = section.options.find((option) => option.value === section.value);
      chips.push({
        key: section.id,
        label: section.label,
        value: current?.label ?? section.value,
        remove: () => section.onChange(section.defaultValue),
      });
    }
    if (section.kind === "toggles") {
      for (const item of section.items.filter((toggle) => toggle.checked)) {
        chips.push({
          key: `${section.id}:${item.id}`,
          label: "",
          value: item.label,
          remove: () => item.onChange(false),
        });
      }
    }
  }
  return chips;
}

/**
 * Busca larga da página (atalho "/") + botão de filtros com menu agrupado:
 * busca nos filtros, opções com ícone e contagem, check no escolhido e
 * liga/desliga. Os filtros ativos aparecem como chips removíveis.
 */
export function FilterBar({ search, sections = [], trailing, className }: FilterBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const chips = activeChips(sections);
  const mobile = useIsMobile();

  // "/" leva à busca da página (Ctrl+K continua abrindo a busca geral)
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
      if (document.querySelector("[aria-modal='true']")) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <Bar className={className}>
      <Search>
        <MagnifyingGlassIcon size={16} aria-hidden />
        <SearchInput
          ref={inputRef}
          type="search"
          data-page-search=""
          aria-label={search.label}
          placeholder={mobile && search.shortPlaceholder ? search.shortPlaceholder : search.placeholder}
          autoComplete="off"
          value={search.value}
          onChange={(event) => search.onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            if (search.value) search.onChange("");
            else event.currentTarget.blur();
          }}
        />
        {search.value ? (
          <Clear
            type="button"
            aria-label="Limpar busca"
            onClick={() => {
              search.onChange("");
              inputRef.current?.focus();
            }}
          >
            <XIcon size={14} weight="bold" />
          </Clear>
        ) : (
          <Kbd aria-hidden>/</Kbd>
        )}
      </Search>

      {chips.length > 0 && (
        <Chips aria-label="Filtros ativos">
          {chips.map((chip) => (
            <Chip key={chip.key}>
              {chip.label && <small>{chip.label}</small>}
              {chip.value}
              <ChipRemove
                type="button"
                aria-label={`Remover filtro ${chip.label} ${chip.value}`.replace(/\s+/g, " ")}
                onClick={chip.remove}
              >
                <XIcon size={12} weight="bold" />
              </ChipRemove>
            </Chip>
          ))}
        </Chips>
      )}

      {sections.length > 0 && (
        <FilterMenu sections={sections} active={chips.length} onClear={() => chips.forEach((chip) => chip.remove())} />
      )}

      {trailing}
    </Bar>
  );
}

/* ---------- Menu ---------- */

function FilterMenu({
  sections,
  active,
  onClear,
}: {
  sections: readonly FilterSection[];
  active: number;
  onClear: () => void;
}) {
  // Celular: "Limpar filtros" vai para o dock (a lista vai até embaixo da folha)
  const clearRef = useRef<() => void>(() => {});
  const dockActions = useMemo<DockAction[] | undefined>(
    () =>
      active > 0
        ? [
            {
              id: "clear-filters",
              icon: FunnelSimpleXIcon,
              label: `Limpar filtros (${active})`,
              text: "Limpar filtros",
              onClick: () => clearRef.current(),
            },
          ]
        : undefined,
    [active],
  );
  const popover = usePopover({ side: "bottom", align: "end", offset: 6, role: "dialog", dockActions });
  const { open, position, contentRef, close } = popover;
  clearRef.current = () => {
    onClear();
    close(true);
  };
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const optionId = (index: number) => `${popover.id}-filter-${index}`;

  /** Seções visíveis (conforme a busca), cada uma com os seus itens. */
  const groups = useMemo(() => {
    const q = normalize(query.trim());
    const matches = (text: string) => !q || normalize(text).includes(q);

    return sections
      .map((section) => {
        const items: Item[] =
          section.kind === "toggles"
            ? section.items.map((toggle) => ({
                key: toggle.id,
                section,
                label: toggle.label,
                leading: toggle.leading,
                checked: toggle.checked,
                toggle: () => toggle.onChange(!toggle.checked),
              }))
            : section.options.map((option) => ({
                key: option.value,
                section,
                label: option.label,
                leading: option.leading,
                count: option.count,
                checked:
                  section.kind === "multi" ? section.value.includes(option.value) : section.value === option.value,
                toggle: () => {
                  if (section.kind === "single") section.onChange(option.value);
                  else
                    section.onChange(
                      section.value.includes(option.value)
                        ? section.value.filter((value) => value !== option.value)
                        : [...section.value, option.value],
                    );
                },
              }));
        const keywords = (item: Item) =>
          section.kind === "toggles"
            ? ""
            : (section.options.find((option) => option.value === item.key)?.keywords ?? "");
        return {
          section,
          // Buscar pelo nome do grupo mostra o grupo inteiro
          items: matches(section.label) ? items : items.filter((item) => matches(`${item.label} ${keywords(item)}`)),
        };
      })
      .filter((group) => group.items.length > 0);
  }, [sections, query]);

  const flat = groups.flatMap((group) => group.items);

  const ready = open && position !== null;
  useEffect(() => {
    if (!ready) return;
    setQuery("");
    setActiveIndex(0);
    // Só com mouse: no toque, focar abriria o teclado e empurraria a tela
    if (window.matchMedia("(hover: hover)").matches) searchRef.current?.focus();
  }, [ready]);

  // Rola só a lista do menu até o item destacado
  useEffect(() => {
    const list = listRef.current;
    const row = document.getElementById(optionId(activeIndex));
    if (!ready || !list || !row) return;
    if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop - 28;
    else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight;
  }, [activeIndex, ready]);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        if (flat.length === 0) return;
        setActiveIndex((current) => (current + (event.key === "ArrowDown" ? 1 : -1) + flat.length) % flat.length);
        break;
      case "Enter":
        event.preventDefault();
        flat[activeIndex]?.toggle();
        break;
      case "Escape":
        event.preventDefault();
        close(true);
        break;
      case "Tab":
        close();
        break;
    }
  };

  let index = -1;

  const content = (
    <Surface
      ref={contentRef}
      id={popover.contentId}
      role="dialog"
      aria-label="Filtros"
      $side={position?.side ?? "bottom"}
      $width="19.5rem"
      $ready={position !== null}
      style={position ? { top: position.top, left: position.left } : { top: 0, left: 0 }}
      onKeyDown={handleKeyDown}
    >
      <MenuSearch>
        <MagnifyingGlassIcon size={16} aria-hidden />
        <input
          ref={searchRef}
          type="search"
          aria-label="Buscar filtros"
          aria-controls={`${popover.id}-filters`}
          aria-activedescendant={flat[activeIndex] ? optionId(activeIndex) : undefined}
          placeholder="Buscar"
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
        />
      </MenuSearch>

      <MenuList ref={listRef} data-sheet-scroll="" id={`${popover.id}-filters`} role="menu" aria-label="Filtros">
        {groups.length === 0 && <MenuEmpty>Nenhum filtro com “{query.trim()}”</MenuEmpty>}
        {groups.map((group, position) => (
          <Fragment key={group.section.id}>
            {position > 0 && <Separator role="presentation" />}
            <GroupLabel role="presentation">{group.section.label}</GroupLabel>
            {group.items.map((item) => {
              index += 1;
              const current = index;
              const toggle = group.section.kind === "toggles";
              return (
                <MenuRow
                  key={`${group.section.id}:${item.key}`}
                  id={optionId(current)}
                  role={group.section.kind === "single" ? "menuitemradio" : "menuitemcheckbox"}
                  aria-checked={item.checked}
                  $active={current === activeIndex}
                  onMouseDown={(event) => event.preventDefault()}
                  onPointerMove={() => current !== activeIndex && setActiveIndex(current)}
                  onClick={item.toggle}
                >
                  {item.leading && (
                    <span data-leading="" style={{ display: "inline-flex" }}>
                      {item.leading}
                    </span>
                  )}
                  <RowLabel>
                    <RowText>{item.label}</RowText>
                  </RowLabel>
                  {item.count !== undefined && <RowCount>{item.count}</RowCount>}
                  {toggle ? (
                    <span onClick={(event) => event.stopPropagation()} style={{ display: "inline-flex" }}>
                      <Switch checked={item.checked} onChange={() => item.toggle()} label={item.label} />
                    </span>
                  ) : (
                    <Check aria-hidden>{item.checked && <CheckIcon size={15} weight="bold" />}</Check>
                  )}
                </MenuRow>
              );
            })}
          </Fragment>
        ))}
      </MenuList>

      {active > 0 && (
        <WideOnly>
          <Separator role="presentation" />
          <MenuRow
            role="button"
            tabIndex={-1}
            $active={false}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onClear();
              close(true);
            }}
          >
            <XIcon size={16} aria-hidden />
            <RowLabel>
              <RowText>Limpar filtros</RowText>
            </RowLabel>
            <RowCount>{active}</RowCount>
          </MenuRow>
        </WideOnly>
      )}
    </Surface>
  );

  return (
    <>
      <SquareButton
        type="button"
        {...popover.triggerProps}
        $active={active > 0}
        aria-label={active > 0 ? `Filtros (${active} ${active === 1 ? "ativo" : "ativos"})` : "Filtros"}
      >
        <SlidersHorizontalIcon size={17} aria-hidden />
        {active > 0 && <ActiveCount aria-hidden>{active}</ActiveCount>}
      </SquareButton>
      {open && createPortal(content, document.body)}
    </>
  );
}
