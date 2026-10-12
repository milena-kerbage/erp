"use client";

import { usePathname } from "next/navigation";
import { navigation } from "@/config/navigation";
import { isPathActive } from "@/lib/navigation";
import { useUnreadConversations } from "@/features/leads/store";
import { useCurrentUser } from "@/features/settings/store";
import { SIDEBAR_NAV_ID, useSidebar } from "./SidebarContext";
import { SidebarItem } from "./SidebarItem";
import { SidebarProfile } from "./SidebarProfile";
import { Aside, Footer, List, Nav } from "./styles";

// Neutral fallback only when rendered outside the authenticated provider.
const fallbackUser = {
  name: "Conta",
  role: "",
  email: "",
  seed: "account",
  avatarUrl: null,
};

export function Sidebar() {
  const pathname = usePathname();
  const { expanded } = useSidebar();
  const unread = useUnreadConversations();
  const currentUser = useCurrentUser() ?? fallbackUser;

  return (
    <Aside $expanded={expanded}>
      <Nav id={SIDEBAR_NAV_ID} aria-label="Menu principal">
        <List $expanded={expanded}>
          {navigation.main.map((item) => (
            <li key={item.href}>
              <SidebarItem
                href={item.href}
                label={item.label}
                icon={item.icon}
                expanded={expanded}
                active={isPathActive(pathname, item.href)}
                locked={"soon" in item}
                indicator={item.href === "/conversas" && unread > 0}
                indicatorLabel={`${unread} ${unread === 1 ? "conversa não lida" : "conversas não lidas"}`}
              />
            </li>
          ))}
        </List>
      </Nav>

      <Footer $expanded={expanded}>
        <nav aria-label="Preferências">
          <List $expanded={expanded}>
            {navigation.secondary.map((item) => (
              <li key={item.href}>
                <SidebarItem
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  tone="outline"
                  expanded={expanded}
                  active={isPathActive(pathname, item.href)}
                />
              </li>
            ))}
          </List>
        </nav>

        <SidebarProfile
          name={currentUser.name}
          role={currentUser.role}
          email={currentUser.email}
          seed={currentUser.seed}
          avatarUrl={currentUser.avatarUrl}
          expanded={expanded}
        />
      </Footer>
    </Aside>
  );
}
