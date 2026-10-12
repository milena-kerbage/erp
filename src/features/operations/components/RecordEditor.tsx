"use client";
import { useEffect, useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import type { QuoteItem } from "@/lib/erp/types";
import { operationCatalog, money, type OperationRecord, type Resource } from "../catalog";
import { erpRequest, requestError } from "../client";
import { BudgetItems } from "./BudgetItems";
import { Actions, FieldGrid, Form, Hint, Label, NativeSelect, Notice } from "./ui";

export type RelationOptions = Record<"leads" | "pedidos" | "orcamentos" | "materiais", { id: string; label: string; record?: OperationRecord }[]>;
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
function localDateTime(value: unknown) {
  if (typeof value !== "string" || !value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(parsed);
  return parts.replace(" ", "T");
}
export function RecordEditor({ resource, record, open, onClose, onSaved, relations, defaultType, dependencyError, initialValues }: { resource: Resource; record: OperationRecord | null; open: boolean; onClose: () => void; onSaved: () => Promise<void>; relations: RelationOptions; defaultType?: string; dependencyError?: string; initialValues?: Record<string, string | number | boolean> }) {
  const definition = operationCatalog[resource];
  const formId = useId();
  const [values, setValues] = useState<Record<string, string | number | boolean>>({});
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    const initial = Object.fromEntries(definition.fields.map((field) => {
      const stored = record?.[field.key];
      const fallback = field.kind === "checkbox" ? true : field.kind === "number" ? 0 : field.kind === "select" ? field.options?.[0]?.value || "" : field.key === "date" || field.key === "dueDate" ? today() : "";
      return [field.key, field.kind === "datetime-local" ? localDateTime(stored) : stored ?? fallback];
    })) as Record<string, string | number | boolean>;
    if (!record && initialValues) Object.assign(initial, initialValues);
    if (!record && defaultType) initial.type = defaultType;
    if (!record && resource === "producao") initial.priority = "normal";
    setValues(initial);
    setItems(Array.isArray(record?.items) && record.items.length ? structuredClone(record.items) as QuoteItem[] : [{ description: "", quantity: 1, unitPrice: 0 }]);
    setDiscount(Number(record?.discount) || 0);
    setError("");
  }, [definition, resource, record, open, defaultType, initialValues]);
  const set = (key: string, value: string | number | boolean) => {
    setValues((current) => {
      const next = { ...current, [key]: value };
      if (resource === "financeiro" && key === "status") next.paidAt = value === "paid" ? current.paidAt || today() : "";
      if (resource === "pedidos" && key === "orcamentoId" && value) {
        const quote = relations.orcamentos.find((option) => option.id === value)?.record;
        if (quote) { next.total = Number(quote.total) || 0; next.leadId = String(quote.leadId || current.leadId || ""); }
      }
      return next;
    });
  };
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      if (dependencyError) throw new Error(dependencyError);
      const payload: Record<string, unknown> = {};
      for (const field of definition.fields) {
        const raw = values[field.key];
        if (field.required && (raw === "" || raw === undefined)) throw new Error(`Preencha ${field.label.toLowerCase()}.`);
        payload[field.key] = field.kind === "datetime-local" && raw ? new Date(`${String(raw)}:00-03:00`).toISOString() : field.kind === "number" ? Number(raw) : field.kind === "checkbox" ? Boolean(raw) : String(raw ?? "").trim();
      }
      if (resource === "agenda" && String(payload.endAt) <= String(payload.startAt)) throw new Error("O término deve ser posterior ao início do compromisso.");
      if (resource === "financeiro" && payload.status === "paid" && !payload.paidAt) throw new Error("Informe a data da baixa para o lançamento liquidado.");
      if (resource === "orcamentos") {
        if (!items.length || items.some((item) => !item.description.trim() || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) throw new Error("Preencha os itens com descrição, quantidade positiva e preço válido.");
        payload.items = items; payload.discount = discount;
      }
      await erpRequest(`records/${resource}${record ? `/${encodeURIComponent(record.id)}` : ""}`, { method: record ? "PATCH" : "POST", body: record ? { revision: record.revision, record: payload } : { record: payload } });
      await onSaved(); onClose();
    } catch (caught) { setError(requestError(caught)); }
    finally { setSaving(false); }
  }
  return <Dialog open={open} onClose={() => { if (!saving) onClose(); }} title={`${record ? "Editar" : ["producao", "movimentacoes"].includes(resource) ? "Nova" : "Novo"} ${definition.singular}`} description={record ? "As alterações usam a revisão atual. Se outra pessoa editar a ficha, recarregue a lista antes de salvar novamente." : definition.description} width="52rem" footer={<Actions><Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button><Button type="submit" form={formId} loading={saving} disabled={Boolean(dependencyError)}>Salvar {definition.singular}</Button></Actions>}>
    <Form id={formId} onSubmit={(event) => void submit(event)}>
      {dependencyError && <Notice role="alert">{dependencyError}</Notice>}
      <FieldGrid>{definition.fields.map((field) => {
        const value = values[field.key] ?? "";
        if (field.kind === "relation" || field.kind === "select") {
          const choices = field.kind === "relation" ? relations[field.relation!].filter((item) => resource !== "pedidos" || field.relation !== "orcamentos" || item.record?.status === "accepted" || item.id === values.orcamentoId).map((item) => ({ value: item.id, label: item.label })) : field.options || [];
          return <Label key={field.key}>{field.label}{field.required && " *"}<NativeSelect value={String(value)} onChange={(event) => set(field.key, event.target.value)} required={field.required} disabled={saving}><option value="">{field.required ? "Selecione" : "Sem vínculo"}</option>{choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</NativeSelect>{field.hint && <Hint>{field.hint}</Hint>}{field.kind === "relation" && !choices.length && <Hint>Não há cadastros disponíveis. Cadastre o {field.relation === "leads" ? "cliente / lead" : "registro relacionado"} primeiro.</Hint>}</Label>;
        }
        if (field.kind === "checkbox") return <Label key={field.key}><span><input type="checkbox" checked={Boolean(value)} disabled={saving} onChange={(event) => set(field.key, event.target.checked)} /> {field.label}</span></Label>;
        const common = { label: field.label, value: String(value), required: field.required, disabled: saving || (resource === "pedidos" && field.key === "total" && Boolean(values.orcamentoId)), onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(field.key, field.kind === "number" ? event.target.value : event.target.value), hint: field.kind === "datetime-local" ? "Horário de Fortaleza / Brasília (UTC−3)." : field.hint };
        return field.kind === "textarea" ? <TextField key={field.key} {...common} multiline maxLength={4000} /> : <TextField key={field.key} {...common} type={field.kind || "text"} min={field.min} step={field.step} maxLength={field.kind === "text" || !field.kind ? 240 : undefined} />;
      })}</FieldGrid>
      {resource === "orcamentos" && <BudgetItems items={items} discount={discount} onChange={setItems} onDiscount={setDiscount} disabled={saving} />}
      {resource === "materiais" && record && <Notice>Saldo atual: <strong>{Number(record.quantity) || 0} {String(record.unit || "")}</strong>. Para atualizar, use Movimentações.</Notice>}
      {resource === "pedidos" && values.orcamentoId && <Notice>Valor copiado do orçamento: <strong>{money(values.total)}</strong>. O servidor copia o valor ao criar ou trocar o vínculo e preserva o valor contratado nas demais edições.</Notice>}
      {definition.hint && <Notice>{definition.hint}</Notice>}
      {error && <Notice role="alert">{error}</Notice>}
    </Form>
  </Dialog>;
}
