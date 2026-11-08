// "Monte o seu quartinho" (/projetos/monte-o-seu): módulos, preços "a partir de", validação das
// escolhas obrigatórias, rascunho/sacola (normalização e identificador) e o ponto de partida a partir
// de um projeto do ateliê.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buscarProjeto, listarProjetos } from "../../src/loja/lib/casas/catalogo.ts";
import {
  alternarModulo,
  atributosDoQuartinho,
  buscarModulo,
  contagemDoGrupo,
  escolherOpcao,
  GRUPOS_MODULOS,
  idQuartinho,
  LIMITE_BORDADO,
  linhasDoQuartinho,
  listarPaletas,
  MODULOS,
  modulosDoGrupo,
  nomeDoQuartinho,
  normalizarQuartinho,
  opcoesCompletas,
  paletasDoTema,
  PRECO_BORDADO,
  precoDoModulo,
  precoDoQuartinho,
  quartinhoDoProjeto,
  quartinhoVazio,
  TAMANHOS_BERCO,
  temPecasDeBerco,
  validarQuartinho,
} from "../../src/loja/lib/casas/modulos.ts";
import { slug } from "../../src/loja/lib/seo/urls.ts";

const catalogo = readFileSync(new URL("../../src/loja/lib/catalogo/exemplos.ts", import.meta.url), "utf8");

test("módulos: os 14 pedidos (e a saída de maternidade), ids únicos, grupos e dados completos", () => {
  const ids = MODULOS.map((modulo) => modulo.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of [
    "kit-berco",
    "protetor",
    "lencois",
    "edredom",
    "saia",
    "cortina",
    "tapete",
    "almofadas",
    "manta",
    "mosquiteiro",
    "enfeite-porta",
    "kit-mini-cama",
    "paninhos",
    "bolsa-maternidade",
  ]) {
    assert.ok(buscarModulo(id), id);
  }
  assert.deepEqual(
    GRUPOS_MODULOS.map((grupo) => grupo.nome),
    ["Berço", "Quarto", "Banho e passeio", "Maternidade"],
  );
  assert.equal(modulosDoGrupo("berco").length, 6);
  for (const modulo of MODULOS) {
    assert.equal(slug(modulo.id), modulo.id);
    assert.ok(GRUPOS_MODULOS.some((grupo) => grupo.id === modulo.grupo), modulo.id);
    assert.ok(modulo.nome && modulo.descricao, modulo.id);
    assert.ok(Number.isInteger(modulo.preco) && modulo.preco > 0, modulo.id);
    assert.ok(modulo.variacoes.length >= 1, modulo.id);
    for (const variacao of modulo.variacoes) {
      assert.ok(variacao.opcoes.length >= 2, `${modulo.id}.${variacao.id}`);
      assert.equal(variacao.opcoes[0].acrescimo, 0, `${modulo.id}.${variacao.id}: a 1ª opção é o "a partir de"`);
      for (const opcao of variacao.opcoes) assert.ok(Number.isInteger(opcao.acrescimo) && opcao.acrescimo >= 0, opcao.rotulo);
    }
    // Ligado ao produto do catálogo: o slug existe em catalogo/exemplos.ts.
    if (modulo.produto) assert.ok(catalogo.includes(`"${modulo.produto}"`), `${modulo.id}: ${modulo.produto} fora do catálogo`);
  }
  // Os tamanhos de berço são os do catálogo.
  for (const tamanho of TAMANHOS_BERCO) assert.ok(catalogo.includes(tamanho), tamanho);
});

test("preço do módulo: a partir de + acréscimos; opção inválida volta para a padrão", () => {
  const kit = buscarModulo("kit-berco");
  assert.deepEqual(opcoesCompletas(kit), { pecas: "7 peças", tecido: "Tricoline" });
  assert.equal(precoDoModulo(kit), 990);
  assert.equal(precoDoModulo(kit, { pecas: "11 peças", tecido: "Linho" }), 990 + 600 + 500);
  assert.equal(precoDoModulo(kit, { pecas: "50 peças" }), 990);
  assert.deepEqual(opcoesCompletas(kit, { pecas: "9 peças", extra: "x" }), { pecas: "9 peças", tecido: "Tricoline" });
});

