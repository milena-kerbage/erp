// Posts do Instagram do ateliê pela API oficial (Instagram API with Instagram Login, conta profissional):
// GET https://graph.instagram.com/v{versão}/me/media?fields=…&limit=12&access_token=…
// Puro e sem dependências: a busca recebe o `fetch` e o token de fora, então roda no `node --test`
// (tests/loja/instagram.test.mjs). Quem lê a variável de ambiente e registra o erro é ./servidor.ts.
//
// Regras:
// - Nada de post inventado: sem token, ou com a API fora do ar, o resultado é { ok: false } e a seção
//   mostra só o convite para seguir.
// - As URLs da CDN do Instagram expiram. A página nunca usa a URL da CDN: cada imagem passa pela rota
//   própria /api/instagram/midia/<id>, que busca a URL atual pelo id (ver o route.ts).
// - Vídeo e reels: a capa (thumbnail_url). Carrossel: a capa (media_url). Sem imagem utilizável, o post
//   fica de fora.

export const VERSAO_PADRAO = "v27.0";
export const LIMITE_POSTS = 12;
export const TAG_INSTAGRAM = "instagram";
export const REVALIDAR_S = 3600; // 1 h
export const TEMPO_LIMITE_MS = 5000;
export const CAMPOS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
const TAMANHO_TRECHO = 140;

export type TipoPost = "imagem" | "video" | "carrossel";

export type PostInstagram = {
  id: string;
  tipo: TipoPost;
  legenda: string;
  trecho: string; // até 140 caracteres, em uma linha (hover e texto alternativo)
  link: string; // permalink do post
  data: string; // ISO 8601
  /** URL da CDN no momento da busca. Só para o servidor (rota de mídia): nunca vai para a página. */
  origem: string;
  /** Endereço da imagem na loja (rota proxy). */
  imagem: string;
};

export type MotivoFalha = "sem-token" | "versao-invalida" | "erro-api" | "tempo-esgotado" | "resposta-invalida" | "rede";

export type ResultadoFeed = { ok: true; posts: PostInstagram[] } | { ok: false; motivo: MotivoFalha; detalhe?: string };

type MidiaBruta = {
  id?: unknown;
  caption?: unknown;
  media_type?: unknown;
  media_url?: unknown;
  thumbnail_url?: unknown;
  permalink?: unknown;
  timestamp?: unknown;
};

const ID = /^\d{1,32}$/;
const VERSAO = /^v\d{1,3}\.\d{1,2}$/;
const VIDEO_NA_URL = /\.(mp4|mov|webm)(\?|$)/i;

export function versaoValida(versao: string): boolean {
  return VERSAO.test(versao);
}

export function idValido(id: string): boolean {
  return ID.test(id);
}

/** Só https e só os domínios da CDN do Instagram/Facebook (a rota de mídia não vira um proxy aberto). */
export function urlDaCdn(valor: unknown): string | null {
  if (typeof valor !== "string" || !valor) return null;
  try {
    const url = new URL(valor);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    const permitido = host === "cdninstagram.com" || host.endsWith(".cdninstagram.com") || host === "fbcdn.net" || host.endsWith(".fbcdn.net");
    return permitido ? url.toString() : null;
  } catch {
    return null;
  }
}

function permalinkValido(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  try {
    const url = new URL(valor);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && (host === "instagram.com" || host === "www.instagram.com") ? url.toString() : null;
  } catch {
    return null;
  }
}

function tipoDe(valor: unknown): TipoPost | null {
  if (valor === "IMAGE") return "imagem";
  if (valor === "VIDEO" || valor === "REELS") return "video";
  if (valor === "CAROUSEL_ALBUM") return "carrossel";
  return null;
}

/** Imagem que dá para mostrar: capa no vídeo; media_url na foto e no carrossel (capa de vídeo, se for). */
export function imagemDe(midia: MidiaBruta): string | null {
  const tipo = tipoDe(midia.media_type);
  if (!tipo) return null;
  if (tipo === "video") return urlDaCdn(midia.thumbnail_url);
  const principal = urlDaCdn(midia.media_url);
  if (principal && !VIDEO_NA_URL.test(new URL(principal).pathname)) return principal;
  return urlDaCdn(midia.thumbnail_url);
}

/** Legenda numa linha, cortada na palavra, com reticências. */
export function trechoDe(legenda: string, tamanho = TAMANHO_TRECHO): string {
  const linha = legenda.replace(/\s+/g, " ").trim();
  if (linha.length <= tamanho) return linha;
  const corte = linha.slice(0, tamanho);
  const espaco = corte.lastIndexOf(" ");
  return `${(espaco > tamanho * 0.6 ? corte.slice(0, espaco) : corte).replace(/[\s.,;:!?–-]+$/, "")}…`;
}

export function rotaDaImagem(id: string): string {
  return `/api/instagram/midia/${id}`;
}

