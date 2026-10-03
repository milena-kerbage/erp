"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import styled from "@emotion/styled";
import { MobileHeaderSlot } from "@/components/layout/Header/HeaderActions";
import { DOCK_SPACE } from "@/styles/sheet";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { renderIcon, type IconSource } from "@/lib/icons";
import { transientOptions } from "@/lib/emotion/transient";
import { staggerChildren } from "@/styles/animations";

/**
 * Peças das telas de configuração: cabeçalho, seções em duas colunas
 * (explicação à esquerda, campos à direita), linhas com switch, cartões e a
 * barra de salvar.
 */

export const Page = styled.div`
  ${staggerChildren(6, 60)};
  /* Seções dentro dos blocos também entram em sequência */
  ${staggerChildren(8, 50, "& > div > section")};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(8)};
  padding: ${({ theme }) => theme.spacing(7, 8, 12)};

  ${({ theme }) => theme.media.md} {
    gap: ${({ theme }) => theme.spacing(6)};
    padding: ${({ theme }) => theme.spacing(4, 4)} ${DOCK_SPACE};
  }
`;

const HeaderRoot = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(3, 4)};

  /* Celular: título e texto à esquerda, botões da página à direita, no topo */
  ${({ theme }) => theme.media.md} {
    flex-wrap: nowrap;
    align-items: flex-start;

    > div:first-of-type {
      flex: 1;
      min-width: 0;
    }
  }
`;

const HeaderTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const HeaderDescription = styled.p`
  margin-top: ${({ theme }) => theme.spacing(1)};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.muted};
`;

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <HeaderRoot>
      <div>
        <HeaderTitle>{title}</HeaderTitle>
        <HeaderDescription>{description}</HeaderDescription>
      </div>
      {actions}
      <MobileHeaderSlot />
    </HeaderRoot>
  );
}

/* ---------- Seção em duas colunas ---------- */

const SectionRoot = styled.section`
  display: grid;
  grid-template-columns: 15rem minmax(0, 1fr);
  gap: ${({ theme }) => theme.spacing(8)};
  align-items: start;

  & + & {
    padding-top: ${({ theme }) => theme.spacing(8)};
    border-top: 1px dashed ${({ theme }) => theme.colors.border.subtle};
  }

  /* Celular: explicação em cima, campos embaixo */
  ${({ theme }) => theme.media.md} {
    grid-template-columns: minmax(0, 1fr);
    gap: ${({ theme }) => theme.spacing(3)};

    & + & {
      padding-top: ${({ theme }) => theme.spacing(6)};
    }
  }
`;

const SectionIntro = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1.5)};
`;

const SectionTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};

  svg {
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const SectionDescription = styled.p`
  font-size: 0.8125rem;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.muted};
`;

/** Superfície dos campos: branca, borda sutil. */
export const Card = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(4)};
  padding: ${({ theme }) => theme.spacing(5)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
  background-color: ${({ theme }) => theme.palette.neutral[0]};

  ${({ theme }) => theme.media.md} {
    padding: ${({ theme }) => theme.spacing(4)};
  }
`;

export function Section({
  title,
  description,
  icon,
  children,
  plain = false,
}: {
  title: string;
  description: string;
  icon?: IconSource;
  children: ReactNode;
  /** Sem o cartão em volta (o conteúdo já tem as próprias superfícies). */
  plain?: boolean;
}) {
  return (
    <SectionRoot>
      <SectionIntro>
        <SectionTitle>
          {icon && renderIcon(icon, { size: 16, "aria-hidden": true })}
          {title}
        </SectionTitle>
        <SectionDescription>{description}</SectionDescription>
      </SectionIntro>
      {plain ? <div>{children}</div> : <Card>{children}</Card>}
    </SectionRoot>
  );
}

/** Campos lado a lado (quebra em uma coluna quando falta espaço). */
export const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: ${({ theme }) => theme.spacing(4)};
`;

/** Divisor pontilhado dentro do cartão. */
export const Divider = styled.hr`
  margin: 0;
  border: 0;
  border-top: 1px dashed ${({ theme }) => theme.colors.border.subtle};
`;

/* ---------- Linha com switch ---------- */

const ToggleRoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(4)};
`;

const ToggleTexts = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  label {
    font-size: 0.8125rem;
    font-weight: ${({ theme }) => theme.fontWeights.medium};
    color: ${({ theme }) => theme.colors.text.primary};
    cursor: pointer;
  }

  span {
    font-size: ${({ theme }) => theme.fontSizes.xs};
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

export function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <ToggleRoot>
      <ToggleTexts>
        <label htmlFor={id}>{title}</label>
        {description && <span id={`${id}-description`}>{description}</span>}
      </ToggleTexts>
      <Switch
        id={id}
        checked={checked}
        onChange={onChange}
        aria-describedby={description ? `${id}-description` : undefined}
      />
    </ToggleRoot>
  );
}

/* ---------- Ações com espera ---------- */

/**
 * Estado "processando" das ações que vão depender da API (salvar, convidar,
 * conectar...). Por enquanto simula a espera; troque o timeout pela chamada.
 */
export function usePending(delay = 550) {
  const [pending, setPending] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const run = useCallback(
    (action: () => void) => {
      setPending(true);
      timer.current = window.setTimeout(() => {
        action();
        setPending(false);
      }, delay);
    },
    [delay],
  );

  return [pending, run] as const;
}

/* ---------- Barra de salvar ---------- */

const SaveBarRoot = styled("div", transientOptions)<{ $visible: boolean }>`
  position: sticky;
  bottom: ${({ theme }) => theme.spacing(4)};

  /* Celular: logo acima do dock flutuante */
  ${({ theme }) => theme.media.md} {
    bottom: ${DOCK_SPACE};
  }

  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(3)};
  margin-top: ${({ theme }) => theme.spacing(-2)};
  padding: ${({ theme }) => theme.spacing(2.5, 2.5, 2.5, 4)};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radii.xl};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transform: translateY(${({ $visible }) => ($visible ? "0" : "8px")});
  pointer-events: ${({ $visible }) => ($visible ? "auto" : "none")};
  transition:
    opacity ${({ theme }) => theme.transitions.normal},
    transform ${({ theme }) => theme.transitions.normal};

  > div {
    display: flex;
    gap: ${({ theme }) => theme.spacing(2)};
  }
