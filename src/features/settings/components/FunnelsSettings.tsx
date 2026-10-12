"use client";

import { useState, type DragEvent, type KeyboardEvent } from "react";
import styled from "@emotion/styled";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  DotsSixVerticalIcon,
  DotsThreeIcon,
  KanbanIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { HeaderActions } from "@/components/layout/Header/HeaderActions";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EditableText } from "@/components/ui/Editable";
import { IconButton } from "@/components/ui/IconButton";
import { IconTile } from "@/components/ui/IconTile";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { TextField } from "@/components/ui/TextField";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import { transientOptions } from "@/lib/emotion/transient";
import { staggerChildren } from "@/styles/animations";
import type { Tone } from "@/styles/theme";
import { funnelIcons, type Funnel, type FunnelStage } from "@/features/leads/funnels";
import { useLeads } from "@/features/leads/store";
import { useWorkspace } from "../store";
import { AppearancePicker } from "./pickers";
import { Card, Page, PageHeader } from "./ui";

/* ---------- Estilos ---------- */

const List = styled.div`
  ${staggerChildren(6, 60)};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(4)};
`;

const FunnelCard = styled(Card)`
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(4)};
  scroll-margin: ${({ theme }) => theme.spacing(6)};
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
`;

const AppearanceButton = styled.button`
  display: inline-flex;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.radii.md};
  transition: transform ${({ theme }) => theme.transitions.fast};

  &:hover {
    transform: scale(1.06);
  }
`;

const HeadTexts = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  min-width: 0;

  > div {
    font-size: ${({ theme }) => theme.fontSizes.md};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  small {
    font-size: ${({ theme }) => theme.fontSizes.xs};
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const HeadActions = styled.div`
  display: flex;
  flex-shrink: 0;
  gap: ${({ theme }) => theme.spacing(2)};
`;

/** Prévia do caminho: um trecho por etapa, na cor dela. */
const Preview = styled.div`
  display: flex;
  gap: 3px;
`;

const PreviewStep = styled("span", transientOptions)<{ $tone: Tone }>`
  flex: 1;
  height: 4px;
  border-radius: ${({ theme }) => theme.radii.full};
  background-color: ${({ theme, $tone }) =>
    `color-mix(in srgb, ${theme.tones[$tone].fg} 60%, ${theme.tones[$tone].soft})`};
`;

const Stages = styled.ol`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const StageRow = styled("li", transientOptions)<{ $dragging: boolean; $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  height: 2.75rem;
  padding: ${({ theme }) => theme.spacing(0, 2, 0, 1)};
  border: 1px dashed ${({ theme, $dragging }) => ($dragging ? theme.palette.sage[400] : "transparent")};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme, $dragging }) =>
    $dragging ? `color-mix(in srgb, ${theme.palette.sage[500]} 8%, ${theme.palette.neutral[0]})` : "transparent"};
  cursor: grab;
  transition:
    background-color ${({ theme }) => theme.transitions.fast},
    border-color ${({ theme }) => theme.transitions.fast};

  /* Enquanto arrasta, a linha arrastada mostra onde vai cair */
  > * {
    opacity: ${({ $dragging }) => ($dragging ? 0.55 : 1)};
  }

  &:hover {
    background-color: ${({ theme, $dragging, $active }) =>
      $dragging
        ? `color-mix(in srgb, ${theme.palette.sage[500]} 8%, ${theme.palette.neutral[0]})`
        : $active
          ? "transparent"
          : theme.colors.interactive.hover};
  }

  &:hover > button:first-of-type {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:active {
    cursor: grabbing;
  }
`;

const StagesHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(2)};
  padding: ${({ theme }) => theme.spacing(1, 2, 0, 2)};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};

  span {
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing(1)};
  }
`;

const Handle = styled.button`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 2rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
`;

const Position = styled.span`
  width: 1.25rem;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  text-align: center;
`;

/** Bolinha da cor da etapa: abre a troca de cor. */
const ToneDot = styled("button", transientOptions)<{ $tone: Tone }>`
  flex-shrink: 0;
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 50%;
  background-color: ${({ theme, $tone }) => theme.tones[$tone].soft};
  box-shadow: inset 0 0 0 2px ${({ theme, $tone }) => theme.tones[$tone].fg};
  transition: transform ${({ theme }) => theme.transitions.fast};

  &:hover {
    transform: scale(1.12);
  }
