// CATÁLOGO DE EXEMPLO para as páginas de produto, categoria e busca: peças típicas do Ateliê Milena
// Kerbage (kit berço, enxoval, quarto de bebê e maternidade). NOMES, PREÇOS, tamanhos e fichas são
// FICTÍCIOS, só para o wireframe. Quando a API de catálogo existir (cadastro do ERP),
// buscarProduto() passa a chamar o backend (tag "produto:<sku>") e este arquivo sai.
// As páginas geradas daqui saem com noindex (ver produto/[slug]/page.tsx).

import { fichaTecnica, type GrupoFicha } from "./fichas";
import { type Foto, fotoPrincipal, type ImagemProduto, imagensDe } from "./fotos";

export type Opcao = { rotulo: string; disponivel: boolean };
// Irmão: a mesma peça em outra cor. Nome, preço, selo, caminho e fotos vêm preenchidos (ver o fim do
// arquivo) para os cards trocarem de cor sem sair da página.
export type Irmao = {
  rotulo: string;
  slug: string;
  foto?: Foto;
  nome?: string;
  preco?: string;
  selo?: string;
  caminho?: string;
  imagens?: ImagemProduto[];
};

export type Produto = {
  slug: string;
  sku: string;
  nome: string;
  marca: string;
  trilha: Array<{ rotulo: string; href: string }>; // breadcrumb a partir da categoria
  caminho: string; // categoria mais funda (ex.: /kit-berco/kits): define em quais listagens aparece
  atributos: Record<string, string[]>; // facetas com rótulo legível ({ para: ["Menina"], cor: ["Rosê"] })
  resumo: string;
  imagens?: ImagemProduto[]; // principal primeiro; sem fotos, as páginas mostram o bloco de espera
  selo?: string;
  preco: string; // decimal em string, como a API manda
  unidade: string; // "peça", "kit com 9 peças", "par"…
  pecas?: string[]; // o que vem no kit
  personalizacao?: string; // bordado com o nome do bebê, quando a peça aceita
  irmaos?: { titulo: string; atual: string; itens: Irmao[] }; // a mesma peça em outras cores
  variacao?: { titulo: string; guia?: { rotulo: string; href: string }; opcoes: Opcao[] }; // escolha obrigatória (tamanho do berço)
  descricao: string[];
  ficha: GrupoFicha[]; // agrupada: identificação, tecido, medidas, prazo, cuidados, venda
  documentos: Array<{ rotulo: string; href: string }>;
  avaliacoes: { nota: number; total: number } | null;
  complementos: string[]; // "Complete o enxoval"
  semelhantes: string[]; // "Você também poderá gostar"
};

// Preço à vista no Pix e parcelamento: no real quem calcula é o backend; aqui, só para o exemplo.
export const DESCONTO_PIX_PERCENTUAL = 5;
const PARCELA_MINIMA_CENTAVOS = 2000;
const MAX_PARCELAS = 10;

// Decimal em string ("1490.00") ↔ centavos, sem passar por ponto flutuante.
function paraCentavos(valor: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(valor)) throw new Error(`valor monetário inválido: ${valor}`);
  const [inteiro, fracao = ""] = valor.split(".");
  return Number(inteiro) * 100 + Number(fracao.padEnd(2, "0"));
}

function deCentavos(centavos: number): string {
  return `${Math.floor(centavos / 100)}.${String(centavos % 100).padStart(2, "0")}`;
}

export function condicoesDePagamento(preco: string): { pix: string; parcelas: number; valorParcela: string } | null {
  const centavos = paraCentavos(preco);
  const pix = deCentavos(Math.round((centavos * (100 - DESCONTO_PIX_PERCENTUAL)) / 100));
  const parcelas = Math.min(MAX_PARCELAS, Math.floor(centavos / PARCELA_MINIMA_CENTAVOS));
  if (parcelas < 2) return { pix, parcelas: 1, valorParcela: preco };
  return { pix, parcelas, valorParcela: deCentavos(Math.ceil(centavos / parcelas)) };
}

// Disponibilidade (faceta "entrega"): pronta entrega sai em até 2 dias úteis; o resto é feito no ateliê.
export const PRONTA_ENTREGA = "Pronta entrega";
export const SOB_ENCOMENDA = "Sob encomenda";
export const BORDADO_NOME = "Bordado com nome";

const GUIA_BERCO = { rotulo: "Qual é o tamanho do meu berço?", href: "/ajuda/guia-de-medidas" };

const TAMANHOS_BERCO = {
  titulo: "Tamanho do berço",
  guia: GUIA_BERCO,
  opcoes: [
    { rotulo: "Berço americano · 70 × 130 cm", disponivel: true },
    { rotulo: "Berço padrão · 60 × 130 cm", disponivel: true },
    { rotulo: "Mini berço · 50 × 90 cm", disponivel: false },
  ],
};
const TAMANHOS_BERCO_ATRIBUTO = ["Berço americano", "Berço padrão"];

