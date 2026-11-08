// Projetos: quartos de bebê completos planejados pelo Ateliê Milena Kerbage (o destaque "Projetos"
// do Instagram @milenakerbageatelie), no tema escolhido: kit berço, cortina, tapete, almofadas,
// enfeite de porta e, conforme o projeto, kit mini cama e enxoval de paninhos.
// PROVISÓRIO: nomes, textos e preços são de demonstração (preços FICTÍCIOS, ver AVISO_PRECOS).
// Quando houver API de catálogo, este arquivo passa a ser montado por ela.
// Fotos: ainda não há. A estrutura espera public/vitrine/projetos/<slug>/foto-1.webp, foto-2.webp…
// (campo "fotos" = quantas existem); com 0, as telas mostram o placeholder com o ícone de bebê.
// Sem imports locais de valor: roda no `node --test` (o import abaixo é só de tipo).

import type { ProjetoFiltravel } from "./filtragem";

export type Cor = { nome: string; hex: string };

export type Projeto = ProjetoFiltravel & {
  nome: string;
  tema: "menina" | "menino" | "neutro";
  estilo: "floral" | "safari" | "nuvens" | "classico";
  tecido: "linho" | "tricoline" | "percal";
  chamada?: string; // frase curta dos projetos em destaque
  descricao: string[]; // 1º parágrafo = resumo
  paleta: Cor[];
  pecas: string[]; // o que o projeto tem no pacote Completo, no tema
  opcionais: OpcionalId[]; // peças que podem entrar no pedido (kit mini cama, enxoval de paninhos)
  fotos: number; // public/vitrine/projetos/<slug>/foto-N.webp (0 = placeholder)
};

export type Foto = { src: string; alt: string };

export const AVISO_PRECOS =
  "Valores fictícios, apenas para demonstração. O valor final depende das medidas, dos tecidos e das peças escolhidas e é confirmado pela vendedora no WhatsApp.";

export const PRAZO_PRODUCAO = "20 a 35 dias úteis";
export const ENTREGA = "Entrega para todo o Brasil";

// Opcionais do projeto: entram na sacola junto com o pacote e somam ao "a partir de" (valores
// fictícios, como os preços). `produto`: a peça equivalente do catálogo (para o link).
export const OPCIONAIS = [
  {
    id: "kit-mini-cama",
    nome: "Kit mini cama no mesmo tema",
    curto: "Kit mini cama",
    apoio: "Protetor baixo, colcha e lençol para a mini cama montessoriana.",
    preco: 790,
    produto: "kit-mini-cama-montessoriana-4-pecas",
  },
  {
    id: "paninhos",
    nome: "Enxoval de paninhos (boca, ombro e fraldas de pano)",
    curto: "Paninhos",
    apoio: "Fraldas de boca, de ombro e de pano com o acabamento do quartinho.",
    preco: 290,
    produto: "fraldas-de-boca-bordadas-kit-com-3",
  },
] as const;

export type OpcionalId = (typeof OPCIONAIS)[number]["id"];
export type Opcional = (typeof OPCIONAIS)[number];

const KIT_MINI_CAMA: OpcionalId = "kit-mini-cama";
const PANINHOS: OpcionalId = "paninhos";

export function buscarOpcional(id: string): Opcional | undefined {
  return OPCIONAIS.find((opcional) => opcional.id === id);
}

