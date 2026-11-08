// "Monte o seu quartinho" (/projetos/monte-o-seu): o projeto personalizado, montado peça por peça.
// Configuração dos módulos (preço "a partir de" por módulo e por opção, ligado ao produto do
// catálogo quando existe) e as regras do montador: preço, validação, rascunho e o item da sacola.
// PROVISÓRIO: preços FICTÍCIOS, como os do catálogo (AVISO_PRECOS). O valor final é confirmado pela
// vendedora no WhatsApp.
// Puro (sem React nem navegador): roda no `node --test` (tests/loja/montador.test.mjs). Os slugs de
// `produto` são conferidos contra src/loja/lib/catalogo/exemplos.ts no teste.

import { buscarProjeto, type Cor, listarProjetos, nomeCurto, type Projeto } from "./catalogo.ts";

export type Tema = Projeto["tema"];
export type GrupoModulo = "berco" | "quarto" | "banho" | "maternidade";
export type IconeModulo = "berco" | "nuvem" | "lua" | "pena" | "estrela" | "folha" | "novelo" | "coracao" | "flor" | "bebe" | "bolsa" | "presente" | "tulipa";

export const TEMAS: ReadonlyArray<{ id: Tema; rotulo: string }> = [
  { id: "menina", rotulo: "Menina" },
  { id: "menino", rotulo: "Menino" },
  { id: "neutro", rotulo: "Neutro" },
];

export const GRUPOS_MODULOS: ReadonlyArray<{ id: GrupoModulo; nome: string; apoio: string }> = [
  { id: "berco", nome: "Berço", apoio: "Tudo o que vai no berço, no tamanho do colchão." },
  { id: "quarto", nome: "Quarto", apoio: "Janela, chão e cantinhos no mesmo tema." },
  { id: "banho", nome: "Banho e passeio", apoio: "Paninhos e manta para o dia a dia." },
  { id: "maternidade", nome: "Maternidade", apoio: "Para a chegada do bebê." },
];

export type OpcaoModulo = { rotulo: string; acrescimo: number }; // reais, soma ao preço do módulo
export type VariacaoModulo = { id: string; titulo: string; opcoes: OpcaoModulo[] };
export type Modulo = {
  id: string;
  nome: string;
  grupo: GrupoModulo;
  descricao: string;
  preco: number; // reais, "a partir de" com a 1ª opção de cada variação
  variacoes: VariacaoModulo[]; // a 1ª opção é a padrão
  berco?: boolean; // feito no tamanho do colchão do berço (exige o tamanho)
  noKitBerco?: boolean; // já vem no kit berço (avulso = reposição ou outro modelo)
  produto?: string; // slug da peça equivalente no catálogo (link "Ver a peça")
  icone: IconeModulo;
};

// Tamanhos do colchão (os mesmos da página de produto, catalogo/exemplos.ts). Sob encomenda, o ateliê
// faz também o mini berço.
export const TAMANHOS_BERCO = ["Berço americano · 70 × 130 cm", "Berço padrão · 60 × 130 cm", "Mini berço · 50 × 90 cm"] as const;

export const PRECO_BORDADO = 90; // reais: nome bordado no protetor, nas almofadas e no enfeite de porta
export const LIMITE_BORDADO = 20;