const ROTULOS_CAMINHO: Record<string, string> = {
  "kit-berco": "Kit berço",
  kits: "Kits completos",
  protetores: "Protetores de berço",
  lencois: "Lençóis e fronhas",
  edredons: "Edredons e colchas",
  saias: "Saias de berço",
  travesseiros: "Travesseiros e rolinhos",
  enxoval: "Enxoval",
  paninhos: "Paninhos",
  "fraldas-de-boca": "Fraldas de boca",
  cueiros: "Cueiros",
  babadores: "Babadores",
  toalhas: "Toalhas com capuz",
  mantas: "Mantas e cobertores",
  quarto: "Quarto de bebê",
  cortinas: "Cortinas",
  tapetes: "Tapetes",
  almofadas: "Almofadas e nichos",
  mosquiteiros: "Mosquiteiros",
  "mini-cama": "Kit mini cama",
  trocador: "Capas de trocador",
  maternidade: "Maternidade",
  bolsas: "Bolsas de maternidade",
  saidas: "Saídas de maternidade",
  "enfeites-de-porta": "Enfeites de porta",
};

// Rótulo de "kits" muda conforme a categoria-mãe (kits de berço, de enxoval, de maternidade).
function rotuloDe(partes: string[], indice: number): string {
  const parte = partes[indice];
  if (parte === "kits" && partes[0] === "enxoval") return "Kits de enxoval";
  if (parte === "kits" && partes[0] === "maternidade") return "Kits maternidade";
  return ROTULOS_CAMINHO[parte] ?? parte;
}

// Trilha do breadcrumb a partir do caminho.
function trilhaDe(caminho: string): Produto["trilha"] {
  const partes = caminho.split("/").filter(Boolean);
  return partes.map((_, indice) => ({ rotulo: rotuloDe(partes, indice), href: `/${partes.slice(0, indice + 1).join("/")}` }));
}

type Base = Pick<Produto, "slug" | "nome" | "caminho" | "resumo" | "preco" | "unidade"> &
  Partial<Omit<Produto, "atributos">> & { atributos: Record<string, string[]> };

// Linhas de produto com a mesma peça em várias cores (os "irmãos").
function irmaos(titulo: string, itens: Array<[rotulo: string, slug: string]>) {
  return {
    titulo,
    itens: itens.map(([rotulo, slug]) => ({ rotulo, slug, foto: fotoPrincipal({ imagens: imagensDe(slug) }) })),
  };
}

const JARDIM = irmaos("Cor", [
  ["Rosê", "kit-berco-jardim-rose"],
  ["Verde-sálvia", "kit-berco-jardim-verde-salvia"],
]);
const NUVEM = irmaos("Cor", [
  ["Azul bebê", "kit-berco-nuvem-azul-bebe"],
  ["Cinza", "kit-berco-nuvem-cinza"],
  ["Cru", "kit-berco-nuvem-cru"],
]);
const SAIDAS = irmaos("Cor", [
  ["Rosê", "saida-de-maternidade-trico-rose"],
  ["Azul bebê", "saida-de-maternidade-trico-azul-bebe"],
  ["Cru", "saida-de-maternidade-trico-cru"],
]);

const PECAS_KIT_9 = [
  "Protetor de berço em 4 partes",
  "Edredom dupla face",
  "Saia de berço",
  "Jogo de lençol com 3 peças (lençol com elástico, lençol de cima e fronha)",
  "Travesseiro",
];

const MIX_BERCO = [
  "jogo-de-lencol-percal-200-fios",
  "manta-de-trico-trancada",
  "cortina-de-linho-e-voal",
  "almofada-de-amamentacao",
];
const MIX_ENXOVAL = [
  "fraldas-de-boca-bordadas-kit-com-3",
  "toalha-com-capuz-bordada",
  "cueiro-de-malha-estampado",
  "manta-de-trico-trancada",
];
const MIX_MATERNIDADE = [
  "saida-de-maternidade-trico-cru",
  "enfeite-de-porta-bordado",
  "bolsa-maternidade-classica-de-linho",
  "fraldas-de-boca-bordadas-kit-com-3",
];
const MIX_QUARTO = ["tapete-redondo-de-croche", "cortina-de-linho-e-voal", "almofada-nuvem", "mosquiteiro-de-teto-com-dossel"];