test("incluir, remover e escolher opção (que inclui o módulo); a ordem segue a configuração", () => {
  let quartinho = alternarModulo(quartinhoVazio(), "cortina");
  quartinho = alternarModulo(quartinho, "kit-berco");
  assert.deepEqual(
    quartinho.modulos.map((item) => item.id),
    ["kit-berco", "cortina"],
  );
  quartinho = escolherOpcao(quartinho, "tapete", "tamanho", "Redondo 1,40 m");
  assert.deepEqual(
    quartinho.modulos.map((item) => item.id),
    ["kit-berco", "cortina", "tapete"],
  );
  assert.equal(quartinho.modulos[2].opcoes.tamanho, "Redondo 1,40 m");
  assert.equal(escolherOpcao(quartinho, "tapete", "tamanho", "Gigante"), quartinho); // opção inexistente não muda nada
  assert.deepEqual(contagemDoGrupo(quartinho, "berco"), { escolhidos: 1, total: 6 });
  assert.deepEqual(contagemDoGrupo(quartinho, "quarto"), { escolhidos: 2, total: 4 });
  quartinho = alternarModulo(quartinho, "kit-berco");
  assert.equal(temPecasDeBerco(quartinho), false);
  assert.equal(alternarModulo(quartinho, "nao-existe"), quartinho);
});

test("total a partir de: módulos com as opções + bordado do nome", () => {
  let quartinho = alternarModulo(alternarModulo(quartinhoVazio(), "kit-berco"), "manta");
  quartinho = escolherOpcao(quartinho, "kit-berco", "pecas", "9 peças");
  assert.equal(precoDoQuartinho(quartinho), 1290 + 269);
  assert.equal(precoDoQuartinho({ ...quartinho, bordado: "  Helena  " }), 1290 + 269 + PRECO_BORDADO);
  assert.equal(precoDoQuartinho({ ...quartinho, bordado: "   " }), 1290 + 269);
  assert.deepEqual(
    linhasDoQuartinho({ ...quartinho, bordado: "Helena" }).map((linha) => [linha.nome, linha.preco]),
    [
      ["Kit berço", 1290],
      ["Manta", 269],
      ["Bordado do nome", PRECO_BORDADO],
    ],
  );
  assert.equal(precoDoQuartinho(quartinhoVazio()), 0);
});

test("validação: paleta, ao menos 1 módulo, tamanho do berço com peça de berço e nome do bordado", () => {
  assert.deepEqual(Object.keys(validarQuartinho(quartinhoVazio())).sort(), ["modulos", "paleta"]);
  const base = { tema: "menina", paleta: "jardim-de-camomila", modulos: [] };
  assert.deepEqual(Object.keys(validarQuartinho(alternarModulo(base, "cortina"))), []);
  const comBerco = alternarModulo(base, "protetor");
  assert.match(validarQuartinho(comBerco).tamanhoBerco, /tamanho do berço/);
  assert.deepEqual(validarQuartinho({ ...comBerco, tamanhoBerco: TAMANHOS_BERCO[1] }), {});
  assert.ok(validarQuartinho({ ...comBerco, tamanhoBerco: "Berço gigante" }).tamanhoBerco);
  // Mosquiteiro não depende do colchão.
  assert.deepEqual(validarQuartinho(alternarModulo(base, "mosquiteiro")), {});
  const cortina = alternarModulo(base, "cortina");
  assert.ok(validarQuartinho(cortina, { comBordado: true }).bordado);
  assert.ok(validarQuartinho({ ...cortina, bordado: "Ana 2" }, { comBordado: true }).bordado);
  assert.deepEqual(validarQuartinho({ ...cortina, bordado: "Maria Clara" }, { comBordado: true }), {});
  assert.ok(validarQuartinho({ ...cortina, tema: undefined }).paleta);
});

