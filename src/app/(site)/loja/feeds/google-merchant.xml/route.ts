import { catalogoDaLoja } from "@/lib/loja/catalogo";
import { feedDoMerchant } from "@/loja/lib/seo/merchant";

// GET /feeds/google-merchant.xml: feed de produtos para o Google Merchant Center (RSS 2.0 com o namespace g:),
// para cadastrar lá como fonte de dados por URL agendada (docs/loja.md › Google Merchant Center). Um item por
// produto ativo do catálogo real, com foto e preço; o catálogo de exemplo nunca sai (canal vazio).
// A CDN guarda por 1 h; se o catálogo do banco estiver fora do ar, a resposta vazia vale só 1 min.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const catalogo = await catalogoDaLoja();
  const real = catalogo.origem === "banco";
  return new Response(feedDoMerchant(catalogo.produtos, real), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": real ? "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" : "public, max-age=0, s-maxage=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
