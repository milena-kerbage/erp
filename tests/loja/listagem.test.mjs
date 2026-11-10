import assert from "node:assert/strict";
import test from "node:test";
import {
  buscarTexto,
  contarFacetas,
  filtrar,
  intercalarPropagandas,
  noCaminho,
  ordenar,
  slugificar,
} from "../../src/loja/lib/catalogo/listagem.ts";
import { slug } from "../../src/loja/lib/seo/urls.ts";

const itens = [
  {
    slug: "jardim",
    nome: "Kit berço Jardim rosê 9 peças",
    marca: "Milena Kerbage",
    caminho: "/kit-berco/kits",
    preco: "1490.00",
    atributos: { cor: ["Rosê"], tecido: ["Percal 200 fios"] },
    selo: "Mais vendido",
  },
  {
    slug: "nuvem",
    nome: "Kit berço Nuvem cru 9 peças",
    marca: "Milena Kerbage",
    caminho: "/kit-berco/kits",
    preco: "1290.00",
    atributos: { cor: ["Cru"], tecido: ["Tricoline"] },
  },
  {
    slug: "safari",
    nome: "Kit berço Safári de linho 11 peças",
    marca: "Milena Kerbage",
    caminho: "/kit-berco/kits",
    preco: "1890.00",
    atributos: { cor: ["Cru"], tecido: ["Linho"] },
    selo: "Novidade",
  },
  {
    slug: "lencol",
    nome: "Jogo de lençol de berço percal 200 fios",
    marca: "Milena Kerbage",
    caminho: "/kit-berco/lencois",
    preco: "189.00",
    atributos: { cor: ["Branco"], tecido: ["Percal 200 fios"] },
  },
  {
    slug: "fraldas",
    nome: "Fraldas de boca bordadas (kit com 3)",
    marca: "Milena Kerbage",
    caminho: "/enxoval/paninhos/fraldas-de-boca",
    preco: "119.00",
    atributos: { cor: ["Branco"], tecido: ["Fralda de algodão"] },
  },
];

test("slugificar segue a mesma regra do motor de URLs", () => {
  for (const texto of ["Verde-sálvia", "Percal 200 fios", "Rosê", "Berço americano · 70 × 130 cm", "1,20 m"]) {
    assert.equal(slugificar(texto), slug(texto));
  }
});

test("filtra com OU dentro da faceta e E entre facetas", () => {
  assert.deepEqual(
    filtrar(itens, { cor: ["rose", "cru"] }).map((i) => i.slug),
    ["jardim", "nuvem", "safari"],
  );
  assert.deepEqual(
    filtrar(itens, { cor: ["rose", "cru"], tecido: ["linho"] }).map((i) => i.slug),
    ["safari"],
  );
  assert.deepEqual(
    filtrar(itens, { preco: ["150-300"] }).map((i) => i.slug),
    ["lencol"],
  );
  assert.deepEqual(
    filtrar(itens, { preco: ["1200-"] }).map((i) => i.slug),
    ["jardim", "nuvem", "safari"],
  );
});

test("ordena por preço e por selo sem mexer no original", () => {
  assert.deepEqual(
    ordenar(itens, "menor-preco").map((i) => i.slug),
    ["fraldas", "lencol", "nuvem", "jardim", "safari"],
  );
  assert.equal(ordenar(itens, "lancamentos")[0].slug, "safari");
  assert.equal(ordenar(itens, "mais-vendidos")[0].slug, "jardim");
  assert.equal(itens[0].slug, "jardim");
});

test("contagem de faceta ignora a própria seleção", () => {
  const kits = noCaminho(itens, "/kit-berco/kits");
  const cor = contarFacetas(kits, { cor: ["rose"] }).find((f) => f.chave === "cor");
  assert.deepEqual(
    cor.opcoes.map((o) => [o.valor, o.total]),
    [
      ["cru", 2],
      ["rose", 1],
    ],
  );
  const tecido = contarFacetas(kits, { cor: ["rose"] }).find((f) => f.chave === "tecido");
  assert.equal(tecido, undefined); // só "Percal" sobra com rosê marcado: faceta de uma opção some
});

