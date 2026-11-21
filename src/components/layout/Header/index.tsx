"use client";

import { usePathname } from "next/navigation";
import { useTheme } from "@emotion/react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Logo } from "@/components/ui/Logo";
import { SearchTrigger } from "@/features/search/components/SearchTrigger";
import { firstAvailableHref, getBreadcrumbs } from "@/lib/navigation";
import { NotificationsMenu } from "@/features/notifications/components/NotificationsMenu";
import { useCurrentUser } from "@/features/settings/store";
import { useHeaderActionsTarget, useHeaderTitle } from "./HeaderActions";
import { MenuConta } from "./MenuConta";
import { NavPrincipal } from "./NavPrincipal";
import { Center, Divider, End, PageActions, Root, Start } from "./styles";

const contaPadrao = { name: "Conta", role: "", email: "", seed: "account", avatarUrl: null };

/**
 * Topo do sistema (desktop), no lugar da antiga barra lateral:
 * esquerda — logo e trilha da página; centro — o menu principal; direita — ações da página (via <HeaderActions>),
 * busca, notificações e a conta. No celular o header some e o menu fica no dock de baixo (MobileNav).
 */
export function Header() {
  const pathname = usePathname();
  const theme = useTheme();
  const setActionsTarget = useHeaderActionsTarget();
  const user = useCurrentUser() ?? contaPadrao;
  const pageTitle = useHeaderTitle();

  // Páginas de detalhe (ex.: um lead) acrescentam o próprio nome à trilha.
  const crumbs = getBreadcrumbs(pathname);
  if (pageTitle) crumbs.push({ label: pageTitle, href: pathname });

  return (
    <Root>
      <Start>
        <Logo size={28} tone={theme.mode === "dark" ? "white" : "black"} href={firstAvailableHref} />
        {crumbs.length > 0 && (
          <>
            <Divider aria-hidden />
            <Breadcrumbs items={crumbs} />
          </>
        )}
      </Start>

      <Center>
        <NavPrincipal />
      </Center>

      <End>
        <PageActions ref={setActionsTarget} data-acoes="" />
        <SearchTrigger />
        <NotificationsMenu />
        <MenuConta name={user.name} role={user.role} email={user.email} seed={user.seed} avatarUrl={user.avatarUrl} />
      </End>
    </Root>
  );
}