export const MODULOS: Modulo[] = [
  // Berço
  {
    id: "kit-berco",
    nome: "Kit berço",
    grupo: "berco",
    descricao: "Protetor, saia, edredom, lençóis e travesseiro no mesmo tecido.",
    preco: 990,
    berco: true,
    produto: "kit-berco-laco-branco-7-pecas",
    icone: "berco",
    variacoes: [
      {
        id: "pecas",
        titulo: "Peças",
        opcoes: [
          { rotulo: "7 peças", acrescimo: 0 },
          { rotulo: "9 peças", acrescimo: 300 },
          { rotulo: "11 peças", acrescimo: 600 },
        ],
      },
      {
        id: "tecido",
        titulo: "Tecido",
        opcoes: [
          { rotulo: "Tricoline", acrescimo: 0 },
          { rotulo: "Percal 200 fios", acrescimo: 200 },
          { rotulo: "Linho", acrescimo: 500 },
        ],
      },
    ],
  },
  {
    id: "protetor",
    nome: "Protetor de berço",
    grupo: "berco",
    descricao: "Em gomos ou trançado, com vivo na cor de destaque da paleta.",
    preco: 390,
    berco: true,
    noKitBerco: true,
    produto: "protetor-de-berco-trancado",
    icone: "nuvem",
    variacoes: [
      {
        id: "modelo",
        titulo: "Modelo",
        opcoes: [
          { rotulo: "Gomos com vivo", acrescimo: 0 },
          { rotulo: "Trançado", acrescimo: 0 },
          { rotulo: "Bordado inglês", acrescimo: 120 },
        ],
      },
    ],
  },
  {
    id: "lencois",
    nome: "Jogo de lençóis",
    grupo: "berco",
    descricao: "Lençol com elástico, lençol de cima e fronha em percal 200 fios.",
    preco: 189,
    berco: true,
    noKitBerco: true,
    produto: "jogo-de-lencol-percal-200-fios",
    icone: "lua",
    variacoes: [
      {
        id: "quantidade",
        titulo: "Quantidade",
        opcoes: [
          { rotulo: "1 jogo", acrescimo: 0 },
          { rotulo: "2 jogos", acrescimo: 189 },
          { rotulo: "3 jogos", acrescimo: 378 },
        ],
      },
    ],
  },
  {
    id: "edredom",
    nome: "Edredom ou colcha",
    grupo: "berco",
    descricao: "Para os dias frios ou uma colcha leve para o calor de Fortaleza.",
    preco: 289,
    berco: true,
    noKitBerco: true,
    produto: "edredom-de-berco-matelasse",
    icone: "pena",
    variacoes: [
      {
        id: "modelo",
        titulo: "Modelo",
        opcoes: [
          { rotulo: "Colcha leve", acrescimo: 0 },
          { rotulo: "Edredom matelassê", acrescimo: 40 },
        ],
      },
    ],
  },
  {
    id: "saia",
    nome: "Saia de berço",
    grupo: "berco",
    descricao: "Esconde o estrado e completa o berço até o chão.",
    preco: 249,
    berco: true,
    noKitBerco: true,
    produto: "saia-de-berco-lese",
    icone: "novelo",
    variacoes: [
      {
        id: "modelo",
        titulo: "Modelo",
        opcoes: [
          { rotulo: "Lisa com pregas", acrescimo: 0 },
          { rotulo: "Lesê", acrescimo: 40 },
        ],
      },
    ],
  },
  {
    id: "mosquiteiro",
    nome: "Mosquiteiro",
    grupo: "berco",
    descricao: "Dossel de voal que protege o berço dos mosquitos e enfeita o quarto.",
    preco: 349,
    produto: "mosquiteiro-de-teto-com-dossel",
    icone: "estrela",
    variacoes: [
      {
        id: "modelo",
        titulo: "Modelo",
        opcoes: [
          { rotulo: "De teto com dossel", acrescimo: 0 },
          { rotulo: "Dossel de parede", acrescimo: 150 },
        ],
      },
    ],
  },
  // Quarto
  {
    id: "cortina",
    nome: "Cortina",
    grupo: "quarto",
    descricao: "Linho e voal, com barrado ou bando no tema do quarto.",
    preco: 690,
    produto: "cortina-de-linho-e-voal",
    icone: "lua",
    variacoes: [
      {
        id: "largura",
        titulo: "Largura",
        opcoes: [
          { rotulo: "2,00 × 2,50 m", acrescimo: 0 },
          { rotulo: "3,00 × 2,50 m", acrescimo: 250 },
        ],
      },
      {
        id: "forro",
        titulo: "Forro",
        opcoes: [
          { rotulo: "Sem blecaute", acrescimo: 0 },
          { rotulo: "Com blecaute", acrescimo: 120 },
        ],
      },
    ],
  },
  {
    id: "tapete",
    nome: "Tapete",
    grupo: "quarto",
    descricao: "Feito à mão em fio de algodão, macio para os primeiros engatinhados.",
    preco: 490,
    produto: "tapete-redondo-de-croche",
    icone: "folha",
    variacoes: [
      {
        id: "tamanho",
        titulo: "Tamanho",
        opcoes: [
          { rotulo: "Redondo 1,00 m", acrescimo: 0 },
          { rotulo: "Redondo 1,40 m", acrescimo: 210 },
          { rotulo: "Retangular 1,50 × 2,00 m", acrescimo: 390 },
        ],
      },
    ],
  },
  {
    id: "almofadas",
    nome: "Almofadas e nichos",
    grupo: "quarto",
    descricao: "Almofadas em formato de flor, nuvem ou bichinho, e nichos de parede.",
    preco: 387,
    produto: "almofada-nuvem",
    icone: "coracao",
    variacoes: [
      {
        id: "conjunto",
        titulo: "Conjunto",
        opcoes: [
          { rotulo: "3 almofadas", acrescimo: 0 },
          { rotulo: "5 almofadas", acrescimo: 258 },
          { rotulo: "3 almofadas e 3 nichos", acrescimo: 450 },
        ],
      },
    ],
  },
  {
    id: "kit-mini-cama",
    nome: "Kit mini cama",
    grupo: "quarto",
    descricao: "Protetor baixo, colcha e lençol para a mini cama montessoriana.",
    preco: 790,
    produto: "kit-mini-cama-montessoriana-4-pecas",
    icone: "berco",
    variacoes: [
      {
        id: "colchao",
        titulo: "Colchão",
        opcoes: [
          { rotulo: "Mini cama · 70 × 150 cm", acrescimo: 0 },
          { rotulo: "Solteiro · 88 × 188 cm", acrescimo: 240 },
        ],
      },
    ],
  },
  // Banho e passeio
  {
    id: "paninhos",
    nome: "Paninhos",
    grupo: "banho",
    descricao: "Fraldas de boca, de ombro e de pano com o acabamento do quarto.",
    preco: 290,
    produto: "fraldas-de-boca-bordadas-kit-com-3",
    icone: "bebe",
    variacoes: [
      {
        id: "kit",
        titulo: "Kit",
        opcoes: [
          { rotulo: "6 peças", acrescimo: 0 },
          { rotulo: "12 peças", acrescimo: 300 },
        ],
      },
    ],
  },
  {
    id: "manta",
    nome: "Manta",
    grupo: "banho",
    descricao: "Para o colo, o carrinho e as primeiras saídas.",
    preco: 269,
    produto: "manta-de-trico-trancada",
    icone: "novelo",
    variacoes: [
      {
        id: "modelo",
        titulo: "Modelo",
        opcoes: [
          { rotulo: "Tricô trançada", acrescimo: 0 },
          { rotulo: "Algodão com bordado", acrescimo: 60 },
        ],
      },
    ],
  },
  // Maternidade
  {
    id: "bolsa-maternidade",
    nome: "Bolsa maternidade",
    grupo: "maternidade",
    descricao: "Bolsa de linho com forro impermeável e trocador.",
    preco: 690,
    produto: "bolsa-maternidade-classica-de-linho",
    icone: "bolsa",
    variacoes: [
      {
        id: "conjunto",
        titulo: "Conjunto",
        opcoes: [
          { rotulo: "Só a bolsa", acrescimo: 0 },
          { rotulo: "Kit com 3 peças", acrescimo: 200 },
        ],
      },
    ],
  },
  {
    id: "saida-maternidade",
    nome: "Saída de maternidade",
    grupo: "maternidade",
    descricao: "Macacão, casaquinho, touca e manta para a saída da maternidade.",
    preco: 289,
    produto: "saida-de-maternidade-trico-cru",
    icone: "presente",
    variacoes: [
      {
        id: "tamanho",
        titulo: "Tamanho",
        opcoes: [
          { rotulo: "RN", acrescimo: 0 },
          { rotulo: "P", acrescimo: 0 },
        ],
      },
    ],
  },
  {
    id: "enfeite-porta",
    nome: "Enfeite de porta",
    grupo: "maternidade",
    descricao: "Guirlanda ou nome em feltro para a porta do quarto e da maternidade.",
    preco: 229,
    produto: "enfeite-de-porta-bordado",
    icone: "tulipa",
    variacoes: [
      {
        id: "modelo",
        titulo: "Modelo",
        opcoes: [
          { rotulo: "Guirlanda bordada", acrescimo: 0 },
          { rotulo: "Nome em feltro", acrescimo: 0 },
        ],
      },
    ],
  },
];

