// Motor de URLs de listagem, filtros e busca. Uma fonte de verdade para: links internos,
// canonical, robots (meta e robots.txt) e redirecionamento de URLs fora do padrão.
// Regras em seo.md §3.3–3.6 e publicacao.md. Sem dependências: roda no Next e no `node --test`.

export type RegrasCategoria = {
  // Facetas que podem virar página indexável (têm demanda de busca), na ORDEM fixa do caminho,
  // com os valores permitidos (slugs). Qualquer outro filtro vai para a query e não é indexado.
  facetasIndexaveis: Array<{ chave: string; valores: string[] }>;
  maxSegmentosIndexaveis?: number; // padrão 1 (ex.: /kit-berco/kits/menina)
};

export type Regras = {
  categorias: Record<string, RegrasCategoria>; // chave = caminho da categoria ("kit-berco/kits")
  parametrosFiltro: string[]; // chaves de filtro aceitas na query (cor, preco, tecido…)
};

export type Listagem = {
  categoria: string; // "kit-berco/kits"
  filtros: Record<string, string[]>;
  ordem?: string;
  pagina?: number;
};

export type DecisaoUrl = {
  url: string; // relativa, canônica
  indexavel: boolean;
  canonical: string; // relativa; = url quando indexável
  motivo: string;
};

// "menor-area", "maior-area" e "mais-quartos": ordenações legadas da área Projetos (src/loja/lib/casas/filtros.ts).
export const ORDENS = [
  "relevancia",
  "menor-preco",
  "maior-preco",
  "mais-vendidos",
  "lancamentos",
  "avaliacao",
  "menor-area",
  "maior-area",
  "mais-quartos",
] as const;
export const ORDEM_PADRAO = "relevancia";
const MAX_VALORES_POR_FILTRO = 10;
const MAX_PAGINA = 500;
const MAX_BUSCA = 100;

export function slug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/,/g, "-") // 1,20 m → 1-20-m
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function montarUrlListagem(listagem: Listagem, regras: Regras): DecisaoUrl {
  const categoria = listagem.categoria.split("/").map(slug).filter(Boolean).join("/");
  const regrasCategoria = regras.categorias[categoria];
  const filtros = normalizarFiltros(listagem.filtros, regras.parametrosFiltro);

  // 1. Facetas indexáveis viram segmentos de caminho (ordem fixa), se couberem no limite.
  const segmentos: string[] = [];
  const restantes = { ...filtros };
  if (regrasCategoria) {
    const limite = regrasCategoria.maxSegmentosIndexaveis ?? 1;
    for (const faceta of regrasCategoria.facetasIndexaveis) {
      const valores = restantes[faceta.chave];
      if (valores?.length === 1 && faceta.valores.includes(valores[0]) && segmentos.length < limite) {
        segmentos.push(valores[0]);
        delete restantes[faceta.chave];
      }
    }
  }

  // 2. O resto vai para a query, em ordem alfabética de chave e de valor.
  const query = new URLSearchParams();
  for (const chave of Object.keys(restantes).sort()) query.set(chave, restantes[chave].join(","));
  const ordem =
    listagem.ordem && listagem.ordem !== ORDEM_PADRAO && (ORDENS as readonly string[]).includes(listagem.ordem)
      ? listagem.ordem
      : undefined;
  if (ordem) query.set("ordem", ordem);
  const pagina = Math.min(Math.max(1, Math.trunc(listagem.pagina ?? 1)), MAX_PAGINA);
  if (pagina > 1) query.set("pagina", String(pagina));

  const caminho = `/${[categoria, ...segmentos].filter(Boolean).join("/")}`;
  const textoQuery = query.toString().replace(/%2C/g, ",");
  const url = textoQuery ? `${caminho}?${textoQuery}` : caminho;

  // 3. Indexável = só caminho (+ página). Filtros na query e ordenação: não (bloqueados no robots.txt).
  const temFiltroNaQuery = Object.keys(restantes).length > 0;
  if (temFiltroNaQuery) return { url, indexavel: false, canonical: url, motivo: "filtro sem demanda de busca (query)" };
  if (ordem) return { url, indexavel: false, canonical: url, motivo: "ordenação" };
  return { url, indexavel: true, canonical: url, motivo: segmentos.length ? "faceta indexável" : "categoria" };
}

export type Interpretacao =
  | { tipo: "ok"; listagem: Listagem; decisao: DecisaoUrl }
  | { tipo: "redirecionar"; destino: string } // 301 para a forma canônica
  | { tipo: "nao-encontrado" }; // 404 na própria URL (nunca redirecionar para página genérica)

