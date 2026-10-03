"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowRightIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CircleHalfIcon,
  ListIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  SignOutIcon,
  SunIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { navigation, type NavModule, type NavTab } from "@/config/navigation";
import { isPathActive } from "@/lib/navigation";
import { DOCK_EASE, useDockActions, useDockPager } from "@/lib/dock";
import { usePresence } from "@/lib/presence";
import { useSheetDrag } from "@/lib/sheetDrag";
import { DOCK_ATTRIBUTE, SHEET_BACKDROP_ATTRIBUTE, useSheet, useTopSheet } from "@/lib/sheets";
import { useAccessibility } from "@/providers/accessibility";
import { useUnreadConversations } from "@/features/leads/store";
import { NotificationsMenu } from "@/features/notifications/components/NotificationsMenu";
import { openSearch } from "@/features/search/open";
import { useCurrentUser } from "@/features/settings/store";
import {
  Backdrop,
  Chevron,
  Count,
  Dock,
  DockButton,
  DockDot,
  DockAction,
  DockInner,
  DockPage,
  DockPagerGroup,
  DockSearch,
  Empty,
  List,
  PlainButton,
  Profile,
  Row,
  RowButton,
  RowStatic,
  Search,
  Separator,
  Sheet,
  SheetBackdrop,
  SheetScroll,
  SubHead,
  ThemeOption,
  ThemeSwitch,
} from "./styles";

const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const main = navigation.main as readonly NavModule[];
const secondary = navigation.secondary as readonly NavModule[];
const account = navigation.account as readonly NavModule[];
const support = navigation.support as readonly NavModule[];

/* ---------- Dock ---------- */

