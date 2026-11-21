/**
 * Para onde cada cartão do Painel leva: a tabela de leads já filtrada (os parâmetros são lidos em /leads) ou a lista
 * de conversas no recorte certo.
 */
type Filtros = { etapas?: string[]; origens?: string[]; criados?: 7 | 30 | 90; nascimento?: 30 | 60 | 90; parados?: boolean; categoria?: "cliente" | "lead" };

export function leadsHref({ etapas = [], origens = [], criados, nascimento, parados, categoria }: Filtros = {}) {
  const params = new URLSearchParams({ visao: "tabela" });
  if (categoria) params.set("categoria", categoria);
  for (const etapa of etapas) params.append("etapa", etapa);
  for (const origem of origens) params.append("origem", origem);
  if (criados) params.set("criados", String(criados));
  if (nascimento) params.set("nascimento", String(nascimento));
  if (parados) params.set("parados", "1");
  return `/leads?${params}`;
}

/** "Site" no Painel junta as origens "Site" e "Loja online" (ver joinSources). */
export const origensDoCanal = (canal: string) => (canal === "Site" ? ["Site", "Loja online"] : [canal]);

export const conversasHref = (aba: "aguardando" | "nao_lidas") => `/conversas?aba=${aba}`;
