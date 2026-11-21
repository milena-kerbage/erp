import assert from "node:assert/strict";
import test from "node:test";
import { disponivelEm, elegivelParaOFeed, feedDoMerchant, generoDe, grupoDe, itemDoFeed, precoDe } from "../../src/loja/lib/seo/merchant.ts";

// Feed do Google Merchant Center (/feeds/google-merchant.xml): campos obrigatórios, disponibilidade, preço e escape.
const produto = (extra = {}) => ({
  slug: "kit-berco-bia", sku: "MK-KB-BIA", nome: "Kit berço Bia 9 peças | Milena Kerbage", marca: "Milena Kerbage",
  trilha: [{ rotulo: "Kit berço", href: "/kit-berco" }, { rotulo: "Kits completos", href: "/kit-berco/kits" }], caminho: "/kit-berco/kits",
  atributos: { para: ["Menina"], cor: ["Rosê", "Branco"], tecido: ["Percal 230 fios"], entrega: ["Sob encomenda"] },
  resumo: "Kit com 9 peças & laços <rosê>.", imagens: [{ src: "/api/catalogo/imagem/abc123?v=1", alt: "Kit", tipo: "principal" }, { src: "/api/catalogo/imagem/def456?v=1", alt: "Detalhe", tipo: "detalhe" }],
  preco: "1450.00", unidade: "kit", descricao: ["Feito no ateliê.\u0007", "Pode ser personalizado."], ficha: [], documentos: [], avaliacoes: null, complementos: [], semelhantes: [], ...extra,
});
const AGORA = new Date("2026-11-21T15:00:00Z");

test("item sob encomenda: backorder com data, preço em BRL, sem GTIN e com escape de XML", () => {
  const xml = itemDoFeed(produto(), AGORA);
  assert.match(xml, /<g:id>MK-KB-BIA<\/g:id>/);
  assert.match(xml, /<title>Kit berço Bia 9 peças<\/title>/, "sem a marca repetida no título");
  assert.match(xml, /<description>Kit com 9 peças &amp; laços &lt;rosê&gt;\. Feito no ateliê\. Pode ser personalizado\.<\/description>/);
  assert.match(xml, /<link>https:\/\/[^<]+\/produto\/kit-berco-bia<\/link>/);
  assert.match(xml, /<g:image_link>https:\/\/[^<]+\/api\/catalogo\/imagem\/abc123\?v=1<\/g:image_link>/);
  assert.match(xml, /<g:additional_image_link>https:\/\/[^<]+def456\?v=1<\/g:additional_image_link>/);
  assert.match(xml, /<g:availability>backorder<\/g:availability>/);
  // 25 dias úteis → 35 corridos a partir de 21/11 (Fortaleza): 26/12.
  assert.match(xml, /<g:availability_date>2026-12-26T00:00-0300<\/g:availability_date>/);
  assert.match(xml, /<g:price>1450\.00 BRL<\/g:price>/);
  assert.doesNotMatch(xml, /sale_price/);
  assert.match(xml, /<g:identifier_exists>no<\/g:identifier_exists>/);
  assert.match(xml, /<g:mpn>MK-KB-BIA<\/g:mpn>/);
  assert.match(xml, /<g:product_type>Kit berço &gt; Kits completos<\/g:product_type>/);
  assert.match(xml, /<g:gender>female<\/g:gender>/);
  assert.match(xml, /<g:age_group>newborn<\/g:age_group>/);
  assert.match(xml, /<g:color>Rosê\/Branco<\/g:color>/);
  assert.match(xml, /<g:material>Percal 230 fios<\/g:material>/);
  assert.doesNotMatch(xml, /google_product_category|g:shipping|\u0007/);
});

test("pronta entrega: in_stock sem data; preço de: price cheio e sale_price atual", () => {
  const xml = itemDoFeed(produto({ atributos: { entrega: ["Pronta entrega"] }, precoDe: "1690.00" }), AGORA);
  assert.match(xml, /<g:availability>in_stock<\/g:availability>/);
  assert.doesNotMatch(xml, /availability_date/);
  assert.match(xml, /<g:price>1690\.00 BRL<\/g:price>/);
  assert.match(xml, /<g:sale_price>1450\.00 BRL<\/g:sale_price>/);
  assert.equal(precoDe(produto({ precoDe: "1000.00" })), undefined, "preço de menor que o atual não vale");
  assert.equal(disponivelEm({ prazo: { min: 5, max: 10 } }, AGORA), "2026-12-05T00:00-0300", "prazo próprio do produto: 10 úteis → 14 corridos");
});

test("gênero e grupo de cores", () => {
  assert.equal(generoDe(produto({ atributos: { para: ["Menino"] } })), "male");
  assert.equal(generoDe(produto({ atributos: { para: ["Menina", "Menino"] } })), "unisex");
  assert.equal(generoDe(produto({ atributos: {} })), "unisex");
  assert.equal(grupoDe(produto()), undefined, "sem outras cores não há grupo");
  const irmaos = { titulo: "Cor", atual: "kit-berco-bia", itens: [{ rotulo: "Rosê", slug: "kit-berco-bia" }, { rotulo: "Azul", slug: "kit-berco-bia-azul" }, { rotulo: "Areia", slug: "kit-berco-areia" }] };
  assert.equal(grupoDe(produto({ irmaos })), "kit-berco-areia", "o menor slug do grupo, igual em todas as cores");
  assert.equal(grupoDe(produto({ slug: "kit-berco-bia-azul", irmaos })), "kit-berco-areia");
});

test("feed: só o catálogo real; sem foto ou sem preço fica de fora", () => {
  assert.equal(elegivelParaOFeed(produto({ imagens: [] })), false);
  assert.equal(elegivelParaOFeed(produto({ preco: "0.00" })), false);
  const real = feedDoMerchant([produto(), produto({ slug: "sem-foto", sku: "X", imagens: undefined }), produto({ slug: "sob-consulta", sku: "Y", preco: "0" })], true, AGORA);
  assert.match(real, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<rss version="2\.0" xmlns:g="http:\/\/base\.google\.com\/ns\/1\.0">/);
  assert.equal(real.match(/<item>/g)?.length, 1);
  const exemplo = feedDoMerchant([produto()], false, AGORA);
  assert.doesNotMatch(exemplo, /<item>/, "catálogo de exemplo nunca vai ao Google");
  assert.match(exemplo, /<\/channel>\n<\/rss>\n$/);
});
