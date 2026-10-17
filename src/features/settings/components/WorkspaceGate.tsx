"use client";

import styled from "@emotion/styled";
import { WarningCircleIcon } from "@phosphor-icons/react";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

const Root = styled.main`
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 100dvh;
  padding: ${({ theme }) => theme.spacing(6)};
`;

type WorkspaceGateProps = { loading: boolean; error: string | null; onRetry: () => void };

/**
 * Tela exibida enquanto os dados do ateliê (funis e configurações) não chegam do
 * banco. Nada é inventado: sem resposta do servidor, só carregamento ou erro.
 */
export function WorkspaceGate({ loading, error, onRetry }: WorkspaceGateProps) {
  return (
    <Root>
      {loading || !error ? (
        <PageSkeleton />
      ) : (
        <EmptyState
          icon={<WarningCircleIcon size={28} />}
          title="Não foi possível carregar os dados do ateliê"
          description={error}
        >
          <Button onClick={onRetry}>Tentar novamente</Button>
        </EmptyState>
      )}
    </Root>
  );
}
