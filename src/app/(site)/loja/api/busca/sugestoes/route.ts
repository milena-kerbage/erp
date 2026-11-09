import type { NextRequest } from "next/server";
import { sugerir } from "@/loja/lib/catalogo/indiceBusca";
import { normalizarBusca } from "@/loja/lib/seo/urls";

// GET /api/busca/sugestoes?q=ber → { q, termos, produtos, categorias, projetos, total }
// Sugestões da gaveta de busca enquanto se digita (o cliente pede com debounce de 200 ms, a partir
// de 2 letras). Rota leve em vez de índice no navegador: o cabeçalho está em toda página e não
// carrega o catálogo; quando o catálogo vier da API do ERP, só o índice do servidor muda.
// A resposta é a mesma para todos (sem cookie nem sessão): o navegador guarda 5 min e o CDN 1 h,
// servindo a versão antiga enquanto revalida. O servidor também guarda as consultas recentes.
export async function GET(request: NextRequest) {
  const q = normalizarBusca(request.nextUrl.searchParams.get("q"));
  return Response.json(await sugerir(q), {
    headers: { "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