`;

const StageName = styled.div`
  flex: 1;
  min-width: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const Count = styled.span`
  flex-shrink: 0;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const AddForm = styled.form`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  padding-left: ${({ theme }) => theme.spacing(8)};

  > div {
    flex: 1;
  }
`;

const Foot = styled.div`
  padding-left: ${({ theme }) => theme.spacing(6)};
`;

/* ---------- Partes ---------- */

function AddStage({ onAdd }: { onAdd: (label: string) => Promise<boolean> }) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [savingStage, setSavingStage] = useState(false);

  const close = () => {
    setAdding(false);
    setLabel("");
  };

  if (!adding) {
    return (
      <Foot>
        <Button variant="ghost" size="sm" icon={PlusIcon} onClick={() => setAdding(true)}>
          Adicionar etapa
        </Button>
      </Foot>
    );
  }

  return (
    <AddForm
      onSubmit={async (event) => {
        event.preventDefault();
        if (!label.trim() || savingStage) return;
        setSavingStage(true);
        try { if (await onAdd(label.trim())) setLabel(""); } finally { setSavingStage(false); }
      }}
      onKeyDown={(event) => event.key === "Escape" && close()}
    >
      <TextField
        label="Nome da nova etapa"
        hideLabel
        placeholder="Nome da etapa (ex.: Prova marcada)"
        autoFocus
        value={label}
        onChange={(event) => setLabel(event.target.value)}
      />
      <Button type="submit" size="sm" disabled={!label.trim()} loading={savingStage}>
        Adicionar
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={close}>
        Concluir
      </Button>
    </AddForm>
  );
}

type FunnelEditorProps = {
  funnel: Funnel;
  index: number;
  total: number;
  counts: Record<string, number>;
  onAskRemove: () => void;
  onBlockedStage: (stage: FunnelStage, count: number) => void;
};

function FunnelEditor({ funnel, index, total, counts, onAskRemove, onBlockedStage }: FunnelEditorProps) {
  const { updateFunnel, moveFunnel, addStage, updateStage, removeStage, moveStage } = useWorkspace();
  const [dragId, setDragId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const leadsInFunnel = funnel.stages.reduce((sum, stage) => sum + (counts[stage.id] ?? 0), 0);

  const move = async (stage: FunnelStage, to: number) => {
    if (to < 0 || to >= funnel.stages.length) return;
    if (!await moveStage(funnel.id, stage.id, to)) return;
    setAnnouncement(`${stage.label} agora é a etapa ${to + 1} de ${funnel.stages.length}.`);
  };

  const handleKey = (event: KeyboardEvent<HTMLButtonElement>, stage: FunnelStage, position: number) => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      move(stage, position + (event.key === "ArrowUp" ? -1 : 1));
      // O botão acompanha a etapa na nova posição
      requestAnimationFrame(() => (event.target as HTMLElement).focus());
    }
  };

  /** Troca de lugar só depois que o cursor passa do meio da linha (sem "tremer"). */
  const onDragOver = (event: DragEvent<HTMLLIElement>, position: number) => {
    if (!dragId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const from = funnel.stages.findIndex((item) => item.id === dragId);
    if (from < 0 || from === position) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const middle = rect.top + rect.height / 2;
    if ((from < position && event.clientY < middle) || (from > position && event.clientY > middle)) return;
    moveStage(funnel.id, dragId, position);
  };

  const finishDrag = () => {
    const position = funnel.stages.findIndex((item) => item.id === dragId);
    const stage = funnel.stages[position];
    if (stage) setAnnouncement(`${stage.label} agora é a etapa ${position + 1} de ${funnel.stages.length}.`);
    setDragId(null);
  };

  return (
    <FunnelCard as="section" id={`funil-${funnel.id}`} aria-label={funnel.name}>
      <Head>
        <AppearancePicker
          label={`Cor e ícone de ${funnel.name}`}
          tone={funnel.tone}
          icon={funnel.icon}
          onToneChange={(tone) => updateFunnel(funnel.id, { tone })}
          onIconChange={(icon) => updateFunnel(funnel.id, { icon })}
          trigger={({ open: _open, ...props }) => (
            <AppearanceButton type="button" {...props} aria-label={`Cor e ícone de ${funnel.name}`}>
              <IconTile icon={funnel.icon} tone={funnel.tone} size="lg" />
            </AppearanceButton>
          )}
        />
        <HeadTexts>
          <div>
            <EditableText
              label="Nome do funil"
              value={funnel.name}
              onSave={(name) => name && updateFunnel(funnel.id, { name })}
            />
          </div>
          <small>
            {funnel.stages.length} {funnel.stages.length === 1 ? "etapa" : "etapas"} / {leadsInFunnel}{" "}
            {leadsInFunnel === 1 ? "lead" : "leads"}
          </small>
        </HeadTexts>
        <HeadActions>
          <IconButton href={`/leads?funil=${funnel.id}`} icon={KanbanIcon} label="Ver no quadro" tooltip="bottom" />
          <Menu
            label={`Ações de ${funnel.name}`}
            align="end"
            width="15rem"
            trigger={(props) => <IconButton {...props} icon={DotsThreeIcon} label="Ações do funil" tooltip="bottom" />}
          >
            <MenuItem icon={ArrowUpIcon} disabled={index === 0} onSelect={() => moveFunnel(funnel.id, -1)}>
              Mover para cima
            </MenuItem>
            <MenuItem icon={ArrowDownIcon} disabled={index === total - 1} onSelect={() => moveFunnel(funnel.id, 1)}>
              Mover para baixo
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              icon={TrashIcon}
              muted
              disabled={total === 1}
              meta={total === 1 ? "único funil" : undefined}
              onSelect={onAskRemove}
            >
              Excluir funil
            </MenuItem>
          </Menu>
        </HeadActions>
      </Head>

      <Preview aria-hidden>
        {funnel.stages.map((stage) => (
          <PreviewStep key={stage.id} $tone={stage.tone} />
        ))}
      </Preview>

      <StagesHead>
        <span>
          <DotsSixVerticalIcon size={13} weight="bold" aria-hidden />
          Arraste as etapas para mudar a ordem do quadro
        </span>
        <span>Leads</span>
      </StagesHead>

      <Stages aria-label={`Etapas de ${funnel.name}`}>
        {funnel.stages.map((stage, position) => {
          const count = counts[stage.id] ?? 0;
          return (
            <StageRow
              key={stage.id}
              draggable
              $dragging={dragId === stage.id}
              $active={dragId !== null}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", stage.label);
                setDragId(stage.id);
              }}
              onDragOver={(event) => onDragOver(event, position)}
              onDrop={(event) => event.preventDefault()}
              onDragEnd={finishDrag}
            >
              <Handle
                type="button"
                aria-label={`Reordenar ${stage.label}, posição ${position + 1} de ${funnel.stages.length}. Use as setas`}
                title="Arraste ou use as setas para reordenar"
                onKeyDown={(event) => handleKey(event, stage, position)}
              >
                <DotsSixVerticalIcon size={16} weight="bold" aria-hidden />
              </Handle>
              <Position aria-hidden>{position + 1}</Position>
              <AppearancePicker
                label={`Cor de ${stage.label}`}
                tone={stage.tone}
                onToneChange={(tone) => updateStage(funnel.id, stage.id, { tone })}
                trigger={({ open: _open, ...props }) => (
                  <ToneDot type="button" {...props} $tone={stage.tone} aria-label={`Cor de ${stage.label}`} />
                )}
              />
              <StageName>
                <EditableText
                  label="Nome da etapa"
                  value={stage.label}
                  onSave={(label) => label && updateStage(funnel.id, stage.id, { label })}
                />
              </StageName>
              <Count>
                {count} {count === 1 ? "lead" : "leads"}
              </Count>
              <IconButton
                icon={TrashIcon}
                label={funnel.stages.length === 1 ? "O funil precisa de uma etapa" : `Excluir ${stage.label}`}
                variant="ghost"
                size="sm"
                tooltip="left"
                disabled={funnel.stages.length === 1}
                onClick={() => (count > 0 ? onBlockedStage(stage, count) : removeStage(funnel.id, stage.id))}
              />
            </StageRow>
          );
        })}
      </Stages>

      <AddStage onAdd={(label) => addStage(funnel.id, label)} />
      <VisuallyHidden role="status">{announcement}</VisuallyHidden>
    </FunnelCard>
  );
}

/* ---------- Tela ---------- */

/** Funis e etapas do quadro de leads: nomes, cores, ícones e ordem. */
export function FunnelsSettings() {
  const { funnels, addFunnel, removeFunnel, currentUser, loading } = useWorkspace();
  const { leads } = useLeads();
  const [removing, setRemoving] = useState<Funnel | null>(null);
  const [blocked, setBlocked] = useState<{ funnel: Funnel; stage: FunnelStage; count: number } | null>(null);

  const countsFor = (funnel: Funnel) =>
    Object.fromEntries(
      funnel.stages.map((stage) => [
        stage.id,
        leads.filter((lead) => lead.funnelId === funnel.id && lead.stage === stage.id).length,
      ]),
    );

  const removingCount = removing ? leads.filter((lead) => lead.funnelId === removing.id).length : 0;

  const create = async () => {
    const funnel = await addFunnel({ name: "Novo funil", icon: funnelIcons[0].icon, tone: "blue" });
    if (!funnel) return;
    requestAnimationFrame(() =>
      document.getElementById(`funil-${funnel.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
    );
  };

  return (
    <Page>
      <HeaderActions>
        <Button disabled={loading || currentUser.permission !== "admin"} icon={PlusIcon} onClick={() => void create()}>
          Novo funil
        </Button>
      </HeaderActions>

      <PageHeader
        title="Funis e etapas"
        description="O caminho de cada tipo de cliente no quadro de leads. As mudanças aparecem na hora em Leads, Conversas e Clientes."
      />

      <fieldset disabled={loading || currentUser.permission !== "admin"} style={{ border: 0, padding: 0, minWidth: 0 }}>
      <List>
        {funnels.map((funnel, index) => (
          <FunnelEditor
            key={funnel.id}
            funnel={funnel}
            index={index}
            total={funnels.length}
            counts={countsFor(funnel)}
            onAskRemove={() => setRemoving(funnel)}
            onBlockedStage={(stage, count) => setBlocked({ funnel, stage, count })}
          />
        ))}
      </List>
      </fieldset>

      <Dialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={removingCount > 0 ? "Este funil tem leads" : `Excluir ${removing?.name}?`}
        description={
          removingCount > 0
            ? `Há ${removingCount} ${removingCount === 1 ? "lead" : "leads"} em ${removing?.name}. Mova para outro funil antes de excluir.`
            : `As ${removing?.stages.length} etapas somem junto. Não dá para desfazer.`
        }
        width="24rem"
        footer={
          removingCount > 0 ? (
            <>
              <Button variant="ghost" onClick={() => setRemoving(null)}>
                Fechar
              </Button>
              <Button href={`/leads?funil=${removing?.id}`} icon={KanbanIcon}>
                Ver no quadro
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setRemoving(null)}>
                Voltar
              </Button>
              <Button
                variant="danger"
                icon={TrashIcon}
                onClick={async () => {
                  if (removing && await removeFunnel(removing.id)) setRemoving(null);
                }}
              >
                Excluir funil
              </Button>
            </>
          )
        }
      />

      <Dialog
        open={blocked !== null}
        onClose={() => setBlocked(null)}
        title="Esta etapa tem leads"
        description={
          blocked &&
          `Há ${blocked.count} ${blocked.count === 1 ? "lead" : "leads"} em ${blocked.stage.label}. Mova para outra etapa no quadro antes de excluir.`
        }
        width="24rem"
        footer={
          <>
            <Button variant="ghost" onClick={() => setBlocked(null)}>
              Fechar
            </Button>
            <Button href={`/leads?funil=${blocked?.funnel.id}`} icon={KanbanIcon}>
              Ver no quadro
            </Button>
          </>
        }
      />
    </Page>
  );
}
