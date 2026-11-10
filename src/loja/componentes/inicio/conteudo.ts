// Conteúdo da home do Ateliê Milena Kerbage, módulo a módulo, na ordem da página. Textos do ateliê;
// links internos pela URL pública.
// Cada mídia aceita `src` de campanha. Os espaços sem imagem são completados pelas fotos do
// catálogo ativo em lib/catalogo/apresentacao.ts, usando a mesma curadoria do menu e da busca.
// Sem uma foto compatível, Midia.tsx mantém a composição nos tons da marca.

import { LINKS_UTILITARIOS } from "@/loja/componentes/layout/cabecalho/navegacao";
import { EDICAO_ATUAL, ROTA_EDICAO } from "@/loja/lib/catalogo/edicoes";
import { montarUrl } from "@/loja/lib/catalogo/urlsListagem";
import { EMPRESA, REDES_SOCIAIS } from "@/loja/lib/empresa";
import { montarUrlBusca } from "@/loja/lib/seo/urls";
import type { NomeIcone, TomMidia } from "./Midia";

export type Acao = { rotulo: string; href: string; externo?: boolean };
export type MidiaConteudo = { src?: string; alt?: string; tom: TomMidia; icone: NomeIcone };

const WHATSAPP = `https://wa.me/${EMPRESA.whatsapp.numero}`;

function categoria(chave: string, filtros: Record<string, string[]> = {}, ordem?: string): string {
  return montarUrl({ tipo: "categoria", categoria: chave }, filtros, ordem);
}

// 0. Hero: 4 slides em tela cheia, sem troca automática. O 1º é a edição do mês (título, texto e
// mídia do bloco de abertura vêm de src/loja/lib/catalogo/edicoes.ts: trocou a edição, trocou o slide).
export type Slide = { id: string; titulo: string; subtitulo: string; acoes: Acao[]; midia: MidiaConteudo };
const ABERTURA_EDICAO = EDICAO_ATUAL.blocos[0]?.midia;
export const SLIDES: Slide[] = [
  {
    id: "edicao-do-mes",
    titulo: EDICAO_ATUAL.titulo,
    subtitulo: EDICAO_ATUAL.subtitulo,
    acoes: [
      { rotulo: "Ver a edição do mês", href: ROTA_EDICAO },
      { rotulo: "Novidades da edição", href: `${ROTA_EDICAO}?ordem=lancamentos` },
    ],
    midia: ABERTURA_EDICAO
      ? { src: ABERTURA_EDICAO.src, alt: ABERTURA_EDICAO.alt, tom: ABERTURA_EDICAO.tom, icone: ABERTURA_EDICAO.icone }
      : { tom: "aconchego", icone: "lua" },
  },
  {
    id: "kit-berco",
    titulo: "Kit berço feito à mão",
    subtitulo: "Percal, tricô e bordado, peça por peça, no ateliê em Fortaleza.",
    acoes: [
      { rotulo: "Ver kits de berço", href: "/kit-berco" },
      { rotulo: "Mais vendidos", href: categoria("kit-berco", {}, "mais-vendidos") },
    ],
    // public/vitrine/home/hero/kit-berco.mp4 (ou .webp)
    midia: { tom: "salvia", icone: "berco" },
  },
  {
    id: "projetos",
    titulo: "O quartinho inteiro, num só tema",
    subtitulo: "Quartinhos completos com kit berço, cortina, tapete e enfeites.",
    acoes: [
      { rotulo: "Conhecer os quartinhos", href: "/personalizado" },
      { rotulo: "Como funciona", href: "/personalizado/como-funciona" },
    ],
    // public/vitrine/home/hero/projetos.webp
    midia: { tom: "musgo", icone: "nuvem" },
  },
  {
    id: "pronta-entrega",
    titulo: "Pronta entrega para todo o Brasil",
    subtitulo: "Sai do ateliê em até 2 dias úteis, embalado à mão.",
    acoes: [
      { rotulo: "Ver pronta entrega", href: LINKS_UTILITARIOS.loja.href },
      { rotulo: "Kit berço a pronta entrega", href: categoria("kit-berco", { entrega: ["pronta-entrega"] }) },
    ],
    // public/vitrine/home/hero/pronta-entrega.mp4
    midia: { tom: "noite", icone: "pacote" },
  },
];

