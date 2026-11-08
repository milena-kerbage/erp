// Regras da listagem (categoria e busca): filtrar, ordenar, contar facetas, paginar e intercalar os
// cards de propaganda. Funções puras e sem imports locais: rodam no servidor, no navegador (contagem
// ao vivo na gaveta de filtros) e no `node --test`.

export type ItemListavel = {
  slug: string;
  nome: string;
  marca: string;
  caminho: string;
  preco: string; // decimal em string
  atributos: Record<string, string[]>; // rótulos legíveis
  selo?: string;
};

// Mesma regra do slug() de src/lib/seo/urls.ts (testado para não divergir).
export function slugificar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/,/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Faixas de preço do filtro "preco" (o motor de URLs aceita "min-max" e "min-").
export const FAIXAS_PRECO = [
  { valor: "0-150", rotulo: "Até R$ 150", min: 0, max: 150 },
  { valor: "150-300", rotulo: "R$ 150 a R$ 300", min: 150, max: 300 },
  { valor: "300-700", rotulo: "R$ 300 a R$ 700", min: 300, max: 700 },
  { valor: "700-1200", rotulo: "R$ 700 a R$ 1.200", min: 700, max: 1200 },
  { valor: "1200-", rotulo: "Acima de R$ 1.200", min: 1200, max: Number.POSITIVE_INFINITY },
] as const;

export const ORDENACOES = [
  { valor: "relevancia", rotulo: "Relevância" },
  { valor: "mais-vendidos", rotulo: "Mais vendidos" },
  { valor: "lancamentos", rotulo: "Novidades" },
  { valor: "menor-preco", rotulo: "Menor preço" },
  { valor: "maior-preco", rotulo: "Maior preço" },
] as const;

// Ordem e título das facetas na gaveta (as chaves batem com REGRAS_SEO.parametrosFiltro).
export const FACETAS = [
  { chave: "para", titulo: "Para" },
  { chave: "entrega", titulo: "Disponibilidade" },
  { chave: "cor", titulo: "Cor" },
  { chave: "tamanho", titulo: "Tamanho do berço" },
  { chave: "tecido", titulo: "Tecido" },
  { chave: "estilo", titulo: "Estilo" },
  { chave: "tema", titulo: "Tema" },
  { chave: "personalizacao", titulo: "Personalização" },
  { chave: "preco", titulo: "Preço" },
] as const;

function emReais(preco: string): number {
  return Number(preco); // só para comparar com as faixas (2 casas cabem exatas); dinheiro não é somado aqui
}

function atendeFiltro(item: ItemListavel, chave: string, valores: string[]): boolean {
  if (chave === "preco") {
    const valor = emReais(item.preco);
    return valores.some((faixa) => {
      const [min, max] = faixa.split("-");
      return valor >= Number(min || 0) && (max === "" || max === undefined ? true : valor < Number(max));
    });
  }
  const doItem = (item.atributos[chave] ?? []).map(slugificar);
  return valores.some((valor) => doItem.includes(valor));
}

// Dentro de uma faceta é "OU" (rosê ou cru); entre facetas é "E" (rosê e percal).
export function filtrar<T extends ItemListavel>(itens: T[], filtros: Record<string, string[]>): T[] {
  const ativos = Object.entries(filtros).filter(([, valores]) => valores.length > 0);
  return itens.filter((item) => ativos.every(([chave, valores]) => atendeFiltro(item, chave, valores)));
}

export function ordenar<T extends ItemListavel>(itens: T[], ordem: string | undefined): T[] {
  const copia = [...itens];
  switch (ordem) {
    case "menor-preco":
      return copia.sort((a, b) => emReais(a.preco) - emReais(b.preco));
    case "maior-preco":
      return copia.sort((a, b) => emReais(b.preco) - emReais(a.preco));
    case "mais-vendidos":
      return copia.sort((a, b) => Number(b.selo === "Mais vendido") - Number(a.selo === "Mais vendido"));
    case "lancamentos":
      return copia.sort((a, b) => Number(b.selo === "Novidade") - Number(a.selo === "Novidade"));
    default:
      return copia; // relevância: ordem do catálogo (no real, a do motor de busca/merchandising)
  }
}

export type OpcaoFaceta = { valor: string; rotulo: string; total: number };
export type Faceta = { chave: string; titulo: string; opcoes: OpcaoFaceta[] };

