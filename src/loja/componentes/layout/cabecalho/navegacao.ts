// Conteúdo do cabeçalho: categorias do mega menu, links utilitários e termos de busca.
// PROVISÓRIO: lista oficial de categorias do ateliê enquanto o catálogo da loja não vem do ERP
// (erp_core.records, recurso "catalogo"). Quando vier, este arquivo passa a ser montado de lá.
// Caminhos seguem o motor de URLs (src/lib/seo/urls.ts): /<categoria>/<subcategoria>[/<faceta>].

import { linkWhatsAppAtelie } from "@/loja/lib/whatsapp";
import { EMPRESA, REDES_SOCIAIS } from "@/loja/lib/empresa";

export type LinkNavegacao = { rotulo: string; href: string };
export type ColunaNavegacao = { titulo: string; href: string; links: LinkNavegacao[] };
export type ItemNavegacao = { rotulo: string; href: string; colunas: ColunaNavegacao[] };
export type LinkUtilitario = LinkNavegacao & { externo?: boolean };

export const NAVEGACAO: ItemNavegacao[] = [
  {
    rotulo: "Kit berço",
    href: "/kit-berco",
    colunas: [
      {
        titulo: "Kits completos",
        href: "/kit-berco/kits",
        links: [
          { rotulo: "Para menina", href: "/kit-berco/kits/menina" },
          { rotulo: "Para menino", href: "/kit-berco/kits/menino" },
          { rotulo: "Unissex", href: "/kit-berco/kits/unissex" },
        ],
      },
    ],
  },
  {
    rotulo: "Kit cama",
    href: "/kit-cama-kids",
    colunas: [
      {
        titulo: "Kit cama",
        href: "/kit-cama-kids",
        links: [
          { rotulo: "Kit cama kids", href: "/kit-cama-kids" },
          { rotulo: "Kit cama adulto", href: "/kit-cama-adulto" },
        ],
      },
    ],
  },
  {
    rotulo: "Kit maternidade",
    href: "/kit-maternidade",
    colunas: [
      {
        titulo: "Para a maternidade",
        href: "/kit-maternidade",
        links: [
          { rotulo: "Kits maternidade", href: "/kit-maternidade" },
          { rotulo: "Kit paninhos", href: "/kit-paninhos" },
        ],
      },
    ],
  },
  {
    rotulo: "Kit paninhos",
    href: "/kit-paninhos",
    colunas: [
      {
        titulo: "Paninhos",
        href: "/kit-paninhos",
        links: [{ rotulo: "Todos os kits paninhos", href: "/kit-paninhos" }],
      },
    ],
  },
  {
    rotulo: "Para presentear",
    href: "/para-presentear",
    colunas: [
      {
        titulo: "Presentes",
        href: "/para-presentear",
        links: [{ rotulo: "Itens para presentear", href: "/para-presentear" }],
      },
    ],
  },
  {
    rotulo: "Complementares",
    href: "/itens-complementares",
    colunas: [
      {
        titulo: "Itens complementares",
        href: "/itens-complementares",
        links: [
          { rotulo: "Todos os complementares", href: "/itens-complementares" },
          { rotulo: "Ninhos", href: "/busca?q=ninho" },
          { rotulo: "Trocadores", href: "/busca?q=trocador" },
          { rotulo: "Almofadas de amamentação", href: "/busca?q=amamenta%C3%A7%C3%A3o" },
          { rotulo: "Embalagem maternidade", href: "/busca?q=embalagem" },
        ],
      },
    ],
  },
  // Loja à parte, como o SNKRS na Nike: o quarto inteiro planejado pelo ateliê, no tema escolhido.
  {
    rotulo: "Personalizado",
    href: "/personalizado",
    colunas: [
      {
        titulo: "Por tema",
        href: "/personalizado",
        links: [
          { rotulo: "Todos os quartinhos", href: "/personalizado" },
          { rotulo: "Para menina", href: "/personalizado/menina" },
          { rotulo: "Para menino", href: "/personalizado/menino" },
          { rotulo: "Neutros", href: "/personalizado/neutro" },
        ],
      },
      {
        titulo: "Por estilo",
        href: "/personalizado",
        links: [
          { rotulo: "Floral", href: "/personalizado/floral" },
          { rotulo: "Safári", href: "/personalizado/safari" },
          { rotulo: "Nuvens e céu", href: "/personalizado/nuvens" },
          { rotulo: "Clássico", href: "/personalizado/classico" },
        ],
      },
      {
        titulo: "Seu quartinho Milena",
        href: "/personalizado/como-funciona",
        links: [
          { rotulo: "Como funciona", href: "/personalizado/como-funciona" },
          { rotulo: "Peça seu quartinho", href: "/personalizado/orcamento" },
        ],
      },
    ],
  },
];