/**
 * Barra flutuante do celular, sempre visível: busca geral e menu. Com algo
 * aberto por cima (dropdown, janela, busca ou o próprio menu), o botão daquilo
 * vira "fechar".
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const unread = useUnreadConversations();
  const top = useTopSheet();
  const pager = useDockPager();
  const actions = useDockActions();

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, []);

  // Fundo dos dropdowns e o menu saem suaves (ficam na tela o tempo da saída)
  const backdrop = usePresence(Boolean(top?.backdrop));
  const menu = usePresence(open);

  const innerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | undefined>(undefined);
  // Onde cada botão estava (pelo data-dock-key), para deslizar até o novo lugar
  const positions = useRef(new Map<string, number>());

  // Folha aberta: trava a rolagem da página de trás (só vale no celular, pelo CSS)
  const sheetOpen = top !== null || open;
  useEffect(() => {
    document.documentElement.toggleAttribute("data-sheet-open", sheetOpen);
    return () => document.documentElement.removeAttribute("data-sheet-open");
  }, [sheetOpen]);

  const menuOnTop = top?.kind === "menu";
  // Algo aberto que não é o menu (dropdown, janela, busca): o botão da esquerda fecha
  const otherOnTop = top !== null && !menuOnTop;

  const dockProps = { [DOCK_ATTRIBUTE]: "" };
  // Com algo aberto por cima, o fechar manda; depois as ações da tela, o paginador e o padrão
  const showActions = !otherOnTop && !open && actions !== null;
  const mode = otherOnTop
    ? `close-${(top?.actions ?? []).map((item) => item.id).join(",")}`
    : showActions
      ? `actions-${actions.items.map((item) => `${item.id}${item.disabled ? "-off" : ""}`).join(",")}-${Boolean(actions.onClose)}`
      : pager && !open
        ? `pager-${pager.current}-${pager.total}`
        : menuOnTop
          ? "menu"
          : "browse";

  // Mede o conteúdo e anima a largura (encolhe para [✕ | ☰], cresce com "Buscar"):
  // logo depois de cada troca de modo e sempre que o conteúdo mudar de tamanho
  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    setWidth(inner.offsetWidth + 2);

    // Botões que continuam deslizam do lugar antigo ao novo (os novos entram
    // pela animação do CSS). O conteúdo fica centrado no dock, então a posição
    // final não depende da largura que ainda está animando.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = new Map<string, number>();
    for (const child of Array.from(inner.children) as HTMLElement[]) {
      const key = child.dataset.dockKey;
      if (!key) continue;
      const left = child.getBoundingClientRect().left;
      next.set(key, left);
      const previous = positions.current.get(key);
      if (!reduce && previous !== undefined && Math.abs(previous - left) > 0.5) {
        child.animate([{ transform: `translateX(${previous - left}px)` }, { transform: "none" }], {
          duration: 380,
          easing: DOCK_EASE,
        });
      }
    }
    positions.current = next;
  }, [mode, unread]);

  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const observer = new ResizeObserver(() => setWidth(inner.offsetWidth + 2));
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {backdrop.present && (
        <SheetBackdrop
          {...{ [SHEET_BACKDROP_ATTRIBUTE]: "" }}
          data-closing={backdrop.closing ? "" : undefined}
          aria-hidden
          onClick={() => top?.backdrop && top.close()}
        />
      )}
      <Dock role="navigation" aria-label="Atalhos" style={{ width }} {...dockProps}>
        <DockInner ref={innerRef}>
          {otherOnTop && top?.actions?.length ? (
            <>
              {/* Folha aberta com ações próprias (ex.: ficha do cliente): as ações e o fechar */}
              {top.actions.map((item) => (
                <DockAction
                  key={item.id}
                  data-dock-key={item.id}
                  type="button"
                  aria-label={item.label}
                  title={item.label}
                  disabled={item.disabled}
                  $primary={Boolean(item.primary)}
                  $wide={Boolean(item.text)}
                  onClick={item.onClick}
                  style={item.color ? { color: item.color } : undefined}
                >
                  <item.icon size={19} weight={item.primary ? "bold" : "regular"} aria-hidden />
                  {item.text && <span>{item.text}</span>}
                </DockAction>
              ))}
              <DockButton
                key="close"
                data-dock-key="close"
                type="button"
                aria-label="Fechar"
                onClick={() => top.close()}
              >
                <XIcon size={20} aria-hidden />
              </DockButton>
            </>
          ) : otherOnTop ? (
            <DockButton
              key="close"
              data-dock-key="close"
              type="button"
              aria-label="Fechar"
              onClick={() => top?.close()}
            >
              <XIcon size={20} aria-hidden />
            </DockButton>
          ) : showActions ? (
            <>
              {/* Ações da tela aberta (ex.: anexar, áudio, enviar; avançar etapa) */}
              {actions.items.map((item) => (
                <DockAction
                  key={item.id}
                  data-dock-key={item.id}
                  type="button"
                  aria-label={item.label}
                  title={item.label}
                  disabled={item.disabled}
                  $primary={Boolean(item.primary)}
                  $wide={Boolean(item.text)}
                  onClick={item.onClick}
                  style={item.color ? { color: item.color } : undefined}
                >
                  <item.icon size={19} weight={item.primary ? "bold" : "regular"} aria-hidden />
                  {item.text && <span>{item.text}</span>}
                </DockAction>
              ))}
              {actions.onClose && (
                <>
                  <DockButton
                    key="screen-close"
                    data-dock-key="screen-close"
                    type="button"
                    aria-label={actions.closeLabel ?? "Fechar"}
                    onClick={actions.onClose}
                  >
                    <XIcon size={20} aria-hidden />
                  </DockButton>
                </>
              )}
            </>
          ) : pager && !open ? (
            <>
              {/* Tela com páginas (ex.: etapas do kanban): busca só no ícone e o paginador no meio */}
              <DockButton
                key="search-icon"
                data-dock-key="search-icon"
                type="button"
                aria-label="Buscar no sistema"
                onClick={() => openSearch()}
              >
                <MagnifyingGlassIcon size={20} aria-hidden />
              </DockButton>
              <DockPagerGroup key="pager" data-dock-key="pager">
                <DockButton
                  key="prev"
                  type="button"
                  aria-label="Etapa anterior"
                  disabled={pager.current <= 1}
                  onClick={pager.onPrev}
                >
                  <CaretLeftIcon size={18} weight="bold" aria-hidden />
                </DockButton>
                <DockPage key="page" aria-live="polite" title={pager.label}>
                  <strong>{pager.current}</strong>/{pager.total}
                  <span className="sr-only">, {pager.label}</span>
                </DockPage>
                <DockButton
                  key="next"
                  type="button"
                  aria-label="Próxima etapa"
                  disabled={pager.current >= pager.total}
                  onClick={pager.onNext}
                >
                  <CaretRightIcon size={18} weight="bold" aria-hidden />
                </DockButton>
              </DockPagerGroup>
            </>
          ) : (
            <DockSearch
              key="search"
              data-dock-key="search"
              type="button"
              aria-label="Buscar no sistema"
              onClick={() => {
                if (open) setOpen(false);
                openSearch();
              }}
            >
              <MagnifyingGlassIcon size={19} aria-hidden />
              Buscar
            </DockSearch>
          )}
          {menuOnTop ? (
            <DockButton
              key="close-menu"
              data-dock-key="close-menu"
              type="button"
              aria-label="Fechar menu"
              onClick={close}
            >
              <XIcon size={20} aria-hidden />
            </DockButton>
          ) : (
            <DockButton
              key="menu"
              data-dock-key="menu"
              ref={menuButtonRef}
              type="button"
              aria-label={unread > 0 ? `Abrir menu, ${unread} conversas não lidas` : "Abrir menu"}
              aria-haspopup="dialog"
              aria-expanded={open}
              onClick={() => {
                if (otherOnTop) top?.close();
                setOpen(true);
              }}
            >
              <ListIcon size={22} aria-hidden />
              {unread > 0 && <DockDot aria-hidden />}
            </DockButton>
          )}
        </DockInner>
      </Dock>

      {menu.present && <MobileMenu onClose={close} closing={menu.closing} />}
    </>
  );
}

