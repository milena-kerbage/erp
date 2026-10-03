"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import styled from "@emotion/styled";
import { useIsMobile } from "@/lib/useMediaQuery";

type PageTitleEntry = { title: string; path: string };

type HeaderContextValue = {
  target: HTMLElement | null;
  setTarget: (element: HTMLElement | null) => void;
  /** Celular (sem header): onde a página recebe esses botões (`MobileHeaderSlot`). */
  mobileTarget: HTMLElement | null;
  setMobileTarget: (element: HTMLElement | null) => void;
  /** Título da página vindo de dados (ex.: nome do lead), com a rota a que pertence. */
  title: PageTitleEntry | null;
  setTitle: (title: PageTitleEntry | null) => void;
};

const HeaderContext = createContext<HeaderContextValue | null>(null);

export function HeaderActionsProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [mobileTarget, setMobileTarget] = useState<HTMLElement | null>(null);
  const [title, setTitle] = useState<PageTitleEntry | null>(null);
  const value = useMemo(
    () => ({ target, setTarget, mobileTarget, setMobileTarget, title, setTitle }),
    [target, mobileTarget, title],
  );

  return <HeaderContext.Provider value={value}>{children}</HeaderContext.Provider>;
}

/** Usado pelo Header para registrar onde as ações são renderizadas. */
export function useHeaderActionsTarget() {
  return useContext(HeaderContext)?.setTarget;
}

/**
 * Usado pelo Header para ler o título definido pela página. Só vale na rota
 * que o definiu — evita mostrar o título anterior durante a navegação.
 */
export function useHeaderTitle() {
  const pathname = usePathname();
  const entry = useContext(HeaderContext)?.title;
  return entry && entry.path === pathname ? entry.title : null;
}

/**
 * Coloca botões de ação no canto direito do header a partir de qualquer
 * página. Somem sozinhos ao sair da página.
 *
 * @example
 * <HeaderActions>
 *   <Button icon={PlusIcon} href="/pedidos/novo">Novo pedido</Button>
 * </HeaderActions>
 */
export function HeaderActions({ children }: { children: ReactNode }) {
  const context = useContext(HeaderContext);
  const mobile = useIsMobile();
  // Celular: não há header; os botões vão para o espaço da própria página (se houver)
  const target = mobile ? context?.mobileTarget : context?.target;
  if (!target) return null;
  return createPortal(children, target);
}

/**
 * Celular: lugar da página que recebe os botões do header (ex.: ao lado da
 * saudação do Painel ou do título das Configurações). Botões com ícone viram
 * quadradinhos só com o ícone. No desktop não aparece.
 */
const Slot = styled.div`
  display: none;

  ${({ theme }) => theme.media.md} {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: ${({ theme }) => theme.spacing(2)};

    &:empty {
      display: none;
    }

    & > a:not([data-keep-label]):has(> [data-icon="start"]),
    & > button:not([data-keep-label]):has(> [data-icon="start"]) {
      width: 2.25rem;
      padding: 0;
      justify-content: center;
    }

    & > a:not([data-keep-label]):has(> [data-icon="start"]) > [data-button-label],
    & > button:not([data-keep-label]):has(> [data-icon="start"]) > [data-button-label] {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }

    & > a:not([data-keep-label]):has(> [data-icon="start"]) > [data-icon="end"],
    & > button:not([data-keep-label]):has(> [data-icon="start"]) > [data-icon="end"] {
      display: none;
    }
  }
`;

export function MobileHeaderSlot({ className }: { className?: string }) {
  const setMobileTarget = useContext(HeaderContext)?.setMobileTarget;
  return <Slot className={className} ref={setMobileTarget} />;
}

/**
 * Define o título de páginas cujo nome vem de dados (ex.: detalhe de um
 * lead). Ele aparece no centro do header e como último item da trilha.
 */
export function PageTitle({ children }: { children: string }) {
  const setTitle = useContext(HeaderContext)?.setTitle;
  const pathname = usePathname();

  useEffect(() => {
    setTitle?.({ title: children, path: pathname });
    return () => setTitle?.(null);
  }, [children, pathname, setTitle]);

  return null;
}