// Categorias antigas que saíram do menu (nov/2026), mas seguem na árvore estática: o catálogo de exemplo
// (fallback e testes) ainda usa esses caminhos. No banco elas ficam desligadas (loja:segmentacoes).
export const CATEGORIAS_LEGADAS: LinkNavegacao[] = [
  { rotulo: "Kit berço · Peças avulsas", href: "/kit-berco" },
  { rotulo: "Protetores de berço", href: "/kit-berco/protetores" },
  { rotulo: "Lençóis e fronhas", href: "/kit-berco/lencois" },
  { rotulo: "Edredons e colchas", href: "/kit-berco/edredons" },
  { rotulo: "Saias de berço", href: "/kit-berco/saias" },
  { rotulo: "Travesseiros e rolinhos", href: "/kit-berco/travesseiros" },
  { rotulo: "Enxoval", href: "/enxoval" },
  { rotulo: "Paninhos", href: "/enxoval/paninhos" },
  { rotulo: "Fraldas de boca", href: "/enxoval/paninhos/fraldas-de-boca" },
  { rotulo: "Cueiros", href: "/enxoval/paninhos/cueiros" },
  { rotulo: "Babadores", href: "/enxoval/paninhos/babadores" },
  { rotulo: "Toalhas com capuz", href: "/enxoval/toalhas" },
  { rotulo: "Mantas e cobertores", href: "/enxoval/mantas" },
  { rotulo: "Kits de enxoval", href: "/enxoval/kits" },
  { rotulo: "Quarto de bebê", href: "/quarto" },
  { rotulo: "Cortinas", href: "/quarto/cortinas" },
  { rotulo: "Tapetes", href: "/quarto/tapetes" },
  { rotulo: "Almofadas e nichos", href: "/quarto/almofadas" },
  { rotulo: "Mosquiteiros", href: "/quarto/mosquiteiros" },
  { rotulo: "Kit mini cama", href: "/quarto/mini-cama" },
  { rotulo: "Capas de trocador", href: "/quarto/trocador" },
  { rotulo: "Maternidade", href: "/maternidade" },
  { rotulo: "Bolsas de maternidade", href: "/maternidade/bolsas" },
  { rotulo: "Saídas de maternidade", href: "/maternidade/saidas" },
  { rotulo: "Enfeites de porta", href: "/maternidade/enfeites-de-porta" },
  { rotulo: "Kits maternidade", href: "/maternidade/kits" },
];

// Links utilitários: rodapé do menu do celular, linha de serviço do mega menu, ícone de conta e rodapé.
export const LINKS_UTILITARIOS = {
  loja: { rotulo: "Pronta entrega", href: "/pronta-entrega" },
  edicao: { rotulo: "Edição do mês", href: "/edicao-do-mes" }, // coleção editorial do mês
  pedido: { rotulo: "Meus pedidos", href: "/conta/pedidos" },
  ajuda: { rotulo: "Ajuda", href: "/ajuda" },
  franquia: { rotulo: "Fale no WhatsApp", href: linkWhatsAppAtelie(), externo: true },
  instagram: { rotulo: "Instagram", href: REDES_SOCIAIS.instagram, externo: true },
  // "Minha conta": login por e-mail e senha (contas de cliente), pedidos, cupom de primeira compra, favoritos e dados.
  conta: { rotulo: "Minha conta", href: "/conta" },
  indique: { rotulo: "Indique o ateliê", href: "/indique" },
} satisfies Record<string, LinkUtilitario>;

// Painel de busca vazio. Trocar pelos termos reais do relatório de busca interna (GA4) assim que houver dados.
export const TERMOS_MAIS_BUSCADOS = [
  "kit berço",
  "kit berço menina",
  "kit berço menino",
  "kit paninhos",
  "kit maternidade",
  "kit cama kids",
  "ninho",
  "pronta entrega",
];
