// POST /api/consentimento: chamado pelo aviso de cookies logo depois da escolha. Não guarda nada: o proxy da loja
// reaplica os cookies de origem nesta resposta já com a decisão (90 dias com consentimento; sem identificadores de
// anúncio quando o marketing é recusado). Veja src/loja/proxy.ts e src/loja/lib/rastreamento/nucleo.ts.
export const runtime = "nodejs";

export function POST() {
  return new Response(null, { status: 204, headers: { "Cache-Control": "private, no-store" } });
}
