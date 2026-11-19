"use client";

import { Suspense, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { LockedModule } from "@/components/layout/LockedModule";
import { NavigationProgress } from "@/components/layout/NavigationProgress";
import { HeaderActionsProvider } from "@/components/layout/Header/HeaderActions";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarProvider } from "@/components/layout/Sidebar/SidebarContext";
import { Main, Panel, Root, SkipLink } from "./styles";
import { findLockedModule } from "@/lib/navigation";
import { useVisualViewport } from "@/lib/useVisualViewport";

type AppShellProps = {
  children: ReactNode;
  defaultSidebarExpanded?: boolean;
};

/** Estrutura das telas internas: header, sidebar e painel de conteúdo. */
export function AppShell({ children, defaultSidebarExpanded }: AppShellProps) {
  useVisualViewport();
  // Módulo em produção (`soon` no menu): a tela de bloqueio entra no lugar da página, inclusive nas seções e nos
  // registros dele (ex.: /pedidos/123), mesmo quando a página já existe.
  const locked = findLockedModule(usePathname());
  return (
    <SidebarProvider defaultExpanded={defaultSidebarExpanded}>
      <HeaderActionsProvider>
        <Root>
          <Suspense>
            <NavigationProgress />
          </Suspense>
          <SkipLink href="#conteudo">Pular para o conteúdo</SkipLink>
          <Header />
          <Sidebar />
          <Panel>
            <Main id="conteudo" tabIndex={-1}>
              {locked ? <LockedModule href={locked.href} /> : children}
            </Main>
          </Panel>
          <MobileNav />
        </Root>
      </HeaderActionsProvider>
    </SidebarProvider>
  );
}
