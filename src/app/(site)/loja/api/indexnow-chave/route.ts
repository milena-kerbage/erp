import { connection, type NextRequest } from "next/server";

// Arquivo de verificação do IndexNow: https://loja…/{chave}.txt (rewrite em next.config.ts).
// Só responde para a chave configurada; qualquer outro nome .txt dá 404.
export async function GET(request: NextRequest) {
  await connection(); // a chave vem do ambiente de execução: não pode ser congelada no build
  const chave = process.env.INDEXNOW_CHAVE ?? "";
  // Após o rewrite a rota enxerga a URL original (/{chave}.txt); chamada direta usa ?chave=.
  const pedida = request.nextUrl.searchParams.get("chave") ?? request.nextUrl.pathname.match(/^\/([a-zA-Z0-9-]{8,128})\.txt$/)?.[1];
  if (!chave || pedida !== chave) {
    return new Response("Not Found", { status: 404 });
  }
  return new Response(chave, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
