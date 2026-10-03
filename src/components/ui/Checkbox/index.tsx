"use client";

import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import styled from "@emotion/styled";

type CheckboxProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & {
  /** Nome acessível (a caixa não tem texto visível). */
  label: string;
  /** Parte selecionada (ex.: "selecionar todos" com só alguns marcados). */
  indeterminate?: boolean;
};

const Input = styled.input`
  display: inline-grid;
  flex-shrink: 0;
  place-content: center;
  width: 1rem;
  height: 1rem;
  margin: 0;
  border: 1.5px solid ${({ theme }) => theme.colors.border.strong};
  border-radius: 4px;
  background-color: ${({ theme }) => theme.palette.neutral[0]};
  appearance: none;
  cursor: pointer;
  transition:
    background-color ${({ theme }) => theme.transitions.fast},
    border-color ${({ theme }) => theme.transitions.fast};

  /* Marca: check (marcado) ou traço (parcial) */
  &::before {
    content: "";
    width: 0.5625rem;
    height: 0.5625rem;
    background-color: ${({ theme }) => theme.palette.neutral[0]};
    clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
    transform: scale(0);
    transition: transform ${({ theme }) => theme.transitions.fast};
  }

  &:hover {
    border-color: ${({ theme }) => theme.palette.neutral[500]};
  }

  &:checked,
  &:indeterminate {
    border-color: ${({ theme }) => theme.colors.primary.strong};
    background-color: ${({ theme }) => theme.colors.primary.strong};
  }

  &:checked::before {
    transform: scale(1);
  }

  &:indeterminate::before {
    height: 2px;
    border-radius: 1px;
    clip-path: none;
    transform: scale(1);
  }
`;

/** Caixa de seleção do sistema (tabelas, listas). */
export function Checkbox({ label, indeterminate = false, ...rest }: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  // "indeterminate" só existe como propriedade do elemento, não como atributo.
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return <Input ref={ref} type="checkbox" aria-label={label} {...rest} />;
}
