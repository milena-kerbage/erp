import { requireSession } from "@/lib/auth/server";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/AppShell";
import {
  SIDEBAR_COOKIE,
  SIDEBAR_EXPANDED,
} from "@/components/layout/Sidebar/constants";
import { LeadsProvider } from "@/features/leads/store";
import { WorkspaceProvider } from "@/features/settings/store";
import { WhatsAppUnreadProvider } from "@/features/whatsapp/unread";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireSession();
  const cookieStore = await cookies();
  const sidebarExpanded =
    cookieStore.get(SIDEBAR_COOKIE)?.value === SIDEBAR_EXPANDED;

  // Configurações do ateliê (funis, equipe...) e leads/conversas são
  // compartilhados entre todas as telas (e o menu mostra as não lidas).
  return (
    <WorkspaceProvider authenticatedUser={user}>
      <WhatsAppUnreadProvider>
      <LeadsProvider>
        <AppShell defaultSidebarExpanded={sidebarExpanded}>{children}</AppShell>
      </LeadsProvider>
      </WhatsAppUnreadProvider>
    </WorkspaceProvider>
  );
}
