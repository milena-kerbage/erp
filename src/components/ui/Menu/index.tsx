"use client";

import {
  createContext,
  useContext,
  useEffect,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { CheckIcon, PlusIcon } from "@phosphor-icons/react";
import { renderIcon, type IconSource } from "@/lib/icons";
import {
  Count,
  GroupLabel,
  RowLabel,
  RowLeading,
  RowMeta,
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
import { AddHint, Header, ItemButton, ItemLink, Note } from "./styles";

export type MenuSide = PopoverSide;
export type MenuAlign = PopoverAlign;
export type MenuTriggerProps = PopoverTriggerProps;

type MenuProps = {
  /** Renderiza o gatilho; espalhe as props recebidas nele. */
  trigger: (props: MenuTriggerProps) => ReactNode;
  children: ReactNode;
  /** Nome acessível do menu. */
  label: string;
  side?: MenuSide;
  align?: MenuAlign;
  offset?: number;
  /** Largura fixa (CSS) ou `"trigger"` para acompanhar a largura do gatilho. */
  width?: string;
};

const MenuContext = createContext<{ close: () => void; focusMenu: () => void } | null>(null);

const ITEM_SELECTOR = '[role="menuitem"]:not([aria-disabled="true"])';

/**
 * Menu de ações (padrão WAI-ARIA "menu button"): setas, Home/End, Esc devolve
 * o foco ao gatilho, clique fora fecha. Para escolher valores, use `Select`.
 */
export function Menu({
  trigger,
  children,
  label,
  side = "bottom",
  align = "start",
  offset = 8,
  width = "15rem",
}: MenuProps) {
  const popover = usePopover({ side, align, offset, role: "menu" });
  const { open, position, contentRef, viaKeyboardRef, close } = popover;

  const getItems = () =>
    Array.from(contentRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []);

  // Foco inicial: primeiro item (teclado) ou o próprio menu (mouse).
  const ready = open && position !== null;
  useEffect(() => {
    if (!ready) return;
    if (viaKeyboardRef.current) getItems()[0]?.focus();
    else contentRef.current?.focus();
  }, [ready]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = getItems();
    const index = items.indexOf(document.activeElement as HTMLElement);

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        items[(index + 1) % items.length]?.focus();
        break;
      case "ArrowUp":
        event.preventDefault();
        items[(index - 1 + items.length) % items.length]?.focus();
        break;
      case "Home":
        event.preventDefault();
        items[0]?.focus();
        break;
      case "End":
        event.preventDefault();
        items[items.length - 1]?.focus();
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

  return (
    <>
      {trigger(popover.triggerProps)}

      {open &&
        createPortal(
          <MenuContext.Provider
            value={{ close: () => close(true), focusMenu: () => contentRef.current?.focus() }}
          >
            <Surface
              ref={contentRef}
              id={popover.contentId}
              role="menu"
              aria-label={label}
              tabIndex={-1}
              $side={position?.side ?? side}
              $width={width === "trigger" ? `${popover.triggerWidth}px` : width}
              $ready={position !== null}
              style={position ? { top: position.top, left: position.left } : { top: 0, left: 0 }}
              onKeyDown={handleKeyDown}
            >
              {children}
            </Surface>
          </MenuContext.Provider>,
          document.body,
        )}
    </>
  );
}

type MenuItemProps = {
  children: ReactNode;
  /** Texto secundário ao lado do rótulo. */
  meta?: string;
  icon?: IconSource;
  /** Elemento no lugar do ícone (ex.: <Dot />, <Avatar />). */
  leading?: ReactNode;
  href?: string;
  onSelect?: () => void;
  /** Conteúdo no fim do item (badge, contador, "+"). */
  trailing?: ReactNode;
  /** Item atual: mostra o check e marca aria-current. */
  selected?: boolean;
  /** Ação secundária, em cinza (ex.: "Sair"). */
  muted?: boolean;
  /** Módulo em produção: item apagado (continua clicável). */
  locked?: boolean;
  disabled?: boolean;
};

export function MenuItem({
  children,
  meta,
  icon,
  leading,
  href,
  onSelect,
  trailing,
  selected = false,
  muted = false,
  locked = false,
  disabled = false,
}: MenuItemProps) {
  const menu = useContext(MenuContext);

  const content = (
    <>
      {(leading || icon) && (
        <RowLeading aria-hidden>
          {leading ?? (icon && renderIcon(icon, { size: 18 }))}
        </RowLeading>
      )}
      <RowLabel>
        <RowText>{children}</RowText>
        {meta && <RowMeta>{meta}</RowMeta>}
      </RowLabel>
      {(trailing || selected) && (
        <RowTrailing>{trailing ?? <CheckIcon size={16} weight="bold" aria-hidden />}</RowTrailing>
      )}
    </>
  );

  const common = {
    role: "menuitem",
    tabIndex: -1,
    $selected: selected,
    $muted: muted,
    "aria-disabled": disabled || undefined,
    "data-locked": locked || undefined,
    "aria-current": selected ? ("page" as const) : undefined,
    onClick: () => {
      if (disabled) return;
      onSelect?.();
      menu?.close();
    },
    // Hover move o foco (como em menus nativos): um único item destacado.
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
      if (document.activeElement !== event.currentTarget) event.currentTarget.focus();
    },
    onPointerLeave: () => menu?.focusMenu(),
  };

  return href && !disabled ? (
    <ItemLink href={href} {...common}>
      {content}
    </ItemLink>
  ) : (
    <ItemButton type="button" {...common}>
      {content}
    </ItemButton>
  );
}

export function MenuSeparator() {
  return <Separator role="separator" />;
}

/** Rótulo de um grupo de itens. */
export function MenuLabel({ children }: { children: ReactNode }) {
  return <GroupLabel role="presentation">{children}</GroupLabel>;
}

/** Bloco não interativo no topo do menu. */
export function MenuHeader({ children }: { children: ReactNode }) {
  return <Header role="presentation">{children}</Header>;
}

/** Texto informativo entre grupos. */
export function MenuNote({ children }: { children: ReactNode }) {
  return <Note role="presentation">{children}</Note>;
}

/** Contador para o `trailing` de um item (ex.: "+8"). */
export function MenuCount({ children }: { children: ReactNode }) {
  return <Count>{children}</Count>;
}

/** Indicador "+" para o `trailing` de um item. */
export function MenuAddHint() {
  return (
    <AddHint aria-hidden>
      <PlusIcon size={12} weight="bold" />
    </AddHint>
  );
}
