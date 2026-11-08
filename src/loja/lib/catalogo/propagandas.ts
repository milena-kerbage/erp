// Propagandas intercaladas na grade da listagem (categoria e busca), no modelo da Lululemon
// (referencia.md §13): cada página mostra as que complementam aquela compra, mais as gerais.
// Funções puras e sem imports locais, como listagem.ts: rodam no servidor e no `node --test`.
//
// Regras do conteúdo (tests/loja/propagandas.test.mjs confere):
// - nada de promessa comercial: sem preço, desconto, cupom, frete, prazo ou "oferta";
// - link só para rota que existe (categoria do menu, /pronta-entrega, /busca, /carrinho);
// - foto opcional: real do ateliê em public/vitrine/propagandas/, com a origem em CREDITOS.md.
//   Sem foto, o card mostra um bloco sálvia com o texto (CardPropaganda).
// PROVISÓRIO: vão para o admin como os banners da home.

// Os 3 estilos da grade: escuro (texto branco embaixo), claro (bloco branco embaixo) e topo
// (texto branco em cima). O índice é o mesmo de `estilo` em intercalarPropagandas.
export const ESTILOS = ["escuro", "claro", "topo"] as const;
export type EstiloPropaganda = (typeof ESTILOS)[number];

export type ImagemPropaganda = {
  src: string; // /vitrine/propagandas/<arquivo>.webp (3:4, 960 × 1280)
  posicao?: string; // object-position quando o card fica deitado (celular); padrão: centro
};

export type Propaganda = {
  id: string;
  titulo: string; // curto, com ponto final (como a Lululemon)
  texto: string; // uma linha de apoio
  acao: string; // CTA sublinhado
  href: string;
  imagem?: ImagemPropaganda; // sem foto ainda: bloco sálvia
  // Fotos de reserva: se a principal já estiver em outra propaganda da mesma página, usa a próxima.
  alternativas?: ImagemPropaganda[];
  // Onde aparece: prefixos de categoria ("kit-berco", "enxoval/paninhos"). Vazio = geral,
  // entra em toda listagem depois das específicas.
  onde: string[];
  // Palavras da busca que puxam esta propaganda (sem acento, minúsculas). Com 4 letras ou mais,
  // casa pelo começo da palavra ("bordad" pega "bordado"); mais curtas, só a palavra inteira.
  termos?: string[];
  // Foto com fundo escuro e a peça em cima: só funciona com o texto branco embaixo.
  estilo?: EstiloPropaganda;
};

// Específicas, por categoria. A área Projetos tem as suas (src/loja/lib/casas/propagandas.ts), que
// ocupam algumas posições em kit berço e quarto; a escolha e os testes valem para elas sem mudar nada.
export const PROPAGANDAS: Propaganda[] = [
  // Kit berço
  {
    id: "berco-completo",
    titulo: "O berço inteiro, combinando.",
    texto: "Protetor, edredom, saia e lençóis no mesmo tecido e no mesmo bordado.",
    acao: "Ver kits completos",
    href: "/kit-berco/kits",
    onde: ["kit-berco"],
    termos: ["kit", "berco", "protetor", "edredom"],
  },
  {
    id: "lencol-percal",
    titulo: "Lençol que respira.",
    texto: "Percal 200 fios de algodão: fresquinho até no calor de Fortaleza.",
    acao: "Ver lençóis",
    href: "/kit-berco/lencois",
    onde: ["kit-berco/kits", "kit-berco/protetores", "kit-berco/edredons", "kit-berco/saias"],
    termos: ["lencol", "percal", "fronha"],
  },
  {
    id: "bordado-nome",
    titulo: "Com o nome do bebê.",
    texto: "Bordamos o nome à mão no protetor, na toalha e na bolsa maternidade.",
    acao: "Ver protetores bordados",
    href: "/kit-berco/protetores",
    onde: ["kit-berco/kits", "enxoval/toalhas", "maternidade/bolsas"],
    termos: ["bordado", "nome", "personaliz"],
    estilo: "claro",
  },
  // Enxoval
  {
    id: "paninhos",
    titulo: "Paninho nunca é demais.",
    texto: "Fraldas de boca, cueiros e babadores macios, de puro algodão.",
    acao: "Ver paninhos",
    href: "/enxoval/paninhos",
    onde: ["enxoval"],
    termos: ["paninho", "fralda", "cueiro", "babador"],
  },
  {
    id: "banho",
    titulo: "Hora do banho, do jeito certo.",
    texto: "Toalha com capuz felpuda e bordada, que seca sem irritar a pele.",
    acao: "Ver toalhas",
    href: "/enxoval/toalhas",
    onde: ["enxoval/paninhos", "enxoval/kits"],
    termos: ["toalha", "banho", "capuz"],
  },
  // Quarto de bebê
  {
    id: "quarto-claro",
    titulo: "Luz suave no quartinho.",
    texto: "Cortina de linho com voal: claridade de dia e escuro na hora da soneca.",
    acao: "Ver cortinas",
    href: "/quarto/cortinas",
    onde: ["quarto"],
    termos: ["cortina", "linho", "voal"],
  },
  {
    id: "chao-macio",
    titulo: "Chão macio para engatinhar.",
    texto: "Tapete de crochê feito à mão em fio de algodão cru.",
    acao: "Ver tapetes",
    href: "/quarto/tapetes",
    onde: ["quarto", "kit-berco"],
    termos: ["tapete", "croche"],
  },
  // Maternidade
  {
    id: "mala-maternidade",
    titulo: "A mala da maternidade, pronta.",
    texto: "Bolsa, frasqueira e necessaire no mesmo tecido, com o nome bordado.",
    acao: "Ver bolsas",
    href: "/maternidade/bolsas",
    onde: ["maternidade"],
    termos: ["bolsa", "mala", "maternidade", "frasqueira"],
  },
  {
    id: "primeiro-look",
    titulo: "O primeiro look do bebê.",
    texto: "Saída de tricô com casaquinho, macacão, touca e manta.",
    acao: "Ver saídas de maternidade",
    href: "/maternidade/saidas",
    onde: ["maternidade", "enxoval/mantas"],
    termos: ["saida", "trico", "casaquinho"],
  },
  {
    id: "porta",
    titulo: "Boas-vindas na porta.",
    texto: "Enfeite bordado à mão com o nome, para a porta do quarto da maternidade.",
    acao: "Ver enfeites de porta",
    href: "/maternidade/enfeites-de-porta",
    onde: ["maternidade/bolsas", "maternidade/saidas", "maternidade/kits"],
    termos: ["enfeite", "porta"],
    estilo: "claro",
  },
];

