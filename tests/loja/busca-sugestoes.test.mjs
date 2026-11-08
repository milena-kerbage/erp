import assert from "node:assert/strict";
import test from "node:test";
import { buscarTexto, slugificar, textoDeBusca } from "../../src/loja/lib/catalogo/listagem.ts";
import {
  destacar,
  MAXIMO_TERMOS,
  normalizarTexto,
  ordenarProdutos,
  palavras,
  pontuar,
  sugerirTermos,
} from "../../src/loja/lib/catalogo/sugestoes.ts";

const indice = [
  { texto: "kit berço", fonte: "popular" },
  { texto: "protetor de berço", fonte: "popular" },
  { texto: "manta", fonte: "popular" },
  { texto: "kit berço menina", fonte: "popular" },
  { texto: "Kit berço", fonte: "categoria" }, // repetido (só muda a caixa): sai
  { texto: "saias de berço", fonte: "categoria" },
  { texto: "mantas e cobertores", fonte: "categoria" },
  { texto: "verde-sálvia", fonte: "atributo" },
  { texto: "percal 200 fios", fonte: "atributo" },
  { texto: "kit berço jardim verde-sálvia", fonte: "produto" },
  { texto: "manta de tricô trançada", fonte: "produto" },
  { texto: "berço americano", fonte: "atributo" },
  { texto: "kit berço nuvem cru", fonte: "produto" },
];

test("normalização da busca: sem acento, sem caixa e a mesma regra do slug da listagem", () => {
  assert.equal(normalizarTexto("  Kit BERÇO  "), "kit berco");
  assert.equal(normalizarTexto("Verde-sálvia"), "verde salvia");
  assert.equal(normalizarTexto("Fraldas de boca (kit com 3)"), "fraldas de boca kit com 3");
  for (const texto of ["Verde-sálvia", "Percal 200 fios", "Rosê", "Saída de maternidade", "Safári"]) {
    assert.equal(normalizarTexto(texto), slugificar(texto).replace(/-/g, " "));
  }
  assert.deepEqual(palavras("kit   ber"), ["kit", "ber"]);
  assert.deepEqual(palavras(" - "), []);
});

test("pontuar: cada palavra digitada começa uma palavra do texto, sem acento", () => {
  assert.ok(pontuar("Kit berço", "berco") > 0);
  assert.ok(pontuar("Kit berço", "ber") > 0);
  assert.ok(pontuar("Kit berço", "kit ber") > 0);
  assert.ok(pontuar("Kit berço", "berço kit") > 0); // ordem livre
  assert.equal(pontuar("Kit berço", "erco"), -1); // meio de palavra não conta
  assert.equal(pontuar("Kit berço", "kit kit"), -1); // cada palavra casa com uma palavra diferente
  assert.equal(pontuar("Kit berço", ""), -1);
  // Quem começa pela consulta e é mais curto ganha.
  assert.ok(pontuar("manta", "man") > pontuar("manta de tricô trançada", "man"));
  assert.ok(pontuar("kit berço", "kit") > pontuar("protetor de kit", "kit"));
});

test("sugerirTermos: até 6, sem repetir; quem começa pelo digitado, os populares e os curtos primeiro", () => {
  const ber = sugerirTermos(indice, "ber");
  assert.ok(ber.length <= MAXIMO_TERMOS);
  assert.deepEqual(ber.slice(0, 2), ["berço americano", "kit berço"]);
  assert.equal(new Set(ber.map(normalizarTexto)).size, ber.length);
  assert.ok(ber.includes("protetor de berço"));
  assert.ok(!ber.includes("manta"));

  const berco = sugerirTermos(indice, "berco"); // sem acento acha "berço"
  assert.deepEqual(berco.slice(0, 2), ["berço americano", "kit berço"]);
  assert.ok(berco.includes("protetor de berço") && berco.includes("saias de berço"));
  assert.deepEqual(sugerirTermos(indice, "manta"), ["manta", "mantas e cobertores", "manta de tricô trançada"]);
  assert.deepEqual(sugerirTermos(indice, "verde"), ["verde-sálvia", "kit berço jardim verde-sálvia"]);
  assert.deepEqual(sugerirTermos(indice, "salvia"), ["verde-sálvia", "kit berço jardim verde-sálvia"]);
  assert.deepEqual(sugerirTermos(indice, "xyz"), []);
  assert.deepEqual(sugerirTermos(indice, "b"), []); // menos de 2 letras: nada
  assert.equal(sugerirTermos(indice, "ber", 2).length, 2);
});

