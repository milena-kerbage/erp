"use client";

import { useEffect, useState } from "react";
import type { FiltroCategoria } from "../../categoria";
import { NewLeadForm } from "../NewLeadForm";
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
 * Leads e clientes numa tela só. Kanban: o funil escolhido no header. Tabela (padrão): todos os funis, com a coluna e o
 * filtro "Categoria" (Cliente = funil Clientes; Lead = os demais). A barra do topo (busca, filtros, visão e "novo")
 * trata o resto, nas duas visões.
 */
export function LeadsView({ funnelId, categoriaInicial, visaoInicial }: { funnelId?: string; categoriaInicial?: FiltroCategoria; visaoInicial?: View }) {
  const [creating, setCreating] = useState(false);
  const [view, setView] = useViewMode<View>("leads", "table", VIEWS, "kanban");
  // Link direto (ex.: /clientes → tabela só de clientes) vale sobre a última visão usada.
  useEffect(() => { if (visaoInicial) setView(visaoInicial); }, [visaoInicial, setView]);
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
      <WideOnly>
        <Button icon={PlusIcon} onClick={() => setCreating(true)}>Novo lead</Button>
      </WideOnly>
      <NarrowOnly>
        <IconButton icon={PlusIcon} label="Novo lead" variant="primary" tooltip={false} onClick={() => setCreating(true)} />
      </NarrowOnly>
    </>
  );

  return (
    <>
      {creating && <NewLeadForm open onClose={() => setCreating(false)} funnelId={funnel.id} />}
      {view === "kanban" && (
        <HeaderActions>
          <FunnelSelect funnelId={funnelId} />
        </HeaderActions>
      )}

      {view === "kanban" ? (
        <Screen data-fill>
          <LeadsBoard funnelId={funnelId} toolbarEnd={controls} />
        </Screen>
      ) : (
        <ClientsTable embedded toolbarEnd={controls} categoriaInicial={categoriaInicial} />
      )}
    </>
  );
}