// Ordem de "Em destaque".
const PROJETOS: Projeto[] = [
  {
    slug: "jardim-de-camomila",
    nome: "Quartinho Jardim de Camomila",
    tema: "menina",
    estilo: "floral",
    tecido: "linho",
    precoAPartirDe: 3900,
    prazoDiasUteis: 30,
    chamada: "Florzinhas bordadas à mão",
    descricao: [
      "Um quartinho claro e afetivo, com camomilas bordadas à mão sobre linho cru e detalhes em amarelo-manteiga.",
      "O kit berço tem protetor em gomos com vivo verde-sálvia, e a cortina leva barrado bordado com as mesmas flores do enfeite de porta.",
    ],
    paleta: [
      { nome: "Linho cru", hex: "#E9E1D3" },
      { nome: "Amarelo-manteiga", hex: "#F3E2A9" },
      { nome: "Verde-sálvia", hex: "#A3B18A" },
    ],
    pecas: [
      "Kit berço com protetor em gomos, saia, edredom e travesseiro",
      "Cortina de linho com barrado bordado",
      "Tapete redondo de algodão cru",
      "Almofadas em formato de flor",
      "Enfeite de porta com guirlanda de camomila",
    ],
    opcionais: [KIT_MINI_CAMA, PANINHOS],
    fotos: 0,
  },
  {
    slug: "nuvem-salvia",
    nome: "Quartinho Nuvem Sálvia",
    tema: "neutro",
    estilo: "nuvens",
    tecido: "tricoline",
    precoAPartirDe: 2900,
    prazoDiasUteis: 25,
    chamada: "Nuvens macias em verde-sálvia",
    descricao: [
      "Nuvens em matelassê, tons de sálvia e off-white: um quartinho neutro e sereno, que acompanha o bebê por muitos anos.",
      "Funciona com berço americano ou mini cama montessoriana, e as almofadas de nuvem viram companhia na hora da soneca.",
    ],
    paleta: [
      { nome: "Off-white", hex: "#F6F3EC" },
      { nome: "Verde-sálvia", hex: "#A3B18A" },
      { nome: "Cinza-névoa", hex: "#C9CCC4" },
    ],
    pecas: [
      "Kit berço com protetor matelassê de nuvens",
      "Cortina em tricoline com prega americana",
      "Tapete em formato de nuvem",
      "Almofadas de nuvem e de gota",
      "Enfeite de porta com nuvem e nome em feltro",
    ],
    opcionais: [KIT_MINI_CAMA, PANINHOS],
    fotos: 0,
  },
  {
    slug: "safari-areia",
    nome: "Quartinho Safári Areia",
    tema: "neutro",
    estilo: "safari",
    tecido: "linho",
    precoAPartirDe: 3400,
    prazoDiasUteis: 30,
    chamada: "Bichinhos em tons de areia",
    descricao: [
      "Leãozinho, girafa e elefante em apliques de linho, numa paleta de areia, caramelo e verde-oliva.",
      "Um safári delicado, sem excesso de cor, que combina com móveis claros ou de madeira natural.",
    ],
    paleta: [
      { nome: "Areia", hex: "#D8C7A8" },
      { nome: "Caramelo", hex: "#B9875A" },
      { nome: "Verde-oliva", hex: "#8A8F5C" },
    ],
    pecas: [
      "Kit berço com apliques de bichinhos",
      "Cortina de linho com bando",
      "Tapete de algodão com franjas",
      "Almofadas de leão, girafa e elefante",
      "Enfeite de porta com cabeça de leãozinho",
    ],
    opcionais: [KIT_MINI_CAMA, PANINHOS],
    fotos: 0,
  },
  {
    slug: "bosque-de-lavanda",
    nome: "Quartinho Bosque de Lavanda",
    tema: "menina",
    estilo: "floral",
    tecido: "percal",
    precoAPartirDe: 4600,
    prazoDiasUteis: 32,
    descricao: [
      "Raminhos de lavanda bordados em percal 200 fios, com babados suaves e laços de cetim lilás.",
      "Um quartinho romântico, pensado para quarto com papel de parede claro e luz difusa.",
    ],
    paleta: [
      { nome: "Lilás", hex: "#C8B6D8" },
      { nome: "Branco", hex: "#FBFAF7" },
      { nome: "Verde-folha", hex: "#9DAA8B" },
    ],
    pecas: [
      "Kit berço com babado duplo e bordado de lavanda",
      "Cortina em voal com barrado de percal",
      "Tapete oval em tons de lilás",
      "Almofadas com laço de cetim",
      "Enfeite de porta com buquê de lavanda",
    ],
    opcionais: [KIT_MINI_CAMA, PANINHOS],
    fotos: 0,
  },
  {
    slug: "ceu-de-algodao",
    nome: "Quartinho Céu de Algodão",
    tema: "menino",
    estilo: "nuvens",
    tecido: "percal",
    precoAPartirDe: 2400,
    prazoDiasUteis: 22,
    descricao: [
      "Azul-céu, branco e estrelinhas: um quartinho leve, com nuvens aplicadas e lua bordada no edredom.",
      "Um dos quartinhos com produção mais rápida, ótimo para quem já está perto da data.",
    ],
    paleta: [
      { nome: "Azul-céu", hex: "#BBD3E3" },
      { nome: "Branco", hex: "#FBFAF7" },
      { nome: "Amarelo-estrela", hex: "#F1D98B" },
    ],
    pecas: [
      "Kit berço com nuvens aplicadas e lua bordada",
      "Cortina blecaute com bando de nuvens",
      "Tapete redondo azul-céu",
      "Almofadas de lua, estrela e nuvem",
      "Enfeite de porta com lua e estrelas",
    ],
    opcionais: [PANINHOS],
    fotos: 0,
  },
  {
    slug: "leaozinho-terracota",
    nome: "Quartinho Leãozinho Terracota",
    tema: "menino",
    estilo: "safari",
    tecido: "tricoline",
    precoAPartirDe: 2700,
    prazoDiasUteis: 25,
    descricao: [
      "Um leãozinho de juba franjada é a estrela deste quartinho em terracota, mostarda e cru.",
      "Cores quentes e acolhedoras, com estampas pequenas que não cansam com o tempo.",
    ],
    paleta: [
      { nome: "Terracota", hex: "#C17A5A" },
      { nome: "Mostarda", hex: "#D6A84B" },
      { nome: "Cru", hex: "#EFE8DA" },
    ],
    pecas: [
      "Kit berço com estampa de folhagens",
      "Cortina em tricoline cru com faixa terracota",
      "Tapete de leãozinho",
      "Almofadas de leão e de folha",
      "Enfeite de porta com leãozinho de juba franjada",
    ],
    opcionais: [KIT_MINI_CAMA, PANINHOS],
    fotos: 0,
  },
  {
    slug: "heranca-azul",
    nome: "Quartinho Herança Azul",
    tema: "menino",
    estilo: "classico",
    tecido: "percal",
    precoAPartirDe: 5200,
    prazoDiasUteis: 33,
    chamada: "Clássico com bordado inglês",
    descricao: [
      "Azul-bebê, bordado inglês e acabamento em vivo: o quarto clássico de geração em geração.",
      "O edredom leva monograma bordado, e a cortina tem bando com pregas fêmeas.",
    ],
    paleta: [
      { nome: "Azul-bebê", hex: "#C9DBEA" },
      { nome: "Branco", hex: "#FBFAF7" },
      { nome: "Azul-marinho", hex: "#2F4058" },
    ],
    pecas: [
      "Kit berço com bordado inglês e vivo marinho",
      "Cortina com bando de pregas fêmeas",
      "Tapete retangular com borda contrastante",
      "Almofadas com monograma",
      "Enfeite de porta com coroa e laço",
    ],
    opcionais: [KIT_MINI_CAMA, PANINHOS],
    fotos: 0,
  },
  {
    slug: "rosa-antigo",
    nome: "Quartinho Rosa Antigo",
    tema: "menina",
    estilo: "classico",
    tecido: "linho",
    precoAPartirDe: 6800,
    prazoDiasUteis: 35,
    descricao: [
      "Linho rosa antigo, rendas e babados largos: um quartinho clássico, cheio de delicadeza.",
      "Inclui dossel de parede no mesmo tecido, que emoldura o berço e completa a cena.",
    ],
    paleta: [
      { nome: "Rosa antigo", hex: "#D9AFA8" },
      { nome: "Marfim", hex: "#F4EEE2" },
      { nome: "Dourado envelhecido", hex: "#B89B6A" },
    ],
    pecas: [
      "Kit berço com babados largos e renda",
      "Dossel de parede e cortina de linho",
      "Tapete oval com borda de renda",
      "Almofadas com babado e laço",
      "Enfeite de porta com guirlanda de rosas",
    ],
    opcionais: [KIT_MINI_CAMA, PANINHOS],
    fotos: 0,
  },
  {
    slug: "primavera-delicada",
    nome: "Quartinho Primavera Delicada",
    tema: "menina",
    estilo: "floral",
    tecido: "tricoline",
    precoAPartirDe: 1900,
    prazoDiasUteis: 20,
    descricao: [
      "Florzinhas miúdas em tricoline 100% algodão, com rosa-chá e verde-menta: o quartinho de entrada do ateliê.",
      "Leve, alegre e fácil de combinar, com produção no menor prazo.",
    ],
    paleta: [
      { nome: "Rosa-chá", hex: "#E8C4BC" },
      { nome: "Verde-menta", hex: "#BFD8C6" },
      { nome: "Branco", hex: "#FBFAF7" },
    ],
    pecas: [
      "Kit berço em tricoline floral",
      "Cortina com prega americana",
      "Tapete redondo rosa-chá",
      "Almofadas de flor",
      "Enfeite de porta com nome em feltro",
    ],
    opcionais: [PANINHOS],
    fotos: 0,
  },
  {
    slug: "lua-de-linho",
    nome: "Quartinho Lua de Linho",
    tema: "neutro",
    estilo: "nuvens",
    tecido: "linho",
    precoAPartirDe: 3600,
    prazoDiasUteis: 28,
    descricao: [
      "Lua crescente, estrelas e nuvens em linho natural, com bordado em fio dourado-claro.",
      "Um céu noturno em tons neutros, para dormir bem desde os primeiros dias.",
    ],
    paleta: [
      { nome: "Linho natural", hex: "#DCD2C0" },
      { nome: "Cinza-pedra", hex: "#A9A49A" },
      { nome: "Dourado-claro", hex: "#D8C08A" },
    ],
    pecas: [
      "Kit berço em linho com lua bordada",
      "Cortina blecaute revestida de linho",
      "Tapete redondo de algodão",
      "Almofadas de lua e estrela",
      "Enfeite de porta com lua crescente",
    ],
    opcionais: [KIT_MINI_CAMA, PANINHOS],
    fotos: 0,
  },
  {
    slug: "savana-oliva",
    nome: "Quartinho Savana Oliva",
    tema: "menino",
    estilo: "safari",
    tecido: "linho",
    precoAPartirDe: 4100,
    prazoDiasUteis: 30,
    descricao: [
      "Verde-oliva, caqui e folhagens tropicais bordadas: um safári sofisticado, com cara de expedição.",
      "Combina com móveis de madeira e cestos de fibra natural.",
    ],
    paleta: [
      { nome: "Verde-oliva", hex: "#7D8455" },
      { nome: "Caqui", hex: "#C9B48A" },
      { nome: "Cru", hex: "#EFE8DA" },
    ],
    pecas: [
      "Kit berço com folhagens bordadas",
      "Cortina de linho com bando reto",
      "Tapete de juta e algodão",
      "Almofadas de elefante e de folha",
      "Enfeite de porta com elefantinho",
    ],
    opcionais: [KIT_MINI_CAMA, PANINHOS],
    fotos: 0,
  },
  {
    slug: "provence-off-white",
    nome: "Quartinho Provence Off-White",
    tema: "neutro",
    estilo: "classico",
    tecido: "linho",
    precoAPartirDe: 7500,
    prazoDiasUteis: 35,
    chamada: "O mais completo do ateliê",
    descricao: [
      "Off-white do kit berço ao dossel, com pregas, vivos e bordado tom sobre tom: o quartinho mais completo do ateliê.",
      "Um clássico provençal que serve para menina ou menino e se adapta ao quarto que crescer junto com o bebê.",
    ],
    paleta: [
      { nome: "Off-white", hex: "#F6F3EC" },
      { nome: "Bege", hex: "#E3D8C6" },
      { nome: "Verde-sálvia", hex: "#A3B18A" },
    ],
    pecas: [
      "Kit berço com pregas e bordado tom sobre tom",
      "Dossel e cortina de linho",
      "Tapete retangular de algodão",
      "Almofadas com vivo e botões encapados",
      "Enfeite de porta com guirlanda e laço",
    ],
    opcionais: [KIT_MINI_CAMA, PANINHOS],
    fotos: 0,
  },
  {
    slug: "ramo-de-oliveira",
    nome: "Quartinho Ramo de Oliveira",
    tema: "neutro",
    estilo: "floral",
    tecido: "linho",
    precoAPartirDe: 3200,
    prazoDiasUteis: 28,
    descricao: [
      "Ramos de oliveira bordados em verde-sálvia sobre linho cru: botânico, neutro e atemporal.",
      "Um floral sem flor cor-de-rosa, para quem quer delicadeza sem definir o tema pelo gênero.",
    ],
    paleta: [
      { nome: "Linho cru", hex: "#E9E1D3" },
      { nome: "Verde-sálvia", hex: "#A3B18A" },
      { nome: "Verde-musgo", hex: "#6E7656" },
    ],
    pecas: [
      "Kit berço com ramos bordados",
      "Cortina de linho com barrado bordado",
      "Tapete redondo cru",
      "Almofadas de folha",
      "Enfeite de porta com guirlanda de oliveira",
    ],
    opcionais: [KIT_MINI_CAMA, PANINHOS],
    fotos: 0,
  },
];

