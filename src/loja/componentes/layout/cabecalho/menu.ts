// Itens do menu do cabeçalho (desktop e celular) montados a partir da taxonomia de navegacao.ts.
// Roda no servidor: os links de atalho saem do motor de URLs (forma canônica, sem redirecionamento)
// e o resultado é só dado serializável, entregue aos Client Components do cabeçalho.
// Painéis no modelo do mega menu da shop.lululemon.com (lululemon-referencia.md §1.5): todo painel
// tem mídia. A = colunas de links; B = editorial com mídia 16:9; C = cards 5:6.

import type { NomeIcone, TomMidia } from "@/loja/componentes/inicio/Midia";
import { montarUrl } from "@/loja/lib/catalogo/urlsListagem";
import { LINKS_UTILITARIOS, type LinkUtilitario, NAVEGACAO } from "./navegacao";

export type LinkMenu = { rotulo: string; href: string; externo?: boolean };
export type ColunaMenu = { titulo: string; href: string; links: LinkMenu[] };
export type CardMenu = { rotulo: string; href: string; tom: TomMidia; icone: NomeIcone; src?: string; alt?: string };
export type PromoMenu = { titulo: string; descricao: string; href: string; tom: TomMidia; icone: NomeIcone; src?: string; alt?: string };

// "colunas": coluna de destaques + colunas de links (variante A) e, no espaço que sobra, a mídia:
// o bloco editorial 16:9 (variante B, quando há `promo`) ou os cards 5:6 (variante C). No celular, os
// `cards` viram a grade 2×N do nível 2. "cards": só a grade de cards (o "Activity" da referência).
export type PainelMenu =
  | { tipo: "colunas"; destaques: LinkMenu[]; secundarios: LinkMenu[]; colunas: ColunaMenu[]; cards: CardMenu[]; promo?: PromoMenu }
  | { tipo: "cards"; cards: CardMenu[] };

export type ItemMenu = {
  id: string;
  rotulo: string;
  href: string;
  destaque?: boolean; // texto com brilho (o "Gifts" da referência)
  soBotao?: boolean; // sem página própria: o rótulo só abre o painel (o "Activity" da referência)
  painel: PainelMenu;
};

// Linha de serviço no canto inferior direito de todo painel (Ajuda · Baixe o app · Vale-presente).
export const LINKS_SERVICO: LinkUtilitario[] = [LINKS_UTILITARIOS.ajuda, LINKS_UTILITARIOS.pedido, LINKS_UTILITARIOS.franquia];

// Rodapé da gaveta do celular (Sign In · Help · Download the App · Gift Cards).
export const LINKS_GAVETA: LinkUtilitario[] = [
  LINKS_UTILITARIOS.conta,
  LINKS_UTILITARIOS.pedido,
  LINKS_UTILITARIOS.ajuda,
  LINKS_UTILITARIOS.franquia,
  LINKS_UTILITARIOS.instagram,
];

const PRONTA = "pronta-entrega";

// Coleção editorial do mês (página /edicao-do-mes): entra na coluna de destaques de todo painel.
const EDICAO: LinkMenu = LINKS_UTILITARIOS.edicao;

// Fotos reais do menu: salve em public/vitrine/menu/<categoria>/<arquivo>.webp (5:6 nos cards, 16:9
// no bloco editorial) e acrescente "<categoria>/<arquivo>" aqui. Sem a foto, a Midia mostra a
// composição de cor e ícone no tom do card (nunca uma imagem quebrada).
const FOTOS_MENU = new Set<string>([]);

function foto(caminho: string): string | undefined {
  return FOTOS_MENU.has(caminho) ? `/vitrine/menu/${caminho}.webp` : undefined;
}

function card(rotulo: string, href: string, tom: TomMidia, icone: NomeIcone, caminho: string): CardMenu {
  return { rotulo, href, tom, icone, src: foto(caminho) };
}

function categoria(chave: string, filtros: Record<string, string[]> = {}, ordem?: string): string {
  return montarUrl({ tipo: "categoria", categoria: chave }, filtros, ordem);
}

