import assert from "node:assert/strict";
import test from "node:test";
import { calcularRecompensas, deCentavos, NOME_PROGRAMA, paraCentavos } from "../../src/loja/lib/fastclub/regras.ts";

test("converte decimal em centavos sem float", () => {
  assert.equal(paraCentavos("39.90"), 3990);
  assert.equal(paraCentavos("0.1"), 10);
  assert.equal(paraCentavos("329"), 32900);
  assert.equal(deCentavos(3990), "39.90");
  assert.equal(deCentavos(5), "0.05");
  assert.throws(() => paraCentavos("39,90"));
  assert.throws(() => paraCentavos("-1.00"));
});

test("1 ponto por real e 2% em moedas", () => {
  assert.deepEqual(calcularRecompensas("39.90"), { pontos: 39, moedas: 79, cashback: "0.79" });
  assert.deepEqual(calcularRecompensas("329.90"), { pontos: 329, moedas: 659, cashback: "6.59" });
});

test("quantidade multiplica antes de arredondar", () => {
  // 3 × 39,90 = 119,70 → 119 pontos e 239 moedas (e não 3 × 79 = 237)
  assert.deepEqual(calcularRecompensas("39.90", 3), { pontos: 119, moedas: 239, cashback: "2.39" });
  assert.throws(() => calcularRecompensas("39.90", 0));
  assert.throws(() => calcularRecompensas("39.90", 1.5));
});

test("nome visível do programa", () => {
  assert.equal(NOME_PROGRAMA, "Clube Milena");
});