function kitJardim(cor: "Rosê" | "Verde-sálvia", slug: string, para: string, pronta: boolean): Base {
  return {
    slug,
    nome: `Kit berço Jardim ${cor.toLowerCase()} 9 peças`,
    caminho: "/kit-berco/kits",
    resumo: `Kit berço floral em percal 200 fios ${cor === "Rosê" ? "rosê" : "verde-sálvia"}, com bordado de florzinhas à mão no protetor.`,
    preco: "1490.00",
    unidade: "kit com 9 peças",
    pecas: PECAS_KIT_9,
    personalizacao: "Bordado do nome do bebê no protetor, incluso",
    atributos: {
      para: [para],
      cor: [cor],
      tamanho: TAMANHOS_BERCO_ATRIBUTO,
      tecido: ["Percal 200 fios"],
      estilo: ["Floral"],
      tema: ["Jardim"],
      entrega: [pronta ? PRONTA_ENTREGA : SOB_ENCOMENDA],
      personalizacao: [BORDADO_NOME],
    },
    irmaos: { ...JARDIM, atual: slug },
    variacao: TAMANHOS_BERCO,
    complementos: MIX_BERCO,
    selo: cor === "Rosê" ? "Mais vendido" : undefined,
  };
}

function kitNuvem(cor: "Azul bebê" | "Cinza" | "Cru", slug: string, para: string, pronta: boolean): Base {
  return {
    slug,
    nome: `Kit berço Nuvem ${cor.toLowerCase()} 9 peças`,
    caminho: "/kit-berco/kits",
    resumo: "Kit berço em tricoline 100% algodão com aplicação de nuvens em matelassê, leve e fácil de lavar.",
    preco: "1290.00",
    unidade: "kit com 9 peças",
    pecas: PECAS_KIT_9,
    atributos: {
      para: [para],
      cor: [cor],
      tamanho: TAMANHOS_BERCO_ATRIBUTO,
      tecido: ["Tricoline"],
      estilo: ["Aplicação"],
      tema: ["Nuvens"],
      entrega: [pronta ? PRONTA_ENTREGA : SOB_ENCOMENDA],
    },
    irmaos: { ...NUVEM, atual: slug },
    variacao: TAMANHOS_BERCO,
    complementos: MIX_BERCO,
    selo: pronta ? PRONTA_ENTREGA : undefined,
  };
}

function saida(cor: "Rosê" | "Azul bebê" | "Cru", slug: string, para: string): Base {
  return {
    slug,
    nome: `Saída de maternidade de tricô ${cor.toLowerCase()} 4 peças`,
    caminho: "/maternidade/saidas",
    resumo: "Casaquinho, macacão, touca e manta de tricô 100% algodão para o primeiro dia em casa.",
    preco: "289.00",
    unidade: "conjunto com 4 peças",
    pecas: ["Casaquinho", "Macacão com pezinho", "Touca", "Manta 80 × 80 cm"],
    atributos: {
      para: [para],
      cor: [cor],
      tamanho: ["RN", "P"],
      tecido: ["Tricô"],
      estilo: ["Tricô"],
      entrega: [PRONTA_ENTREGA],
    },
    irmaos: { ...SAIDAS, atual: slug },
    variacao: {
      titulo: "Tamanho",
      guia: { rotulo: "Guia de tamanhos", href: "/ajuda/guia-de-medidas" },
      opcoes: [
        { rotulo: "RN · até 3,5 kg", disponivel: true },
        { rotulo: "P · até 3 meses", disponivel: cor !== "Azul bebê" },
      ],
    },
    complementos: MIX_MATERNIDADE.filter((outro) => !outro.startsWith("saida")),
    selo: PRONTA_ENTREGA,
  };
}

