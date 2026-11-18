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
  src: string; // /vitrine/propagandas/<arquivo>.webp (3:4, 960 × 1280) ou a capa .webp do vídeo
  video?: string; // /vitrine/videos/<arquivo>.mp4: curto, sem áudio, em loop (a `src` vira a capa)
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
    texto: "Protetor, edredom, almofadas e lençol no mesmo tecido e no mesmo bordado.",
    acao: "Ver kits completos",
    href: "/kit-berco/kits",
    imagem: { src: "/vitrine/videos/kit-berco-menina.webp", video: "/vitrine/videos/kit-berco-menina.mp4" },
    alternativas: [{ src: "/vitrine/videos/kit-berco-menino.webp", video: "/vitrine/videos/kit-berco-menino.mp4" }],
    onde: ["kit-berco"],
    termos: ["kit", "berco", "protetor", "edredom"],
  },
  {
    id: "complementares-berco",
    titulo: "Complete com o ninho.",
    texto: "Ninho, trocador e almofada de amamentação no mesmo tema do kit.",
    acao: "Ver complementares",
    href: "/itens-complementares",
    imagem: { src: "/vitrine/videos/ninho.webp", video: "/vitrine/videos/ninho.mp4" },
    onde: ["kit-berco/kits", "kit-maternidade", "kit-cama-kids"],
    termos: ["ninho", "trocador", "amamentacao"],
  },
  {
    id: "bordado-nome",
    titulo: "Com o nome do bebê.",
    texto: "Bordado no kit, na toalha e nos paninhos. Qualquer peça pode ser personalizada.",
    acao: "Combinar o bordado",
    href: "/busca?q=bordado",
    imagem: { src: "/vitrine/videos/bordado-nome.webp", video: "/vitrine/videos/bordado-nome.mp4" },
    onde: ["kit-berco/kits", "kit-paninhos", "para-presentear"],
    termos: ["bordado", "nome", "personaliz"],
    estilo: "claro",
  },
  // Maternidade e paninhos
  {
    id: "paninhos",
    titulo: "Paninho nunca é demais.",
    texto: "Cueiro, fralda, fralda de ombro, pano de boca e toalha com capuz, bordados.",
    acao: "Ver kit paninhos",
    href: "/kit-paninhos",
    imagem: { src: "/vitrine/videos/kit-paninhos.webp", video: "/vitrine/videos/kit-paninhos.mp4" },
    onde: ["kit-maternidade", "para-presentear", "itens-complementares"],
    termos: ["paninho", "fralda", "cueiro", "toalha"],
  },
  {
    id: "kit-maternidade",
    titulo: "Pronta para a maternidade.",
    texto: "Manta, cueiros, paninhos, embalagem especial e o kit berço maternidade.",
    acao: "Ver kits maternidade",
    href: "/kit-maternidade",
    imagem: { src: "/vitrine/videos/ninho.webp", video: "/vitrine/videos/ninho.mp4" },
    onde: ["kit-paninhos", "itens-complementares", "para-presentear"],
    termos: ["maternidade", "manta", "ninho"],
  },
  {
    id: "amamentacao",
    titulo: "Conforto para amamentar.",
    texto: "Almofada de amamentação bordada, no mesmo tema do quartinho.",
    acao: "Ver complementares",
    href: "/itens-complementares",
    imagem: { src: "/vitrine/videos/almofada-amamentacao.webp", video: "/vitrine/videos/almofada-amamentacao.mp4" },
    onde: ["kit-maternidade", "kit-paninhos"],
    termos: ["almofada", "amamentacao"],
    estilo: "claro",
  },
  // Cama kids
  {
    id: "cama-kids",
    titulo: "A cama também ganha tema.",
    texto: "Almofadões, rolos e edredom para a cama de solteiro ou casal.",
    acao: "Ver kit cama kids",
    href: "/kit-cama-kids",
    imagem: { src: "/vitrine/videos/kit-cama-kids.webp", video: "/vitrine/videos/kit-cama-kids.mp4" },
    onde: ["kit-berco", "itens-complementares"],
    termos: ["cama", "kids", "solteiro", "almofadao"],
  },
];

// Gerais: entram em toda listagem, depois das específicas.
export const PROPAGANDAS_GERAIS: Propaganda[] = [
  {
    id: "pronta-entrega",
    titulo: "Peças que já estão prontas.",
    texto: "Kits e peças que já estão prontas, sem esperar a produção.",
    acao: "Ver pronta entrega",
    href: "/pronta-entrega",
    onde: [],
  },
  {
    id: "projeto-quartinho",
    titulo: "O quarto inteiro, planejado.",
    texto: "O ateliê desenha o quartinho no tema que você escolher. Qualquer item pode ser personalizado ou modificado.",
    acao: "Conhecer os quartinhos",
    href: "/personalizado",
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
