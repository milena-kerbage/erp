"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SIDEBAR_COOKIE, SIDEBAR_EXPANDED } from "./constants";

type SidebarContextValue = {
  expanded: boolean;
  toggle: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

function persist(expanded: boolean) {
  const value = expanded ? SIDEBAR_EXPANDED : "collapsed";
  document.cookie = `${SIDEBAR_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
}

/** Estado da sidebar compartilhado entre ela e o botão no header. */
export function SidebarProvider({
  children,
  defaultExpanded = false,
}: {
  children: ReactNode;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const pathname = usePathname();
  const firstRender = useRef(true);

  // Ao abrir outra página o menu recolhe, deixando o espaço para o conteúdo.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setExpanded((current) => {
      if (current) persist(false);
      return false;
    });
  }, [pathname]);

  const value = useMemo(
    () => ({
      expanded,
      toggle: () => {
        const next = !expanded;
        setExpanded(next);
        persist(next);
      },
    }),
    [expanded],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar precisa estar dentro de <SidebarProvider>");
  return context;
}

export const SIDEBAR_NAV_ID = "menu-principal";
