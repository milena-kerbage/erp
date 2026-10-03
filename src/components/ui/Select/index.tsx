"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CaretDownIcon, CheckIcon, MagnifyingGlassIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { toneFor } from "@/components/ui/Tag";
import {
  GroupLabel,
  RowLabel,
  RowLeading,
  RowDescription,
  RowMeta,
  RowStack,
  RowText,
  RowTrailing,
  Separator,
  Surface,
} from "@/components/ui/Popover/styles";
import {
  usePopover,
  type PopoverAlign,
  type PopoverSide,
  type PopoverTriggerProps,
} from "@/components/ui/Popover/usePopover";
import {
  Caret,
  Checkbox,
  Chip,
  ChipRemove,
  Control,
  Empty,
  Field,
  FieldHint,
  FieldLabel,
  List,
  More,
  Option,
  Placeholder,
  Required,
  SearchInput,
  SearchRow,
  TriggerButton,
  Value,
} from "./styles";

export type SelectOption<V extends string = string> = {
  value: V;
  label: string;
  /** Texto secundário ao lado do rótulo (ex.: "+55", "@usuario"). */
  meta?: string;
  /** Explicação da opção, numa segunda linha (ex.: o que uma permissão permite). */
  description?: string;
  /** Elemento à esquerda (ex.: <Dot />, <Avatar />). */
  leading?: ReactNode;
  /** Elemento à direita (ex.: <Badge />). */
  trailing?: ReactNode;
  /** Texto extra considerado na busca. */
  keywords?: string;
  disabled?: boolean;
};

export type SelectTriggerProps = PopoverTriggerProps & { open: boolean };

type CommonProps<V extends string> = {
  options: readonly SelectOption<V>[];
  /** Nome do campo (visível no campo padrão; nome acessível sempre). */
  label: string;
  /** Bloco no topo do dropdown (ex.: de quem é a seleção). */
  header?: ReactNode;
  /** Rótulo dentro do dropdown (ex.: "Mover para"). */
  heading?: string;
  /** Mostra a busca. Padrão: ligada quando há mais de 7 opções. */
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  placeholder?: string;
  /** Gatilho próprio; sem ele, usa o campo de formulário. */
  trigger?: (props: SelectTriggerProps) => ReactNode;
  side?: PopoverSide;
  align?: PopoverAlign;
  /** Largura do dropdown (CSS) ou "trigger". Padrão: "trigger" no campo, 15rem no gatilho próprio. */
  width?: string;
  /** Só no campo padrão. */
  hint?: string;
  required?: boolean;
  /** Quantos chips aparecem antes do "+N mais" (seleção múltipla). */
  maxChips?: number;
  /** Permite criar um valor novo a partir do texto buscado. */
  onCreate?: (text: string) => void;
  /** Rótulo da opção de criar (padrão: `Criar "texto"`). */
  createLabel?: (text: string) => string;
};

type SingleProps<V extends string> = CommonProps<V> & {
  multiple?: false;
  value: V | null | undefined;
  onChange: (value: V) => void;
};

type MultipleProps<V extends string> = CommonProps<V> & {
  multiple: true;
  value: readonly V[];
  onChange: (value: V[]) => void;
};

export type SelectProps<V extends string> = SingleProps<V> | MultipleProps<V>;

const CREATE_VALUE = "__create__";

/** Normaliza para busca: sem acentos e sem maiúsculas. */
const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Seleção de valores (padrão WAI-ARIA "listbox"): única ou múltipla, com
 * busca opcional. Setas, Home/End, Enter escolhe, Esc fecha.
 */
