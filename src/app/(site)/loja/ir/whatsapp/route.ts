import { NextResponse, type NextRequest } from "next/server";
import { ORIGEM_LOJA } from "@/lib/hosts";
import { db } from "@/lib/whatsapp/core";
import { gerarCodigoRef, guardarReferencia, textoComRef } from "@/lib/whatsapp/origem";
import { chaveIp, limitar } from "@/loja/lib/contas/servidor";
import { EMPRESA } from "@/loja/lib/empresa";
import { origemDaRequisicao } from "@/loja/lib/rastreamento/origem";
import { MENSAGEM_PADRAO } from "@/loja/lib/whatsapp";

// GET /ir/whatsapp?texto=…: todo botão de WhatsApp do site passa por aqui. Guarda de onde a visitante veio (campanha,
// busca, indicação, página em que clicou), acrescenta "(ref. CÓDIGO)" à mensagem pronta e redireciona para a conversa
// com o ateliê. Quando a mensagem chega no ERP, o código devolve a origem para a conversa e para a ficha do lead.
// Só redireciona para o WhatsApp do próprio ateliê; se algo falhar, abre a conversa sem o código.
export const runtime = "nodejs";

const ROBOS = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pagespeed|monitor/i;

export async function GET(request: NextRequest) {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: tirar caracteres de controle é o objetivo
  const texto = (request.nextUrl.searchParams.get("texto") ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, 700) || MENSAGEM_PADRAO;
  let mensagem = texto;
  try {
    if (!ROBOS.test(request.headers.get("user-agent") ?? "")) {
      await limitar(`ref:${chaveIp(request)}`, 40, 60 * 60 * 1000);
      const origem = origemDaRequisicao(request.headers, ORIGEM_LOJA) ?? { channel: "Direto" };
      // A página em que o botão foi clicado (só o caminho, do Referer do próprio site).
      let clicou: string | undefined;
      try { const referer = new URL(request.headers.get("referer") ?? ""); if (referer.origin === ORIGEM_LOJA || referer.host === request.headers.get("host")) clicou = `${ORIGEM_LOJA}${referer.pathname}`.slice(0, 280); } catch { clicou = undefined; }
      const codigo = gerarCodigoRef();
      await guardarReferencia(db(), codigo, { ...origem, ...(clicou ? { clickedPage: clicou } : {}) });
      mensagem = textoComRef(texto, codigo);
    }
  } catch {
    mensagem = texto; // limite, banco fora do ar: a conversa abre do mesmo jeito, só sem o código
  }
  return NextResponse.redirect(`https://wa.me/${EMPRESA.whatsapp.numero}?text=${encodeURIComponent(mensagem)}`, { status: 302, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });
}