test("paletas: as dos projetos, filtradas pelo tema (neutras combinam com tudo)", () => {
  assert.equal(listarPaletas().length, listarProjetos().length);
  const menina = paletasDoTema("menina");
  assert.ok(menina.every((paleta) => paleta.tema === "menina" || paleta.tema === "neutro"));
  assert.equal(menina[0].tema, "menina");
  assert.ok(paletasDoTema("neutro").every((paleta) => paleta.tema === "neutro"));
  assert.equal(paletasDoTema(undefined).length, listarProjetos().length);
});

test("partir de um projeto: tema, paleta e as peças do pacote Completo + opcionais", () => {
  const jardim = buscarProjeto("jardim-de-camomila");
  const quartinho = quartinhoDoProjeto(jardim, { modulos: [], tamanhoBerco: TAMANHOS_BERCO[0], bordado: "Helena" });
  assert.equal(quartinho.tema, "menina");
  assert.equal(quartinho.paleta, "jardim-de-camomila");
  assert.equal(quartinho.base, "jardim-de-camomila");
  assert.deepEqual(
    quartinho.modulos.map((item) => item.id),
    ["kit-berco", "cortina", "tapete", "almofadas", "kit-mini-cama", "paninhos", "enfeite-porta"],
  );
  assert.equal(quartinho.tamanhoBerco, TAMANHOS_BERCO[0]); // o que a cliente já escolheu continua
  assert.deepEqual(validarQuartinho(quartinho), {});
  assert.equal(nomeDoQuartinho(quartinho), "Quartinho personalizado Jardim de Camomila");
  assert.deepEqual(atributosDoQuartinho(quartinho).slice(0, 2), ["Tema: Menina", "Paleta: Jardim de Camomila (Linho cru, Amarelo-manteiga, Verde-sálvia)"]);
});

test("rascunho e sacola: normalização tira o que não existe e o id é estável", () => {
  const bruto = {
    tema: "menino",
    paleta: "nao-existe",
    base: "ceu-de-algodao",
    tamanhoBerco: "Berço gigante",
    modulos: [{ id: "cortina", opcoes: { largura: "3,00 × 2,50 m" } }, { id: "cortina" }, { id: "x" }, null, { id: "kit-berco", opcoes: "ruim" }],
    bordado: `  ${"Helena".repeat(5)}  `,
  };
  const limpo = normalizarQuartinho(bruto);
  assert.deepEqual(limpo, {
    tema: "menino",
    base: "ceu-de-algodao",
    modulos: [
      { id: "kit-berco", opcoes: { pecas: "7 peças", tecido: "Tricoline" } },
      { id: "cortina", opcoes: { largura: "3,00 × 2,50 m", forro: "Sem blecaute" } },
    ],
    bordado: "Helena".repeat(5).slice(0, LIMITE_BORDADO),
  });
  assert.deepEqual(normalizarQuartinho("lixo"), { modulos: [] });
  // Mesmo conjunto (em outra ordem) = mesmo id; mudou uma opção = outro id.
  const a = { tema: "menina", paleta: "jardim-de-camomila", modulos: [{ id: "cortina", opcoes: {} }, { id: "tapete", opcoes: {} }] };
  const b = { ...a, modulos: [...a.modulos].reverse() };
  assert.equal(idQuartinho(a), idQuartinho(b));
  assert.match(idQuartinho(a), /^quartinho-[0-9a-z]+$/);
  assert.notEqual(idQuartinho(a), idQuartinho(escolherOpcao(a, "tapete", "tamanho", "Redondo 1,40 m")));
});

test("o montador salva o rascunho e oferece Adicionar no meu enxoval e o pedido pelo WhatsApp", () => {
  const montador = readFileSync(new URL("../../src/loja/componentes/casas/Montador.tsx", import.meta.url), "utf8");
  assert.match(montador, /mk_montador/);
  assert.match(montador, /Adicionar no meu enxoval/);
  assert.match(montador, /Fazer pedido pelo WhatsApp/);
  assert.match(montador, /% OFF no Pix/);
  assert.match(montador, /A combinar pelo WhatsApp/);
  assert.doesNotMatch(montador, /cashback|seleção de projetos/i);
});
