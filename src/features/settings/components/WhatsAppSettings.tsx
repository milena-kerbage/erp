"use client";

import { Button } from "@/components/ui/Button";
import { IntegrationManagerPanel } from "@/features/integrations/components/IntegrationManagerPanel";
import { Page, PageHeader } from "./ui";

/** The same manager, focused on WhatsApp tests, is also available in Integrations. */
export function WhatsAppSettings() {
  return (
    <Page>
      <PageHeader
        title="WhatsApp Business"
        description="Acompanhe a implantação, configure o acesso e execute os testes da integração oficial."
        actions={<Button href="/configuracoes/integracoes" variant="secondary">Todas as integrações</Button>}
      />
      <IntegrationManagerPanel initialTab="tests" />
    </Page>
  );
}
