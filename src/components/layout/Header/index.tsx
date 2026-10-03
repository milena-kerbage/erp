"use client";

import { usePathname } from "next/navigation";
import { useTheme } from "@emotion/react";
import { SidebarSimpleIcon } from "@phosphor-icons/react";
import { SIDEBAR_NAV_ID, useSidebar } from "@/components/layout/Sidebar/SidebarContext";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { IconButton } from "@/components/ui/IconButton";
import { Logo } from "@/components/ui/Logo";
import { SearchTrigger } from "@/features/search/components/SearchTrigger";
import { firstAvailableHref, getBreadcrumbs } from "@/lib/navigation";
import { NotificationsMenu } from "@/features/notifications/components/NotificationsMenu";
import { useHeaderActionsTarget, useHeaderTitle } from "./HeaderActions";
import { Avatar } from "@/components/ui/Avatar";
import { useCurrentUser } from "@/features/settings/store";
import { Brand, DesktopOnly, Divider, MobileLead, PageActions, Root, Start, Title, Tools } from "./styles";

/**
 * Esquerda: menu, logo e trilha.
 * Centro (do espaço livre): nome da página.
 * Direita: busca, notificações e as ações da página (via <HeaderActions>).
 */
export function Header() {
  const pathname = usePathname();
  const theme = useTheme();
  const { expanded, toggle } = useSidebar();
  const setActionsTarget = useHeaderActionsTarget();
  const user = useCurrentUser();

  const pageTitle = useHeaderTitle();

  // Páginas de detalhe (ex.: um lead) acrescentam o próprio nome à trilha.
  const crumbs = getBreadcrumbs(pathname);
  if (pageTitle) crumbs.push({ label: pageTitle, href: pathname });
  const current = crumbs[crumbs.length - 1];

  return (
    <Root>
      <Start>
        <Brand>
          <DesktopOnly>
            <IconButton
              icon={SidebarSimpleIcon}
              label={expanded ? "Recolher menu" : "Expandir menu"}
              variant="ghost"
              tooltip="bottom"
              aria-expanded={expanded}
              aria-controls={SIDEBAR_NAV_ID}
              onClick={toggle}
            />
          </DesktopOnly>
          <DesktopOnly>
            <Logo size={30} tone={theme.mode === "dark" ? "white" : "black"} href={firstAvailableHref} />
          </DesktopOnly>
        </Brand>
        <MobileLead>
          {pathname === "/" && user ? (
            <>
              <Avatar name={user.name} seed={user.seed} src={user.avatarUrl} size="md" shape="circle" />
              <strong>{user.name}</strong>
            </>
          ) : (
            current && <h1>{current.label}</h1>
          )}
        </MobileLead>
        <Divider aria-hidden />
        <DesktopOnly>
          <Breadcrumbs items={crumbs} />
        </DesktopOnly>
      </Start>

      {current ? (
        <Title>{current.label}</Title>
      ) : (
        <span />
      )}

      <Tools>
        <SearchTrigger />
        <DesktopOnly>
          <NotificationsMenu />
        </DesktopOnly>
        <PageActions ref={setActionsTarget} />
      </Tools>
    </Root>
  );
}
