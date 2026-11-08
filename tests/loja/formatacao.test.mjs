import assert from "node:assert/strict";
import test from "node:test";
import { formatarParcelamento, formatarPreco, formatarPrecoPorUnidade } from "../../src/loja/lib/formatacao/moeda.ts";

// Intl usa espaço não separável (U+00A0) entre "R$" e o número.
const n = (texto) => texto.replace(/ /g, " ");

test("formata reais a partir de string decimal", () => {
  assert.equal(n(formatarPreco("102.95")), "R$ 102,95");
  assert.equal(n(formatarPreco("1234567.5")), "R$ 1.234.567,50");
  assert.equal(n(formatarPreco("0")), "R$ 0,00");
});

test("recusa valor que não é decimal com até 2 casas", () => {
  assert.throws(() => formatarPreco("102,95"));
  assert.throws(() => formatarPreco("10.999"));
  assert.throws(() => formatarPreco("abc"));
});

test("parcelamento e preço por unidade", () => {
  assert.equal(n(formatarParcelamento(5, "20.59")), "ou 5x de R$ 20,59");
  assert.throws(() => formatarParcelamento(1, "10.00"));
  assert.equal(n(formatarPrecoPorUnidade("165.56", "peça")), "R$ 165,56/peça");
});
