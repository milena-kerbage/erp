import assert from "node:assert/strict";
import test from "node:test";
import { interpretarUrlListagem, montarUrlBusca, montarUrlListagem, normalizarBusca, regrasRobots, slug } from "../../src/loja/lib/seo/urls.ts";

const REGRAS = {
  categorias: {
    "kit-berco/kits": {
      facetasIndexaveis: [
        { chave: "para", valores: ["menina", "menino", "neutro"] },
        { chave: "tamanho", valores: ["berco-americano", "berco-padrao"] },
      ],
    },
  },
  parametrosFiltro: ["para", "tamanho", "cor", "preco"],
};
const CATEGORIAS = new Set(["kit-berco", "kit-berco/kits", "enxoval"]);
const interpretar = (url) => {
  const u = new URL(url, "https://www.ateliemilenakerbage.com.br");
  return interpretarUrlListagem(u.pathname, u.searchParams, CATEGORIAS, REGRAS);
};

test("slug remove acento, vírgula decimal e caixa", () => {
  assert.equal(slug("Kit Berço Jardim Rosê 1,20 m"), "kit-berco-jardim-rose-1-20-m");
});

test("faceta com demanda vira caminho indexável", () => {
  const d = montarUrlListagem({ categoria: "kit-berco/kits", filtros: { para: ["menina"] } }, REGRAS);
  assert.deepEqual(d, {
    url: "/kit-berco/kits/menina",
    indexavel: true,
    canonical: "/kit-berco/kits/menina",
    motivo: "faceta indexável",
  });
});

test("só 1 segmento indexável por padrão; o segundo filtro vai para a query e não indexa", () => {
  const d = montarUrlListagem({ categoria: "kit-berco/kits", filtros: { tamanho: ["berco-americano"], para: ["neutro"] } }, REGRAS);
  assert.equal(d.url, "/kit-berco/kits/neutro?tamanho=berco-americano");
  assert.equal(d.indexavel, false);
});

test("filtros na query em ordem fixa, valores ordenados e sem duplicata", () => {
  const d = montarUrlListagem({ categoria: "kit-berco", filtros: { cor: ["Rose", "cru", "rose"], preco: ["100-500"] } }, REGRAS);
  assert.equal(d.url, "/kit-berco?cor=cru,rose&preco=100-500");
});

test("ordenação e paginação", () => {
  assert.equal(montarUrlListagem({ categoria: "kit-berco", filtros: {}, ordem: "relevancia" }, REGRAS).url, "/kit-berco");
  const ord = montarUrlListagem({ categoria: "kit-berco", filtros: {}, ordem: "menor-preco" }, REGRAS);
  assert.equal(ord.indexavel, false);
  const pag = montarUrlListagem({ categoria: "kit-berco", filtros: {}, pagina: 3 }, REGRAS);
  assert.deepEqual([pag.url, pag.indexavel, pag.canonical], ["/kit-berco?pagina=3", true, "/kit-berco?pagina=3"]); // canonical próprio
  assert.equal(montarUrlListagem({ categoria: "kit-berco", filtros: {}, pagina: 1 }, REGRAS).url, "/kit-berco");
});

test("URL canônica é aceita; utm não provoca redirecionamento", () => {
  const r = interpretar("/kit-berco/kits/menina?utm_source=google&gclid=X");
  assert.equal(r.tipo, "ok");
  assert.deepEqual(r.listagem.filtros, { para: ["menina"] });
});

test("variações da mesma página redirecionam (301) para a forma canônica, preservando rastreio", () => {
  assert.deepEqual(interpretar("/Kit-Berco/Kits"), { tipo: "redirecionar", destino: "/kit-berco/kits" });
  assert.deepEqual(interpretar("/kit-berco/kits?para=menina"), {
    tipo: "redirecionar",
    destino: "/kit-berco/kits/menina",
  });
  assert.deepEqual(interpretar("/kit-berco?preco=100-500&cor=rose,cru&utm_source=meta"), {
    tipo: "redirecionar",
    destino: "/kit-berco?cor=cru,rose&preco=100-500&utm_source=meta",
  });
  assert.deepEqual(interpretar("/kit-berco?pagina=1"), { tipo: "redirecionar", destino: "/kit-berco" });
  assert.deepEqual(interpretar("/kit-berco?sessao=abc"), { tipo: "redirecionar", destino: "/kit-berco" });
});

test("caminho ou página inexistente é 404 (nunca redireciona para página genérica)", () => {
  assert.deepEqual(interpretar("/nao-existe"), { tipo: "nao-encontrado" });
  assert.deepEqual(interpretar("/kit-berco/kits/valor-inventado"), { tipo: "nao-encontrado" });
  assert.deepEqual(interpretar("/kit-berco/kits/neutro/neutro"), { tipo: "nao-encontrado" });
  assert.deepEqual(interpretar("/kit-berco?pagina=0"), { tipo: "nao-encontrado" });
  assert.deepEqual(interpretar("/kit-berco?pagina=abc"), { tipo: "nao-encontrado" });
});

test("busca normalizada e robots gerado da mesma fonte", () => {
  assert.equal(normalizarBusca("  Manta   BORDADA  "), "manta bordada");
  assert.equal(montarUrlBusca("Manta Bordada"), "/busca?q=manta+bordada");
  const robots = regrasRobots(REGRAS);
  assert.ok(robots.includes("/busca") && robots.includes("/*?*cor=") && robots.includes("/*?*ordem="));
});