// Facetas com contagem "se eu marcar esta opção": cada faceta conta ignorando a própria seleção,
// para que marcar "rosê" não zere "cru" (o padrão das boas listagens).
export function contarFacetas(itens: ItemListavel[], filtros: Record<string, string[]>): Faceta[] {
  const saida: Faceta[] = [];
  for (const { chave, titulo } of FACETAS) {
    const { [chave]: _ignorada, ...outros } = filtros;
    const base = filtrar(itens, outros);
    let opcoes: OpcaoFaceta[];
    if (chave === "preco") {
      opcoes = FAIXAS_PRECO.map((faixa) => ({
        valor: faixa.valor,
        rotulo: faixa.rotulo,
        total: base.filter((item) => emReais(item.preco) >= faixa.min && emReais(item.preco) < faixa.max).length,
      })).filter((opcao) => opcao.total > 0);
    } else {
      const contagem = new Map<string, OpcaoFaceta>();
      for (const item of base) {
        for (const rotulo of item.atributos[chave] ?? []) {
          const valor = slugificar(rotulo);
          const atual = contagem.get(valor) ?? { valor, rotulo, total: 0 };
          atual.total += 1;
          contagem.set(valor, atual);
        }
      }
      opcoes = [...contagem.values()].sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR", { numeric: true }));
    }
    // Faceta com uma opção só não ajuda a escolher (a não ser que já esteja marcada).
    if (opcoes.length > 1 || (filtros[chave]?.length ?? 0) > 0) saida.push({ chave, titulo, opcoes });
  }
  return saida;
}

// Busca simples por termos (todos precisam aparecer), sem acento e sem caixa.
export function buscarTexto<T extends ItemListavel>(itens: T[], termo: string): T[] {
  const termos = slugificar(termo)
    .split("-")
    .filter((parte) => parte.length > 1);
  if (termos.length === 0) return [];
  return itens.filter((item) => {
    const texto = slugificar(`${item.nome} ${item.marca} ${item.caminho.replace(/\//g, " ")}`);
    return termos.every((parte) => texto.includes(parte));
  });
}

export function noCaminho<T extends ItemListavel>(itens: T[], caminho: string): T[] {
  return itens.filter((item) => item.caminho === caminho || item.caminho.startsWith(`${caminho}/`));
}

// Célula da grade: produto ou propaganda (com o estilo visual sorteado).
export type Celula<T> = { tipo: "produto"; item: T } | { tipo: "propaganda"; indice: number; estilo: number };

export const ESTILOS_PROPAGANDA = 3;

