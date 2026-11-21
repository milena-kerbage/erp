import { databaseProblem, requireSession } from "@/lib/auth/server";
import { ConfigurationNotice } from "@/components/layout/ConfigurationNotice";
import { AppShell } from "@/components/layout/AppShell";
import { LeadsProvider } from "@/features/leads/store";
import { WorkspaceProvider } from "@/features/settings/store";
import { WhatsAppUnreadProvider } from "@/features/whatsapp/unread";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  let user;
  try { user = await requireSession(); }
  catch (error) {
    // redirect() do Next.js também lança: só falhas de banco explicáveis viram aviso.
    const problem = databaseProblem(error);
    if (!problem) throw error;
    return <ConfigurationNotice {...problem} />;
  }
  // Configurações do ateliê (funis, equipe...) e leads/conversas são
  // compartilhados entre todas as telas (e o menu mostra as não lidas).
  return (
    <WorkspaceProvider authenticatedUser={user}>
      <WhatsAppUnreadProvider>
      <LeadsProvider>
        <AppShell>{children}</AppShell>
      </LeadsProvider>
      </WhatsAppUnreadProvider>
    </WorkspaceProvider>
  );
}
