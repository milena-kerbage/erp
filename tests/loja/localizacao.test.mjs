import assert from "node:assert/strict";
import test from "node:test";
import {
  arredondarCoordenada,
  dentroDoBrasil,
  desserializarLocal,
  formatarCep,
  mascararCep,
  normalizarCep,
  serializarLocal,
} from "../../src/loja/lib/localizacao/cep.ts";

test("normaliza CEP em qualquer formato e recusa o inválido", () => {
  assert.equal(normalizarCep("20220-410"), "20220410");
  assert.equal(normalizarCep(" 20.220-410 "), "20220410");
  assert.equal(normalizarCep("2022041"), null);
  assert.equal(normalizarCep("202204100"), null);
  assert.equal(normalizarCep("00000-000"), null);
  assert.equal(normalizarCep(null), null);
});

test("formata e mascara enquanto digita", () => {
  assert.equal(formatarCep("20220410"), "20220-410");
  assert.equal(mascararCep("2022"), "2022");
  assert.equal(mascararCep("202204"), "20220-4");
  assert.equal(mascararCep("20220-41099"), "20220-410");
  assert.equal(mascararCep("ab20220c410"), "20220-410");
});

test("cookie ida e volta preserva acento e espaço", () => {
  const local = { cep: "01310100", cidade: "São Paulo", uf: "SP" };
  assert.deepEqual(desserializarLocal(serializarLocal(local)), local);
});

test("cookie adulterado ou malformado vira null", () => {
  assert.equal(desserializarLocal("01310100|S%C3%A3o%20Paulo"), null); // faltou a UF
  assert.equal(desserializarLocal("123|Cidade|SP"), null); // CEP inválido
  assert.equal(desserializarLocal("01310100|Cidade|S1"), null); // UF inválida
  assert.equal(desserializarLocal("01310100|%E0%A4%A|SP"), null); // codificação quebrada
  assert.equal(desserializarLocal(`01310100|${"a".repeat(400)}|SP`), null); // grande demais
  assert.equal(desserializarLocal(undefined), null);
});

test("só consulta coordenadas dentro do Brasil e arredonda a ~110 m", () => {
  assert.equal(dentroDoBrasil(-22.9, -43.2), true); // Rio
  assert.equal(dentroDoBrasil(-3.1, -60.0), true); // Manaus
  assert.equal(dentroDoBrasil(40.4, -3.7), false); // Madri
  assert.equal(dentroDoBrasil(Number.NaN, -43), false);
  assert.equal(arredondarCoordenada(-22.899321), -22.899);
});
