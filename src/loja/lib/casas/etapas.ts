// Etapas do "Monte o seu quartinho": cada uma tem a sua página (/personalizado/monte-o-seu/<etapa>),
// com o progresso no topo, "Voltar" e "Continuar". Aqui ficam a ordem, os grupos de peças de cada
// etapa, a validação por etapa (o que é obrigatório para seguir) e os endereços.
// Puro (sem React nem navegador): roda no `node --test` (tests/loja/montador.test.mjs).

import { type ErrosQuartinho, type GrupoModulo, type Quartinho, validarQuartinho } from "./modulos.ts";

export const BASE_MONTADOR = "/personalizado/monte-o-seu";

export type IdEtapa = "tema" | "berco" | "quarto" | "banho-e-maternidade" | "bordado" | "resumo";
export type ChaveErro = keyof ErrosQuartinho;

export type EtapaMontador = {
  id: IdEtapa;
  rotulo: string; // progresso e título da página
  titulo: string; // título da etapa (h2)
  apoio: string;
  grupos: GrupoModulo[]; // peças desta etapa (vazio nas etapas sem peças)
  erros: ChaveErro[]; // o que esta etapa exige para seguir
};

export const ETAPAS_MONTADOR: readonly EtapaMontador[] = [
  {
    id: "tema",
    rotulo: "Tema",
    titulo: "Tema e paleta",
    apoio: "As cores que vão do berço à porta. Dá para ajustar os tons com a vendedora.",
    grupos: [],
    erros: ["paleta"],
  },
  {
    id: "berco",
    rotulo: "Berço",
    titulo: "Berço",
    apoio: "Kit berço e peças avulsas no tamanho do colchão. Os valores são a partir de, conforme as opções.",
    grupos: ["berco"],
    erros: ["tamanhoBerco"],
  },
  {
    id: "quarto",
    rotulo: "Quarto",
    titulo: "Quarto",
    apoio: "Janela, chão e cantinhos no mesmo tema.",
    grupos: ["quarto"],
    erros: [],
  },
  {
    id: "banho-e-maternidade",
    rotulo: "Banho e maternidade",
    titulo: "Banho, passeio e maternidade",
    apoio: "Paninhos, manta e o que vai para a maternidade.",
    grupos: ["banho", "maternidade"],
    // Última etapa de peças: daqui só segue com pelo menos uma peça no quartinho.
    erros: ["modulos"],
  },
  {
    id: "bordado",
    rotulo: "Bordado",
    titulo: "Bordado do nome",
    apoio: "Opcional: o nome do bebê no protetor, nas almofadas e no enfeite de porta.",
    grupos: [],
    erros: ["bordado"],
  },
  {
    id: "resumo",
    rotulo: "Resumo",
    titulo: "Resumo do seu quartinho",
    apoio: "Confira as peças, o total a partir de e leve o quartinho para a sacola.",
    grupos: [],
    erros: [],
  },
];

export const IDS_ETAPAS: IdEtapa[] = ETAPAS_MONTADOR.map((etapa) => etapa.id);

// Onde cada pendência se resolve (os links do resumo levam até ela).
export const ETAPA_DO_ERRO: Record<ChaveErro, IdEtapa> = {
  paleta: "tema",
  tamanhoBerco: "berco",
  modulos: "banho-e-maternidade",
  bordado: "bordado",
};

export function ehEtapa(valor: string | null | undefined): valor is IdEtapa {
  return IDS_ETAPAS.includes(valor as IdEtapa);
}

export function buscarEtapa(id: string | null | undefined): EtapaMontador | undefined {
  return ETAPAS_MONTADOR.find((etapa) => etapa.id === id);
}

export function indiceEtapa(id: IdEtapa): number {
  return IDS_ETAPAS.indexOf(id);
}

export function etapaAnterior(id: IdEtapa): IdEtapa | undefined {
  return IDS_ETAPAS[indiceEtapa(id) - 1];
}

export function proximaEtapa(id: IdEtapa): IdEtapa | undefined {
  return IDS_ETAPAS[indiceEtapa(id) + 1];
}

// Etapa em que cada grupo de peças aparece (o resumo leva ao lugar certo para editar).
export function etapaDoGrupo(grupo: GrupoModulo): IdEtapa {
  return ETAPAS_MONTADOR.find((etapa) => etapa.grupos.includes(grupo))?.id ?? "berco";
}

// Só os erros que a etapa exige (no resumo, todos).
export function errosDaEtapa(id: IdEtapa, quartinho: Quartinho, opcoes: { comBordado?: boolean } = {}): ErrosQuartinho {
  const todos = validarQuartinho(quartinho, opcoes);
  if (id === "resumo") return todos;
  const etapa = buscarEtapa(id);
  return Object.fromEntries(Object.entries(todos).filter(([chave]) => etapa?.erros.includes(chave as ChaveErro))) as ErrosQuartinho;
}

export function etapaValida(id: IdEtapa, quartinho: Quartinho, opcoes: { comBordado?: boolean } = {}): boolean {
  return Object.keys(errosDaEtapa(id, quartinho, opcoes)).length === 0;
}

// Primeira etapa ANTES de `id` com pendência: quem chega direto por URL (favorito, recarregar) a uma
// etapa adiante volta para ela.
export function primeiraPendenteAntes(id: IdEtapa, quartinho: Quartinho, opcoes: { comBordado?: boolean } = {}): IdEtapa | undefined {
  return IDS_ETAPAS.slice(0, indiceEtapa(id)).find((anterior) => !etapaValida(anterior, quartinho, opcoes));
}

// Passo do progresso clicável: já visitado (ou o atual) e sem pendência nas etapas anteriores.
export function etapaAlcancavel(
  id: IdEtapa,
  quartinho: Quartinho,
  visitadas: readonly string[],
  opcoes: { comBordado?: boolean } = {},
): boolean {
  if (!visitadas.includes(id)) return false;
  return primeiraPendenteAntes(id, quartinho, opcoes) === undefined;
}

// Endereço da etapa. Na edição de um quartinho da sacola, o ?editar= acompanha todas as etapas.
export function hrefEtapa(id: IdEtapa, editar?: string | null): string {
  return `${BASE_MONTADOR}/${id}${editar ? `?editar=${encodeURIComponent(editar)}` : ""}`;
}

// Etapas visitadas que vieram do navegador: só ids válidos, sem repetir, na ordem do montador.
export function normalizarVisitadas(bruto: unknown): IdEtapa[] {
  const lista = Array.isArray(bruto) ? bruto : [];
  return IDS_ETAPAS.filter((id) => lista.includes(id));
}