// Gerais: entram em toda listagem, depois das específicas.
export const PROPAGANDAS_GERAIS: Propaganda[] = [
  {
    id: "pronta-entrega",
    titulo: "Peças que já estão prontas.",
    texto: "Kit berço, paninhos e saídas de maternidade que não esperam a produção.",
    acao: "Ver pronta entrega",
    href: "/pronta-entrega",
    onde: [],
  },
  {
    id: "projeto-quartinho",
    titulo: "O quarto inteiro, planejado.",
    texto: "O ateliê desenha o quartinho no tema que você escolher, do berço à cortina.",
    acao: "Conhecer os projetos",
    href: "/projetos",
    onde: [],
  },
];

const MAX_ESPECIFICAS = 3; // cabem ~3 propagandas por página de 24; as gerais completam a lista

export type ContextoPropaganda =
  | { tipo: "categoria"; categoria: string } // "kit-berco/kits" (sem barra inicial)
  | { tipo: "busca"; termo: string; caminhos: string[] }; // caminhos = categorias dos resultados

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function dentro(caminho: string, prefixo: string): boolean {
  return caminho === prefixo || caminho.startsWith(`${prefixo}/`);
}

// Pontos da propaganda para a página: o prefixo mais fundo que casa vale mais (subcategoria antes
// da categoria); a de uma subcategoria também entra na mãe, que lista os mesmos produtos, com meio
// ponto. Na busca, soma o peso de cada categoria dos resultados e as palavras buscadas.
function pontuar(propaganda: Propaganda, contexto: ContextoPropaganda): number {
  const profundidade = (caminho: string) =>
    Math.max(
      0,
      ...propaganda.onde.map((prefixo) => {
        if (dentro(caminho, prefixo)) return prefixo.split("/").length;
        return dentro(prefixo, caminho) ? 0.5 : 0;
      }),
    );
  if (contexto.tipo === "categoria") return profundidade(contexto.categoria);
  const pesos = new Map<string, number>();
  for (const caminho of contexto.caminhos) {
    const chave = caminho.replace(/^\//, "");
    pesos.set(chave, (pesos.get(chave) ?? 0) + 1);
  }
  let pontos = 0;
  for (const [caminho, quantos] of pesos) if (profundidade(caminho) > 0) pontos += quantos / contexto.caminhos.length;
  const palavras = semAcento(contexto.termo)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const casadas = (propaganda.termos ?? []).filter((termo) =>
    palavras.some((palavra) => palavra === termo || (termo.length >= 4 && palavra.startsWith(termo))),
  );
  return pontos + casadas.length;
}

// Link para a própria página (ou para uma mãe dela) não leva a lugar novo.
function apontaParaCa(propaganda: Propaganda, contexto: ContextoPropaganda): boolean {
  if (contexto.tipo !== "categoria" || !propaganda.href.startsWith("/")) return false;
  return dentro(contexto.categoria, propaganda.href.slice(1));
}

// Lista de propagandas da página, em ordem de relevância (intercalarPropagandas sorteia a ordem
// em que aparecem): até 3 específicas e depois as gerais, sem repetir foto na mesma página.
export function escolherPropagandas(
  contexto: ContextoPropaganda,
  especificas: Propaganda[] = PROPAGANDAS,
  gerais: Propaganda[] = PROPAGANDAS_GERAIS,
): Propaganda[] {
  const candidatas = especificas
    .filter((propaganda) => !apontaParaCa(propaganda, contexto))
    .map((propaganda, ordem) => ({ propaganda, ordem, pontos: pontuar(propaganda, contexto) }))
    .filter(({ pontos }) => pontos > 0)
    .sort((a, b) => b.pontos - a.pontos || a.ordem - b.ordem)
    .map(({ propaganda }) => propaganda);

  const fotos = new Set<string>();
  const escolhidas: Propaganda[] = [];
  const incluir = (propaganda: Propaganda) => {
    // Sem foto (bloco sálvia): entra sem disputar foto com as outras.
    if (!propaganda.imagem) {
      escolhidas.push(propaganda);
      return;
    }
    const imagem = [propaganda.imagem, ...(propaganda.alternativas ?? [])].find((opcao) => !fotos.has(opcao.src));
    if (!imagem) return;
    fotos.add(imagem.src);
    escolhidas.push(imagem === propaganda.imagem ? propaganda : { ...propaganda, imagem });
  };
  for (const propaganda of candidatas) if (escolhidas.length < MAX_ESPECIFICAS) incluir(propaganda);
  for (const propaganda of gerais.filter((geral) => !apontaParaCa(geral, contexto))) incluir(propaganda);
  return escolhidas;
}