test("busca por termos sem acento e caminho por prefixo", () => {
  assert.deepEqual(
    buscarTexto(itens, "kit berço peças").map((i) => i.slug),
    ["jardim", "nuvem", "safari"], // "berço" sozinho também acharia o lençol (pelo caminho)
  );
  assert.deepEqual(
    buscarTexto(itens, "SAFÁRI").map((i) => i.slug),
    ["safari"],
  );
  assert.deepEqual(buscarTexto(itens, " "), []);
  assert.deepEqual(
    noCaminho(itens, "/kit-berco").map((i) => i.slug),
    ["jardim", "nuvem", "safari", "lencol"],
  );
  assert.deepEqual(noCaminho(itens, "/kit-berco/ki"), []); // prefixo de texto não basta
});

test("propagandas sortidas: nunca em linhas seguidas, coluna e estilo variam, sorteio estável", () => {
  const trinta = Array.from({ length: 30 }, (_, i) => i);
  const linhasDe = (celulas) => {
    const linhas = [];
    let atual = [];
    for (const c of celulas) {
      atual.push(c);
      if (atual.length === 3) {
        linhas.push(atual);
        atual = [];
      }
    }
    if (atual.length) linhas.push(atual);
    return linhas;
  };
  for (const semente of ["kit-berco", "enxoval", "quarto", "busca:manta"]) {
    const celulas = intercalarPropagandas(trinta, 3, 4, semente);
    assert.equal(celulas.filter((c) => c.tipo === "produto").length, 30); // nenhum produto some
    const anuncios = linhasDe(celulas)
      .map((linha, indice) => ({
        indice,
        coluna: linha.findIndex((c) => c.tipo === "propaganda"),
        celula: linha.find((c) => c.tipo === "propaganda"),
      }))
      .filter((a) => a.coluna >= 0);
    assert.ok(anuncios.length >= 2);
    for (let i = 1; i < anuncios.length; i++) {
      assert.ok(anuncios[i].indice - anuncios[i - 1].indice >= 3, "2 ou mais linhas de produto entre anúncios");
      assert.notEqual(anuncios[i].coluna, anuncios[i - 1].coluna, "coluna não repete");
      assert.notEqual(anuncios[i].celula.estilo, anuncios[i - 1].celula.estilo, "estilo não repete");
    }
    assert.deepEqual(intercalarPropagandas(trinta, 3, 4, semente), celulas); // mesmo sorteio sempre
  }
  assert.equal(intercalarPropagandas([1, 2], 3, 2).length, 2); // poucos itens: sem propaganda
});

test("intercalarPropagandas usa as primeiras da lista quando cabem menos anúncios", () => {
  const nove = Array.from({ length: 9 }, (_, i) => i);
  let comAnuncio = 0;
  for (const semente of ["quarto:1", "maternidade:1", "busca:lencol:1", "x", "y", "z"]) {
    const usados = intercalarPropagandas(nove, 3, 5, semente)
      .filter((c) => c.tipo === "propaganda")
      .map((c) => c.indice);
    assert.ok(usados.length < 5);
    assert.deepEqual(
      [...usados].sort(),
      Array.from({ length: usados.length }, (_, i) => i),
      semente,
    );
    if (usados.length > 0) comAnuncio += 1;
  }
  assert.ok(comAnuncio > 0);
});

test("paraListagem tira só o que a página do produto usa e mantém o que a grade e os filtros precisam", async () => {
  const { paraListagem, filtrar, ordenar } = await import("../../src/loja/lib/catalogo/listagem.ts");
  const produto = {
    slug: "kit-teste", nome: "Kit teste", marca: "Ateliê", caminho: "/kit-berco/kits", preco: "100.00",
    atributos: { cor: ["Rosê"] }, selo: "Novo", imagens: [{ src: "/x.webp", alt: "x", tipo: "principal" }],
    ficha: [{ titulo: "Tecido", itens: [] }], descricao: ["texto longo"], documentos: [{ rotulo: "d", href: "/d" }],
    complementos: ["a"], semelhantes: ["b"], seo: { titulo: "t" },
  };
  const enxuto = paraListagem(produto);
  assert.deepEqual([enxuto.ficha, enxuto.descricao, enxuto.documentos, enxuto.complementos, enxuto.semelhantes], [[], [], [], [], []]);
  assert.equal(enxuto.seo, undefined);
  for (const campo of ["slug", "nome", "marca", "caminho", "preco", "atributos", "selo", "imagens"]) assert.deepEqual(enxuto[campo], produto[campo]);
  assert.deepEqual(filtrar([enxuto], { cor: ["rose"] }).length, filtrar([produto], { cor: ["rose"] }).length);
  assert.equal(ordenar([enxuto], "menor-preco")[0].slug, "kit-teste");
  assert.equal(produto.ficha.length, 1, "o original não muda");
});