const POR_SLUG = new Map(PROJETOS.map((projeto) => [projeto.slug, projeto]));

export function listarProjetos(): Projeto[] {
  return PROJETOS;
}

export function buscarProjeto(slug: string): Projeto | null {
  return POR_SLUG.get(slug) ?? null;
}

// Os projetos com "chamada" abrem as vitrines.
export function projetosEmDestaque(): Projeto[] {
  return PROJETOS.filter((projeto) => projeto.chamada);
}

export function caminhoFoto(slug: string, arquivo: string): string {
  return `/vitrine/projetos/${slug}/${arquivo}.webp`;
}

// Fotos publicadas do projeto (vazio enquanto não houver: as telas usam o placeholder).
export function fotosDoProjeto(projeto: Projeto): Foto[] {
  return Array.from({ length: projeto.fotos }, (_, i) => ({
    src: caminhoFoto(projeto.slug, `foto-${i + 1}`),
    alt: `${projeto.nome}: foto ${i + 1}`,
  }));
}

const MOEDA = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// "R$ 3.900" (espaço comum, para não quebrar comparação em texto e mensagens).
export function formatarPreco(valor: number): string {
  return MOEDA.format(valor).replace(/\s/g, " ");
}

export function rotuloTema(tema: Projeto["tema"]): string {
  return tema === "menina" ? "Para menina" : tema === "menino" ? "Para menino" : "Neutro";
}

