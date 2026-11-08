// "Indique o ateliê": a indicação é o ponto forte do ateliê. A página
// /indique monta uma mensagem para a cliente mandar a quem quiser pelo WhatsApp, ou copia o link.
// Não há programa de pontos nem recompensa automática: só o link da loja com UTMs, para o ateliê
// saber quantas visitas vieram de indicação (os UTMs entram no cookie de atribuição, rastreamento).
// Puro: roda no `node --test` (tests/loja/ajuda.test.mjs).

export const UTM_INDICACAO = { utm_source: "indicacao", utm_medium: "compartilhamento" } as const;

// Link da loja para compartilhar: a origem + UTMs; `canal` vira utm_campaign (whatsapp ou link).
export function linkIndicacao(origem: string, canal: "whatsapp" | "link"): string {
  const url = new URL("/", origem);
  url.searchParams.set("utm_source", UTM_INDICACAO.utm_source);
  url.searchParams.set("utm_medium", UTM_INDICACAO.utm_medium);
  url.searchParams.set("utm_campaign", canal);
  return url.toString();
}

export function mensagemIndicacao(link: string): string {
  return [
    "Oi! Quero te indicar o Ateliê Milena Kerbage: enxoval e quarto de bebê feitos à mão em Fortaleza, com entrega para todo o Brasil.",
    "Dá para ver as peças e montar o pedido pelo site, e uma vendedora atende pelo WhatsApp:",
    link,
  ].join("\n\n");
}

// WhatsApp sem número: abre a lista de conversas para a cliente escolher para quem mandar.
export function linkCompartilharWhatsApp(texto: string): string {
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}