const BASES: Base[] = [
  // Kit berço: kits completos
  kitJardim("Rosê", "kit-berco-jardim-rose", "Menina", true),
  kitJardim("Verde-sálvia", "kit-berco-jardim-verde-salvia", "Neutro", false),
  kitNuvem("Azul bebê", "kit-berco-nuvem-azul-bebe", "Menino", true),
  kitNuvem("Cinza", "kit-berco-nuvem-cinza", "Neutro", false),
  kitNuvem("Cru", "kit-berco-nuvem-cru", "Neutro", true),
  {
    slug: "kit-berco-safari-de-linho-11-pecas",
    nome: "Kit berço Safári de linho 11 peças",
    caminho: "/kit-berco/kits",
    resumo: "Linho com algodão em tom areia, com bichinhos do safári bordados à mão. Feito sob encomenda no ateliê.",
    preco: "1890.00",
    unidade: "kit com 11 peças",
    pecas: [...PECAS_KIT_9, "Rolinho segura-bebê (par)", "Almofada decorativa"],
    personalizacao: "Bordado do nome do bebê no protetor, incluso",
    atributos: {
      para: ["Menino"],
      cor: ["Cru"],
      tamanho: TAMANHOS_BERCO_ATRIBUTO,
      tecido: ["Linho"],
      estilo: ["Bordado"],
      tema: ["Safári"],
      entrega: [SOB_ENCOMENDA],
      personalizacao: [BORDADO_NOME],
    },
    variacao: TAMANHOS_BERCO,
    complementos: MIX_BERCO,
    selo: "Novidade",
  },
  {
    slug: "kit-berco-laco-branco-7-pecas",
    nome: "Kit berço Laço branco 7 peças",
    caminho: "/kit-berco/kits",
    resumo: "Piquet branco com laços de cetim no protetor: clássico, delicado e fácil de combinar.",
    preco: "990.00",
    unidade: "kit com 7 peças",
    pecas: ["Protetor de berço em 4 partes", "Colcha", "Jogo de lençol com 2 peças (lençol com elástico e fronha)"],
    atributos: {
      para: ["Menina"],
      cor: ["Branco"],
      tamanho: TAMANHOS_BERCO_ATRIBUTO,
      tecido: ["Piquet"],
      estilo: ["Clássico"],
      tema: ["Clássico"],
      entrega: [PRONTA_ENTREGA],
    },
    variacao: TAMANHOS_BERCO,
    complementos: MIX_BERCO,
    selo: PRONTA_ENTREGA,
  },
  {
    slug: "kit-berco-trico-cru-5-pecas",
    nome: "Kit berço Tricô cru 5 peças",
    caminho: "/kit-berco/kits",
    resumo: "Protetor trançado de tricô com lençóis de percal: aconchego neutro, que combina com qualquer quarto.",
    preco: "690.00",
    unidade: "kit com 5 peças",
    pecas: ["Protetor trançado (rolo único)", "Jogo de lençol com 3 peças", "Manta de tricô"],
    atributos: {
      para: ["Neutro"],
      cor: ["Cru"],
      tamanho: TAMANHOS_BERCO_ATRIBUTO,
      tecido: ["Tricô"],
      estilo: ["Trançado"],
      entrega: [PRONTA_ENTREGA],
    },
    variacao: TAMANHOS_BERCO,
    complementos: MIX_BERCO,
    selo: PRONTA_ENTREGA,
  },

  // Kit berço: peças avulsas
  {
    slug: "protetor-de-berco-trancado",
    nome: "Protetor de berço trançado",
    caminho: "/kit-berco/protetores",
    resumo: "Rolo trançado em malha 100% algodão com enchimento de fibra siliconada, para contornar o berço.",
    preco: "390.00",
    unidade: "peça",
    atributos: { cor: ["Cru", "Rosê", "Verde-sálvia"], tamanho: TAMANHOS_BERCO_ATRIBUTO, tecido: ["Malha"], estilo: ["Trançado"], entrega: [SOB_ENCOMENDA] },
    variacao: TAMANHOS_BERCO,
    complementos: MIX_BERCO,
    selo: "Mais vendido",
  },
  {
    slug: "protetor-de-berco-bordado-com-nome",
    nome: "Protetor de berço bordado com nome",
    caminho: "/kit-berco/protetores",
    resumo: "Protetor em 4 partes de percal 200 fios, com o nome do bebê bordado na peça da cabeceira.",
    preco: "349.00",
    unidade: "jogo com 4 partes",
    personalizacao: "Bordado do nome do bebê, incluso",
    atributos: {
      cor: ["Branco"],
      tamanho: TAMANHOS_BERCO_ATRIBUTO,
      tecido: ["Percal 200 fios"],
      estilo: ["Bordado"],
      entrega: [SOB_ENCOMENDA],
      personalizacao: [BORDADO_NOME],
    },
    variacao: TAMANHOS_BERCO,
    complementos: MIX_BERCO,
  },
  {
    slug: "jogo-de-lencol-percal-200-fios",
    nome: "Jogo de lençol de berço percal 200 fios 3 peças",
    caminho: "/kit-berco/lencois",
    resumo: "Lençol com elástico, lençol de cima e fronha em percal 200 fios 100% algodão, com barra de vivo.",
    preco: "189.00",
    unidade: "jogo com 3 peças",
    pecas: ["Lençol com elástico", "Lençol de cima", "Fronha"],
    atributos: { cor: ["Branco", "Cru"], tamanho: TAMANHOS_BERCO_ATRIBUTO, tecido: ["Percal 200 fios"], estilo: ["Liso"], entrega: [PRONTA_ENTREGA] },
    variacao: TAMANHOS_BERCO,
    complementos: ["protetor-de-berco-trancado", "edredom-de-berco-matelasse", "saia-de-berco-lese"],
    selo: PRONTA_ENTREGA,
  },
  {
    slug: "edredom-de-berco-matelasse",
    nome: "Edredom de berço matelassê dupla face",
    caminho: "/kit-berco/edredons",
    resumo: "Tricoline matelassê de um lado e liso do outro, com enchimento leve de fibra siliconada.",
    preco: "329.00",
    unidade: "peça",
    atributos: { cor: ["Verde-sálvia", "Rosê", "Azul bebê"], tamanho: TAMANHOS_BERCO_ATRIBUTO, tecido: ["Tricoline"], estilo: ["Matelassê"], entrega: [SOB_ENCOMENDA] },
    variacao: TAMANHOS_BERCO,
    complementos: ["jogo-de-lencol-percal-200-fios", "saia-de-berco-lese", "protetor-de-berco-trancado"],
  },
  {
    slug: "saia-de-berco-lese",
    nome: "Saia de berço de lesê",
    caminho: "/kit-berco/saias",
    resumo: "Saia franzida de lesê de algodão branco, presa no estrado com velcro.",
    preco: "249.00",
    unidade: "peça",
    atributos: { cor: ["Branco"], tamanho: TAMANHOS_BERCO_ATRIBUTO, tecido: ["Lesê"], estilo: ["Clássico"], entrega: [PRONTA_ENTREGA] },
    variacao: TAMANHOS_BERCO,
    complementos: ["jogo-de-lencol-percal-200-fios", "edredom-de-berco-matelasse"],
    selo: PRONTA_ENTREGA,
  },
  {
    slug: "almofada-de-amamentacao",
    nome: "Almofada de amamentação",
    caminho: "/kit-berco/travesseiros",
    resumo: "Almofada em meia-lua com capa removível de tricoline, que apoia o bebê e as costas na hora de mamar.",
    preco: "219.00",
    unidade: "peça",
    personalizacao: "Bordado do nome do bebê na capa, opcional sem custo",
    atributos: { cor: ["Cru", "Verde-sálvia"], tecido: ["Tricoline"], estilo: ["Liso"], entrega: [PRONTA_ENTREGA], personalizacao: [BORDADO_NOME] },
    complementos: ["manta-de-trico-trancada", "fraldas-de-boca-bordadas-kit-com-3"],
    selo: PRONTA_ENTREGA,
  },
  {
    slug: "rolinhos-decorativos-par",
    nome: "Rolinhos decorativos de berço (par)",
    caminho: "/kit-berco/travesseiros",
    resumo: "Par de rolinhos de percal com laço nas pontas, para compor o berço na decoração.",
    preco: "129.00",
    unidade: "par",
    atributos: { cor: ["Rosê", "Azul bebê", "Cru"], tecido: ["Percal 200 fios"], estilo: ["Clássico"], entrega: [SOB_ENCOMENDA] },
    complementos: MIX_BERCO,
  },

  // Enxoval
  {
    slug: "fraldas-de-boca-bordadas-kit-com-3",
    nome: "Fraldas de boca bordadas (kit com 3)",
    caminho: "/enxoval/paninhos/fraldas-de-boca",
    resumo: "Fraldinhas de boca de fralda dupla com barrado de tricoline e a inicial do bebê bordada.",
    preco: "119.00",
    unidade: "kit com 3 peças",
    personalizacao: "Bordado da inicial ou do nome do bebê, incluso",
    atributos: { cor: ["Branco", "Rosê", "Azul bebê"], tecido: ["Fralda de algodão"], estilo: ["Bordado"], entrega: [PRONTA_ENTREGA], personalizacao: [BORDADO_NOME] },
    complementos: MIX_ENXOVAL.filter((outro) => !outro.startsWith("fraldas")),
    selo: "Mais vendido",
  },
  {
    slug: "cueiro-de-malha-estampado",
    nome: "Cueiro de malha estampado",
    caminho: "/enxoval/paninhos/cueiros",
    resumo: "Cueiro macio de malha 100% algodão, com estampa de ramos em verde-sálvia, para enrolar e acalmar.",
    preco: "99.00",
    unidade: "peça",
    atributos: { cor: ["Verde-sálvia"], tecido: ["Malha"], estilo: ["Floral"], entrega: [PRONTA_ENTREGA] },
    complementos: MIX_ENXOVAL.filter((outro) => !outro.startsWith("cueiro")),
    selo: PRONTA_ENTREGA,
  },
  {
    slug: "babador-bandana-kit-com-2",
    nome: "Babador bandana (kit com 2)",
    caminho: "/enxoval/paninhos/babadores",
    resumo: "Babadores bandana de malha com forro atoalhado e botão de pressão regulável.",
    preco: "79.00",
    unidade: "kit com 2 peças",
    atributos: { cor: ["Cru", "Cinza"], tecido: ["Malha"], estilo: ["Liso"], entrega: [PRONTA_ENTREGA] },
    complementos: MIX_ENXOVAL,
    selo: PRONTA_ENTREGA,
  },
  {
    slug: "toalha-com-capuz-bordada",
    nome: "Toalha de banho com capuz bordada",
    caminho: "/enxoval/toalhas",
    resumo: "Toalha felpuda 100% algodão com capuz de tricoline e o nome do bebê bordado.",
    preco: "159.00",
    unidade: "peça",
    personalizacao: "Bordado do nome do bebê no capuz, incluso",
    atributos: { cor: ["Branco", "Rosê", "Azul bebê"], tecido: ["Atoalhado"], estilo: ["Bordado"], entrega: [SOB_ENCOMENDA], personalizacao: [BORDADO_NOME] },
    complementos: MIX_ENXOVAL.filter((outro) => !outro.startsWith("toalha")),
  },
  {
    slug: "manta-de-trico-trancada",
    nome: "Manta de tricô trançada",
    caminho: "/enxoval/mantas",
    resumo: "Manta de tricô 100% algodão com trança no centro, para o carrinho, o colo e o berço.",
    preco: "269.00",
    unidade: "peça",
    atributos: { cor: ["Cru", "Verde-sálvia", "Rosê"], tecido: ["Tricô"], estilo: ["Trançado"], entrega: [PRONTA_ENTREGA] },
    complementos: ["kit-berco-trico-cru-5-pecas", "saida-de-maternidade-trico-cru", "almofada-de-amamentacao"],
    selo: "Mais vendido",
  },
  {
    slug: "kit-enxoval-primeiros-dias-12-pecas",
    nome: "Kit enxoval primeiros dias 12 peças",
    caminho: "/enxoval/kits",
    resumo: "O básico do primeiro mês num só kit: paninhos, cueiros, toalha com capuz e manta.",
    preco: "590.00",
    unidade: "kit com 12 peças",
    pecas: ["6 fraldas de boca", "2 cueiros de malha", "2 babadores", "Toalha com capuz", "Manta de malha"],
    personalizacao: "Bordado do nome do bebê na toalha e nas fraldas, incluso",
    atributos: { para: ["Neutro"], cor: ["Branco", "Cru"], tecido: ["Malha"], estilo: ["Bordado"], entrega: [SOB_ENCOMENDA], personalizacao: [BORDADO_NOME] },
    complementos: ["manta-de-trico-trancada", "bolsa-maternidade-classica-de-linho", "kit-berco-nuvem-cru"],
    selo: "Novidade",
  },

  // Quarto de bebê
  {
    slug: "cortina-de-linho-e-voal",
    nome: "Cortina de linho e voal 2 folhas",
    caminho: "/quarto/cortinas",
    resumo: "Linho com forro de blackout e voal por cima: claridade suave de dia e escuro na hora da soneca.",
    preco: "690.00",
    unidade: "par de folhas",
    atributos: { cor: ["Cru", "Branco"], tecido: ["Linho"], estilo: ["Liso"], entrega: [SOB_ENCOMENDA] },
    variacao: {
      titulo: "Largura",
      guia: { rotulo: "Como medir a janela", href: "/ajuda/guia-de-medidas" },
      opcoes: [
        { rotulo: "2,00 × 2,50 m", disponivel: true },
        { rotulo: "3,00 × 2,50 m", disponivel: true },
      ],
    },
    complementos: MIX_QUARTO.filter((outro) => !outro.startsWith("cortina")),
  },
  {
    slug: "tapete-redondo-de-croche",
    nome: "Tapete redondo de crochê",
    caminho: "/quarto/tapetes",
    resumo: "Tapete feito à mão em fio de algodão cru, macio para os primeiros engatinhados.",
    preco: "490.00",
    unidade: "peça",
    atributos: { cor: ["Cru"], tecido: ["Crochê"], estilo: ["Artesanal"], entrega: [SOB_ENCOMENDA] },
    variacao: {
      titulo: "Diâmetro",
      opcoes: [
        { rotulo: "1,00 m", disponivel: true },
        { rotulo: "1,40 m", disponivel: true },
      ],
    },
    complementos: MIX_QUARTO.filter((outro) => !outro.startsWith("tapete")),
    selo: "Novidade",
  },
  {
    slug: "almofada-nuvem",
    nome: "Almofada nuvem",
    caminho: "/quarto/almofadas",
    resumo: "Almofada decorativa em formato de nuvem, de tricoline com vivo e enchimento de fibra siliconada.",
    preco: "129.00",
    unidade: "peça",
    personalizacao: "Bordado do nome do bebê, opcional sem custo",
    atributos: { cor: ["Branco", "Azul bebê", "Cinza"], tecido: ["Tricoline"], estilo: ["Aplicação"], tema: ["Nuvens"], entrega: [PRONTA_ENTREGA], personalizacao: [BORDADO_NOME] },
    complementos: MIX_QUARTO.filter((outro) => !outro.startsWith("almofada")),
    selo: PRONTA_ENTREGA,
  },
  {
    slug: "mosquiteiro-de-teto-com-dossel",
    nome: "Mosquiteiro de teto com dossel",
    caminho: "/quarto/mosquiteiros",
    resumo: "Dossel de voal com coroa de tecido, que protege o berço dos mosquitos e enfeita o quarto.",
    preco: "349.00",
    unidade: "peça",
    atributos: { cor: ["Branco"], tecido: ["Voal"], estilo: ["Clássico"], entrega: [PRONTA_ENTREGA] },
    complementos: MIX_QUARTO.filter((outro) => !outro.startsWith("mosquiteiro")),
    selo: PRONTA_ENTREGA,
  },
  {
    slug: "kit-mini-cama-montessoriana-4-pecas",
    nome: "Kit mini cama montessoriana 4 peças",
    caminho: "/quarto/mini-cama",
    resumo: "Protetor baixo, colcha e jogo de lençol para a mini cama no chão, no estilo montessoriano.",
    preco: "790.00",
    unidade: "kit com 4 peças",
    pecas: ["Protetor em 3 partes", "Colcha", "Lençol com elástico", "Fronha"],
    atributos: { para: ["Neutro"], cor: ["Verde-sálvia", "Cru"], tamanho: ["Mini cama"], tecido: ["Percal 200 fios"], estilo: ["Liso"], entrega: [SOB_ENCOMENDA] },
    variacao: {
      titulo: "Colchão",
      guia: GUIA_BERCO,
      opcoes: [
        { rotulo: "Mini cama · 70 × 150 cm", disponivel: true },
        { rotulo: "Solteiro · 88 × 188 cm", disponivel: true },
      ],
    },
    complementos: MIX_QUARTO,
  },
  {
    slug: "capa-de-trocador-matelasse",
    nome: "Capa de trocador matelassê",
    caminho: "/quarto/trocador",
    resumo: "Capa com elástico para trocador de 50 × 70 cm, em tricoline matelassê que vai direto à máquina.",
    preco: "149.00",
    unidade: "peça",
    atributos: { cor: ["Branco", "Verde-sálvia"], tecido: ["Tricoline"], estilo: ["Matelassê"], entrega: [PRONTA_ENTREGA] },
    complementos: ["fraldas-de-boca-bordadas-kit-com-3", "toalha-com-capuz-bordada"],
    selo: PRONTA_ENTREGA,
  },

  // Maternidade
  {
    slug: "bolsa-maternidade-classica-de-linho",
    nome: "Bolsa maternidade clássica de linho",
    caminho: "/maternidade/bolsas",
    resumo: "Bolsa grande de linho com forro impermeável, trocador embutido e o nome do bebê bordado.",
    preco: "690.00",
    unidade: "peça",
    personalizacao: "Bordado do nome do bebê, incluso",
    atributos: { cor: ["Cru", "Verde-sálvia"], tecido: ["Linho"], estilo: ["Bordado"], entrega: [SOB_ENCOMENDA], personalizacao: [BORDADO_NOME] },
    complementos: MIX_MATERNIDADE.filter((outro) => !outro.startsWith("bolsa")),
    selo: "Mais vendido",
  },
  {
    slug: "kit-bolsa-maternidade-3-pecas",
    nome: "Kit bolsa maternidade 3 peças",
    caminho: "/maternidade/bolsas",
    resumo: "Bolsa grande, frasqueira térmica e necessaire, no mesmo tecido, para a mala da maternidade.",
    preco: "890.00",
    unidade: "kit com 3 peças",
    pecas: ["Bolsa grande", "Frasqueira térmica", "Necessaire"],
    personalizacao: "Bordado do nome do bebê na bolsa, incluso",
    atributos: { cor: ["Rosê", "Azul bebê", "Cru"], tecido: ["Matelassê"], estilo: ["Bordado"], entrega: [SOB_ENCOMENDA], personalizacao: [BORDADO_NOME] },
    complementos: MIX_MATERNIDADE.filter((outro) => !outro.startsWith("bolsa")),
  },
  saida("Rosê", "saida-de-maternidade-trico-rose", "Menina"),
  saida("Azul bebê", "saida-de-maternidade-trico-azul-bebe", "Menino"),
  saida("Cru", "saida-de-maternidade-trico-cru", "Neutro"),
  {
    slug: "enfeite-de-porta-bordado",
    nome: "Enfeite de porta de maternidade bordado",
    caminho: "/maternidade/enfeites-de-porta",
    resumo: "Bastidor com o nome do bebê bordado à mão e flores secas, para a porta do quarto da maternidade.",
    preco: "229.00",
    unidade: "peça",
    personalizacao: "Nome do bebê bordado à mão, incluso",
    atributos: { cor: ["Cru"], tecido: ["Linho"], estilo: ["Bordado"], entrega: [SOB_ENCOMENDA], personalizacao: [BORDADO_NOME] },
    complementos: MIX_MATERNIDADE.filter((outro) => !outro.startsWith("enfeite")),
  },
  {
    slug: "kit-maternidade-chegada",
    nome: "Kit maternidade Chegada",
    caminho: "/maternidade/kits",
    resumo: "Saída de tricô, manta e enfeite de porta combinando, para o primeiro encontro com o bebê.",
    preco: "790.00",
    unidade: "kit com 3 itens",
    pecas: ["Saída de maternidade de tricô (4 peças)", "Manta de tricô", "Enfeite de porta bordado"],
    personalizacao: "Nome do bebê no enfeite de porta, incluso",
    atributos: { para: ["Neutro"], cor: ["Cru"], tecido: ["Tricô"], estilo: ["Bordado"], entrega: [SOB_ENCOMENDA], personalizacao: [BORDADO_NOME] },
    complementos: ["bolsa-maternidade-classica-de-linho", "fraldas-de-boca-bordadas-kit-com-3"],
    selo: "Novidade",
  },
];

