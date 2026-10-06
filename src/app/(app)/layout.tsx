import { requireSession } from "@/lib/auth/server";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/AppShell";
import {
  SIDEBAR_COOKIE,
  SIDEBAR_EXPANDED,
} from "@/components/layout/Sidebar/constants";
import { mockConversationStatus, mockDetails, mockMessages } from "@/features/leads/mock-details";
import { mockLeads } from "@/features/leads/mock";
import { LeadsProvider } from "@/features/leads/store";
import { WorkspaceProvider } from "@/features/settings/store";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireSession();
  const cookieStore = await cookies();
  const sidebarExpanded =
    cookieStore.get(SIDEBAR_COOKIE)?.value === SIDEBAR_EXPANDED;

  // Configurações do ateliê (funis, equipe...) e leads/conversas são
  // compartilhados entre todas as telas (e o menu mostra as não lidas).
  return (
    <WorkspaceProvider authenticatedUser={user}>
      <LeadsProvider
        initialLeads={mockLeads}
        initialDetails={mockDetails}
        initialMessages={mockMessages}
        initialStatuses={mockConversationStatus}
      >
        <AppShell defaultSidebarExpanded={sidebarExpanded}>{children}</AppShell>
      </LeadsProvider>
    </WorkspaceProvider>
  );
}