// Coluna 1 do painel (links grandes, 18 px): atalhos da categoria inteira e a Edição do mês.
function destaquesDe(chave: string, rotulo: string): LinkMenu[] {
  return [
    { rotulo: `Ver tudo de ${rotulo}`, href: categoria(chave) },
    { rotulo: "Novidades", href: categoria(chave, {}, "lancamentos") },
    EDICAO,
    { rotulo: "Mais vendidos", href: categoria(chave, {}, "mais-vendidos") },
    { rotulo: "Pronta entrega", href: categoria(chave, { entrega: [PRONTA] }) },
    { rotulo: "Bordado com o nome", href: categoria(chave, { personalizacao: ["bordado-com-nome"] }) },
  ];
}

const SECUNDARIOS: LinkMenu[] = [
  { rotulo: "Monte o seu quartinho", href: "/personalizado/monte-o-seu" },
  { rotulo: "Quartinhos personalizados", href: "/personalizado" },
];

// Mídia de cada categoria: cards 5:6 das subcategorias principais (os primeiros que couberem no
// desktop; os 4 na grade 2×2 do celular) e, onde houver, o bloco editorial 16:9 do desktop.
const MIDIA_CATEGORIA: Record<string, { cards: CardMenu[]; promo?: PromoMenu }> = {
  "kit-berco": {
    cards: [
      card("Para menina", "/kit-berco/kits/menina", "rose", "flor", "kit-berco/menina"),
      card("Para menino", "/kit-berco/kits/menino", "azul", "nuvem", "kit-berco/menino"),
      card("Unissex", "/kit-berco/kits/unissex", "linho", "bebe", "kit-berco/unissex"),
      card("Complementares", "/itens-complementares", "salviaClara", "coracao", "kit-berco/complementares"),
    ],
  },
  "kit-cama-kids": {
    cards: [
      card("Kit cama kids", "/kit-cama-kids", "rose", "nuvem", "kit-cama/kids"),
      card("Kit cama adulto", "/kit-cama-adulto", "linho", "lua", "kit-cama/adulto"),
    ],
  },
  "kit-maternidade": {
    cards: [
      card("Kits maternidade", "/kit-maternidade", "areia", "presente", "kit-maternidade/kits"),
      card("Kit paninhos", "/kit-paninhos", "salviaClara", "bebe", "kit-maternidade/paninhos"),
    ],
  },
};

function itemDaNavegacao(indice: number): (typeof NAVEGACAO)[number] {
  return NAVEGACAO[indice];
}

function colunas(indice: number): ItemMenu {
  const item = itemDaNavegacao(indice);
  const chave = item.href.slice(1);
  const midia = MIDIA_CATEGORIA[chave] ?? { cards: [] };
  return {
    id: chave,
    rotulo: item.rotulo,
    href: item.href,
    painel: {
      tipo: "colunas",
      destaques: destaquesDe(chave, item.rotulo),
      secundarios: SECUNDARIOS,
      colunas: item.colunas.map(({ titulo, href, links }) => ({ titulo, href, links })),
      cards: midia.cards,
      promo: midia.promo,
    },
  };
}