// Os 8 mais vendidos (home e carrinho vazio). PROVISÓRIO até haver o relatório de vendas.
export const MAIS_VENDIDOS_SLUGS = [
  "kit-berco-jardim-rose",
  "kit-berco-nuvem-azul-bebe",
  "protetor-de-berco-trancado",
  "fraldas-de-boca-bordadas-kit-com-3",
  "manta-de-trico-trancada",
  "bolsa-maternidade-classica-de-linho",
  "saida-de-maternidade-trico-cru",
  "jogo-de-lencol-percal-200-fios",
];

function completar(base: Base, indice: number): Produto {
  const sku = `MK-${String(1001 + indice)}`;
  const trilha = base.trilha ?? trilhaDe(base.caminho);
  const pronta = base.atributos.entrega?.includes(PRONTA_ENTREGA) ?? false;
  return {
    sku,
    descricao: [
      base.resumo,
      pronta
        ? "Peça de pronta entrega: sai do ateliê em até 2 dias úteis. Em Fortaleza, dá para retirar no ateliê sem custo."
        : "Peça feita sob encomenda no ateliê, em Fortaleza: a produção leva de 15 a 25 dias úteis, mais o prazo do frete.",
      base.personalizacao
        ? `${base.personalizacao}. Depois da compra, o ateliê confirma pelo WhatsApp o nome, a fonte e a cor da linha antes de bordar.`
        : "Quer combinar com o restante do quarto? Fale com o ateliê pelo WhatsApp: a gente ajuda a montar o enxoval completo.",
    ],
    ficha: fichaTecnica({
      nome: base.nome,
      marca: base.marca ?? "Milena Kerbage",
      sku,
      unidade: base.unidade,
      caminho: base.caminho,
      trilha,
      atributos: base.atributos,
      pecas: base.pecas,
      personalizacao: base.personalizacao,
      variacao: base.variacao,
    }),
    documentos: [],
    avaliacoes: null, // sem avaliação inventada: o bloco mostra o estado vazio
    complementos: [],
    semelhantes: [],
    imagens: imagensDe(base.slug),
    ...base,
    marca: base.marca ?? "Milena Kerbage",
    trilha,
    atributos: {
      ...base.atributos,
      // Pronta entrega dá para retirar no ateliê, em Fortaleza. [CONFIRMAR] com o ateliê.
      ...(pronta ? { retirada: ["Sim"] } : {}),
    },
  };
}

