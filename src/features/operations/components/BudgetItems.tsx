"use client";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import type { QuoteItem } from "@/lib/erp/types";
import { money } from "../catalog";
import { Actions, FieldGrid, Notice, Stack } from "./ui";

export function BudgetItems({ items, discount, onChange, onDiscount, disabled }: { items: QuoteItem[]; discount: number; onChange: (items: QuoteItem[]) => void; onDiscount: (value: number) => void; disabled: boolean }) {
  const update = (index: number, key: keyof QuoteItem, value: string | number) => onChange(items.map((item, current) => current === index ? { ...item, [key]: value } : item));
  const subtotal = items.reduce((total, item) => total + Math.round(item.quantity * item.unitPrice * 100), 0) / 100;
  return <Stack>
    <Actions><strong>Peças e serviços</strong><Button size="sm" variant="secondary" icon={PlusIcon} disabled={disabled || items.length >= 100} onClick={() => onChange([...items, { description: "", quantity: 1, unitPrice: 0 }])}>Adicionar item</Button></Actions>
    {items.map((item, index) => <FieldGrid key={index}>
      <TextField label={`Item ${index + 1}: peça / serviço`} value={item.description} onChange={(event) => update(index, "description", event.target.value)} required maxLength={240} disabled={disabled} />
      <TextField label={`Quantidade do item ${index + 1}`} type="number" min="0.001" step="0.001" value={item.quantity} onChange={(event) => update(index, "quantity", Number(event.target.value))} required disabled={disabled} />
      <TextField label={`Valor unitário do item ${index + 1} (R$)`} type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => update(index, "unitPrice", Number(event.target.value))} required disabled={disabled} />
      <Actions><span>{money(item.quantity * item.unitPrice)}</span><Button variant="ghost" size="sm" icon={TrashIcon} disabled={disabled || items.length === 1} onClick={() => onChange(items.filter((_, current) => current !== index))} aria-label={`Remover item ${index + 1}`}>Remover</Button></Actions>
    </FieldGrid>)}
    <TextField label="Desconto no orçamento (R$)" type="number" min="0" max={subtotal} step="0.01" value={discount} disabled={disabled} onChange={(event) => onDiscount(Number(event.target.value))} />
    <Notice>Subtotal: <strong>{money(subtotal)}</strong> · Desconto: <strong>{money(discount)}</strong> · Total previsto: <strong>{money(Math.max(0, subtotal - discount))}</strong>. A API valida e calcula o valor definitivo ao salvar.</Notice>
  </Stack>;
}