// Gerador pseudoaleatório com semente (mulberry32): o mesmo sorteio no servidor e no navegador,
// e por categoria/termo, então a página não "pisca" nem muda a cada visita.
function sorteador(semente: string): () => number {
  let estado = 2166136261;
  for (const letra of semente) estado = Math.imul(estado ^ letra.charCodeAt(0), 16777619);
  return () => {
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function embaralhar(quantidade: number, sortear: () => number): number[] {
  const ordem = Array.from({ length: quantidade }, (_, indice) => indice);
  for (let i = ordem.length - 1; i > 0; i--) {
    const j = Math.floor(sortear() * (i + 1));
    [ordem[i], ordem[j]] = [ordem[j], ordem[i]];
  }
  return ordem;
}

// Propagandas sortidas no meio da grade (no modelo da Lululemon, mas sem padrão fixo): a primeira
// na 2ª ou 3ª linha; depois, 2 ou 3 linhas de produto entre uma e outra (nunca em linhas seguidas);
// a coluna muda e nunca repete a anterior; a ordem dos anúncios e o estilo também são sorteados,
// sem dois estilos iguais em sequência. A lista vem em ordem de relevância (escolherPropagandas):
// quando cabem menos anúncios que a lista, entram os primeiros, em ordem sorteada.
export function intercalarPropagandas<T>(itens: T[], colunas: number, propagandas: number, semente = "milena"): Celula<T>[] {
  const sortear = sorteador(semente);
  const ordemAnuncios = embaralhar(propagandas, sortear);
  const celulas: Celula<T>[] = [];
  let proximo = 0;
  let linha = 0;
  let usadas = 0;
  let proximaLinhaComAnuncio = 1 + Math.floor(sortear() * 2); // 2ª ou 3ª linha
  let colunaAnterior = -1;
  let estiloAnterior = -1;
  while (proximo < itens.length) {
    const cabe = itens.length - proximo >= colunas - 1; // não deixa a última linha só com o anúncio
    const temPropaganda = linha === proximaLinhaComAnuncio && usadas < propagandas && cabe && colunas > 1;
    let posicao = -1;
    let estilo = 0;
    if (temPropaganda) {
      do posicao = Math.floor(sortear() * colunas);
      while (posicao === colunaAnterior);
      do estilo = Math.floor(sortear() * ESTILOS_PROPAGANDA);
      while (estilo === estiloAnterior);
      colunaAnterior = posicao;
      estiloAnterior = estilo;
      proximaLinhaComAnuncio = linha + 3 + Math.floor(sortear() * 2); // 2 ou 3 linhas de produto no meio
    } else if (linha === proximaLinhaComAnuncio) {
      proximaLinhaComAnuncio += 1;
    }
    for (let coluna = 0; coluna < colunas && proximo < itens.length; coluna++) {
      if (coluna === posicao) celulas.push({ tipo: "propaganda", indice: usadas++, estilo });
      else celulas.push({ tipo: "produto", item: itens[proximo++] });
    }
    linha += 1;
  }
  const sorteados = ordemAnuncios.filter((indice) => indice < usadas);
  return celulas.map((celula) => (celula.tipo === "propaganda" ? { ...celula, indice: sorteados[celula.indice] } : celula));
}

// Blocos editoriais grandes (a "Monthly Edit" da Lululemon, lululemon-animacoes-edicao.md §3): cada
// bloco ocupa 2 colunas na altura de UM card e fica numa linha só dele com os cards que sobram
// (na grade de 3: o bloco e 1 card). Um bloco a cada `intervalo` linhas de cards, alternando o lado
// conforme `lados` (1º à esquerda, 2º à direita…). Roda sobre as células já com as propagandas
// (intercalarPropagandas): o card que acompanha o bloco é sempre um PRODUTO (a altura da linha é a
// do card) e as propagandas seguem na ordem em que estavam. Bloco só entra se houver produtos para
// completar a linha; os que não cabem ficam de fora. Lista curta (categoria pequena ou filtrada) que
// não chega à `primeiraLinha`: o 1º bloco sobe para a última linha que ainda tem produto.
export type LadoBloco = "esquerda" | "direita";
export type CelulaComBloco<T> = Celula<T> | { tipo: "bloco"; indice: number; lado: LadoBloco };

export function intercalarBlocos<T>(
  celulas: Celula<T>[],
  colunas: number,
  lados: LadoBloco[],
  { primeiraLinha = 0, intervalo = 2 }: { primeiraLinha?: number; intervalo?: number } = {},
): CelulaComBloco<T>[] {
  if (lados.length === 0 || colunas < 3) return [...celulas];
  for (let linha = Math.max(0, primeiraLinha); linha > 0; linha--) {
    const tentativa = posicionarBlocos(celulas, colunas, lados, linha, intervalo);
    if (tentativa.some((celula) => celula.tipo === "bloco")) return tentativa;
  }
  return posicionarBlocos(celulas, colunas, lados, 0, intervalo);
}

function posicionarBlocos<T>(
  celulas: Celula<T>[],
  colunas: number,
  lados: LadoBloco[],
  primeiraLinha: number,
  intervalo: number,
): CelulaComBloco<T>[] {
  const companheiros = colunas - 2; // cards ao lado do bloco
  const fila = [...celulas];
  const saida: CelulaComBloco<T>[] = [];
  let linha = 0;
  let usados = 0;
  let proximaLinhaComBloco = primeiraLinha;
  while (fila.length > 0) {
    if (usados < lados.length && linha === proximaLinhaComBloco) {
      const posicoes: number[] = [];
      for (let i = 0; i < fila.length && posicoes.length < companheiros; i++) if (fila[i].tipo === "produto") posicoes.push(i);
      if (posicoes.length === companheiros) {
        const cards = posicoes.map((posicao) => fila[posicao]);
        for (const posicao of [...posicoes].reverse()) fila.splice(posicao, 1);
        const lado = lados[usados];
        const bloco: CelulaComBloco<T> = { tipo: "bloco", indice: usados, lado };
        saida.push(...(lado === "esquerda" ? [bloco, ...cards] : [...cards, bloco]));
        usados += 1;
        proximaLinhaComBloco = linha + intervalo + 1;
        linha += 1;
        continue;
      }
      proximaLinhaComBloco = -1; // faltam produtos: nenhum bloco depois deste ponto
    }
    saida.push(...fila.splice(0, colunas));
    linha += 1;
  }
  return saida;
}