const POR_ID = new Map(MODULOS.map((modulo) => [modulo.id, modulo]));

export function buscarModulo(id: string): Modulo | undefined {
  return POR_ID.get(id);
}

export function modulosDoGrupo(grupo: GrupoModulo): Modulo[] {
  return MODULOS.filter((modulo) => modulo.grupo === grupo);
}

// Paletas: as dos projetos do ateliê (cada uma com o nome curto do projeto). Para menina e menino,
// as do tema primeiro e depois as neutras, que combinam com tudo.
export type Paleta = { id: string; nome: string; tema: Tema; cores: Cor[] };

export function listarPaletas(): Paleta[] {
  return listarProjetos().map((projeto) => ({ id: projeto.slug, nome: nomeCurto(projeto), tema: projeto.tema, cores: projeto.paleta }));
}

export function buscarPaleta(id: string | undefined): Paleta | undefined {
  return id ? listarPaletas().find((paleta) => paleta.id === id) : undefined;
}

export function paletasDoTema(tema: Tema | undefined): Paleta[] {
  const todas = listarPaletas();
  if (!tema) return todas;
  if (tema === "neutro") return todas.filter((paleta) => paleta.tema === "neutro");
  return [...todas.filter((paleta) => paleta.tema === tema), ...todas.filter((paleta) => paleta.tema === "neutro")];
}