test("destacar: o trecho digitado vai em negrito, preservando acentos", () => {
  const juntar = (trechos) => trechos.map((t) => (t.destaque ? `[${t.texto}]` : t.texto)).join("");
  assert.equal(juntar(destacar("kit berço", "ber")), "kit [ber]ço");
  assert.equal(juntar(destacar("kit berço", "berco")), "kit [berço]");
  assert.equal(juntar(destacar("kit berço", "BERÇO")), "kit [berço]");
  assert.equal(juntar(destacar("kit berço menina", "kit men")), "[kit] berço [men]ina");
  assert.equal(juntar(destacar("verde-sálvia", "salv")), "verde-[sálv]ia");
  assert.equal(juntar(destacar("protetor de berço", "erco")), "protetor de berço"); // meio de palavra: sem negrito
  assert.equal(juntar(destacar("manta", "")), "manta");
  assert.equal(destacar("kit berço", "ber").map((t) => t.texto).join(""), "kit berço");
});

test("ordenarProdutos: nome que casa primeiro, depois os destaques, uma peça por família de cores", () => {
  const itens = [
    { slug: "lencol", nome: "Jogo de lençol de berço percal", familia: undefined },
    { slug: "jardim-rose", nome: "Kit berço Jardim rosê 9 peças", familia: "jardim" },
    { slug: "jardim-verde", nome: "Kit berço Jardim verde-sálvia 9 peças", familia: "jardim" },
    { slug: "nuvem-cru", nome: "Kit berço Nuvem cru 9 peças", familia: "nuvem" },
    { slug: "nuvem-cinza", nome: "Kit berço Nuvem cinza 9 peças", familia: "nuvem" },
    { slug: "manta", nome: "Manta de tricô trançada", familia: undefined }, // casou por atributo
  ];
  const kit = ordenarProdutos(itens, "kit", { destaques: ["jardim-rose"] }).map((p) => p.slug);
  assert.deepEqual(kit, ["jardim-rose", "nuvem-cru", "lencol", "manta"]);
  // A cor digitada traz o irmão certo.
  assert.equal(ordenarProdutos(itens, "verde", { destaques: ["jardim-rose"] })[0].slug, "jardim-verde");
  assert.equal(ordenarProdutos(itens, "kit", { limite: 2 }).length, 2);
});

test("buscarTexto também acha pelas facetas (cor, tecido, para…), sem acento", () => {
  const itens = [
    {
      slug: "jardim",
      nome: "Kit berço Jardim 9 peças",
      marca: "Milena Kerbage",
      caminho: "/kit-berco/kits",
      preco: "1490.00",
      atributos: { cor: ["Verde-sálvia"], para: ["Menina"], entrega: ["Pronta entrega"], retirada: ["Sim"] },
    },
    { slug: "manta", nome: "Manta de tricô", marca: "Milena Kerbage", caminho: "/enxoval/mantas", preco: "189.00", atributos: { cor: ["Cru"] } },
  ];
  assert.deepEqual(buscarTexto(itens, "verde").map((i) => i.slug), ["jardim"]);
  assert.deepEqual(buscarTexto(itens, "kit berço menina").map((i) => i.slug), ["jardim"]);
  assert.deepEqual(buscarTexto(itens, "SÁLVIA").map((i) => i.slug), ["jardim"]);
  assert.deepEqual(buscarTexto(itens, "pronta entrega").map((i) => i.slug), ["jardim"]);
  assert.deepEqual(buscarTexto(itens, "sim"), []); // "retirada" não entra no texto de busca
  assert.ok(!textoDeBusca(itens[0]).includes("sim"));
  assert.deepEqual(buscarTexto(itens, "xyz"), []);
});