const PRODUTOS: Produto[] = BASES.map(completar).map((produto, _indice, todos) => ({
  ...produto,
  // Semelhantes: mesma categoria primeiro, depois o resto do catálogo (sem repetir o mix).
  semelhantes: [
    ...todos.filter((outro) => outro.slug !== produto.slug && outro.caminho === produto.caminho),
    ...todos.filter((outro) => outro.slug !== produto.slug && outro.caminho !== produto.caminho),
  ]
    .map((outro) => outro.slug)
    .filter((slug) => !produto.complementos.includes(slug))
    .slice(0, 8),
}));

const POR_SLUG = new Map(PRODUTOS.map((produto) => [produto.slug, produto]));

// Irmãos com o que o card precisa para trocar de cor sem sair da página (nome, preço, selo e fotos).
for (const produto of PRODUTOS) {
  if (!produto.irmaos) continue;
  produto.irmaos = {
    ...produto.irmaos,
    itens: produto.irmaos.itens.map((irmao) => {
      const outro = POR_SLUG.get(irmao.slug);
      return outro ? { ...irmao, nome: outro.nome, preco: outro.preco, selo: outro.selo, caminho: outro.caminho, imagens: outro.imagens } : irmao;
    }),
  };
}

export function listarProdutos(): Produto[] {
  return PRODUTOS;
}

export function listarSlugs(): string[] {
  return PRODUTOS.map((produto) => produto.slug);
}

export function buscarProduto(slug: string): Produto | null {
  return POR_SLUG.get(slug) ?? null;
}

export function buscarVarios(slugs: string[]): Produto[] {
  return slugs.map((slug) => POR_SLUG.get(slug)).filter((produto): produto is Produto => Boolean(produto));
}
