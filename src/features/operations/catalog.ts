/** Campos de domínio das fichas. A validação definitiva e os cálculos pertencem à API. */
export type Resource = "agenda" | "orcamentos" | "pedidos" | "catalogo" | "producao" | "materiais" | "movimentacoes" | "financeiro";
export type OperationRecord = { id: string; revision: number; createdAt: string; updatedAt: string; archivedAt?: string | null; [key: string]: unknown };
export type Field = { key: string; label: string; kind?: "text" | "date" | "datetime-local" | "number" | "textarea" | "select" | "relation" | "checkbox"; required?: boolean; min?: number; step?: string; options?: readonly { value: string; label: string }[]; relation?: "leads" | "pedidos" | "orcamentos" | "materiais"; hint?: string };
const options = (...values: [string, string][]) => values.map(([value, label]) => ({ value, label }));
const lead: Field = { key: "leadId", label: "Cliente / lead", kind: "relation", relation: "leads", hint: "Cadastre a pessoa em Leads ou Clientes antes de relacionar." };
const notes: Field = { key: "notes", label: "Observações internas", kind: "textarea" };
const title: Field = { key: "title", label: "Descrição", required: true };
const order: Field = { key: "pedidoId", label: "Pedido relacionado", kind: "relation", relation: "pedidos" };
const moneyField = (key: string, label: string): Field => ({ key, label, kind: "number", required: true, min: 0, step: "0.01" });
export const operationCatalog: Record<Resource, { title: string; singular: string; description: string; fields: Field[]; columns: { key: string; label: string; format?: "money" | "date" | "datetime" | "relation" | "quantity" | "boolean" }[]; hint?: string }> = {
  agenda: {
    title: "Agenda", singular: "compromisso", description: "Organize provas, visitas e entregas com horários e clientes vinculados.",
    fields: [title, lead, { key: "startAt", label: "Início", kind: "datetime-local", required: true }, { key: "endAt", label: "Término", kind: "datetime-local", required: true }, { key: "location", label: "Local" }, { key: "status", label: "Situação", kind: "select", options: options(["scheduled", "Agendado"], ["confirmed", "Confirmado"], ["completed", "Realizado"], ["cancelled", "Cancelado"]) }, notes],
    columns: [{ key: "title", label: "Compromisso" }, { key: "leadId", label: "Cliente", format: "relation" }, { key: "startAt", label: "Início", format: "datetime" }, { key: "endAt", label: "Término", format: "datetime" }, { key: "status", label: "Situação" }],
    hint: "Esta agenda registra compromissos internos. Lembretes externos e sincronização de calendários dependem de uma integração específica.",
  },
  orcamentos: {
    title: "Orçamentos", singular: "orçamento", description: "Detalhe as peças e serviços, valores, prazo de validade e aprovação da cliente.",
    fields: [title, { ...lead, required: true }, { key: "validUntil", label: "Válido até", kind: "date", required: true }, { key: "status", label: "Situação", kind: "select", options: options(["draft", "Rascunho"], ["sent", "Enviado"], ["accepted", "Aceito"], ["rejected", "Recusado"], ["expired", "Expirado"]) }, { key: "description", label: "Condições, prazos e observações", kind: "textarea" }],
    columns: [{ key: "title", label: "Orçamento" }, { key: "leadId", label: "Cliente", format: "relation" }, { key: "total", label: "Total", format: "money" }, { key: "validUntil", label: "Validade", format: "date" }, { key: "status", label: "Situação" }],
    hint: "O total é calculado a partir dos itens. Marcar como enviado registra o acompanhamento; o envio para a cliente é realizado em Conversas.",
  },
  pedidos: {
    title: "Pedidos", singular: "pedido", description: "Acompanhe o pedido desde a confirmação até a entrega, com valor, cliente e prazo.",
    fields: [title, { ...lead, required: true }, { key: "orcamentoId", label: "Orçamento relacionado", kind: "relation", relation: "orcamentos", hint: "Selecione um orçamento aprovado quando houver." }, moneyField("total", "Valor contratado (R$)"), { key: "dueDate", label: "Prazo de entrega", kind: "date", required: true }, { key: "status", label: "Etapa", kind: "select", options: options(["pending", "Pendente"], ["confirmed", "Confirmado"], ["production", "Em produção"], ["ready", "Pronto"], ["delivered", "Entregue"], ["cancelled", "Cancelado"]) }, notes],
    columns: [{ key: "title", label: "Pedido" }, { key: "leadId", label: "Cliente", format: "relation" }, { key: "total", label: "Valor", format: "money" }, { key: "dueDate", label: "Entrega", format: "date" }, { key: "status", label: "Etapa" }],
  },
  catalogo: {
    title: "Catálogo", singular: "item de catálogo", description: "Cadastre modelos e serviços do ateliê com referência, categoria e preço.",
    fields: [{ key: "name", label: "Nome do modelo / serviço", required: true }, { key: "sku", label: "Referência (SKU)", required: true }, { key: "category", label: "Categoria" }, moneyField("price", "Preço de referência (R$)"), { key: "description", label: "Descrição e acabamento", kind: "textarea" }, { key: "active", label: "Disponível para novos pedidos", kind: "checkbox" }],
    columns: [{ key: "name", label: "Modelo / serviço" }, { key: "sku", label: "Referência" }, { key: "category", label: "Categoria" }, { key: "price", label: "Preço", format: "money" }, { key: "active", label: "Disponível", format: "boolean" }],
  },
  producao: {
    title: "Produção", singular: "tarefa de produção", description: "Distribua as etapas de trabalho por pedido, responsável, prioridade e prazo.",
    fields: [title, { ...order, required: true }, { key: "owner", label: "Responsável", required: true }, { key: "dueDate", label: "Prazo da tarefa", kind: "date", required: true }, { key: "status", label: "Andamento", kind: "select", options: options(["pending", "A fazer"], ["cutting", "Corte"], ["sewing", "Costura"], ["fitting", "Prova"], ["finishing", "Acabamento"], ["completed", "Concluída"], ["cancelled", "Cancelada"]) }, { key: "priority", label: "Prioridade", kind: "select", options: options(["low", "Baixa"], ["normal", "Normal"], ["high", "Alta"]) }, notes],
    columns: [{ key: "title", label: "Tarefa" }, { key: "pedidoId", label: "Pedido", format: "relation" }, { key: "owner", label: "Responsável" }, { key: "dueDate", label: "Prazo", format: "date" }, { key: "status", label: "Andamento" }, { key: "priority", label: "Prioridade" }],
  },
  materiais: {
    title: "Materiais", singular: "material", description: "Cadastre tecidos e aviamentos e acompanhe saldos calculados pelas movimentações.",
    fields: [{ key: "name", label: "Material", required: true }, { key: "sku", label: "Referência (SKU)", required: true }, { key: "unit", label: "Unidade de medida", required: true, hint: "Use m, un, kg, cm ou a unidade adequada ao material. Ela permanece fixa após a primeira movimentação." }, { key: "minQuantity", label: "Quantidade mínima", kind: "number", min: 0, step: "0.001", required: true }, moneyField("unitCost", "Custo de referência por unidade (R$)")],
    columns: [{ key: "name", label: "Material" }, { key: "sku", label: "Referência" }, { key: "quantity", label: "Saldo", format: "quantity" }, { key: "unit", label: "Unidade" }, { key: "minQuantity", label: "Mínimo", format: "quantity" }, { key: "unitCost", label: "Custo unitário", format: "money" }],
    hint: "O saldo não é editável na ficha. Registre uma entrada para o estoque inicial e entradas/saídas para os demais ajustes.",
  },
  movimentacoes: {
    title: "Movimentações", singular: "movimentação", description: "Registre entradas e saídas de materiais; o estoque é atualizado pela API.",
    fields: [{ key: "materialId", label: "Material", kind: "relation", relation: "materiais", required: true }, { key: "direction", label: "Tipo", kind: "select", options: options(["in", "Entrada"], ["out", "Saída"]) }, { key: "quantity", label: "Quantidade", kind: "number", min: 0.001, step: "0.001", required: true }, moneyField("unitCost", "Custo por unidade (R$)"), { key: "date", label: "Data da movimentação", kind: "date", required: true }, { key: "notes", label: "Motivo / pedido / documento", kind: "textarea", required: true }],
    columns: [{ key: "materialId", label: "Material", format: "relation" }, { key: "direction", label: "Tipo" }, { key: "quantity", label: "Quantidade", format: "quantity" }, { key: "unitCost", label: "Custo unitário", format: "money" }, { key: "date", label: "Data", format: "date" }, { key: "notes", label: "Motivo" }],
    hint: "Movimentações são imutáveis. Para corrigir, arquive a entrada incorreta e registre outra. O arquivamento reverte o efeito no saldo quando possível.",
  },
  financeiro: {
    title: "Financeiro", singular: "lançamento financeiro", description: "Controle valores a receber e a pagar, vencimentos e baixas realizadas pelo ateliê.",
    fields: [{ key: "type", label: "Tipo", kind: "select", options: options(["income", "Recebimento"], ["expense", "Pagamento"]) }, title, lead, order, { ...moneyField("amount", "Valor (R$)"), min: 0.01 }, { key: "dueDate", label: "Vencimento", kind: "date", required: true }, { key: "status", label: "Situação", kind: "select", options: options(["pending", "Pendente"], ["paid", "Pago / recebido"], ["cancelled", "Cancelado"]) }, { key: "paidAt", label: "Data da baixa", kind: "date", hint: "Informe quando o lançamento estiver pago / recebido." }, { key: "category", label: "Categoria" }, notes],
    columns: [{ key: "title", label: "Lançamento" }, { key: "type", label: "Tipo" }, { key: "amount", label: "Valor", format: "money" }, { key: "dueDate", label: "Vencimento", format: "date" }, { key: "paidAt", label: "Baixa", format: "date" }, { key: "status", label: "Situação" }],
    hint: "A baixa registra um pagamento ou recebimento já confirmado pelo ateliê. Esta tela não transfere dinheiro e não emite notas fiscais.",
  },
};

export const money = (value: unknown) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);
export const quantity = (value: unknown) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(Number(value) || 0);
export function dateLabel(value: unknown, withTime = false) {
  if (typeof value !== "string" || !value) return "—";
  const parsed = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString("pt-BR", withTime ? { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" } : { dateStyle: "short" });
}
