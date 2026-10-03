"use client";

import { useState, type DragEvent, type ReactNode, type Ref } from "react";
import { CircleDashedIcon, PlusIcon } from "@phosphor-icons/react";
import type { Tone } from "@/styles/theme";
import {
  AddButton,
  Board,
  Cards,
  Column,
  ColumnActions,
  ColumnEmpty,
  ColumnHeader,
  ColumnMeta,
  Count,
  TitlePill,
  TitleText,
} from "./styles";

/** Faixa de colunas com rolagem horizontal (no celular, uma etapa por vez). */
export function KanbanBoard({
  children,
  label,
  railRef,
}: {
  children: ReactNode;
  label: string;
  /** Elemento que rola (para acompanhar a etapa à vista). */
  railRef?: Ref<HTMLDivElement>;
}) {
  return (
    <Board ref={railRef} role="region" aria-label={label}>
      {children}
    </Board>
  );
}

type KanbanColumnProps = {
  title: string;
  tone: Tone;
  count: number;
  /** Total à direita do título (ex.: soma dos orçamentos da etapa). */
  meta?: ReactNode;
  /** Texto quando a etapa está vazia. */
  emptyLabel?: string;
  /** Botões à direita do total (ex.: adicionar). */
  actions?: ReactNode;
  /** Texto do botão no fim da coluna; sem `onAdd`, não aparece. */
  addLabel?: string;
  onAdd?: () => void;
  /** Recebe o id solto na coluna (arrastar e soltar). */
  onDropItem?: (id: string) => void;
  children?: ReactNode;
};

/** MIME próprio para o arrastar e soltar do kanban. */
export const KANBAN_DRAG_TYPE = "application/x-kanban-item";

export function KanbanColumn({
  title,
  tone,
  count,
  meta,
  emptyLabel = "Nada nesta etapa",
  actions,
  addLabel,
  onAdd,
  onDropItem,
  children,
}: KanbanColumnProps) {
  const [dropping, setDropping] = useState(false);

  const accepts = (event: DragEvent) => Boolean(onDropItem) && event.dataTransfer.types.includes(KANBAN_DRAG_TYPE);

  return (
    <Column
      $tone={tone}
      $dropping={dropping}
      aria-label={`${title}, ${count} ${count === 1 ? "item" : "itens"}`}
      onDragOver={(event) => {
        if (!accepts(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        if (!dropping) setDropping(true);
      }}
      onDragLeave={(event) => {
        // Só sai de verdade quando o ponteiro deixa a coluna (não um filho).
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropping(false);
      }}
      onDrop={(event) => {
        setDropping(false);
        const id = event.dataTransfer.getData(KANBAN_DRAG_TYPE);
        if (id && onDropItem) {
          event.preventDefault();
          onDropItem(id);
        }
      }}
    >
      <ColumnHeader>
        <TitlePill $tone={tone}>
          <CircleDashedIcon size={16} weight="bold" aria-hidden />
          <TitleText>{title}</TitleText>
          <Count $tone={tone} aria-hidden>
            {count}
          </Count>
        </TitlePill>
        {(meta || actions) && (
          <ColumnActions>
            {meta && <ColumnMeta>{meta}</ColumnMeta>}
            {actions}
          </ColumnActions>
        )}
      </ColumnHeader>

      {count > 0 ? <Cards>{children}</Cards> : <ColumnEmpty>{emptyLabel}</ColumnEmpty>}

      {onAdd && addLabel && (
        <AddButton type="button" $tone={tone} onClick={onAdd}>
          <PlusIcon size={14} weight="bold" aria-hidden />
          {addLabel}
        </AddButton>
      )}
    </Column>
  );
}
