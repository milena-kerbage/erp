"use client";

import { useCallback, useEffect, useState } from "react";
import styled from "@emotion/styled";
import { Tooltip } from "@/components/ui/Tooltip";
import { renderIcon, type IconSource } from "@/lib/icons";
import { transientOptions } from "@/lib/emotion/transient";
import { useIsMobile } from "@/lib/useMediaQuery";

export type ViewOption<V extends string> = { value: V; label: string; icon: IconSource };

type ViewSwitchProps<V extends string> = {
  /** Nome acessível do grupo (ex.: "Visualização dos leads"). */
  label: string;
  value: V;
  options: readonly ViewOption<V>[];
  onChange: (value: V) => void;
};

/** Trilho com a opção escolhida em "cartão" branco, na altura dos botões do header. */
const Track = styled.div`
  display: inline-flex;
  flex-shrink: 0;
  gap: 2px;
  height: 2.25rem;
  padding: 3px;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme }) => theme.colors.interactive.hover};

  /* Celular: sem troca de visualização (a tela usa a visão do celular) */
  ${({ theme }) => theme.media.md} {
    display: none;
  }
`;

const Option = styled("button", transientOptions)<{ $selected: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.875rem;
  height: 100%;
  border: 1px solid ${({ theme, $selected }) => ($selected ? theme.colors.border.subtle : "transparent")};
  border-radius: calc(${({ theme }) => theme.radii.md} - 3px);
  background-color: ${({ theme, $selected }) => ($selected ? theme.palette.neutral[0] : "transparent")};
  color: ${({ theme, $selected }) => ($selected ? theme.colors.text.primary : theme.colors.text.muted)};
  transition:
    background-color ${({ theme }) => theme.transitions.fast},
    color ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

/** Troca entre visualizações (tabela, cards, kanban). */
export function ViewSwitch<V extends string>({ label, value, options, onChange }: ViewSwitchProps<V>) {
  return (
    <Track role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <Tooltip key={option.value} label={option.label} side="bottom">
          <Option
            type="button"
            role="radio"
            aria-checked={option.value === value}
            aria-label={option.label}
            $selected={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {renderIcon(option.icon, {
              size: 17,
              weight: option.value === value ? "fill" : "regular",
              "aria-hidden": true,
            })}
          </Option>
        </Tooltip>
      ))}
    </Track>
  );
}

/**
 * Visualização escolhida em cada tela, lembrada neste navegador. No celular
 * vale sempre `mobileView` (nunca tabela), sem mexer na escolha do desktop.
 */
export function useViewMode<V extends string>(key: string, initial: V, allowed: readonly V[], mobileView?: V) {
  const mobile = useIsMobile();
  const [view, setView] = useState<V>(initial);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`mk_view:${key}`) as V | null;
      if (saved && allowed.includes(saved)) setView(saved);
    } catch {
      /* sem acesso ao armazenamento */
    }
    // Lê uma vez ao montar
  }, [key]);

  const change = useCallback(
    (next: V) => {
      setView(next);
      try {
        window.localStorage.setItem(`mk_view:${key}`, next);
      } catch {
        /* sem acesso ao armazenamento */
      }
    },
    [key],
  );

  return [mobile && mobileView ? mobileView : view, change] as const;
}
