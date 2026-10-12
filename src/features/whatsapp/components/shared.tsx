"use client";

import styled from "@emotion/styled";
import { transientOptions } from "@/lib/emotion/transient";

export const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
  min-width: 0;
`;

export const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
`;

export const ConfirmationLabel = styled.label`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing(2)};
  font-size: 0.8125rem;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  input { margin-top: 2px; }
`;

export const Note = styled.p`
  font-size: 0.8125rem;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.muted};
  overflow-wrap: anywhere;
  a { color: ${({ theme }) => theme.colors.text.brand}; text-decoration: underline; }
`;

export const Notice = styled("div", transientOptions)<{ $error?: boolean }>`
  padding: ${({ theme }) => theme.spacing(3, 4)};
  border: 1px solid ${({ theme, $error }) => $error ? theme.colors.danger : theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme, $error }) => $error ? theme.tones.rose.bg : theme.colors.background.surface};
  color: ${({ theme, $error }) => $error ? theme.tones.rose.fg : theme.colors.text.secondary};
  font-size: 0.8125rem;
  line-height: 1.6;
  overflow-wrap: anywhere;
  a { text-decoration: underline; }
`;

export function formatWhatsAppDate(value: string | null | undefined, withDate = true): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "Ainda não recebido";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: withDate ? "short" : undefined, timeStyle: "short" }).format(new Date(value));
}