// 2. Par editorial (2 × 1:1 + texto).
export type Editorial = { id: string; titulo: string; texto: string; acao: Acao; midia: MidiaConteudo; atalho: Acao };
export const PAR_EDITORIAL: Editorial[] = [
  {
    id: "menina",
    titulo: "Para ela",
    texto: "Rosê, floral e laços: kits com bordado delicado e acabamento à mão.",
    acao: { rotulo: "Kits para menina", href: "/kit-berco/kits/menina" },
    atalho: { rotulo: "Ver peças para menina", href: "/kit-berco/kits/menina" },
    // public/vitrine/home/par/menina.webp
    midia: { tom: "rose", icone: "flor" },
  },
  {
    id: "menino",
    titulo: "Para ele",
    texto: "Azul bebê, nuvens e safári: o enxoval leve que acompanha o quartinho.",
    acao: { rotulo: "Kits para menino", href: "/kit-berco/kits/menino" },
    atalho: { rotulo: "Ver peças para menino", href: "/kit-berco/kits/menino" },
    // public/vitrine/home/par/menino.webp
    midia: { tom: "azul", icone: "nuvem" },
  },
];

// Grades de cards com abas (3, 4, 7 e 11).
export type CardGrade = { rotulo: string; href: string; midia: MidiaConteudo };
export type Aba = { rotulo: string; cards: CardGrade[] };
export type Grade = { id: string; titulo: string; colunas: 4 | 6; abas: Aba[] };

const card = (rotulo: string, href: string, tom: TomMidia, icone: NomeIcone): CardGrade => ({ rotulo, href, midia: { tom, icone } });

// 3. Novidades (4 cards).
export const NOVIDADES: Grade = {
  id: "novidades",
  titulo: "Recém-saídas da costura",
  colunas: 4,
  abas: [
    {
      rotulo: "Kit berço",
      cards: [
        card("Kits para menina", "/kit-berco/kits/menina", "rose", "flor"),
        card("Kits para menino", "/kit-berco/kits/menino", "azul", "nuvem"),
        card("Kits neutros", "/kit-berco/kits/neutro", "cru", "folha"),
        card("Protetores de berço", categoria("kit-berco/protetores", {}, "lancamentos"), "salviaClara", "novelo"),
      ],
    },
    {
      rotulo: "Enxoval",
      cards: [
        card("Fraldas de boca", categoria("enxoval/paninhos/fraldas-de-boca", {}, "lancamentos"), "branco", "agulha"),
        card("Cueiros", categoria("enxoval/paninhos/cueiros", {}, "lancamentos"), "verde", "folha"),
        card("Toalhas com capuz", categoria("enxoval/toalhas", {}, "lancamentos"), "azul", "nuvem"),
        card("Mantas e cobertores", categoria("enxoval/mantas", {}, "lancamentos"), "cru", "novelo"),
      ],
    },
    {
      rotulo: "Maternidade",
      cards: [
        card("Bolsas de maternidade", categoria("maternidade/bolsas", {}, "lancamentos"), "areia", "bolsa"),
        card("Saídas de maternidade", categoria("maternidade/saidas", {}, "lancamentos"), "rose", "coracao"),
        card("Enfeites de porta", categoria("maternidade/enfeites-de-porta", {}, "lancamentos"), "linho", "estrela"),
        card("Kits maternidade", categoria("maternidade/kits", {}, "lancamentos"), "salviaClara", "presente"),
      ],
    },
  ],
};

// 4. Compre por cor (6 cards).
const CORES: Array<[rotulo: string, slug: string, tom: TomMidia]> = [
  ["Rosê", "rose", "rose"],
  ["Azul bebê", "azul-bebe", "azul"],
  ["Verde-sálvia", "verde-salvia", "verde"],
  ["Cru", "cru", "cru"],
  ["Cinza", "cinza", "cinza"],
  ["Branco", "branco", "branco"],
];
const porCor = (chave: string): CardGrade[] =>
  CORES.map(([rotulo, slug, tom]) => card(rotulo, categoria(chave, { cor: [slug] }), tom, "novelo"));

export const POR_COR: Grade = {
  id: "por-cor",
  titulo: "Escolha pela cor",
  colunas: 6,
  abas: [
    { rotulo: "Kit berço", cards: porCor("kit-berco") },
    { rotulo: "Enxoval", cards: porCor("enxoval") },
    { rotulo: "Quarto", cards: porCor("quarto") },
  ],
};

// 7. Quarto de bebê (6 cards).
export const QUARTO: Grade = {
  id: "quarto",
  titulo: "Quarto de bebê",
  colunas: 6,
  abas: [
    {
      rotulo: "Por peça",
      cards: [
        card("Cortinas", "/quarto/cortinas", "linho", "pena"),
        card("Tapetes", "/quarto/tapetes", "cru", "novelo"),
        card("Almofadas e nichos", "/quarto/almofadas", "azul", "nuvem"),
        card("Mosquiteiros", "/quarto/mosquiteiros", "branco", "lua"),
        card("Kit mini cama", "/quarto/mini-cama", "verde", "berco"),
        card("Capas de trocador", "/quarto/trocador", "areia", "coracao"),
      ],
    },
    {
      rotulo: "Por tema",
      cards: [
        card("Floral", "/personalizado/floral", "rose", "flor"),
        card("Safári", "/personalizado/safari", "cru", "folha"),
        card("Nuvens e céu", "/personalizado/nuvens", "azul", "nuvem"),
        card("Clássico", "/personalizado/classico", "branco", "tulipa"),
        card("Para menina", "/personalizado/menina", "rose", "borboleta"),
        card("Para menino", "/personalizado/menino", "salviaClara", "lua"),
      ],
    },
  ],
};