// O quartinho montado: é o que vai para o rascunho (localStorage) e para a sacola (item personalizado).
export type ModuloEscolhido = { id: string; opcoes: Record<string, string> };
export type Quartinho = {
  tema?: Tema;
  paleta?: string; // id da paleta (slug do projeto de onde ela vem)
  base?: string; // projeto de partida, quando houver
  tamanhoBerco?: string;
  modulos: ModuloEscolhido[];
  bordado?: string; // nome a bordar (vazio = sem bordado)
};

export function quartinhoVazio(): Quartinho {
  return { modulos: [] };
}

// Opções do módulo: as escolhidas que existem, e a 1ª de cada variação no que faltar.
export function opcoesCompletas(modulo: Modulo, escolhidas: Record<string, string> = {}): Record<string, string> {
  return Object.fromEntries(
    modulo.variacoes.map((variacao) => {
      const valida = variacao.opcoes.find((opcao) => opcao.rotulo === escolhidas[variacao.id]);
      return [variacao.id, (valida ?? variacao.opcoes[0]).rotulo];
    }),
  );
}

export function precoDoModulo(modulo: Modulo, escolhidas: Record<string, string> = {}): number {
  const opcoes = opcoesCompletas(modulo, escolhidas);
  return modulo.variacoes.reduce(
    (soma, variacao) => soma + (variacao.opcoes.find((opcao) => opcao.rotulo === opcoes[variacao.id])?.acrescimo ?? 0),
    modulo.preco,
  );
}

export function incluido(quartinho: Quartinho, id: string): boolean {
  return quartinho.modulos.some((modulo) => modulo.id === id);
}

// Incluir ou remover um módulo mantendo a ordem de MODULOS (a lista do resumo fica estável).
export function alternarModulo(quartinho: Quartinho, id: string): Quartinho {
  const modulo = buscarModulo(id);
  if (!modulo) return quartinho;
  if (incluido(quartinho, id)) return { ...quartinho, modulos: quartinho.modulos.filter((item) => item.id !== id) };
  const modulos = [...quartinho.modulos, { id, opcoes: opcoesCompletas(modulo) }];
  return { ...quartinho, modulos: ordenar(modulos) };
}

export function escolherOpcao(quartinho: Quartinho, id: string, variacao: string, rotulo: string): Quartinho {
  const modulo = buscarModulo(id);
  if (!modulo || !modulo.variacoes.some((item) => item.id === variacao && item.opcoes.some((opcao) => opcao.rotulo === rotulo))) return quartinho;
  const atual = quartinho.modulos.find((item) => item.id === id);
  const opcoes = opcoesCompletas(modulo, { ...(atual?.opcoes ?? {}), [variacao]: rotulo });
  // Escolher uma opção num módulo de fora já o inclui.
  const modulos = atual ? quartinho.modulos.map((item) => (item.id === id ? { id, opcoes } : item)) : ordenar([...quartinho.modulos, { id, opcoes }]);
  return { ...quartinho, modulos };
}

