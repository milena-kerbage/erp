"use client";

import styled from "@emotion/styled";
import { Button } from "@/components/ui/Button";
import { ConexaoWhatsApp } from "@/features/integrations/components/ConexaoWhatsApp";
import { IntegrationManagerPanel } from "@/features/integrations/components/IntegrationManagerPanel";
import { Page, PageHeader } from "./ui";

/**
 * Conexão do WhatsApp em poucos cliques (ConexaoWhatsApp). Esta é a página cadastrada na Meta para o
 * cadastro incorporado: o botão "Conectar com a Meta" precisa ficar aqui. O painel técnico completo
 * (etapas, testes, rotas, eventos e privacidade) fica recolhido em "Diagnóstico técnico".
 */
export function WhatsAppSettings() {
  return (
    <Page>
      <PageHeader
        title="WhatsApp Business"
        description="Conecte o número da empresa com a Meta e acompanhe se as mensagens estão chegando."
        actions={<Button href="/configuracoes/integracoes" variant="secondary">Todas as integrações</Button>}
      />
      <ConexaoWhatsApp />
      <Avancado>
        <summary>Diagnóstico técnico (avançado)</summary>
        <IntegrationManagerPanel initialTab="tests" />
      </Avancado>
    </Page>
  );
}

const Avancado = styled.details`
  summary {
    cursor: pointer;
    padding: ${({ theme }) => theme.spacing(2, 0)};
    font-size: 0.875rem;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  &[open] summary { margin-bottom: ${({ theme }) => theme.spacing(3)}; }
`;
