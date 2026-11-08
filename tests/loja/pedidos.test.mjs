import assert from "node:assert/strict";
import test from "node:test";
import {
  acoes,
  diaPorExtenso,
  diasParaAgendar,
  linhaDoTempo,
  noFiltro,
  previsaoPorPrazo,
  progresso,
  situacao,
} from "../../src/loja/lib/pedidos/status.ts";

const entrega = {
  tipo: "endereco",
  modalidade: "Normal",
  destino: "Rio de Janeiro/RJ",
  prazo: "3 a 5 dias úteis",
  previsao: "2026-11-05",
  rastreio: "XX",
};
const historico = [
  { status: "aguardando_pagamento", em: "2026-10-30T10:00:00-03:00" },
  { status: "pagamento_aprovado", em: "2026-10-30T10:02:00-03:00" },
  { status: "em_separacao", em: "2026-10-30T15:00:00-03:00" },
  { status: "nota_emitida", em: "2026-10-31T09:00:00-03:00" },
  { status: "em_transporte", em: "2026-11-01T08:00:00-03:00" },
];

test("linha do tempo da entrega: feitos, atual e próximos (produção antes da nota)", () => {
  const passos = linhaDoTempo({ entrega, status: "em_transporte", historico });
  assert.deepEqual(
    passos.map((passo) => passo.rotulo),
    ["Pedido recebido", "Pagamento aprovado", "Em produção no ateliê", "Nota fiscal emitida", "Em transporte", "Entregue"],
  );
  assert.deepEqual(
    passos.map((passo) => passo.estado),
    ["feito", "feito", "feito", "feito", "atual", "proximo"],
  );
  assert.equal(passos[4].em, "2026-11-01T08:00:00-03:00");
  assert.equal(progresso({ entrega, status: "em_transporte", historico }), 4.5 / 6);
});

test("saiu para entrega aparece como passo atual de Em transporte", () => {
  const passos = linhaDoTempo({
    entrega,
    status: "saiu_para_entrega",
    historico: [...historico, { status: "saiu_para_entrega", em: "2026-11-04T07:30:00-03:00" }],
  });
  assert.equal(passos[4].rotulo, "Saiu para entrega");
  assert.equal(passos[4].estado, "atual");
  assert.equal(passos[4].em, "2026-11-04T07:30:00-03:00");
});

test("entregue e retirada concluídos; cancelado mostra só o que aconteceu", () => {
  const entregue = linhaDoTempo({
    entrega,
    status: "entregue",
    historico: [...historico, { status: "entregue", em: "2026-11-04T14:00:00-03:00" }],
  });
  assert.ok(entregue.every((passo) => passo.estado === "feito"));
  const retirada = { tipo: "retirada", local: "Ateliê Milena Kerbage · Fortaleza", prazo: "2 dias úteis", previsao: "2026-11-02" };
  const pronto = linhaDoTempo({ entrega: retirada, status: "pronto_para_retirada", historico: historico.slice(0, 2) });
  assert.deepEqual(
    pronto.map((passo) => passo.estado),
    ["feito", "feito", "feito", "atual", "proximo"],
  );
  const cancelado = linhaDoTempo({
    entrega,
    status: "cancelado",
    historico: [...historico.slice(0, 2), { status: "cancelado", em: "2026-10-30T11:00:00-03:00" }],
  });
  assert.equal(cancelado.length, 2);
  assert.equal(progresso({ entrega, status: "cancelado", historico }), 0);
});

test("ações por situação e filtros", () => {
  assert.equal(acoes({ status: "aguardando_pagamento", entrega }).pagar, true);
  assert.equal(acoes({ status: "em_separacao", entrega }).cancelar, true);
  assert.equal(acoes({ status: "em_transporte", entrega }).cancelar, false);
  assert.equal(acoes({ status: "em_transporte", entrega }).reagendar, true);
  assert.equal(acoes({ status: "em_transporte", entrega }).rastrear, true);
  assert.equal(acoes({ status: "entregue", entrega }).trocar, true);
  assert.equal(acoes({ status: "pagamento_aprovado", entrega }).notaFiscal, false);
  assert.equal(acoes({ status: "em_separacao", entrega }).notaFiscal, false); // em produção: nota ainda não saiu
  assert.equal(acoes({ status: "nota_emitida", entrega }).notaFiscal, true);
  assert.equal(situacao("em_separacao").rotulo, "Em produção no ateliê");
  assert.equal(noFiltro("em_transporte", "andamento"), true);
  assert.equal(noFiltro("entregue", "andamento"), false);
  assert.equal(noFiltro("retirado", "concluidos"), true);
  assert.equal(situacao("pronto_para_retirada").tom, "atencao");
});

test("datas no fuso de Brasília e dias para agendar sem domingo", () => {
  assert.equal(diaPorExtenso("2026-11-05"), "quinta, 5 de nov.");
  const dias = diasParaAgendar(new Date(2026, 10, 6), 3); // sexta, 6/nov
  assert.deepEqual(dias, ["2026-11-07", "2026-11-09", "2026-11-10"]); // pula o domingo 8
});

test("previsão por prazo em dias úteis", () => {
  assert.equal(previsaoPorPrazo("3 a 5 dias úteis", new Date(2026, 10, 2)), "2026-11-09"); // seg 2/nov + 5 úteis
  assert.equal(previsaoPorPrazo("Pronto em 1 dia útil", new Date(2026, 10, 6)), "2026-11-09"); // sexta → segunda
});
