"use client";

import { useState, type ReactNode } from "react";
import styled from "@emotion/styled";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { Tooltip } from "@/components/ui/Tooltip";
import { copyText } from "@/lib/clipboard";
import { renderIcon, type IconSource } from "@/lib/icons";

/**
 * Lista de informações "rótulo → valor", empilhadas como na ficha do cliente.
 * Use <DataGroup> para separar blocos (Contato, Evento...).
 */

const Group = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3.5)};
  padding: ${({ theme }) => theme.spacing(4, 0)};

  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
  }
`;

const GroupTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const List = styled.dl`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3.5)};
`;

const Row = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  &:hover [data-copy] {
    opacity: 1;
  }
`;

const Term = styled.dt`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1.5)};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};

  svg {
    flex-shrink: 0;
  }
`;

const Description = styled.dd`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  min-width: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  overflow-wrap: anywhere;

  a {
    color: ${({ theme }) => theme.colors.text.brand};
    text-decoration: underline;
    text-decoration-color: ${({ theme }) => theme.palette.sage[200]};
    text-underline-offset: 3px;

    &:hover {
      text-decoration-color: currentColor;
    }
  }
`;

const Empty = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
`;

const CopyButton = styled.button`
  position: absolute;
  top: 0;
  right: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  opacity: 0;
  transition:
    opacity ${({ theme }) => theme.transitions.fast},
    background-color ${({ theme }) => theme.transitions.fast};

  &:hover,
  &:focus-visible {
    opacity: 1;
    background-color: ${({ theme }) => theme.colors.interactive.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  @media (hover: none) {
    opacity: 1;
  }
`;

type DataGroupProps = {
  title?: string;
  /** Conteúdo livre (ex.: lista de links) em vez de itens rótulo → valor. */
  plain?: boolean;
  children: ReactNode;
};

export function DataGroup({ title, plain = false, children }: DataGroupProps) {
  return (
    <Group>
      {title && <GroupTitle>{title}</GroupTitle>}
      {plain ? children : <List>{children}</List>}
    </Group>
  );
}

type DataItemProps = {
  label: string;
  /** Ícone ao lado do rótulo. */
  icon?: IconSource;
  children?: ReactNode;
  /** Texto copiado pelo botão de copiar (aparece no hover). */
  copy?: string;
};

export function DataItem({ label, icon, children, copy }: DataItemProps) {
  const [copied, setCopied] = useState(false);
  const empty = children === undefined || children === null || children === "";

  return (
    <Row>
      <Term>
        {icon && renderIcon(icon, { size: 14, "aria-hidden": true })}
        {label}
      </Term>
      <Description>{empty ? <Empty>Não informado</Empty> : children}</Description>
      {copy && !empty && (
        <Tooltip label={copied ? "Copiado!" : "Copiar"} side="left">
          <CopyButton
            type="button"
            data-copy
            aria-label={`Copiar ${label.toLowerCase()}`}
            onClick={async () => {
              if (!(await copyText(copy))) return;
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <CheckIcon size={14} weight="bold" /> : <CopyIcon size={14} />}
          </CopyButton>
        </Tooltip>
      )}
    </Row>
  );
}
