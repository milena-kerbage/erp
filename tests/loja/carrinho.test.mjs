import assert from "node:assert/strict";
import test from "node:test";
import {
  CUPONS,
  calcularTotais,
  centavos,
  decimal,
  prazoDeProducao,
  textoPrazo,
  validarCupom,
} from "../../src/loja/lib/carrinho/totais.ts";

test("subtotal, Pix de 5% e parcelamento em centavos", () => {
  const t = calcularTotais([
    { preco: "119.00", quantidade: 3 }, // 357,00 (fraldas de boca)
    { preco: "140.70", quantidade: 1 }, // 140,70
  ]);
  assert.equal(t.itens, 4);
  assert.equal(t.subtotal, 49770);
  assert.equal(t.descontoPix, 2489); // 5% de 497,70 = 24,885 → 24,89
  assert.equal(t.totalPix, 47281);
  assert.equal(t.parcelas, 10);
  assert.equal(t.valorParcela, 4977);
  assert.equal(decimal(t.totalPix), "472.81");
});

test("cupom entra antes do Pix e respeita o mínimo", () => {
  const linhas = [{ preco: "219.90", quantidade: 5 }]; // 1.099,50 (5 almofadas de amamentação)
  const enxoval = CUPONS.find((c) => c.codigo === "ENXOVAL10");
  const t = calcularTotais(linhas, enxoval);
  assert.equal(t.descontoCupom, 10995);
  assert.equal(t.totalCartao, 98955);
  assert.equal(t.totalPix, 98955 - Math.round(98955 * 0.05));
  assert.equal(calcularTotais([{ preco: "119.00", quantidade: 1 }], enxoval).descontoCupom, 0); // abaixo do mínimo
});

test("validação de cupom: maiúsculas, espaços, inválido e mínimo", () => {
  assert.equal(validarCupom(" bemvindo5 ", 100).tipo, "ok");
  assert.equal(validarCupom("NAOEXISTE", 100000).tipo, "invalido");
  assert.equal(validarCupom("ENXOVAL10", 99999).tipo, "minimo");
  assert.equal(validarCupom("enxoval10", 100000).tipo, "ok");
});

test("carrinho vazio e parcela mínima", () => {
  const vazio = calcularTotais([]);
  assert.equal(vazio.totalPix, 0);
  assert.equal(vazio.parcelas, 1);
  assert.equal(calcularTotais([{ preco: "29.90", quantidade: 1 }]).parcelas, 1); // abaixo de R$ 40 não parcela
  assert.throws(() => centavos("29,90"));
});

test("Pix não desconta o frete (quando houver)", () => {
  const t = calcularTotais([{ preco: "100.00", quantidade: 1 }], undefined, 4190);
  assert.equal(t.descontoPix, 500); // 5% de R$ 100, sem o frete
  assert.equal(t.totalCartao, 14190);
  assert.equal(t.totalPix, 13690);
});

test("prazo de produção: vale o da peça mais demorada", () => {
  assert.deepEqual(prazoDeProducao([{ prontaEntrega: true }, { prontaEntrega: true }]), { min: 1, max: 2 });
  assert.deepEqual(prazoDeProducao([{ prontaEntrega: true }, { prontaEntrega: false }]), { min: 15, max: 25 });
  assert.equal(textoPrazo({ min: 2, max: 2 }), "2 dias úteis");
  assert.equal(textoPrazo({ min: 15, max: 25 }), "15 a 25 dias úteis");
});

test("editar item da sacola: troca no lugar, junta linhas iguais e separa com/sem bordado", async () => {
  const { editarItens } = await import("../../src/loja/componentes/carrinho/estado.ts");
  const a = { slug: "kit-a", variacao: "Berço padrão", quantidade: 1, personalizacao: "com" };
  const b = { slug: "kit-b", quantidade: 2 };
  const c = { slug: "kit-a", variacao: "Berço americano", quantidade: 3, personalizacao: "com" };

  // Troca o tamanho no mesmo lugar.
  assert.deepEqual(editarItens([a, b], a, { ...a, variacao: "Berço americano", quantidade: 2 }), [
    { slug: "kit-a", variacao: "Berço americano", quantidade: 2, personalizacao: "com" },
    b,
  ]);
  // A nova escolha já existe em outra linha: viram uma só, com as quantidades somadas.
  assert.deepEqual(editarItens([a, b, c], a, { ...a, variacao: "Berço americano" }), [b, { ...c, quantidade: 4 }]);
  // Com e sem bordado continuam linhas diferentes.
  assert.deepEqual(editarItens([a, c], a, { ...a, personalizacao: "sem" }), [{ ...a, personalizacao: "sem" }, c]);
  // Quantidade limitada a 1..999 e alvo inexistente não muda nada.
  assert.equal(editarItens([a], a, { ...a, quantidade: 5000 })[0].quantidade, 999);
  assert.deepEqual(editarItens([b], a, { ...a, quantidade: 2 }), [b]);
});