`;

/** Aparece quando há alterações não salvas (fica grudada no rodapé ao rolar). */
export function SaveBar({
  visible,
  onSave,
  onDiscard,
  disabled = false,
  saving = false,
}: {
  visible: boolean;
  onSave: () => void;
  onDiscard: () => void;
  disabled?: boolean;
  /** Salvando (mostra o carregamento no botão). */
  saving?: boolean;
}) {
  return (
    <SaveBarRoot
      $visible={visible || saving}
      role="region"
      aria-label="Alterações não salvas"
      aria-hidden={!visible && !saving}
    >
      Você tem alterações não salvas.
      <div>
        <Button variant="ghost" size="sm" onClick={onDiscard} disabled={saving} tabIndex={visible ? 0 : -1}>
          Descartar
        </Button>
        <Button size="sm" onClick={onSave} disabled={disabled} loading={saving} tabIndex={visible ? 0 : -1}>
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </SaveBarRoot>
  );
}

/* ---------- Cartão de número ---------- */

const StatRoot = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
`;

const StatBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: ${({ theme }) => theme.spacing(3.5, 4)};

  small {
    font-size: ${({ theme }) => theme.fontSizes.xs};
    color: ${({ theme }) => theme.colors.text.muted};
  }

  strong {
    font-size: ${({ theme }) => theme.fontSizes.xl};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const StatFoot = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1.5)};
  padding: ${({ theme }) => theme.spacing(2, 4)};
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
  background-color: ${({ theme }) => theme.colors.background.surface};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};

  svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

export function StatCard({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: IconSource;
}) {
  return (
    <StatRoot>
      <StatBody>
        <small>{label}</small>
        <strong>{value}</strong>
      </StatBody>
      <StatFoot>
        {renderIcon(icon, { size: 14, "aria-hidden": true })}
        {note}
      </StatFoot>
    </StatRoot>
  );
}

export const StatGrid = styled.div`
  ${staggerChildren(4, 50)};
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: ${({ theme }) => theme.spacing(3)};

  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: ${({ theme }) => theme.spacing(2)};
  }
`;

/* ---------- Tabela em cartão ---------- */

export const TableCard = styled.div`
  overflow: auto;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
`;

export const Table = styled.table`
  ${staggerChildren(12, 25, "& tbody tr")};
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;

  th {
    height: 2.25rem;
    padding: ${({ theme }) => theme.spacing(0, 3)};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
    background-color: ${({ theme }) => theme.colors.background.surface};
    font-size: ${({ theme }) => theme.fontSizes.xs};
    font-weight: ${({ theme }) => theme.fontWeights.medium};
    color: ${({ theme }) => theme.colors.text.muted};
    text-align: left;
    white-space: nowrap;
  }

  td {
    height: 3rem;
    padding: ${({ theme }) => theme.spacing(0, 3)};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.faint};
    color: ${({ theme }) => theme.colors.text.primary};
    white-space: nowrap;
  }

  th:first-of-type,
  td:first-of-type {
    padding-left: ${({ theme }) => theme.spacing(4)};
  }

  th:last-of-type,
  td:last-of-type {
    padding-right: ${({ theme }) => theme.spacing(3)};
  }

  /* Divisória vertical entre as colunas */
  th:not(:last-of-type),
  td:not(:last-of-type) {
    border-right: 1px solid ${({ theme }) => theme.colors.border.faint};
  }

  tbody tr:last-of-type td {
    border-bottom: 0;
  }

  tbody tr:hover td {
    background-color: ${({ theme }) => theme.colors.interactive.hover};
  }
`;

/** Ícone + texto numa linha (células, listas). */
export const Inline = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  min-width: 0;
  vertical-align: middle;

  > svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

export const Muted = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
`;

/** Selo tingido (permissão, status). */
export const Pill = styled("span", transientOptions)<{ $tone: import("@/styles/theme").Tone; $outline?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 1.375rem;
  padding: ${({ theme }) => theme.spacing(0, 1.75)};
  border: 1px solid ${({ theme, $tone, $outline }) => ($outline ? theme.tones[$tone].soft : "transparent")};
  border-radius: ${({ theme }) => theme.radii.sm};
  background-color: ${({ theme, $tone, $outline }) => ($outline ? theme.palette.neutral[0] : theme.tones[$tone].soft)};
  color: ${({ theme, $tone }) => theme.tones[$tone].fg};
  font-size: 0.75rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  white-space: nowrap;
`;

export const Mono = styled.code`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;
