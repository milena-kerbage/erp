import assert from "node:assert/strict";
import test from "node:test";
import { AVISO_FICHA, fichaTecnica } from "../../src/loja/lib/catalogo/fichas.ts";

const base = { marca: "Milena Kerbage", sku: "MK-1", unidade: "peça", trilha: [{ rotulo: "Kit berço" }, { rotulo: "Kits completos" }], atributos: {} };
const valor = (ficha, grupo, nome) => ficha.find((g) => g.titulo === grupo)?.itens.find(([n]) => n === nome)?.[1];
const titulos = (ficha) => ficha.map((g) => g.titulo);

test("kit berço: composição do tecido, enchimento, medidas, peças e bordado", () => {
  const ficha = fichaTecnica({
    ...base,
    nome: "Kit berço Jardim rosê 9 peças",
    unidade: "kit com 9 peças",
    caminho: "/kit-berco/kits",
    atributos: { para: ["Menina"], cor: ["Rosê"], tecido: ["Percal 200 fios"], entrega: ["Sob encomenda"], tema: ["Jardim"] },
    pecas: ["Protetor", "Edredom"],
    personalizacao: "Bordado do nome do bebê no protetor, incluso",
    variacao: { titulo: "Tamanho do berço", opcoes: [{ rotulo: "Berço americano · 70 × 130 cm" }, { rotulo: "Berço padrão · 60 × 130 cm" }] },
  });
  assert.deepEqual(titulos(ficha), ["Identificação", "Tecido e enchimento", "Medidas", "O que vem no kit", "Prazo e personalização", "Cuidados", "Venda"]);
  assert.equal(valor(ficha, "Identificação", "Categoria"), "Kit berço › Kits completos");
  assert.equal(valor(ficha, "Identificação", "Para"), "Menina");
  assert.equal(valor(ficha, "Tecido e enchimento", "Composição"), "100% algodão, percal 200 fios");
  assert.equal(valor(ficha, "Tecido e enchimento", "Enchimento"), "Fibra siliconada antialérgica");
  assert.match(valor(ficha, "Medidas", "Tamanho do berço"), /70 × 130 cm; Berço padrão/);
  assert.equal(valor(ficha, "O que vem no kit", "Item 2"), "Edredom");
  assert.equal(valor(ficha, "Prazo e personalização", "Prazo de produção"), "15 a 25 dias úteis, mais o prazo do frete");
  assert.match(valor(ficha, "Prazo e personalização", "Bordado"), /nome do bebê/);
});

test("pronta entrega sai em até 2 dias úteis; tricô tem cuidado próprio", () => {
  const ficha = fichaTecnica({
    ...base,
    nome: "Manta de tricô trançada",
    caminho: "/enxoval/mantas",
    atributos: { tecido: ["Tricô"], entrega: ["Pronta entrega"] },
  });
  assert.equal(valor(ficha, "Prazo e personalização", "Disponibilidade"), "Pronta entrega");
  assert.equal(valor(ficha, "Prazo e personalização", "Prazo de produção"), "Sai do ateliê em até 2 dias úteis");
  assert.match(valor(ficha, "Cuidados", "Secagem"), /horizontal/);
  assert.equal(valor(ficha, "Tecido e enchimento", "Enchimento"), undefined); // manta não tem enchimento
});

test("grupos vazios não aparecem", () => {
  const ficha = fichaTecnica({ ...base, nome: "Peça simples", caminho: "/maternidade/enfeites-de-porta" });
  assert.deepEqual(titulos(ficha), ["Identificação", "Prazo e personalização", "Venda"]);
});

test("aviso fala de peça artesanal e de sono seguro", () => {
  assert.match(AVISO_FICHA, /feitas à mão/);
  assert.match(AVISO_FICHA, /Sociedade Brasileira de Pediatria/);
});
