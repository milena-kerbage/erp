"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import styled from "@emotion/styled";
import { transientOptions } from "@/lib/emotion/transient";

export type TabItem<V extends string> = {
  value: V;
  label: string;
  /** Contador ao lado do rótulo (ex.: nº de arquivos). */
  count?: number;
};

type TabsProps<V extends string> = {
  items: readonly TabItem<V>[];
  value: V;
  onChange: (value: V) => void;
  label: string;
  /** Conteúdo da aba ativa. */
  children: ReactNode;
  className?: string;
};

const List = styled.div`
  display: flex;
  flex-shrink: 0;
  gap: ${({ theme }) => theme.spacing(5)};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};

  /* Celular: abas numa linha que rola para o lado, sem barra */
  ${({ theme }) => theme.media.md} {
    gap: ${({ theme }) => theme.spacing(4)};
    overflow-x: auto;
    scrollbar-width: none;
    overscroll-behavior-x: contain;

    &::-webkit-scrollbar {
      display: none;
    }

    > button {
      flex-shrink: 0;
    }

    /* Com rolagem, o sublinhado não pode passar da borda (seria cortado) */
    > button::after {
      bottom: 0;
    }
  }
`;

const Tab = styled("button", transientOptions)<{ $active: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1.5)};
  height: 2.5rem;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme, $active }) => ($active ? theme.colors.text.primary : theme.colors.text.muted)};
  white-space: nowrap;
  transition: color ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  /* Sublinhado da aba ativa, sobre a borda da lista */
  &::after {
    content: "";
    position: absolute;
    right: 0;
    bottom: -1px;
    left: 0;
    height: 2px;
    border-radius: 2px;
    background-color: ${({ theme, $active }) => ($active ? theme.colors.primary.main : "transparent")};
    transition: background-color ${({ theme }) => theme.transitions.fast};
  }
`;

const Count = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.125rem;
  height: 1.125rem;
  padding: 0 4px;
  border-radius: ${({ theme }) => theme.radii.full};
  background-color: ${({ theme }) => theme.palette.neutral[100]};
  font-size: 0.6875rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Panel = styled.div`
  min-height: 0;
  outline: none;
`;

/** Abas dentro de uma tela (padrão WAI-ARIA "tabs"): setas trocam de aba. */
export function Tabs<V extends string>({
  items,
  value,
  onChange,
  label,
  children,
  className,
}: TabsProps<V>) {
  const id = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = items.findIndex((item) => item.value === value);
    let next = -1;
    if (event.key === "ArrowRight") next = (index + 1) % items.length;
    if (event.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = items.length - 1;
    if (next < 0) return;

    event.preventDefault();
    onChange(items[next].value);
    refs.current[items[next].value]?.focus();
  };

  return (
    <div className={className}>
      <List role="tablist" aria-label={label} onKeyDown={handleKeyDown}>
        {items.map((item) => {
          const active = item.value === value;
          return (
            <Tab
              key={item.value}
              ref={(element) => {
                refs.current[item.value] = element;
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${item.value}`}
              aria-selected={active}
              aria-controls={`${id}-panel`}
              tabIndex={active ? 0 : -1}
              $active={active}
              onClick={() => onChange(item.value)}
            >
              {item.label}
              {item.count !== undefined && item.count > 0 && <Count>{item.count}</Count>}
            </Tab>
          );
        })}
      </List>
      <Panel
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${value}`}
        tabIndex={0}
      >
        {children}
      </Panel>
    </div>
  );
}
