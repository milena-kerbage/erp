// Endereços antigos da loja: a área "Projetos" virou "Personalizado" e cada URL antiga responde 308
// para a nova no proxy da loja (src/loja/proxy.ts), sem afetar o ERP.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { destinoLegado } from "../../src/loja/lib/seo/legado.ts";

test("/projetos/** vai para /personalizado/**, e a antiga seleção para a sacola", () => {
  assert.equal(destinoLegado("/projetos"), "/personalizado");
  assert.equal(destinoLegado("/projetos/"), "/personalizado");
  assert.equal(destinoLegado("/projetos/jardim-de-camomila"), "/personalizado/jardim-de-camomila");
  assert.equal(destinoLegado("/projetos/floral"), "/personalizado/floral");
  assert.equal(destinoLegado("/projetos/como-funciona"), "/personalizado/como-funciona");
  assert.equal(destinoLegado("/projetos/orcamento"), "/personalizado/orcamento");
  assert.equal(destinoLegado("/projetos/monte-o-seu"), "/personalizado/monte-o-seu");
  assert.equal(destinoLegado("/Projetos/Menina"), "/personalizado/Menina"); // o 2º 308 (motor de URLs) normaliza a caixa
  assert.equal(destinoLegado("/projetos/selecao"), "/carrinho");
  assert.equal(destinoLegado("/projetos/selecao/"), "/carrinho");
});

test("o resto não muda", () => {
  for (const caminho of ["/", "/personalizado", "/personalizado/monte-o-seu/tema", "/produto/projetos", "/kit-berco/kits", "/projetosx", "/carrinho"]) {
    assert.equal(destinoLegado(caminho), null, caminho);
  }
});

test("o proxy da loja aplica o 308 preservando a busca (o ERP não passa por ele)", () => {
  const proxy = readFileSync(new URL("../../src/loja/proxy.ts", import.meta.url), "utf8");
  assert.match(proxy, /destinoLegado\(caminho\)/);
  assert.match(proxy, /novo\.pathname = legado;\n\s+return comCabecalhos\(NextResponse\.redirect\(novo, 308\)\)/);
  const raiz = readFileSync(new URL("../../src/proxy.ts", import.meta.url), "utf8");
  assert.match(raiz, /proxyLoja/);
});

test("a entrada do montador abre a 1ª etapa (307)", async () => {
  const { destinoEntrada } = await import("../../src/loja/lib/seo/legado.ts");
  assert.equal(destinoEntrada("/personalizado/monte-o-seu"), "/personalizado/monte-o-seu/tema");
  assert.equal(destinoEntrada("/personalizado/monte-o-seu/"), "/personalizado/monte-o-seu/tema");
  assert.equal(destinoEntrada("/personalizado/monte-o-seu/berco"), null);
  assert.equal(destinoEntrada("/personalizado"), null);
});
