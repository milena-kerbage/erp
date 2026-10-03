"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type HTMLInputTypeAttribute,
  type MouseEvent,
  type ReactNode,
} from "react";
import { css, type Theme } from "@emotion/react";
import styled from "@emotion/styled";
import { transientOptions } from "@/lib/emotion/transient";
import type { Tone } from "@/styles/theme";

/**
 * Edição direta: o valor aparece como texto e, ao clicar, o mesmo texto vira
 * campo — sem borda, anel ou fundo novo; só o cursor aparece. Enter ou sair
 * do campo salva; Esc cancela.
 */

/** Mesmo lugar e tipografia no texto e no campo: nada "pula" ao editar. */
const surface = (theme: Theme) => css`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing(1.5)};
  max-width: calc(100% + 0.75rem);
  min-height: 1.5rem;
  margin: 0 -0.375rem;
  padding: ${theme.spacing(0, 1.5)};
  border: 0;
  border-radius: ${theme.radii.sm};
  background: transparent;
  font: inherit;
  color: inherit;
  text-align: left;
`;

const Display = styled("button", transientOptions)<{ $empty: boolean }>`
  ${({ theme }) => surface(theme)};
  color: ${({ theme, $empty }) => ($empty ? theme.colors.text.muted : "inherit")};
  cursor: text;

  > span {
    min-width: 0;
    overflow-wrap: anywhere;
  }
`;

const Input = styled.input`
  ${({ theme }) => surface(theme)};
  width: calc(100% + 0.75rem);
  outline: none;
  caret-color: ${({ theme }) => theme.colors.primary.main};
  cursor: text;

  &:focus-visible {
    outline: none;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

type EditableTextProps = {
  value: string;
  onSave: (value: string) => void;
  /** Nome do campo (acessibilidade). */
  label: string;
  type?: HTMLInputTypeAttribute;
  inputMode?: ComponentPropsWithoutRef<"input">["inputMode"];
  placeholder?: string;
  /** Como o valor aparece fora da edição (ex.: formatado). */
  display?: ReactNode;
  /** Valor que vai para o campo ao editar (ex.: com a máscara completa). */
  editValue?: string;
  /** Formata enquanto digita (R$, telefone, @...). */
  mask?: (input: string) => string;
  className?: string;
};

export function EditableText({
  value,
  onSave,
  label,
  type = "text",
  inputMode,
  placeholder = "Vazio",
  display,
  editValue,
  mask,
  className,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const cancelled = useRef(false);
  /** Só devolve o foco ao texto se a edição começou pelo teclado. */
  const viaKeyboard = useRef(false);

  const initial = editValue ?? value;

  useEffect(() => {
    if (!editing) return;
    const element = inputRef.current;
    if (!element) return;
    element.focus();
    // Cursor no fim, como quem continua escrevendo (type="email" não aceita seleção)
    try {
      element.setSelectionRange(element.value.length, element.value.length);
    } catch {
      /* sem suporte a seleção neste tipo de campo */
    }
  }, [editing]);

  const start = (event: MouseEvent<HTMLButtonElement>) => {
    cancelled.current = false;
    viaKeyboard.current = event.detail === 0;
    setDraft(mask ? mask(initial) : initial);
    setEditing(true);
  };

  const finish = () => {
    if (!cancelled.current && draft.trim() !== initial.trim()) onSave(draft.trim());
    setEditing(false);
    if (viaKeyboard.current) window.requestAnimationFrame(() => buttonRef.current?.focus());
  };

  if (editing) {
    return (
      <Input
        ref={inputRef}
        type={type}
        inputMode={inputMode}
        aria-label={label}
        value={draft}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => setDraft(mask ? mask(event.target.value) : event.target.value)}
        onBlur={finish}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            inputRef.current?.blur();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            cancelled.current = true;
            inputRef.current?.blur();
          }
        }}
      />
    );
  }

  const empty = !value;

  return (
    <Display
      ref={buttonRef}
      type="button"
      $empty={empty}
      aria-label={`${label}: ${empty ? "vazio" : value}. Editar`}
      className={className}
      onClick={start}
    >
      <span>{empty ? placeholder : (display ?? value)}</span>
    </Display>
  );
}

/* ---------- Gatilhos de dropdown ---------- */

export type FieldTriggerVariant = "plain" | "pill" | "badge";

/**
 * Gatilho de escolha dentro da ficha:
 * - plain: o próprio texto (funil, etapa, data);
 * - pill: pílula com borda e avatar (responsável);
 * - badge: selo no tom da opção, com ícone (origem, tipo de evento).
 */
export const FieldTrigger = styled("button", transientOptions)<{
  $variant?: FieldTriggerVariant;
  $tone?: Tone;
  $empty?: boolean;
}>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1.5)};
  max-width: 100%;
  min-width: 0;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background-color ${({ theme }) => theme.transitions.fast},
    border-color ${({ theme }) => theme.transitions.fast};

  svg {
    flex-shrink: 0;
  }

  ${({ theme, $variant = "plain", $tone = "neutral", $empty }) => {
    if ($empty)
      return css`
        min-height: 1.5rem;
        color: ${theme.colors.text.muted};
      `;

    switch ($variant) {
      case "pill":
        return css`
          height: 1.75rem;
          padding: ${theme.spacing(0, 2.5, 0, 0.75)};
          border: 1px solid ${theme.colors.border.subtle};
          border-radius: ${theme.radii.full};
          background-color: ${theme.palette.neutral[0]};
          font-size: 0.8125rem;
          font-weight: ${theme.fontWeights.medium};
          color: ${theme.colors.text.primary};

          &:hover,
          &[aria-expanded="true"] {
            border-color: ${theme.colors.border.default};
          }
        `;
      case "badge":
        return css`
          height: 1.625rem;
          padding: ${theme.spacing(0, 2)};
          border-radius: ${theme.radii.sm};
          background-color: ${theme.tones[$tone].soft};
          font-size: 0.8125rem;
          font-weight: ${theme.fontWeights.medium};
          color: ${theme.tones[$tone].fg};

          svg {
            width: 15px;
            height: 15px;
          }

          &:hover,
          &[aria-expanded="true"] {
            background-color: color-mix(in srgb, ${theme.tones[$tone].fg} 10%, ${theme.tones[$tone].soft});
          }
        `;
      default:
        return css`
          min-height: 1.5rem;
          color: ${theme.colors.text.primary};
        `;
    }
  }}
`;