function ordenar(modulos: ModuloEscolhido[]): ModuloEscolhido[] {
  const ordem = new Map(MODULOS.map((modulo, indice) => [modulo.id, indice]));
  return [...modulos].sort((a, b) => (ordem.get(a.id) ?? 0) - (ordem.get(b.id) ?? 0));
}

export function temPecasDeBerco(quartinho: Quartinho): boolean {
  return quartinho.modulos.some((item) => buscarModulo(item.id)?.berco);
}

// "3 de 6 escolhidos" por grupo.
export function contagemDoGrupo(quartinho: Quartinho, grupo: GrupoModulo): { escolhidos: number; total: number } {
  const doGrupo = modulosDoGrupo(grupo);
  return { escolhidos: doGrupo.filter((modulo) => incluido(quartinho, modulo.id)).length, total: doGrupo.length };
}

export function bordadoLimpo(nome: string | undefined): string {
  return (nome ?? "").replace(/\s+/g, " ").trim().slice(0, LIMITE_BORDADO);
}

// Total "a partir de" (reais): módulos com as opções escolhidas + bordado do nome.
export function precoDoQuartinho(quartinho: Quartinho): number {
  const modulos = quartinho.modulos.reduce((soma, item) => {
    const modulo = buscarModulo(item.id);
    return modulo ? soma + precoDoModulo(modulo, item.opcoes) : soma;
  }, 0);
  return modulos + (bordadoLimpo(quartinho.bordado) ? PRECO_BORDADO : 0);
}

// Escolhas obrigatórias, com a mensagem que aparece junto da etapa: paleta, ao menos 1 módulo, o
// tamanho do berço quando há peça de berço e um nome válido quando o bordado está ligado.
export type ErrosQuartinho = Partial<Record<"paleta" | "modulos" | "tamanhoBerco" | "bordado", string>>;

