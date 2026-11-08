import { type NextRequest, NextResponse } from "next/server";
import { PASTA_PUBLICA_LOJA, PREFIXO_LOJA } from "@/lib/hosts";
import { CATEGORIAS_EXISTENTES } from "@/loja/lib/catalogo/categorias";
import { planejarCookies } from "@/loja/lib/rastreamento/nucleo";
import { REGRAS_SEO } from "@/loja/lib/seo/config";
import { interpretarUrlListagem } from "@/loja/lib/seo/urls";

// Proxy da loja (host www./domínio principal). Chamado pelo src/proxy.ts depois da separação por host.
// 1. URLs públicas (/produto/x) são reescritas para as rotas internas (/loja/produto/x);
// 2. listagem fora da forma canônica vai com 308 para a URL certa ANTES de renderizar (seo.md §3.5);
// 3. captura UTMs, IDs de clique, visitante e sessão no servidor (rastreamento.md): cookies por
//    Set-Cookie escapam do limite de 7 dias que o Safari impõe aos cookies de JS.
// Nunca faz autorização: a loja é pública.

// Primeiro segmento das categorias: só esses caminhos passam pelo motor de listagem.
const RAIZES_DE_CATEGORIA = new Set([...CATEGORIAS_EXISTENTES].map((chave) => chave.split("/")[0]));

// Arquivos gerados pelo Next dentro de /loja (ícones e imagens de compartilhamento) já vêm com o prefixo.
const ARQUIVO_GERADO = /\/(icon|apple-icon|opengraph-image|twitter-image)(-[\w-]+)?(\.\w+)?$/;
// Chave do IndexNow na raiz do domínio (publicacao.md §3.1): /{chave}.txt.
const CHAVE_INDEXNOW = /^\/([a-zA-Z0-9-]{8,128})\.txt$/;

function redirecionamentoCanonico(request: NextRequest): string | null {
  const raiz = request.nextUrl.pathname.split("/")[1]?.toLowerCase();
  if (!raiz || !RAIZES_DE_CATEGORIA.has(raiz)) return null;
  const resultado = interpretarUrlListagem(request.nextUrl.pathname, request.nextUrl.searchParams, CATEGORIAS_EXISTENTES, REGRAS_SEO);
  return resultado.tipo === "redirecionar" ? resultado.destino : null;
}

// Navegação de página de verdade: sem API, arquivo com extensão ou prefetch do roteador.
function ehNavegacao(request: NextRequest): boolean {
  const caminho = request.nextUrl.pathname;
  if (request.method !== "GET") return false;
  if (caminho.startsWith("/api/") || /\.[a-zA-Z0-9]+$/.test(caminho)) return false;
  if (request.headers.get("next-router-prefetch") || request.headers.get("purpose") === "prefetch") return false;
  return true;
}

function aplicarRastreamento(request: NextRequest, resposta: NextResponse) {
  const plano = planejarCookies({
    url: request.url,
    referer: request.headers.get("referer"),
    userAgent: request.headers.get("user-agent") ?? "",
    cookies: Object.fromEntries(request.cookies.getAll().map((c) => [c.name, c.value])),
    agoraMs: Date.now(),
    gerarId: () => crypto.randomUUID(),
  });
  const seguro = request.nextUrl.protocol === "https:";
  for (const cookie of plano.definir) {
    resposta.cookies.set({
      name: cookie.nome,
      value: cookie.valor,
      httpOnly: cookie.httpOnly,
      secure: seguro,
      sameSite: "lax",
      path: "/",
      ...(cookie.maxAge ? { maxAge: cookie.maxAge } : {}),
    });
  }
  for (const nome of plano.apagar) resposta.cookies.delete(nome);
}

function comCabecalhos(resposta: NextResponse): NextResponse {
  // Loja é pública e indexável: referência de origem preservada para atribuição de campanhas.
  resposta.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return resposta;
}

export function proxyLoja(request: NextRequest): NextResponse {
  const caminho = request.nextUrl.pathname;

  // Arquivos públicos da loja e robots.txt (gerado por host em src/app/robots.ts) passam direto.
  if (caminho.startsWith(`${PASTA_PUBLICA_LOJA}/`) || caminho === "/robots.txt") return comCabecalhos(NextResponse.next());

  // Prefixo interno digitado na barra: arquivos gerados passam; páginas vão para a URL pública.
  if (caminho === PREFIXO_LOJA || caminho.startsWith(`${PREFIXO_LOJA}/`)) {
    if (ARQUIVO_GERADO.test(caminho) || caminho.endsWith("/sitemap.xml")) return comCabecalhos(NextResponse.next());
    const publica = new URL(request.url);
    publica.pathname = caminho.slice(PREFIXO_LOJA.length) || "/";
    return NextResponse.redirect(publica, 308);
  }

  const indexNow = CHAVE_INDEXNOW.exec(caminho);
  if (indexNow) {
    const interna = new URL(`${PREFIXO_LOJA}/api/indexnow-chave`, request.url);
    interna.searchParams.set("chave", indexNow[1] ?? "");
    return comCabecalhos(NextResponse.rewrite(interna));
  }

  const navegacao = ehNavegacao(request);
  const destino = navegacao ? redirecionamentoCanonico(request) : null;
  let resposta: NextResponse;
  if (destino) {
    resposta = NextResponse.redirect(new URL(destino, request.url), 308);
  } else {
    const interna = new URL(request.url);
    interna.pathname = caminho === "/" ? PREFIXO_LOJA : `${PREFIXO_LOJA}${caminho}`;
    resposta = NextResponse.rewrite(interna);
  }
  if (navegacao) aplicarRastreamento(request, resposta);
  return comCabecalhos(resposta);
}
