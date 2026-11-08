import assert from "node:assert/strict";
import test from "node:test";
import {
  COLCHOES,
  calcularBerco,
  calcularEnxoval,
  estacaoDoMes,
  listaParaMensagem,
} from "../../src/loja/lib/calculadora/enxoval.ts";

test("berço americano 130 × 70 × 12: lençol, protetor e saia", () => {
  const medidas = calcularBerco(COLCHOES.americano);
  assert.ok(!("erro" in medidas));
  assert.equal(medidas.colchao, "130 × 70 × 12 cm");
  assert.deepEqual([medidas.lencol.comprimento, medidas.lencol.largura], [170, 110]); // + 2 × (12 + 8)
  assert.equal(medidas.protetor.contorno, 400);
  assert.equal(medidas.protetor.altura, 35);
  assert.deepEqual(
    medidas.protetor.partes.map((parte) => parte.cm),
    [70, 70, 130, 130],
  );
  assert.equal(medidas.saia.contorno, 270); // 3 lados
  assert.equal(medidas.saia.altura, 30);
  assert.ok(medidas.avisos.length > 0);
});

test("mini berço e altura do estrado informada", () => {
  const medidas = calcularBerco({ ...COLCHOES.mini, alturaEstrado: 25 });
  assert.equal(medidas.lencol.comprimento, 126); // 90 + 2 × (10 + 8)
  assert.equal(medidas.saia.altura, 25);
  assert.match(medidas.saia.texto, /190 cm de contorno/);
});

test("medidas inválidas devolvem erro", () => {
  assert.ok("erro" in calcularBerco({ comprimento: 0, largura: 70, altura: 12 }));
  assert.ok("erro" in calcularBerco({ comprimento: 130, largura: 140, altura: 12 }));
  assert.ok("erro" in calcularBerco({ comprimento: 130, largura: 70, altura: 40 }));
  assert.ok("erro" in calcularBerco({ comprimento: Number.NaN, largura: 70, altura: 12 }));
  assert.ok("erro" in calcularBerco({ ...COLCHOES.americano, alturaEstrado: 2 }));
});

test("quantidades do enxoval pela lavagem e pela estação", () => {
  const duas = calcularEnxoval({ estacao: "inverno", lavagensPorSemana: 2 });
  assert.ok(!("erro" in duas));
  const qtd = Object.fromEntries(duas.itens.map((item) => [item.chave, item.quantidade]));
  assert.deepEqual(qtd, { fraldasDeBoca: 20, cueiros: 10, lencois: 4, toalhas: 4, mantas: 4 });

  const diaria = calcularEnxoval({ estacao: "verao", lavagensPorSemana: 7 });
  const qtdDiaria = Object.fromEntries(diaria.itens.map((item) => [item.chave, item.quantidade]));
  assert.equal(qtdDiaria.fraldasDeBoca, 10);
  assert.equal(qtdDiaria.lencois, 3); // mínimo
  assert.equal(qtdDiaria.mantas, 2);
  assert.ok(diaria.itens.every((item) => item.href.startsWith("/")));
});

test("entradas inválidas do enxoval e estação pelo mês", () => {
  assert.ok("erro" in calcularEnxoval({ estacao: "verao", lavagensPorSemana: 0 }));
  assert.ok("erro" in calcularEnxoval({ estacao: "verao", lavagensPorSemana: 2.5 }));
  assert.ok("erro" in calcularEnxoval({ estacao: "outono", lavagensPorSemana: 2 }));
  assert.equal(estacaoDoMes(1), "verao");
  assert.equal(estacaoDoMes(7), "inverno");
  assert.equal(estacaoDoMes(4), "meia-estacao");
});

test("mensagem do WhatsApp traz medidas e quantidades", () => {
  const medidas = calcularBerco(COLCHOES.americano);
  const { itens } = calcularEnxoval({ estacao: "inverno", lavagensPorSemana: 2 });
  const texto = listaParaMensagem(medidas, itens);
  assert.match(texto, /130 × 70 × 12 cm/);
  assert.match(texto, /• 20 fraldas de boca/);
  assert.match(listaParaMensagem(null, []), /calculadora do enxoval/);
});
