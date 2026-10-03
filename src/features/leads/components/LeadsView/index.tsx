"use client";

import styled from "@emotion/styled";
import { KanbanIcon, PlusIcon, TableIcon } from "@phosphor-icons/react";
import { HeaderActions } from "@/components/layout/Header/HeaderActions";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { useViewMode, ViewSwitch } from "@/components/ui/ViewSwitch";
import { NarrowOnly, WideOnly } from "@/styles/responsive";
import { ClientsTable } from "@/features/clients/components/ClientsTable";
import { useFunnels } from "@/features/settings/store";
import { FunnelSelect } from "../FunnelSelect";
import { LeadsBoard } from "../LeadsBoard";

type View = "kanban" | "table";
const VIEWS: readonly View[] = ["kanban", "table"];

/** A tela ocupa a altura toda (no celular vai até a borda de baixo, com o dock por cima). */
const Screen = styled.div`
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  min-height: 0;
`;

/**
 * Leads do funil em kanban (padrão) ou em tabela. O funil fica no header; a
 * barra do topo (busca, filtros, visão e "novo lead") trata o resto, nas duas
 * visões, como a tela de tarefas do web-specular.
 */
export function LeadsView({ funnelId }: { funnelId?: string }) {
  const [view, setView] = useViewMode<View>("leads", "kanban", VIEWS, "kanban");
  // Sem ?funil= na URL vale o primeiro funil, igual ao kanban
  const funnel = useFunnels().findFunnel(funnelId);

  const controls = (
    <>
      {/* Celular: sem header, o funil fica aqui, logo depois dos filtros */}
      <NarrowOnly>
        <FunnelSelect funnelId={funnelId} variant="toolbar" />
      </NarrowOnly>
      <ViewSwitch
        label="Visualização dos leads"
        value={view}
        onChange={setView}
        options={[
          { value: "kanban", label: "Kanban", icon: KanbanIcon },
          { value: "table", label: "Tabela", icon: TableIcon },
        ]}
      />
      {/* TODO: abrir o formulário de novo lead */}
      <WideOnly>
        <Button icon={PlusIcon}>Novo lead</Button>
      </WideOnly>
      <NarrowOnly>
        <IconButton icon={PlusIcon} label="Novo lead" variant="primary" tooltip={false} />
      </NarrowOnly>
    </>
  );

  return (
    <>
      <HeaderActions>
        <FunnelSelect funnelId={funnelId} />
      </HeaderActions>

      {view === "kanban" ? (
        <Screen data-fill>
          <LeadsBoard funnelId={funnelId} toolbarEnd={controls} />
        </Screen>
      ) : (
        <ClientsTable funnelId={funnel.id} embedded toolbarEnd={controls} />
      )}
    </>
  );
}
