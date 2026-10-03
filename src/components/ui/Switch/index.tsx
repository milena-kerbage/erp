"use client";

import styled from "@emotion/styled";
import { transientOptions } from "@/lib/emotion/transient";

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Nome acessível (use quando não houver texto visível ligado por `id`). */
  label?: string;
  id?: string;
  disabled?: boolean;
  /** Id do texto que descreve o controle. */
  "aria-describedby"?: string;
};

const Track = styled("button", transientOptions)<{ $checked: boolean }>`
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  width: 2.125rem;
  height: 1.25rem;
  padding: 2px;
  border-radius: ${({ theme }) => theme.radii.full};
  background-color: ${({ theme, $checked }) => ($checked ? theme.colors.primary.main : theme.palette.neutral[300])};
  cursor: pointer;
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme, $checked }) => ($checked ? theme.colors.primary.hover : theme.palette.neutral[400])};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Bolinha */
  &::after {
    content: "";
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    background-color: ${({ theme }) => theme.palette.neutral[0]};
    transform: translateX(${({ $checked }) => ($checked ? "0.875rem" : "0")});
    transition: transform ${({ theme }) => theme.transitions.normal};
  }
`;

/** Liga/desliga (preferências, integrações, webhooks). */
export function Switch({ checked, onChange, label, id, disabled, ...rest }: SwitchProps) {
  return (
    <Track
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      $checked={checked}
      onClick={() => onChange(!checked)}
      {...rest}
    />
  );
}