export function montarMenu(): ItemMenu[] {
  // NAVEGACAO: 0 Kit berço, 1 Kit cama kids, 2 Kit maternidade, 3 Kit paninhos, 4 Para presentear,
  // 5 Complementares, 6 Personalizado.
  const projetos = itemDaNavegacao(6);
  return [
    colunas(0),
    colunas(1),
    colunas(2),
    colunas(3),
    colunas(4),
    colunas(5),
    {
      // Variante B (editorial com mídia 16:9), como "New & Featured".
      id: "projetos",
      rotulo: projetos.rotulo,
      href: projetos.href,
      painel: {
        tipo: "colunas",
        destaques: [
          { rotulo: "Todos os quartinhos", href: "/personalizado" },
          { rotulo: "Monte o seu quartinho", href: "/personalizado/monte-o-seu" },
          { rotulo: "Como funciona", href: "/personalizado/como-funciona" },
          { rotulo: "Peça seu quartinho", href: "/personalizado/orcamento" },
          EDICAO,
        ],
        secundarios: [{ rotulo: "Fale com o ateliê", href: LINKS_UTILITARIOS.franquia.href, externo: true }],
        colunas: projetos.colunas.slice(0, 2).map(({ titulo, href, links }) => ({ titulo, href, links })),
        cards: [
          card("Para menina", "/personalizado/menina", "rose", "flor", "projetos/menina"),
          card("Para menino", "/personalizado/menino", "azul", "nuvem", "projetos/menino"),
          card("Neutros", "/personalizado/neutro", "linho", "folha", "projetos/neutro"),
          card("Monte o seu", "/personalizado/monte-o-seu", "salvia", "berco", "projetos/monte-o-seu"),
        ],
        promo: {
          titulo: "O quartinho inteiro, planejado pelo ateliê",
          descricao: "Kit berço e peças complementares no mesmo tema, com bordado do nome. Qualquer item pode ser personalizado.",
          href: "/personalizado",
          tom: "salvia",
          icone: "berco",
          src: foto("projetos/editorial"),
        },
      },
    },
    {
      // Item de destaque com brilho no texto e painel editorial, como "Gifts".
      id: PRONTA,
      rotulo: LINKS_UTILITARIOS.loja.rotulo,
      href: LINKS_UTILITARIOS.loja.href,
      destaque: true,
      painel: {
        tipo: "colunas",
        destaques: [
          { rotulo: "Tudo a pronta entrega", href: LINKS_UTILITARIOS.loja.href },
          { rotulo: "Kit berço", href: categoria("kit-berco", { entrega: [PRONTA] }) },
          { rotulo: "Kit maternidade", href: categoria("kit-maternidade", { entrega: [PRONTA] }) },
          { rotulo: "Kit paninhos", href: categoria("kit-paninhos", { entrega: [PRONTA] }) },
          { rotulo: "Complementares", href: categoria("itens-complementares", { entrega: [PRONTA] }) },
          EDICAO,
        ],
        secundarios: [LINKS_UTILITARIOS.pedido],
        colunas: [
          {
            titulo: "Por cor",
            href: LINKS_UTILITARIOS.loja.href,
            links: [
              { rotulo: "Rosê", href: categoria("kit-berco", { entrega: [PRONTA], cor: ["rose"] }) },
              { rotulo: "Azul bebê", href: categoria("kit-berco", { entrega: [PRONTA], cor: ["azul-bebe"] }) },
              { rotulo: "Verde-sálvia", href: categoria("kit-berco", { entrega: [PRONTA], cor: ["verde-salvia"] }) },
              { rotulo: "Cru", href: categoria("kit-berco", { entrega: [PRONTA], cor: ["cru"] }) },
              { rotulo: "Branco", href: categoria("kit-berco", { entrega: [PRONTA], cor: ["branco"] }) },
            ],
          },
          {
            titulo: "Para presentear",
            href: LINKS_UTILITARIOS.loja.href,
            links: [
              { rotulo: "Itens para presentear", href: categoria("para-presentear", { entrega: [PRONTA] }) },
              { rotulo: "Kit paninhos", href: categoria("kit-paninhos", { entrega: [PRONTA] }) },
            ],
          },
        ],
        cards: [
          card("Kit berço", categoria("kit-berco", { entrega: [PRONTA] }), "rose", "berco", "pronta-entrega/kit-berco"),
          card("Kit maternidade", categoria("kit-maternidade", { entrega: [PRONTA] }), "areia", "presente", "pronta-entrega/kit-maternidade"),
          card("Kit paninhos", categoria("kit-paninhos", { entrega: [PRONTA] }), "salviaClara", "bebe", "pronta-entrega/kit-paninhos"),
          card("Para presentear", categoria("para-presentear", { entrega: [PRONTA] }), "linho", "presente", "pronta-entrega/presentes"),
        ],
        promo: {
          titulo: "Sai do ateliê em até 2 dias úteis",
          descricao: "Peças prontas, embaladas à mão, com entrega para todo o Brasil.",
          href: LINKS_UTILITARIOS.loja.href,
          tom: "linho",
          icone: "pacote",
          src: foto("pronta-entrega/editorial"),
        },
      },
    },
  ];
}