export function Select<V extends string>(props: SelectProps<V>) {
  const {
    options,
    label,
    header,
    heading,
    searchPlaceholder = "Buscar...",
    emptyMessage = "Nada encontrado",
    placeholder = "Selecionar",
    trigger,
    side = "bottom",
    align = "start",
    hint,
    required,
    maxChips = 2,
    onCreate,
    createLabel = (text: string) => `Criar “${text}”`,
  } = props;

  const multiple = props.multiple === true;
  const selectedValues = useMemo<readonly V[]>(
    () => (props.multiple ? props.value : props.value != null ? [props.value] : []),
    [props.multiple, props.value],
  );
  const isSelected = (value: V) => selectedValues.includes(value);

  const searchable = props.searchable ?? options.length > 7;
  const width = props.width ?? (trigger ? "15rem" : "trigger");

  const popover = usePopover({ side, align, offset: 6, role: "listbox" });
  const { open, position, contentRef, close } = popover;
  const listboxId = `${popover.id}-listbox`;
  const optionId = (index: number) => `${popover.id}-option-${index}`;

  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return options;
    return options.filter((option) =>
      normalize(`${option.label} ${option.meta ?? ""} ${option.keywords ?? ""}`).includes(q),
    );
  }, [options, query]);

  // Opção extra "Criar …" quando o texto buscado ainda não existe.
  const createText = query.trim();
  const canCreate =
    Boolean(onCreate) &&
    createText.length > 0 &&
    !options.some((option) => normalize(option.label) === normalize(createText));
  const items: SelectOption<V>[] = canCreate
    ? [
        ...filtered,
        {
          value: CREATE_VALUE as V,
          label: createLabel(createText),
          leading: <PlusIcon size={16} weight="bold" />,
        },
      ]
    : [...filtered];

  const enabledIndexes = items.map((option, index) => (option.disabled ? -1 : index)).filter((index) => index >= 0);

  // Ao abrir: limpa a busca, destaca o selecionado e foca busca ou lista.
  const ready = open && position !== null;
  useEffect(() => {
    if (!ready) return;
    setQuery("");
    const selected = options.findIndex((option) => selectedValues.includes(option.value));
    setActiveIndex(selected >= 0 ? selected : 0);
    (searchable ? searchRef.current : listRef.current)?.focus();
    // Só no momento em que abre (as demais dependências não devem reexecutar).
  }, [ready]);

  // Mantém o destacado visível ao navegar pelo teclado.
  useEffect(() => {
    if (!ready) return;
    document.getElementById(optionId(activeIndex))?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, ready]);

  const choose = (option: SelectOption<V> | undefined) => {
    if (!option || option.disabled) return;

    if (option.value === CREATE_VALUE) {
      onCreate?.(createText);
      setQuery("");
      if (!props.multiple) close(true);
      return;
    }

    if (props.multiple) {
      const next = isSelected(option.value)
        ? props.value.filter((value) => value !== option.value)
        : [...props.value, option.value];
      props.onChange(next);
    } else {
      props.onChange(option.value);
      close(true);
    }
  };

  const move = (direction: 1 | -1 | "first" | "last") => {
    if (enabledIndexes.length === 0) return;
    if (direction === "first") return setActiveIndex(enabledIndexes[0]);
    if (direction === "last") return setActiveIndex(enabledIndexes[enabledIndexes.length - 1]);

    const current = enabledIndexes.indexOf(activeIndex);
    const next =
      current === -1
        ? enabledIndexes[0]
        : enabledIndexes[(current + direction + enabledIndexes.length) % enabledIndexes.length];
    setActiveIndex(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const inSearch = event.currentTarget === searchRef.current;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        break;
      case "Home":
      case "End":
        if (inSearch) return;
        event.preventDefault();
        move(event.key === "Home" ? "first" : "last");
        break;
      case "Enter":
        event.preventDefault();
        choose(items[activeIndex]);
        break;
      case " ":
        if (inSearch) return;
        event.preventDefault();
        choose(items[activeIndex]);
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

  const selectedOptions = options.filter((option) => isSelected(option.value));
  const activeId = items[activeIndex] ? optionId(activeIndex) : undefined;

  const content = (
    <Surface
      ref={contentRef}
      id={popover.contentId}
      $side={position?.side ?? side}
      $width={width === "trigger" ? `${popover.triggerWidth}px` : width}
      $ready={position !== null}
      style={position ? { top: position.top, left: position.left } : { top: 0, left: 0 }}
    >
      {searchable && (
        <SearchRow>
          <MagnifyingGlassIcon size={16} aria-hidden />
          <SearchInput
            ref={searchRef}
            type="search"
            role="combobox"
            aria-label={`Buscar em ${label}`}
            aria-expanded
            aria-controls={listboxId}
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            placeholder={searchPlaceholder}
            autoComplete="off"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
        </SearchRow>
      )}

      {header && (
        <>
          {header}
          <Separator role="presentation" />
        </>
      )}

      {heading && <GroupLabel>{heading}</GroupLabel>}

      <List
        ref={listRef}
        data-sheet-scroll=""
        id={listboxId}
        role="listbox"
        aria-label={label}
        aria-multiselectable={multiple || undefined}
        aria-activedescendant={searchable ? undefined : activeId}
        tabIndex={searchable ? -1 : 0}
        onKeyDown={searchable ? undefined : handleKeyDown}
      >
        {items.length === 0 && <Empty role="presentation">{emptyMessage}</Empty>}

        {items.map((option, index) => {
          const selected = option.value !== CREATE_VALUE && isSelected(option.value);
          return (
            <Option
              key={option.value}
              id={optionId(index)}
              role="option"
              aria-selected={selected}
              aria-disabled={option.disabled || undefined}
              $active={index === activeIndex}
              $selected={selected}
              // Mantém o foco na busca/lista ao clicar
              onMouseDown={(event) => event.preventDefault()}
              onPointerMove={() => index !== activeIndex && setActiveIndex(index)}
              onClick={() => choose(option)}
            >
              {multiple && option.value !== CREATE_VALUE && (
                <Checkbox $checked={selected} aria-hidden>
                  {selected && <CheckIcon size={11} weight="bold" />}
                </Checkbox>
              )}
              {option.leading && <RowLeading aria-hidden>{option.leading}</RowLeading>}
              {option.description ? (
                <RowStack>
                  <RowText>{option.label}</RowText>
                  <RowDescription>{option.description}</RowDescription>
                </RowStack>
              ) : (
                <RowLabel>
                  <RowText>{option.label}</RowText>
                  {option.meta && <RowMeta>{option.meta}</RowMeta>}
                </RowLabel>
              )}
              {option.trailing && <RowTrailing>{option.trailing}</RowTrailing>}
              {!multiple && selected && !option.trailing && (
                <RowTrailing>
                  <CheckIcon size={16} weight="bold" aria-hidden />
                </RowTrailing>
              )}
            </Option>
          );
        })}
      </List>
    </Surface>
  );

  const portal = open && createPortal(content, document.body);

  if (trigger) {
    return (
      <>
        {trigger({ ...popover.triggerProps, open })}
        {portal}
      </>
    );
  }

  /* ---------- Campo padrão (formulários) ---------- */

  const chips = multiple ? selectedOptions.slice(0, maxChips) : [];
  const hidden = multiple ? selectedOptions.length - chips.length : 0;
  const single = !multiple ? selectedOptions[0] : undefined;

  const remove = (value: V) => {
    if (props.multiple) props.onChange(props.value.filter((item) => item !== value));
  };

  return (
    <Field>
      <FieldLabel htmlFor={popover.triggerProps.id}>
        {label}
        {required && <Required aria-hidden>*</Required>}
        {hint && <FieldHint>{hint}</FieldHint>}
      </FieldLabel>

      <Control
        $open={open}
        onClick={(event) => {
          // Clique na área vazia do campo também abre.
          if (event.target === event.currentTarget) popover.triggerRef.current?.click();
        }}
      >
        {chips.map((option) => (
          <Chip key={option.value} $tone={toneFor(option.label)}>
            {option.label}
            <ChipRemove type="button" aria-label={`Remover ${option.label}`} onClick={() => remove(option.value)}>
              <XIcon size={11} weight="bold" aria-hidden />
            </ChipRemove>
          </Chip>
        ))}

        <TriggerButton type="button" {...popover.triggerProps} aria-required={required || undefined}>
          {single ? (
            <Value>
              {single.leading}
              {single.label}
            </Value>
          ) : chips.length === 0 ? (
            <Placeholder>{placeholder}</Placeholder>
          ) : hidden > 0 ? (
            <More>+{hidden} mais</More>
          ) : null}
          <Caret $open={open} aria-hidden>
            <CaretDownIcon size={16} />
          </Caret>
        </TriggerButton>
      </Control>

      {portal}
    </Field>
  );
}
