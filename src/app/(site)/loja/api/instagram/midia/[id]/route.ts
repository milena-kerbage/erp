import { revalidateTag } from "next/cache";
import { idValido, normalizarMidia, TAG_INSTAGRAM, urlDaMidia } from "@/loja/lib/instagram/feed";
import { configuracaoInstagram, postsDoInstagram } from "@/loja/lib/instagram/servidor";

// GET /api/instagram/midia/{id}: imagem de um post do feed da home, servida pela própria loja.
// Por que um proxy (e não images.remotePatterns com a URL da CDN na página): as URLs da CDN do
// Instagram expiram e mudam; uma página em cache (ISR) ou o otimizador de imagens guardariam um
// endereço que um dia quebra. Aqui a página só conhece /api/instagram/midia/<id>, que é estável:
// 1. o id precisa estar no feed atual (cache de 1 h): a rota não vira um proxy aberto;
// 2. busca os bytes na URL do feed; se ela expirou (403/404/410…), pede a URL atual pelo id à API
//    (sem cache) e marca o feed como velho (revalidateTag), para a próxima busca já vir com as novas;
// 3. responde a imagem com cache curto no navegador (1 h) e na CDN (1 h, servindo a cópia velha por
//    até 1 dia enquanto renova). O visitante não fala com a CDN da Meta (nem o IP dele).

export const runtime = "nodejs";

const LIMITE_BYTES = 8 * 1024 * 1024;
const TEMPO_LIMITE_MS = 8000;
const SEM_CACHE = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } as const;

async function baixar(url: string): Promise<Response | null> {
  try {
    const resposta = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(TEMPO_LIMITE_MS) });
    const tipo = resposta.headers.get("content-type") ?? "";
    const tamanho = Number(resposta.headers.get("content-length") ?? "0");
    if (!resposta.ok || !tipo.startsWith("image/") || tamanho > LIMITE_BYTES) return null;
    return resposta;
  } catch {
    return null;
  }
}

async function urlAtual(id: string): Promise<string | null> {
  const { token, versao } = configuracaoInstagram();
  if (!token) return null;
  try {
    const resposta = await fetch(urlDaMidia(versao, id, token), { cache: "no-store", signal: AbortSignal.timeout(TEMPO_LIMITE_MS) });
    if (!resposta.ok) return null;
    return normalizarMidiaParcial(await resposta.json());
  } catch {
    return null;
  }
}

// /{id} não traz permalink: completa só para reaproveitar a mesma validação de tipo e de domínio.
function normalizarMidiaParcial(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const post = normalizarMidia({ ...(json as object), permalink: "https://www.instagram.com/" });
  return post?.origem ?? null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!idValido(id)) return new Response(null, { status: 404, headers: SEM_CACHE });

  const feed = await postsDoInstagram();
  const post = feed.ok ? feed.posts.find((item) => item.id === id) : undefined;
  if (!post) return new Response(null, { status: 404, headers: SEM_CACHE });

  let imagem = await baixar(post.origem);
  if (!imagem) {
    const nova = await urlAtual(id);
    if (nova) {
      imagem = await baixar(nova);
      try {
        revalidateTag(TAG_INSTAGRAM, "max");
      } catch {
        // fora de um handler do Next
      }
    }
  }
  if (!imagem?.body) {
    console.error(`[instagram] Imagem do post ${id} indisponível na CDN e na API.`);
    return new Response(null, { status: 502, headers: SEM_CACHE });
  }

  const cabecalhos = new Headers({
    "Content-Type": imagem.headers.get("content-type") ?? "image/jpeg",
    "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    "Content-Disposition": "inline",
    "X-Content-Type-Options": "nosniff",
  });
  const tamanho = imagem.headers.get("content-length");
  // O fetch do Node descompacta o corpo: o tamanho original só vale sem content-encoding.
  if (tamanho && !imagem.headers.get("content-encoding")) cabecalhos.set("Content-Length", tamanho);
  return new Response(imagem.body, { headers: cabecalhos });
}