export function interpretarUrlListagem(
  caminho: string,
  busca: URLSearchParams,
  categoriasExistentes: Set<string>,
  regras: Regras,
): Interpretacao {
  const partes = caminho.split("/").filter(Boolean);
  // Categoria = maior prefixo existente (comparando já normalizado); o que sobra são segmentos de faceta.
  let categoriaNormal = "";
  let tamanhoCategoria = 0;
  for (let i = partes.length; i > 0; i--) {
    const candidata = partes.slice(0, i).map(slug).join("/");
    if (categoriasExistentes.has(candidata)) {
      categoriaNormal = candidata;
      tamanhoCategoria = i;
      break;
    }
  }
  if (!categoriaNormal) return { tipo: "nao-encontrado" };

  const filtros: Record<string, string[]> = {};
  const segmentos = partes.slice(tamanhoCategoria);
  const regrasCategoria = regras.categorias[categoriaNormal];
  for (const segmento of segmentos) {
    const valor = slug(segmento);
    const faceta = regrasCategoria?.facetasIndexaveis.find((f) => f.valores.includes(valor));
    if (!faceta || filtros[faceta.chave]) return { tipo: "nao-encontrado" }; // segmento desconhecido ou repetido
    filtros[faceta.chave] = [valor];
  }
  for (const [chave, valor] of busca) {
    if (!regras.parametrosFiltro.includes(chave)) continue; // ordem/pagina tratadas abaixo; utm etc. ignorados
    filtros[chave] = [...(filtros[chave] ?? []), ...valor.split(",")];
  }

  const paginaBruta = busca.get("pagina");
  const pagina = paginaBruta === null ? 1 : Number(paginaBruta);
  if (!Number.isInteger(pagina) || pagina < 1 || pagina > MAX_PAGINA) return { tipo: "nao-encontrado" };
  const listagem: Listagem = { categoria: categoriaNormal, filtros, ordem: busca.get("ordem") ?? undefined, pagina };
  const decisao = montarUrlListagem(listagem, regras);

  // Compara com a forma canônica ignorando parâmetros de campanha (utm_*, gclid…), que não mudam a página.
  // No redirecionamento eles são preservados: a tag do Google e o Pixel ainda precisam lê-los.
  const rastreio = new URLSearchParams([...busca].filter(([chave]) => PARAMETROS_RASTREIO.test(chave)));
  if (urlSemRastreio(caminho, busca) !== decisao.url) {
    const extra = rastreio.toString();
    return { tipo: "redirecionar", destino: extra ? `${decisao.url}${decisao.url.includes("?") ? "&" : "?"}${extra}` : decisao.url };
  }
  return { tipo: "ok", listagem, decisao };
}

// Busca interna: /busca?q=. Nunca indexável (robots.txt). Termos populares viram categoria/faceta.
export function normalizarBusca(termo: string | null): string {
  return (termo ?? "").replace(/\s+/g, " ").trim().toLowerCase().slice(0, MAX_BUSCA);
}

export function montarUrlBusca(termo: string, pagina = 1): string {
  const q = normalizarBusca(termo);
  const query = new URLSearchParams({ q });
  if (pagina > 1) query.set("pagina", String(pagina));
  return `/busca?${query.toString()}`;
}

// Regras de robots.txt geradas da mesma fonte: o que o motor marca como não indexável é bloqueado aqui.
export function regrasRobots(regras: Regras): string[] {
  return ["/busca", "/carrinho", "/checkout", "/conta", "/*?*ordem=", ...regras.parametrosFiltro.map((chave) => `/*?*${chave}=`)];
}

function normalizarFiltros(filtros: Record<string, string[]>, aceitos: string[]): Record<string, string[]> {
  const saida: Record<string, string[]> = {};
  for (const [chave, valores] of Object.entries(filtros)) {
    if (!aceitos.includes(chave) && !chave.match(/^[a-z][a-z0-9_]*$/)) continue;
    const limpos = [...new Set(valores.map((v) => (chave === "preco" ? v.replace(/[^0-9-]/g, "") : slug(v))).filter(Boolean))]
      .sort()
      .slice(0, MAX_VALORES_POR_FILTRO);
    if (limpos.length) saida[chave] = limpos;
  }
  return saida;
}

const PARAMETROS_RASTREIO =
  /^(utm_|gclid$|gbraid$|wbraid$|dclid$|fbclid$|msclkid$|ttclid$|li_fat_id$|epik$|twclid$|sccid$|rdt_cid$|mc_|gad_|srsltid$|_gl$)/i;

// URL como chegou, sem os parâmetros de rastreio. Parâmetro desconhecido continua e, por não
// existir na forma canônica, provoca o redirecionamento para a URL limpa.
function urlSemRastreio(caminho: string, busca: URLSearchParams): string {
  const query = new URLSearchParams([...busca].filter(([chave]) => !PARAMETROS_RASTREIO.test(chave)));
  const texto = query.toString().replace(/%2C/g, ",");
  const limpo = `/${caminho.split("/").filter(Boolean).join("/")}`;
  return texto ? `${limpo}?${texto}` : limpo;
}