const ESTILOS: Record<Projeto["estilo"], string> = { floral: "Floral", safari: "Safári", nuvens: "Nuvens e céu", classico: "Clássico" };
const TECIDOS: Record<Projeto["tecido"], string> = { linho: "Linho", tricoline: "Tricoline 100% algodão", percal: "Percal 200 fios" };

export function rotuloEstilo(estilo: Projeto["estilo"]): string {
  return ESTILOS[estilo];
}

export function rotuloTecido(tecido: Projeto["tecido"]): string {
  return TECIDOS[tecido];
}

export function prazoDoProjeto(projeto: Projeto): string {
  return `${projeto.prazoDiasUteis} dias úteis`;
}

// "Para menina · Floral" (selo do card).
export function resumoProjeto(projeto: Projeto): string {
  return `${rotuloTema(projeto.tema)} · ${rotuloEstilo(projeto.estilo)}`;
}

// Os 3 pacotes, iguais em todos os projetos. O acréscimo soma ao "a partir de" do projeto
// (valores fictícios, como os preços).
export const PACOTES = [
  {
    nome: "Essencial",
    frase: "Kit berço e cortina no tema.",
    acrescimo: 0,
    itens: ["Kit berço completo (protetor, saia, edredom, lençóis e travesseiro)", "Cortina no tema"],
  },
  {
    nome: "Completo",
    frase: "O quartinho inteiro, peça por peça.",
    acrescimo: 1200,
    itens: [
      "Kit berço completo (protetor, saia, edredom, lençóis e travesseiro)",
      "Cortina no tema",
      "Tapete",
      "Almofadas decorativas",
      "Enfeite de porta",
    ],
  },
  {
    nome: "Completo personalizado",
    frase: "Com o nome do bebê e peças exclusivas.",
    acrescimo: 2300,
    itens: [
      "Kit berço completo (protetor, saia, edredom, lençóis e travesseiro)",
      "Cortina no tema",
      "Tapete",
      "Almofadas decorativas",
      "Enfeite de porta",
      "Bordado do nome do bebê",
      "Peças exclusivas desenhadas para o seu quarto",
    ],
  },
] as const;

