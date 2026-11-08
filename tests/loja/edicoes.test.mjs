import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { BLOCOS_POR_CATEGORIA, EDICAO_ATUAL, EDICOES, ROTA_EDICAO } from "../../src/loja/lib/catalogo/edicoes.ts";
import { intercalarBlocos, intercalarPropagandas } from "../../src/loja/lib/catalogo/listagem.ts";

// Slugs do catálogo de exemplo, lidos como texto (exemplos.ts importa módulos com alias "@/", que o
// node --test não resolve): `slug: "x"` e os construtores kitJardim/kitNuvem/saida("Cor", "slug", …).
const exemplos = readFileSync(new URL("../../src/loja/lib/catalogo/exemplos.ts", import.meta.url), "utf8");
const SLUGS = new Set([
  ...[...exemplos.matchAll(/slug: "([^"]+)"/g)].map(([, slug]) => slug),
  ...[...exemplos.matchAll(/(?:kitJardim|kitNuvem|saida)\("[^"]+", "([^"]+)"/g)].map(([, slug]) => slug),
]);

// Rotas que existem: categorias do menu (navegacao.ts) e páginas fixas.
const navegacao = readFileSync(new URL("../../src/loja/componentes/layout/cabecalho/navegacao.ts", import.meta.url), "utf8");
const ROTAS = new Set([...navegacao.matchAll(/href: "(\/[^"?]*)"/g)].map(([, href]) => href));
for (const fixa of ["/busca", "/pronta-entrega", "/projetos", ROTA_EDICAO]) ROTAS.add(fixa);

const linhasDe = (celulas, colunas) => {
  const linhas = [];
  let atual = [];
  let unidades = 0;
  for (const celula of celulas) {
    atual.push(celula);
    unidades += celula.tipo === "bloco" ? 2 : 1;
    if (unidades >= colunas) {
      linhas.push(atual);
      atual = [];
      unidades = 0;
    }
  }
  if (atual.length) linhas.push(atual);
  return linhas;
};

test("intercalarBlocos: bloco a cada 2 linhas, alternando o lado, sempre ao lado de um produto", () => {
  const produtos = Array.from({ length: 24 }, (_, i) => i);
  const base = intercalarPropagandas(produtos, 3, 2, "edicao-do-mes:1");
  const celulas = intercalarBlocos(base, 3, ["esquerda", "direita", "esquerda", "direita"]);
  assert.equal(celulas.filter((c) => c.tipo === "produto").length, 24, "nenhum produto some");
  assert.equal(
    celulas.filter((c) => c.tipo === "propaganda").length,
    base.filter((c) => c.tipo === "propaganda").length,
    "nenhuma propaganda some",
  );
  const linhas = linhasDe(celulas, 3);
  const comBloco = linhas.map((linha, indice) => ({ linha, indice })).filter(({ linha }) => linha.some((c) => c.tipo === "bloco"));
  assert.deepEqual(
    comBloco.map(({ indice }) => indice),
    [0, 3, 6, 9],
  );
  comBloco.forEach(({ linha }, n) => {
    assert.equal(linha.length, 2);
    const bloco = linha.find((c) => c.tipo === "bloco");
    const outro = linha.find((c) => c.tipo !== "bloco");
    assert.equal(outro.tipo, "produto", "o card ao lado do bloco é um produto");
    assert.equal(bloco.indice, n);
    assert.equal(bloco.lado, n % 2 === 0 ? "esquerda" : "direita");
    assert.equal(linha.indexOf(bloco), bloco.lado === "esquerda" ? 0 : 1);
  });
  // As linhas sem bloco continuam com 3 células.
  for (const linha of linhas.slice(0, -1)) assert.equal(linha.reduce((soma, c) => soma + (c.tipo === "bloco" ? 2 : 1), 0), 3);
});

test("intercalarBlocos: começa na linha pedida, não entra sem produto e não muda nada sem blocos", () => {
  const celulas = intercalarPropagandas(Array.from({ length: 9 }, (_, i) => i), 3, 0);
  const comInicio = intercalarBlocos(celulas, 3, ["esquerda"], { primeiraLinha: 2 });
  assert.equal(linhasDe(comInicio, 3).findIndex((linha) => linha.some((c) => c.tipo === "bloco")), 2);

  // Lista curta: o 1º bloco sobe para a última linha com produto; sem produto, nenhum bloco.
  const seis = intercalarPropagandas(Array.from({ length: 6 }, (_, i) => i), 3, 0);
  const recuado = intercalarBlocos(seis, 3, ["esquerda", "direita"], { primeiraLinha: 2 });
  assert.equal(linhasDe(recuado, 3).findIndex((linha) => linha.some((c) => c.tipo === "bloco")), 1);
  assert.equal(recuado.filter((c) => c.tipo === "produto").length, 6);
  assert.equal(intercalarBlocos([], 3, ["esquerda"], { primeiraLinha: 2 }).length, 0);
  const soAnuncio = [{ tipo: "propaganda", indice: 0, estilo: 0 }];
  assert.deepEqual(intercalarBlocos(soAnuncio, 3, ["esquerda"]), soAnuncio, "o bloco nunca fica ao lado só de propaganda");

  assert.deepEqual(intercalarBlocos(celulas, 3, []), celulas);
  assert.deepEqual(intercalarBlocos(celulas, 2, ["esquerda"]), celulas); // 2 colunas: o bloco não teria par
});

test("edição atual: produtos do catálogo, sem repetir, e os 3 tipos de bloco", () => {
  assert.ok(EDICOES[EDICAO_ATUAL.chave] === EDICAO_ATUAL);
  assert.match(EDICAO_ATUAL.chave, /^[a-z0-9-]+$/);
  assert.ok(EDICAO_ATUAL.descricao.length <= 160, "meta description curta");
  for (const slug of EDICAO_ATUAL.produtos) assert.ok(SLUGS.has(slug), `produto inexistente: ${slug}`);
  assert.equal(new Set(EDICAO_ATUAL.produtos).size, EDICAO_ATUAL.produtos.length, "produto repetido");
  assert.ok(EDICAO_ATUAL.blocos.some((b) => b.titulo && !b.href), "(a) com texto");
  assert.ok(EDICAO_ATUAL.blocos.some((b) => !b.titulo && !b.href), "(b) só imagem");
  assert.ok(EDICAO_ATUAL.blocos.some((b) => b.titulo && b.href && b.acao), "(c) clicável");
});

test("blocos: links para rotas que existem, alt em toda mídia e src local em /vitrine/edicoes", () => {
  const todos = [...Object.values(EDICOES).flatMap((edicao) => edicao.blocos), ...Object.values(BLOCOS_POR_CATEGORIA).flat()];
  const ids = todos.map((bloco) => bloco.id);
  assert.equal(new Set(ids).size, ids.length, "id repetido");
  for (const bloco of todos) {
    assert.ok(bloco.midia.alt.length > 10, `${bloco.id}: alt`);
    if (bloco.href) {
      assert.ok(bloco.titulo && bloco.acao, `${bloco.id}: clicável precisa de título e CTA`);
      assert.ok(ROTAS.has(bloco.href.split("?")[0]), `${bloco.id}: rota inexistente ${bloco.href}`);
    }
    if (bloco.midia.src) {
      assert.match(bloco.midia.src, /^\/vitrine\/edicoes\/[a-z0-9-]+\/[\w.-]+\.(webp|jpg|mp4|webm)$/, bloco.id);
      assert.ok(existsSync(new URL(`../../public${bloco.midia.src}`, import.meta.url)), `${bloco.id}: arquivo ${bloco.midia.src}`);
    }
  }
  for (const [chave, blocos] of Object.entries(BLOCOS_POR_CATEGORIA)) {
    assert.ok(blocos.length >= 1 && blocos.length <= 2, `${chave}: 1 ou 2 blocos`);
    assert.ok(ROTAS.has(`/${chave}`), `${chave}: categoria do menu`);
  }
});
