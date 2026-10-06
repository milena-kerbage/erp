"use client";

import { Suspense, type ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { NavigationProgress } from "@/components/layout/NavigationProgress";
import { HeaderActionsProvider } from "@/components/layout/Header/HeaderActions";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarProvider } from "@/components/layout/Sidebar/SidebarContext";
import { Main, Panel, Root, SkipLink } from "./styles";
import { useVisualViewport } from "@/lib/useVisualViewport";

type AppShellProps = {
  children: ReactNode;
  defaultSidebarExpanded?: boolean;
};

/** Estrutura das telas internas: header, sidebar e painel de conteúdo. */
export function AppShell({ children, defaultSidebarExpanded }: AppShellProps) {
  useVisualViewport();
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
              {children}
            </Main>
          </Panel>
          <MobileNav />
        </Root>
      </HeaderActionsProvider>
    </SidebarProvider>
  );
}