export type NomePacote = (typeof PACOTES)[number]["nome"];

export function precoDoPacote(projeto: Projeto, pacote: string): number {
  return projeto.precoAPartirDe + (PACOTES.find((item) => item.nome === pacote)?.acrescimo ?? 0);
}

export function pacoteValido(pacote: string | undefined): NomePacote {
  return PACOTES.find((item) => item.nome === pacote)?.nome ?? PACOTES[0].nome;
}

// Só os opcionais que o projeto oferece, sem repetir e na ordem de OPCIONAIS.
export function opcionaisValidos(projeto: Pick<Projeto, "opcionais">, ids: readonly string[] = []): OpcionalId[] {
  return OPCIONAIS.map((opcional) => opcional.id).filter((id) => ids.includes(id) && projeto.opcionais.includes(id));
}

// Preço "a partir de" da escolha na página do projeto e na sacola: pacote + opcionais (reais).
export function precoDoProjeto(projeto: Projeto, pacote: string, opcionais: readonly string[] = []): number {
  return opcionaisValidos(projeto, opcionais).reduce(
    (soma, id) => soma + (buscarOpcional(id)?.preco ?? 0),
    precoDoPacote(projeto, pacote),
  );
}

// "Floral · Menina": a variação em cinza no título da página do projeto (como o "9 peças" dos produtos).
export function variacaoProjeto(projeto: Pick<Projeto, "tema" | "estilo">): string {
  const tema = projeto.tema === "menina" ? "Menina" : projeto.tema === "menino" ? "Menino" : "Neutro";
  return `${rotuloEstilo(projeto.estilo)} · ${tema}`;
}