/* ---------- Menu ---------- */

type Item = {
  key: string;
  label: string;
  href: string;
  icon?: NavModule["icon"];
  locked: boolean;
  tabs?: readonly NavTab[];
};

const toItem = (module: NavModule): Item => ({
  key: module.href,
  label: module.label,
  href: module.overview === false && module.tabs?.length ? module.tabs[0].href : module.href,
  icon: module.icon,
  locked: Boolean(module.soon),
  tabs: module.soon ? undefined : module.tabs,
});

function MobileMenu({ onClose, closing }: { onClose: () => void; closing: boolean }) {
  const pathname = usePathname();
  const sheetRef = useRef<HTMLDivElement>(null);
  const openedAt = useRef(pathname);
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<Item | null>(null);
  const unread = useUnreadConversations();
  const user = useCurrentUser();
  const { settings, update } = useAccessibility();
  useSheet(!closing, onClose, "menu");
  useSheetDrag(sheetRef, onClose, !closing);

  // Foco no menu ao abrir (sem abrir o teclado); Esc fecha
  useEffect(() => {
    sheetRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Navegou: fecha
  useEffect(() => {
    if (pathname !== openedAt.current) onClose();
  }, [pathname, onClose]);

  const primary = main.filter((module) => !module.soon).map(toItem);
  const locked = main.filter((module) => module.soon).map(toItem);
  const settingsItems = secondary.map(toItem);

  /** Busca: módulos, seções e conta num resultado só. */
  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return [];
    const all: Item[] = [
      ...main.map(toItem),
      ...secondary.flatMap((module) => [
        toItem(module),
        ...(module.tabs ?? []).map((tab) => ({
          key: tab.href,
          label: `${tab.label}`,
          href: tab.href,
          icon: module.icon,
          locked: false,
        })),
      ]),
      ...account.map(toItem),
      ...support.map(toItem),
    ];
    const seen = new Set<string>();
    return all.filter((item) => {
      if (seen.has(item.label) || !normalize(item.label).includes(q)) return false;
      seen.add(item.label);
      return true;
    });
  }, [query]);

  const row = (item: Item) => {
    const active = isPathActive(pathname, item.key);
    const badge =
      item.key === "/conversas" && unread > 0 ? (
        <Count aria-label={`${unread} não lidas`}>{unread}</Count>
      ) : item.locked ? (
        <Badge tone="peach">Produção</Badge>
      ) : null;

    if (item.tabs?.length) {
      return (
        <li key={item.key}>
          <RowButton type="button" onClick={() => setSection(item)} aria-current={active ? "page" : undefined}>
            {item.icon && <item.icon size={20} aria-hidden />}
            <span>{item.label}</span>
            <Chevron aria-hidden>
              <CaretRightIcon size={16} />
            </Chevron>
          </RowButton>
        </li>
      );
    }

    return (
      <li key={item.key}>
        <Row
          href={item.href}
          aria-current={active ? "page" : undefined}
          data-locked={item.locked || undefined}
          onClick={onClose}
        >
          {item.icon && <item.icon size={20} aria-hidden />}
          <span>{item.label}</span>
          {badge}
        </Row>
      </li>
    );
  };

  const dark = settings.appearance === "dark";

  return (
    <>
      <Backdrop aria-hidden data-closing={closing ? "" : undefined} onClick={onClose} />
      <Sheet
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        tabIndex={-1}
        data-closing={closing ? "" : undefined}
      >
        <SheetScroll>
          {section ? (
            <>
              <SubHead>
                <PlainButton type="button" onClick={() => setSection(null)} aria-label="Voltar ao menu">
                  <CaretLeftIcon size={20} />
                </PlainButton>
                <strong>{section.label}</strong>
              </SubHead>
              <List>
                {(section.tabs ?? []).map((tab) => (
                  <li key={tab.href}>
                    <Row href={tab.href} aria-current={pathname === tab.href ? "page" : undefined} onClick={onClose}>
                      <span>{tab.label}</span>
                      <Chevron aria-hidden>
                        <CaretRightIcon size={16} />
                      </Chevron>
                    </Row>
                  </li>
                ))}
              </List>
            </>
          ) : (
            <>
              <Search>
                <MagnifyingGlassIcon size={18} aria-hidden />
                <input
                  type="search"
                  aria-label="Buscar no menu"
                  placeholder="Buscar"
                  autoComplete="off"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && query.trim()) {
                      onClose();
                      openSearch(query.trim());
                    }
                  }}
                />
              </Search>

              {query.trim() ? (
                <List>
                  {results.map(row)}
                  {results.length === 0 && (
                    <li>
                      <Empty>Nada no menu com “{query.trim()}”.</Empty>
                    </li>
                  )}
                  <li>
                    <RowButton
                      type="button"
                      onClick={() => {
                        onClose();
                        openSearch(query.trim());
                      }}
                    >
                      <MagnifyingGlassIcon size={20} aria-hidden />
                      <span>Buscar “{query.trim()}” em todo o sistema</span>
                      <Chevron aria-hidden>
                        <ArrowRightIcon size={16} />
                      </Chevron>
                    </RowButton>
                  </li>
                </List>
              ) : (
                <>
                  <List aria-label="Módulos">{primary.map(row)}</List>
                  <Separator />
                  <List aria-label="Em produção">{locked.map(row)}</List>
                  <Separator />
                  <List aria-label="Configurações">{settingsItems.map(row)}</List>

                  {user && (
                    <Profile>
                      <Avatar name={user.name} seed={user.seed} src={user.avatarUrl} size="md" shape="circle" />
                      <div>
                        <strong>{user.name}</strong>
                        <small>{user.role}</small>
                      </div>
                      <NotificationsMenu />
                    </Profile>
                  )}

                  <Separator />

                  <List aria-label="Conta">
                    {account.map((module) => row(toItem(module)))}
                    <li>
                      <RowStatic>
                        <CircleHalfIcon size={20} aria-hidden />
                        <span>Tema</span>
                        <ThemeSwitch role="radiogroup" aria-label="Tema">
                          <ThemeOption
                            type="button"
                            role="radio"
                            aria-checked={!dark}
                            aria-label="Claro"
                            $active={!dark}
                            onClick={() => update({ appearance: "light" })}
                          >
                            <SunIcon size={16} weight={dark ? "regular" : "fill"} />
                          </ThemeOption>
                          <ThemeOption
                            type="button"
                            role="radio"
                            aria-checked={dark}
                            aria-label="Escuro"
                            $active={dark}
                            onClick={() => update({ appearance: "dark" })}
                          >
                            <MoonIcon size={16} weight={dark ? "fill" : "regular"} />
                          </ThemeOption>
                        </ThemeSwitch>
                      </RowStatic>
                    </li>
                    {support.map((module) => row(toItem(module)))}
                    <li>
                      {/* TODO: encerrar a sessão quando a autenticação existir */}
                      <RowButton type="button" onClick={onClose}>
                        <SignOutIcon size={20} aria-hidden />
                        <span>Sair da conta</span>
                      </RowButton>
                    </li>
                  </List>
                </>
              )}
            </>
          )}
        </SheetScroll>
      </Sheet>
    </>
  );
}
