"use client";

import { useId, type ComponentPropsWithoutRef, type ReactNode } from "react";
import styled from "@emotion/styled";
import { renderIcon, type IconSource } from "@/lib/icons";
import { transientOptions } from "@/lib/emotion/transient";

type BaseProps = {
  label: string;
  /** Texto de ajuda abaixo do campo. */
  hint?: ReactNode;
  error?: string;
  icon?: IconSource;
  /** Conteúdo no fim do campo (ex.: botão de copiar). */
  trailing?: ReactNode;
  /** Formata enquanto digita (telefone, R$...). */
  mask?: (value: string) => string;
  /** Esconde o rótulo visualmente (continua acessível). */
  hideLabel?: boolean;
  className?: string;
};

type InputProps = BaseProps &
  Omit<ComponentPropsWithoutRef<"input">, "className"> & { multiline?: false };
type TextareaProps = BaseProps &
  Omit<ComponentPropsWithoutRef<"textarea">, "className"> & { multiline: true };

export type TextFieldProps = InputProps | TextareaProps;

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1.5)};
  min-width: 0;
`;

const Label = styled("label", transientOptions)<{ $hidden: boolean }>`
  font-size: 0.8125rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};

  ${({ $hidden }) =>
    $hidden
      ? `position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap;`
      : ""}
`;

/** Caixa do campo: borda sutil; em foco só a borda muda de cor (sem anel). */
const Control = styled("div", transientOptions)<{ $multiline: boolean; $error: boolean }>`
  display: flex;
  align-items: ${({ $multiline }) => ($multiline ? "flex-start" : "center")};
  gap: ${({ theme }) => theme.spacing(2)};
  min-height: 2.25rem;
  padding: ${({ theme, $multiline }) => ($multiline ? theme.spacing(2, 2.5) : theme.spacing(0, 2.5))};
  border: 1px solid ${({ theme, $error }) => ($error ? theme.colors.danger : theme.colors.border.subtle)};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
  color: ${({ theme }) => theme.colors.text.muted};
  transition: border-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme, $error }) => ($error ? theme.colors.danger : theme.colors.border.default)};
  }

  &:focus-within {
    border-color: ${({ theme, $error }) => ($error ? theme.colors.danger : theme.palette.sage[400])};
  }

  > svg {
    flex-shrink: 0;
    margin-top: ${({ $multiline }) => ($multiline ? "2px" : "0")};
  }

  input,
  textarea {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: none;
    background: transparent;
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.text.primary};

    &::placeholder {
      color: ${({ theme }) => theme.colors.text.muted};
    }

    &:focus-visible {
      outline: none;
    }
  }

  input {
    height: 2.125rem;
  }

  textarea {
    min-height: 5.5rem;
    line-height: 1.5;
    resize: vertical;
  }
`;

const Hint = styled("span", transientOptions)<{ $error: boolean }>`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme, $error }) => ($error ? theme.colors.danger : theme.colors.text.muted)};
`;

/** Campo de formulário das configurações: rótulo, ícone, ajuda e máscara. */
export function TextField(props: TextFieldProps) {
  const {
    label,
    hint,
    error,
    icon,
    trailing,
    mask,
    hideLabel = false,
    className,
    id,
    multiline: _multiline,
    ...rest
  } = props;
  const generated = useId();
  const fieldId = id ?? generated;
  const hintId = hint || error ? `${fieldId}-hint` : undefined;

  const common = {
    id: fieldId,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": hintId,
  };

  return (
    <Root className={className}>
      <Label htmlFor={fieldId} $hidden={hideLabel}>
        {label}
      </Label>
      <Control $multiline={Boolean(props.multiline)} $error={Boolean(error)}>
        {icon && renderIcon(icon, { size: 16, "aria-hidden": true })}
        {props.multiline ? (
          <textarea
            {...common}
            {...(rest as Omit<TextareaProps, keyof BaseProps | "multiline">)}
            onChange={(event) => {
              if (mask) event.target.value = mask(event.target.value);
              (rest as TextareaProps).onChange?.(event);
            }}
          />
        ) : (
          <input
            {...common}
            {...(rest as Omit<InputProps, keyof BaseProps | "multiline">)}
            onChange={(event) => {
              if (mask) event.target.value = mask(event.target.value);
              (rest as InputProps).onChange?.(event);
            }}
          />
        )}
        {trailing}
      </Control>
      {(error || hint) && (
        <Hint id={hintId} $error={Boolean(error)}>
          {error ?? hint}
        </Hint>
      )}
    </Root>
  );
}