// 11. Enxoval (6 cards).
export const ENXOVAL: Grade = {
  id: "enxoval",
  titulo: "Monte o enxoval",
  colunas: 6,
  abas: [
    {
      rotulo: "Enxoval",
      cards: [
        card("Fraldas de boca", "/enxoval/paninhos/fraldas-de-boca", "branco", "agulha"),
        card("Cueiros", "/enxoval/paninhos/cueiros", "verde", "folha"),
        card("Babadores", "/enxoval/paninhos/babadores", "rose", "coracao"),
        card("Toalhas com capuz", "/enxoval/toalhas", "azul", "nuvem"),
        card("Mantas e cobertores", "/enxoval/mantas", "cru", "novelo"),
        card("Kits de enxoval", "/enxoval/kits", "salviaClara", "presente"),
      ],
    },
    {
      rotulo: "Kit berço",
      cards: [
        card("Kits completos", "/kit-berco/kits", "salviaClara", "berco"),
        card("Protetores", "/kit-berco/protetores", "cru", "novelo"),
        card("Lençóis e fronhas", "/kit-berco/lencois", "branco", "pena"),
        card("Edredons e colchas", "/kit-berco/edredons", "rose", "nuvem"),
        card("Saias de berço", "/kit-berco/saias", "linho", "tulipa"),
        card("Travesseiros e rolinhos", "/kit-berco/travesseiros", "azul", "lua"),
      ],
    },
  ],
};

// Features em tela cheia (5, 8 e 10).
export type Feature = { id: string; titulo: string; acoes: Acao[]; midia: MidiaConteudo; centro?: boolean; atalho?: Acao };

export const FEATURE_PROJETOS: Feature = {
  id: "feature-projetos",
  titulo: "Quartinho personalizado: o ateliê planeja cada detalhe com você",
  acoes: [{ rotulo: "Conhecer os quartinhos", href: "/personalizado" }],
  // public/vitrine/home/features/projetos.mp4
  midia: { tom: "salvia", icone: "berco" },
};

export const FEATURE_MATERNIDADE: Feature = {
  id: "feature-maternidade",
  titulo: "Bolsa e saída de maternidade para o grande dia",
  acoes: [{ rotulo: "Ver maternidade", href: "/maternidade" }],
  atalho: { rotulo: "Ver as peças do look", href: "/maternidade/saidas" },
  // public/vitrine/home/features/maternidade.webp
  midia: { tom: "musgo", icone: "bolsa" },
};

export const FEATURE_BORDADO: Feature = {
  id: "feature-bordado",
  titulo: "Bordado com o nome do bebê, feito à mão",
  centro: true,
  acoes: [
    { rotulo: "Peças com bordado", href: montarUrlBusca("bordado") },
    { rotulo: "Combinar pelo WhatsApp", href: WHATSAPP, externo: true },
  ],
  // public/vitrine/home/features/bordado.mp4
  midia: { tom: "noite", icone: "agulha" },
};

// 6 e 9. Carrosséis de produtos.
export const CARROSSEL_MAIS_VENDIDOS = {
  id: "mais-vendidos",
  titulo: "As mais pedidas no ateliê",
  acao: { rotulo: "Ver mais vendidos", href: categoria("kit-berco", {}, "mais-vendidos") },
};

export const CARROSSEL_PRONTA_ENTREGA = {
  id: "pronta-entrega",
  titulo: "Sai do ateliê em até 2 dias úteis",
  acao: { rotulo: "Ver tudo", href: LINKS_UTILITARIOS.loja.href },
};

// 12. Instagram (antes do rodapé): posts reais pela API oficial (src/loja/lib/instagram). Sem token
// ou com a API fora do ar, só o convite para seguir. Scarlett: frase curta e SEM acento.
export const INSTAGRAM = {
  arroba: "@milenakerbageatelie",
  assinatura: "Cada detalhe, bem cuidado",
  texto: "Bastidores do ateliê, lançamentos e quartinhos montados por clientes.",
  acao: { rotulo: "Seguir no Instagram", href: REDES_SOCIAIS.instagram, externo: true },
};