/** Converte um item de /me/media (ou de /{id}) num post da loja; null se faltar algo essencial. */
export function normalizarMidia(midia: MidiaBruta): PostInstagram | null {
  if (!midia || typeof midia !== "object") return null;
  const id = typeof midia.id === "string" ? midia.id : "";
  const tipo = tipoDe(midia.media_type);
  const link = permalinkValido(midia.permalink);
  const origem = imagemDe(midia);
  if (!idValido(id) || !tipo || !link || !origem) return null;
  const legenda = typeof midia.caption === "string" ? midia.caption.trim() : "";
  const instante = typeof midia.timestamp === "string" ? Date.parse(midia.timestamp) : Number.NaN;
  return {
    id,
    tipo,
    legenda,
    trecho: trechoDe(legenda),
    link,
    data: Number.isNaN(instante) ? "" : new Date(instante).toISOString(),
    origem,
    imagem: rotaDaImagem(id),
  };
}

/** Resposta de /me/media → posts válidos, sem repetição, até `limite`. null se o formato não bater. */
export function normalizarResposta(json: unknown, limite = LIMITE_POSTS): PostInstagram[] | null {
  if (!json || typeof json !== "object" || !Array.isArray((json as { data?: unknown }).data)) return null;
  const vistos = new Set<string>();
  const posts: PostInstagram[] = [];
  for (const item of (json as { data: MidiaBruta[] }).data) {
    const post = normalizarMidia(item);
    if (!post || vistos.has(post.id)) continue;
    vistos.add(post.id);
    posts.push(post);
    if (posts.length >= limite) break;
  }
  return posts;
}

export function urlDoFeed(versao: string, token: string, limite = LIMITE_POSTS): string {
  const url = new URL(`https://graph.instagram.com/${versao}/me/media`);
  url.searchParams.set("fields", CAMPOS);
  url.searchParams.set("limit", String(limite));
  url.searchParams.set("access_token", token);
  return url.toString();
}

export function urlDaMidia(versao: string, id: string, token: string): string {
  const url = new URL(`https://graph.instagram.com/${versao}/${id}`);
  url.searchParams.set("fields", "id,media_type,media_url,thumbnail_url");
  url.searchParams.set("access_token", token);
  return url.toString();
}

/** Mensagem de erro da API sem o token (a Meta não costuma ecoar, mas o log nunca pode levar). */
export function detalheDoErro(json: unknown, status: number, token: string): string {
  const erro = json && typeof json === "object" ? (json as { error?: { message?: unknown; code?: unknown } }).error : undefined;
  const mensagem = typeof erro?.message === "string" ? erro.message : "";
  const codigo = typeof erro?.code === "number" || typeof erro?.code === "string" ? ` código ${erro.code}` : "";
  const texto = `HTTP ${status}${codigo}${mensagem ? `: ${mensagem}` : ""}`.slice(0, 300);
  return token ? texto.split(token).join("***") : texto;
}

type Busca = (url: string, init: RequestInit & { next?: { revalidate?: number; tags?: string[] } }) => Promise<Response>;

/**
 * Busca e normaliza os posts. Nunca lança: qualquer falha vira { ok: false, motivo }. O `next` (cache de
 * 1 h com a tag "instagram") só tem efeito no fetch do Next; no node --test é ignorado.
 */
export async function buscarFeed({
  token,
  versao = VERSAO_PADRAO,
  buscar = fetch,
  tempoLimiteMs = TEMPO_LIMITE_MS,
  limite = LIMITE_POSTS,
}: {
  token: string | undefined;
  versao?: string;
  buscar?: Busca;
  tempoLimiteMs?: number;
  limite?: number;
}): Promise<ResultadoFeed> {
  const chave = token?.trim();
  if (!chave) return { ok: false, motivo: "sem-token" };
  if (!versaoValida(versao)) return { ok: false, motivo: "versao-invalida", detalhe: versao };
  let resposta: Response;
  try {
    resposta = await buscar(urlDoFeed(versao, chave, limite), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(tempoLimiteMs),
      next: { revalidate: REVALIDAR_S, tags: [TAG_INSTAGRAM] },
    });
  } catch (erro) {
    const tempo = erro instanceof Error && (erro.name === "TimeoutError" || erro.name === "AbortError");
    return { ok: false, motivo: tempo ? "tempo-esgotado" : "rede", detalhe: tempo ? `${tempoLimiteMs} ms` : erro instanceof Error ? erro.message.split(chave).join("***") : undefined };
  }
  const json: unknown = await resposta.json().catch(() => null);
  if (!resposta.ok) return { ok: false, motivo: "erro-api", detalhe: detalheDoErro(json, resposta.status, chave) };
  const posts = normalizarResposta(json, limite);
  if (!posts) return { ok: false, motivo: "resposta-invalida" };
  return { ok: true, posts };
}
