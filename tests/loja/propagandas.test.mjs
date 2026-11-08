import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { ESTILOS, escolherPropagandas, PROPAGANDAS, PROPAGANDAS_GERAIS } from "../../src/loja/lib/catalogo/propagandas.ts";

const TODAS = [...PROPAGANDAS, ...PROPAGANDAS_GERAIS];
const GERAIS = ["pronta-entrega", "projeto-quartinho"];
const ids = (lista) => lista.map((propaganda) => propaganda.id);
const categoria = (chave) => escolherPropagandas({ tipo: "categoria", categoria: chave });

// Rotas da loja: categorias do menu e links utilitários (navegacao.ts) + páginas fixas. Lido como
// texto porque o menu importa módulos com alias "@/", que o node --test não resolve.
const navegacao = readFileSync(new URL("../../src/loja/componentes/layout/cabecalho/navegacao.ts", import.meta.url), "utf8");
const ROTAS = new Set([...navegacao.matchAll(/href: "(\/[^"?]*)"/g)].map(([, href]) => href));
for (const fixa of ["/busca", "/carrinho", "/pronta-entrega", "/personalizado"]) ROTAS.add(fixa);
const CATEGORIAS_DO_MENU = [...ROTAS].filter((href) => !["/busca", "/carrinho", "/pronta-entrega"].includes(href) && !href.startsWith("/conta") && !href.startsWith("/ajuda"));

test("cada categoria principal tem propagandas próprias antes das gerais", () => {
  const esperado = {
    "kit-berco": "berco-completo",
    enxoval: "paninhos",
    quarto: "quarto-claro",
    maternidade: "mala-maternidade",
  };
  for (const [chave, primeira] of Object.entries(esperado)) {
    const lista = categoria(chave);
    assert.equal(lista[0].id, primeira, chave);
    assert.ok(lista.length >= 4, `${chave}: ${ids(lista)}`);
    assert.deepEqual(ids(lista).slice(-2), GERAIS, chave);
  }
});

test("subcategoria vale mais que a categoria e não aponta para a própria página", () => {
  const kits = ids(categoria("kit-berco/kits"));
  assert.ok(!kits.includes("berco-completo"), "o link de 'O berço inteiro' é /kit-berco/kits");
  assert.equal(kits[0], "lencol-percal");
  assert.ok(kits.includes("bordado-nome"));

  const saidas = ids(categoria("maternidade/saidas"));
  assert.equal(saidas[0], "porta");
  assert.ok(!saidas.includes("primeiro-look"));

  assert.ok(!ids(categoria("quarto/cortinas")).includes("quarto-claro"));
  assert.ok(!ids(categoria("pronta-entrega")).includes("pronta-entrega"));
});

test("busca usa as categorias dos resultados e as palavras buscadas", () => {
  const kit = escolherPropagandas({
    tipo: "busca",
    termo: "kit berço",
    caminhos: ["/kit-berco/kits", "/kit-berco/kits", "/kit-berco/protetores", "/quarto/mini-cama"],
  });
  assert.equal(kit[0].id, "berco-completo");

  const bordado = escolherPropagandas({ tipo: "busca", termo: "toalha bordada com nome", caminhos: ["/enxoval/toalhas"] });
  assert.ok(ids(bordado).includes("bordado-nome"));
  assert.ok(ids(bordado).includes("banho"));

  // Palavra curta só casa inteira: "ki" não puxa o kit.
  assert.deepEqual(ids(escolherPropagandas({ tipo: "busca", termo: "ki", caminhos: [] })), GERAIS);
});

test("busca sem relação com nenhuma categoria mostra só as gerais", () => {
  assert.deepEqual(ids(escolherPropagandas({ tipo: "busca", termo: "xyz", caminhos: [] })), GERAIS);
});

test("limita as específicas a 3 e nunca repete foto na mesma página", () => {
  for (const href of CATEGORIAS_DO_MENU) {
    const lista = categoria(href.slice(1));
    const fotos = lista.flatMap((propaganda) => (propaganda.imagem ? [propaganda.imagem.src] : []));
    assert.equal(new Set(fotos).size, fotos.length, `${href}: ${fotos}`);
    assert.ok(lista.filter((propaganda) => propaganda.onde.length > 0).length <= 3, href);
  }
  // Com foto repetida, a segunda usa a reserva.
  const foto = { src: "/vitrine/propagandas/a.webp" };
  const reserva = { src: "/vitrine/propagandas/b.webp" };
  const lista = escolherPropagandas(
    { tipo: "categoria", categoria: "enxoval" },
    [
      { id: "um", titulo: "Um.", texto: "Um.", acao: "Ver", href: "/enxoval/mantas", imagem: foto, onde: ["enxoval"] },
      { id: "dois", titulo: "Dois.", texto: "Dois.", acao: "Ver", href: "/enxoval/toalhas", imagem: foto, alternativas: [reserva], onde: ["enxoval"] },
    ],
    [],
  );
  assert.deepEqual(
    lista.map((propaganda) => propaganda.imagem.src),
    [foto.src, reserva.src],
  );
});

test("lista extensível: propaganda nova entra sem mudar a escolha", () => {
  const projeto = {
    id: "projeto-teste",
    titulo: "Projeto.",
    texto: "Teste.",
    acao: "Ver",
    href: "/personalizado",
    onde: ["kit-berco", "quarto"],
  };
  assert.ok(ids(escolherPropagandas({ tipo: "categoria", categoria: "quarto" }, [...PROPAGANDAS, projeto])).includes("projeto-teste"));
  assert.ok(!ids(escolherPropagandas({ tipo: "categoria", categoria: "maternidade" }, [...PROPAGANDAS, projeto])).includes("projeto-teste"));
});

test("links só para rotas que existem", () => {
  for (const { id, href } of TODAS) assert.ok(ROTAS.has(href.split("?")[0]), `${id}: ${href} não está no menu`);
});

test("sem promessa comercial no texto", () => {
  const proibido = /r\$|%|desconto|cupom|gr[aá]tis|frete|oferta|promo|prazo|barat|imperd|liquida|parcel|pre[cç]o/i;
  for (const { id, titulo, texto, acao } of TODAS) assert.doesNotMatch(`${titulo} ${texto} ${acao}`, proibido, id);
});

test("conteúdo completo; foto, quando houver, no disco e com crédito", () => {
  assert.equal(new Set(ids(TODAS)).size, TODAS.length, "ids repetidos");
  for (const propaganda of TODAS) {
    for (const campo of ["titulo", "texto", "acao", "href"]) assert.ok(propaganda[campo]?.length > 0, `${propaganda.id}.${campo}`);
    assert.ok(propaganda.titulo.length <= 34, `${propaganda.id}: título longo`);
    if (propaganda.estilo) assert.ok(ESTILOS.includes(propaganda.estilo));
    const fotos = [propaganda.imagem, ...(propaganda.alternativas ?? [])].filter(Boolean);
    if (fotos.length === 0) continue;
    const creditos = readFileSync(new URL("../../public/vitrine/propagandas/CREDITOS.md", import.meta.url), "utf8");
    for (const { src } of fotos) {
      assert.match(src, /^\/vitrine\/propagandas\/[a-z0-9-]+\.webp$/);
      assert.ok(existsSync(new URL(`../../public${src}`, import.meta.url)), src);
      assert.ok(creditos.includes(src.split("/").pop()), `${src} sem crédito`);
    }
  }
});