// "Jardim de Camomila": o nome sem "Projeto" (nome da paleta no montador).
export function nomeCurto(projeto: Pick<Projeto, "nome">): string {
  return projeto.nome.replace(/^(Quartinho|Projeto)\s+/, "");
}

// "Por que um projeto do ateliê": iguais em todos os projetos.
export const DIFERENCIAIS = [
  { titulo: "Tudo no mesmo tema", texto: "Kit berço, cortina, tapete e enfeites pensados juntos, com a mesma paleta e o mesmo acabamento." },
  { titulo: "Feito à mão no ateliê", texto: "Corte, costura e bordado feitos em Fortaleza, peça por peça, com conferência de cada detalhe." },
  { titulo: "Tecidos naturais", texto: "Linho, tricoline e percal de algodão: macios, respiráveis e próprios para a pele do bebê." },
  { titulo: "Nas medidas do seu quarto", texto: "Cortina, tapete e kit berço feitos para as medidas do seu berço e da sua janela." },
  { titulo: "Entrega para todo o Brasil", texto: "Embalagem cuidadosa e envio rastreado para qualquer cidade do país." },
] as const;

// "Como funciona": da escolha à entrega (a linha do tempo "Passo a passo", secoes.tsx). `icone` é a
// chave do ícone da etapa; `prazo`, quanto ela costuma levar.
// [CONFIRMAR] com o ateliê os prazos de "Pedido" e "Confirmação".
export const ETAPAS = [
  {
    titulo: "Escolha",
    texto: "Escolha um quartinho do ateliê e o pacote, ou monte o seu peça por peça, e junte tudo na sacola.",
    prazo: "No seu tempo",
    icone: "escolha",
  },
  {
    titulo: "Pedido",
    texto: "Da sacola, o pedido segue pelo WhatsApp: uma vendedora confere as medidas do berço e da janela e a previsão do nascimento.",
    prazo: "Em horário comercial",
    icone: "pedido",
  },
  {
    titulo: "Confirmação",
    texto: "Você recebe os valores finais, os tecidos e o prazo. Ajustes de cor e de peças entram aqui.",
    prazo: "1 a 2 dias úteis",
    icone: "confirmacao",
  },
  {
    titulo: "Produção",
    texto: `Com o pedido confirmado, o ateliê corta, costura e borda tudo em ${PRAZO_PRODUCAO}.`,
    prazo: PRAZO_PRODUCAO,
    icone: "producao",
  },
  {
    titulo: "Entrega",
    texto: "O quartinho chega embalado e pronto para montar, em qualquer cidade do Brasil.",
    prazo: "Conforme o frete combinado",
    icone: "entrega",
  },
] as const;