export function validarQuartinho(quartinho: Quartinho, { comBordado = Boolean(quartinho.bordado) }: { comBordado?: boolean } = {}): ErrosQuartinho {
  const erros: ErrosQuartinho = {};
  if (!quartinho.tema || !buscarPaleta(quartinho.paleta)) erros.paleta = "Escolha o tema e uma paleta de cores.";
  if (quartinho.modulos.filter((item) => buscarModulo(item.id)).length === 0) erros.modulos = "Inclua pelo menos uma peça no seu quartinho.";
  if (temPecasDeBerco(quartinho) && !TAMANHOS_BERCO.some((tamanho) => tamanho === quartinho.tamanhoBerco)) {
    erros.tamanhoBerco = "Selecione o tamanho do berço para as peças de berço.";
  }
  if (comBordado) {
    const nome = bordadoLimpo(quartinho.bordado);
    if (!nome) erros.bordado = "Escreva o nome a bordar ou escolha sem bordado.";
    else if (!/^[\p{L}\s'-]+$/u.test(nome)) erros.bordado = "Use só letras no nome do bordado.";
  }
  return erros;
}

// Começar de um projeto do ateliê: tema, paleta e as peças do pacote Completo (kit berço, cortina,
// tapete, almofadas e enfeite de porta), mais os opcionais que o projeto oferece. O tamanho do berço
// e o bordado continuam com a cliente.
export function quartinhoDoProjeto(projeto: Projeto, atual: Quartinho = quartinhoVazio()): Quartinho {
  const ids = ["kit-berco", "cortina", "tapete", "almofadas", "enfeite-porta", ...projeto.opcionais];
  const modulos = ordenar(
    ids.flatMap((id) => {
      const modulo = buscarModulo(id);
      return modulo ? [{ id, opcoes: opcoesCompletas(modulo, atual.modulos.find((item) => item.id === id)?.opcoes) }] : [];
    }),
  );
  return { ...atual, tema: projeto.tema, paleta: projeto.slug, base: projeto.slug, modulos };
}

// O que veio do navegador (rascunho ou sacola) pode estar velho ou editado à mão: só fica o que existe.
export function normalizarQuartinho(bruto: unknown): Quartinho {
  const valor = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;
  const tema = TEMAS.find((item) => item.id === valor.tema)?.id;
  const paleta = typeof valor.paleta === "string" && buscarPaleta(valor.paleta) ? valor.paleta : undefined;
  const base = typeof valor.base === "string" && buscarProjeto(valor.base) ? valor.base : undefined;
  const tamanhoBerco = TAMANHOS_BERCO.find((tamanho) => tamanho === valor.tamanhoBerco);
  const vistos = new Set<string>();
  const modulos = (Array.isArray(valor.modulos) ? valor.modulos : []).flatMap((item: unknown) => {
    const escolhido = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const modulo = typeof escolhido.id === "string" ? buscarModulo(escolhido.id) : undefined;
    if (!modulo || vistos.has(modulo.id)) return [];
    vistos.add(modulo.id);
    const opcoes = escolhido.opcoes && typeof escolhido.opcoes === "object" ? (escolhido.opcoes as Record<string, string>) : {};
    return [{ id: modulo.id, opcoes: opcoesCompletas(modulo, opcoes) }];
  });
  const bordado = bordadoLimpo(typeof valor.bordado === "string" ? valor.bordado : "");
  return {
    ...(tema ? { tema } : {}),
    ...(paleta ? { paleta } : {}),
    ...(base ? { base } : {}),
    ...(tamanhoBerco ? { tamanhoBerco } : {}),
    modulos: ordenar(modulos),
    ...(bordado ? { bordado } : {}),
  };
}

// Identificador estável do quartinho na sacola: o mesmo conjunto vira a mesma linha (soma a
// quantidade); qualquer mudança vira outra linha.
export function idQuartinho(quartinho: Quartinho): string {
  const limpo = normalizarQuartinho(quartinho);
  const texto = JSON.stringify([
    limpo.tema ?? "",
    limpo.paleta ?? "",
    limpo.tamanhoBerco ?? "",
    limpo.bordado ?? "",
    limpo.modulos.map((item) => [item.id, Object.entries(item.opcoes).sort(([a], [b]) => a.localeCompare(b))]),
  ]);
  let hash = 2166136261;
  for (const letra of texto) {
    hash ^= letra.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return `quartinho-${hash.toString(36)}`;
}

// Texto curto das opções de um módulo ("9 peças · Percal 200 fios").
export function resumoOpcoes(modulo: Modulo, escolhidas: Record<string, string>): string {
  const opcoes = opcoesCompletas(modulo, escolhidas);
  return modulo.variacoes.map((variacao) => opcoes[variacao.id]).join(" · ");
}

// Linhas do item na sacola, no pedido e na mensagem do WhatsApp.
export function atributosDoQuartinho(quartinho: Quartinho): string[] {
  const paleta = buscarPaleta(quartinho.paleta);
  const base = quartinho.base ? buscarProjeto(quartinho.base) : null;
  const tema = TEMAS.find((item) => item.id === quartinho.tema)?.rotulo;
  const bordado = bordadoLimpo(quartinho.bordado);
  return [
    tema && `Tema: ${tema}`,
    paleta && `Paleta: ${paleta.nome} (${paleta.cores.map((cor) => cor.nome).join(", ")})`,
    base && `A partir do ${base.nome}`,
    quartinho.tamanhoBerco && `Tamanho do berço: ${quartinho.tamanhoBerco}`,
    `Bordado do nome: ${bordado || "sem bordado"}`,
  ].filter((linha): linha is string => Boolean(linha));
}

export type LinhaModulo = { nome: string; detalhe: string; preco: number };

export function linhasDoQuartinho(quartinho: Quartinho): LinhaModulo[] {
  const linhas = quartinho.modulos.flatMap((item) => {
    const modulo = buscarModulo(item.id);
    return modulo ? [{ nome: modulo.nome, detalhe: resumoOpcoes(modulo, item.opcoes), preco: precoDoModulo(modulo, item.opcoes) }] : [];
  });
  const bordado = bordadoLimpo(quartinho.bordado);
  return bordado ? [...linhas, { nome: "Bordado do nome", detalhe: bordado, preco: PRECO_BORDADO }] : linhas;
}

// "Quartinho Jardim de Camomila": nome do item na sacola (sem paleta, "Quartinho personalizado").
export function nomeDoQuartinho(quartinho: Quartinho): string {
  const paleta = buscarPaleta(quartinho.paleta);
  return paleta ? `Quartinho personalizado ${paleta.nome}` : "Quartinho personalizado";
}
