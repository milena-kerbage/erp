// Imports relativos com extensão: este módulo é puro e roda direto no `node --test` (tests/loja/merchant.test.mjs).
import { ORIGEM_LOJA as ORIGEM } from "../../../lib/hosts.ts";
import { PRODUCAO_ENCOMENDA } from "../carrinho/totais.ts";
import { PRONTA_ENTREGA } from "../catalogo/constantes.ts";
import type { Produto } from "../catalogo/exemplos.ts";
import { semPreco } from "../formatacao/moeda.ts";
import { semMarca } from "./compartilhar.ts";

// Dados de produto para o Google: o feed do Merchant Center (/feeds/google-merchant.xml) e o JSON-LD da página
// de produto saem daqui, para a disponibilidade, o preço e os atributos dizerem SEMPRE a mesma coisa nos dois
// (o Google confere feed × página × dados estruturados e reprova divergência).
// Especificação: support.google.com/merchants/answer/7052112 (conferida em nov/2026).

/** Pronta entrega sai do ateliê em até 2 dias úteis; o resto é feito sob encomenda (backorder). */
export const prontaEntrega = (produto: Pick<Produto, "atributos">) => produto.atributos.entrega?.includes(PRONTA_ENTREGA) ?? false;

/** Entra no feed: catálogo real, com foto e com preço (R$ 0,00 é "Sob consulta": não pode ir ao Google). */
export const elegivelParaOFeed = (produto: Produto) => Boolean(produto.imagens?.length) && !semPreco(produto.preco);

/** "1450.00": duas casas, ponto decimal (o feed junta " BRL"; o JSON-LD manda o número puro). */
export const precoDecimal = (valor: string) => Number(valor).toFixed(2);

/** Preço "de" (riscado) válido: maior que o preço atual. */
export const precoDe = (produto: Pick<Produto, "preco" | "precoDe">) =>
  produto.precoDe && !semPreco(produto.precoDe) && Number(produto.precoDe) > Number(produto.preco) ? precoDecimal(produto.precoDe) : undefined;

/**
 * Data em que a peça sob encomenda fica disponível: hoje + o prazo máximo de produção (dias úteis convertidos em
 * corridos, 5 úteis = 7 corridos), no fuso de Fortaleza. Formato do feed: AAAA-MM-DDThh:mm-0300.
 */
export function disponivelEm(produto: Pick<Produto, "prazo">, agora = new Date()): string {
  const uteis = produto.prazo?.max ?? PRODUCAO_ENCOMENDA.max;
  const corridos = Math.ceil((uteis * 7) / 5);
  const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza", year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(agora.getTime() + corridos * 86_400_000),
  );
  return `${dia}T00:00-0300`;
}

/** Menina → female, Menino → male; os dois, unissex ou nada → unisex. */
export function generoDe(produto: Pick<Produto, "atributos">): "female" | "male" | "unisex" {
  const para = (produto.atributos.para ?? []).map((valor) => valor.toLowerCase());
  const menina = para.some((valor) => valor.includes("menina")), menino = para.some((valor) => valor.includes("menino"));
  return menina && !menino ? "female" : menino && !menina ? "male" : "unisex";
}

/** Cores no formato do Google: principal primeiro, separadas por "/", até 3 cores e 100 caracteres. */
export const corDe = (produto: Pick<Produto, "atributos">) => (produto.atributos.cor ?? []).slice(0, 3).join("/").slice(0, 100) || undefined;
export const materialDe = (produto: Pick<Produto, "atributos">) => (produto.atributos.tecido ?? []).slice(0, 3).join("/").slice(0, 200) || undefined;

/** A mesma peça em outras cores forma um grupo: o id é o menor slug do grupo (estável, igual em todas as cores). */
export function grupoDe(produto: Pick<Produto, "slug" | "irmaos">): string | undefined {
  const slugs = produto.irmaos?.itens.map((irmao) => irmao.slug) ?? [];
  if (slugs.length < 2 && !(slugs.length === 1 && slugs[0] !== produto.slug)) return undefined;
  return [...new Set([produto.slug, ...slugs])].sort()[0]?.slice(0, 50);
}

// ---------------------------------------------------------------- feed (RSS 2.0 + namespace g:)

// biome-ignore lint/suspicious/noControlCharactersInRegex: remover caracteres de controle é o objetivo (XML 1.0 não aceita)
const CONTROLE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f￾￿]/g;
const texto = (valor: string, maximo: number) => valor.replace(CONTROLE, "").replace(/\s+/g, " ").trim().slice(0, maximo);
const xml = (valor: string) => valor.replace(CONTROLE, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const campo = (nome: string, valor: string | undefined) => (valor ? `    <${nome}>${xml(valor)}</${nome}>` : "");
const absoluta = (src: string) => new URL(src, ORIGEM).href;

export function itemDoFeed(produto: Produto, agora = new Date()): string {
  const [principal, ...outras] = produto.imagens ?? [];
  const pronta = prontaEntrega(produto);
  const de = precoDe(produto);
  const preco = `${precoDecimal(produto.preco)} BRL`;
  const linhas = [
    campo("g:id", texto(produto.sku, 50)),
    campo("title", texto(semMarca(produto.nome), 150)),
    campo("description", texto([produto.resumo, ...produto.descricao].filter(Boolean).join(" "), 5000)),
    campo("link", `${ORIGEM}/produto/${produto.slug}`),
    campo("g:image_link", principal && absoluta(principal.src)),
    ...outras.slice(0, 10).map((imagem) => campo("g:additional_image_link", absoluta(imagem.src))),
    campo("g:availability", pronta ? "in_stock" : "backorder"),
    campo("g:availability_date", pronta ? undefined : disponivelEm(produto, agora)),
    // Com preço "de": price é o cheio e sale_price o atual (o Google mostra o riscado).
    campo("g:price", de ? `${de} BRL` : preco),
    campo("g:sale_price", de ? preco : undefined),
    campo("g:brand", texto(produto.marca, 70)),
    campo("g:condition", "new"),
    // Peças do ateliê não têm GTIN; o código do ateliê vai como MPN.
    campo("g:identifier_exists", "no"),
    campo("g:mpn", texto(produto.sku, 70)),
    campo("g:product_type", texto(produto.trilha.map((item) => item.rotulo).join(" > "), 750)),
    campo("g:gender", generoDe(produto)),
    campo("g:age_group", "newborn"),
    campo("g:color", corDe(produto)),
    campo("g:material", materialDe(produto)),
    campo("g:item_group_id", grupoDe(produto)),
  ].filter(Boolean);
  return `  <item>\n${linhas.join("\n")}\n  </item>`;
}

/**
 * O feed inteiro. Só o catálogo REAL (cadastro do ERP) entra: com o de exemplo (preços fictícios) o canal sai
 * vazio. Sem google_product_category (o ID da taxonomia não foi confirmado) e sem g:shipping (o frete é
 * configurado na conta do Merchant Center; no site ele é combinado pelo WhatsApp).
 */
export function feedDoMerchant(produtos: Produto[], real: boolean, agora = new Date()): string {
  const itens = real ? produtos.filter(elegivelParaOFeed).map((produto) => itemDoFeed(produto, agora)) : [];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "<channel>",
    "  <title>Ateliê Milena Kerbage</title>",
    `  <link>${ORIGEM}</link>`,
    "  <description>Enxoval e quarto de bebê do Ateliê Milena Kerbage, em Fortaleza. Entrega para todo o Brasil.</description>",
    ...itens,
    "</channel>",
    "</rss>",
    "",
  ].join("\n");
}
