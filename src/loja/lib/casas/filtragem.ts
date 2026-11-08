// Filtros da área Projetos (quarto de bebê completo): tema, estilo e tecido. Funções puras e sem
// imports locais: rodam no servidor e no `node --test`. Dentro de um filtro é "OU" (floral ou
// safári); entre filtros é "E" (floral e linho), como na listagem de produtos. As chaves estão em
// REGRAS_SEO.parametrosFiltro (src/loja/lib/seo/config.ts), senão o proxy as tiraria da URL.

export type ProjetoFiltravel = {
  slug: string;
  tema: string; // "menina" | "menino" | "neutro"
  estilo: string; // "floral" | "safari" | "nuvens" | "classico"
  tecido: string; // "linho" | "tricoline" | "percal"
  precoAPartirDe: number; // R$, pacote Essencial (valores fictícios)
  prazoDiasUteis: number; // produção no ateliê, antes do envio
};

export type Filtros = Record<string, string[]>;

export const TEMAS = [
  { valor: "menina", rotulo: "Para menina" },
  { valor: "menino", rotulo: "Para menino" },
  { valor: "neutro", rotulo: "Neutro" },
] as const;

export const ESTILOS = [
  { valor: "floral", rotulo: "Floral" },
  { valor: "safari", rotulo: "Safári" },
  { valor: "nuvens", rotulo: "Nuvens e céu" },
  { valor: "classico", rotulo: "Clássico" },
] as const;

export const TECIDOS = [
  { valor: "linho", rotulo: "Linho" },
  { valor: "tricoline", rotulo: "Tricoline 100% algodão" },
  { valor: "percal", rotulo: "Percal 200 fios" },
] as const;

// Ordem dos grupos na gaveta de filtros. As chaves vão para a query (?estilo=floral,safari).
export const FILTROS_PROJETOS = [
  { chave: "tema", titulo: "Tema" },
  { chave: "estilo", titulo: "Estilo" },
  { chave: "tecido", titulo: "Tecido" },
] as const;

export const CHAVES_FILTRO_PROJETOS: string[] = FILTROS_PROJETOS.map((filtro) => filtro.chave);

const OPCOES: Record<string, ReadonlyArray<{ valor: string; rotulo: string }>> = {
  tema: TEMAS,
  estilo: ESTILOS,
  tecido: TECIDOS,
};

// Valor de cada filtro para um projeto (sempre um só por filtro).
export function valorDoFiltro(projeto: ProjetoFiltravel, chave: string): string | undefined {
  switch (chave) {
    case "tema":
      return projeto.tema;
    case "estilo":
      return projeto.estilo;
    case "tecido":
      return projeto.tecido;
    default:
      return undefined;
  }
}

export function rotuloDoValor(chave: string, valor: string): string {
  return OPCOES[chave]?.find((opcao) => opcao.valor === valor)?.rotulo ?? valor;
}

// Só filtros conhecidos e valores que existem em algum projeto; sem repetição e em ordem fixa
// (o mesmo filtro sempre gera a mesma URL).
export function limparFiltros(projetos: ProjetoFiltravel[], filtros: Filtros): Filtros {
  const saida: Filtros = {};
  for (const chave of CHAVES_FILTRO_PROJETOS) {
    const existentes = new Set(projetos.map((projeto) => valorDoFiltro(projeto, chave)));
    const valores = [...new Set(filtros[chave] ?? [])].filter((valor) => existentes.has(valor)).sort();
    if (valores.length) saida[chave] = valores;
  }
  return saida;
}

export function filtrarProjetos<T extends ProjetoFiltravel>(projetos: T[], filtros: Filtros): T[] {
  const ativos = Object.entries(filtros).filter(([chave, valores]) => CHAVES_FILTRO_PROJETOS.includes(chave) && valores.length > 0);
  return projetos.filter((projeto) => ativos.every(([chave, valores]) => valores.includes(valorDoFiltro(projeto, chave) ?? "")));
}

export type OpcaoFiltro = { valor: string; rotulo: string; total: number; ativo: boolean };
export type GrupoFiltro = { chave: string; titulo: string; opcoes: OpcaoFiltro[] };

// Opções de cada filtro com a contagem "se eu marcar esta opção": cada grupo conta ignorando a
// própria seleção, para marcar "floral" não zerar "safári". Grupo com uma opção só não aparece.
export function gruposDeFiltro(projetos: ProjetoFiltravel[], filtros: Filtros): GrupoFiltro[] {
  const grupos: GrupoFiltro[] = [];
  for (const { chave, titulo } of FILTROS_PROJETOS) {
    const { [chave]: proprios = [], ...outros } = filtros;
    const base = filtrarProjetos(projetos, outros);
    const contagem = new Map<string, number>();
    for (const projeto of projetos) {
      const valor = valorDoFiltro(projeto, chave);
      if (valor !== undefined && !contagem.has(valor)) contagem.set(valor, 0);
    }
    for (const projeto of base) {
      const valor = valorDoFiltro(projeto, chave);
      if (valor !== undefined) contagem.set(valor, (contagem.get(valor) ?? 0) + 1);
    }
    // Ordem fixa das listas acima (a mesma do menu), não alfabética.
    const opcoes = (OPCOES[chave] ?? [])
      .filter(({ valor }) => contagem.has(valor))
      .map(({ valor, rotulo }) => ({ valor, rotulo, total: contagem.get(valor) ?? 0, ativo: proprios.includes(valor) }));
    if (opcoes.length > 1) grupos.push({ chave, titulo, opcoes });
  }
  return grupos;
}

// Marca ou desmarca um valor, devolvendo filtros novos (o objeto recebido não muda).
export function alternarFiltro(filtros: Filtros, chave: string, valor: string): Filtros {
  const atuais = filtros[chave] ?? [];
  const proximos = atuais.includes(valor) ? atuais.filter((item) => item !== valor) : [...atuais, valor].sort();
  const { [chave]: _antigo, ...resto } = filtros;
  return proximos.length ? { ...resto, [chave]: proximos } : resto;
}

// Pílulas de filtros ativos ("Floral ×"), na ordem da gaveta.
export function filtrosAtivos(filtros: Filtros): Array<{ chave: string; valor: string; rotulo: string }> {
  return FILTROS_PROJETOS.flatMap(({ chave }) =>
    (filtros[chave] ?? []).map((valor) => ({ chave, valor, rotulo: rotuloDoValor(chave, valor) })),
  );
}

// Os valores entram no parâmetro "ordem" do motor de URLs (ORDENS em src/loja/lib/seo/urls.ts).
export const ORDENACOES_PROJETOS = [
  { valor: "relevancia", rotulo: "Em destaque" },
  { valor: "menor-preco", rotulo: "Menor preço" },
  { valor: "maior-preco", rotulo: "Maior preço" },
] as const;

// Em destaque = a ordem do catálogo. Empate de preço: o menor prazo primeiro.
export function ordenarProjetos<T extends ProjetoFiltravel>(projetos: T[], ordem: string | undefined): T[] {
  const copia = [...projetos];
  switch (ordem) {
    case "menor-preco":
      return copia.sort((a, b) => a.precoAPartirDe - b.precoAPartirDe || a.prazoDiasUteis - b.prazoDiasUteis);
    case "maior-preco":
      return copia.sort((a, b) => b.precoAPartirDe - a.precoAPartirDe || a.prazoDiasUteis - b.prazoDiasUteis);
    default:
      return copia;
  }
}