// Páginas do menu "Projetos" (navegacao.ts) que não são um projeto: seleções do catálogo (com
// filtros fixos) e conteúdos do ateliê.
export type Colecao =
  | { tipo: "selecao"; slug: string; titulo: string; texto: string; filtros: Record<string, string[]> }
  | { tipo: "conteudo"; slug: "como-funciona" | "orcamento"; titulo: string; texto: string };

const COLECOES: Colecao[] = [
  {
    tipo: "selecao",
    slug: "menina",
    titulo: "Quartinhos para menina",
    texto: "Florais, rendas e tons de rosa, lilás e amarelo-manteiga.",
    filtros: { tema: ["menina"] },
  },
  {
    tipo: "selecao",
    slug: "menino",
    titulo: "Quartinhos para menino",
    texto: "Céu, safári e clássicos em azul, oliva e terracota.",
    filtros: { tema: ["menino"] },
  },
  {
    tipo: "selecao",
    slug: "neutro",
    titulo: "Quartinhos neutros",
    texto: "Linho cru, sálvia e off-white: quartinhos que servem para menina ou menino.",
    filtros: { tema: ["neutro"] },
  },
  {
    tipo: "selecao",
    slug: "floral",
    titulo: "Quartinhos florais",
    texto: "Camomila, lavanda, oliveira e florzinhas miúdas, bordadas à mão.",
    filtros: { estilo: ["floral"] },
  },
  {
    tipo: "selecao",
    slug: "safari",
    titulo: "Quartinhos safári",
    texto: "Leãozinho, girafa e elefante em tons de areia, oliva e terracota.",
    filtros: { estilo: ["safari"] },
  },
  {
    tipo: "selecao",
    slug: "nuvens",
    titulo: "Quartinhos nuvens e céu",
    texto: "Nuvens, lua e estrelas para um quarto leve e sereno.",
    filtros: { estilo: ["nuvens"] },
  },
  {
    tipo: "selecao",
    slug: "classico",
    titulo: "Quartinhos clássicos",
    texto: "Bordado inglês, babados, dossel e monograma: o quarto de geração em geração.",
    filtros: { estilo: ["classico"] },
  },
  {
    tipo: "conteudo",
    slug: "como-funciona",
    titulo: "Como funciona",
    texto: "Do primeiro contato à entrega: o quartinho completo, planejado e feito à mão pelo ateliê.",
  },
  {
    tipo: "conteudo",
    slug: "orcamento",
    titulo: "Peça seu quartinho",
    texto: "Escolha um quartinho do ateliê ou monte o seu quartinho peça por peça: tudo vai para a mesma sacola e o pedido segue pelo WhatsApp.",
  },
];

export function listarColecoes(): Colecao[] {
  return COLECOES;
}

export function buscarColecao(slug: string): Colecao | null {
  return COLECOES.find((colecao) => colecao.slug === slug) ?? null;
}
