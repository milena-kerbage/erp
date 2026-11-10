"use client";

import { useSearchParams } from "next/navigation";
import type { BlocoEditorial } from "@/loja/lib/catalogo/edicoes";
import type { Produto } from "@/loja/lib/catalogo/exemplos";
import { filtrosDaQuery } from "@/loja/lib/catalogo/urlsListagem";
import { ORDEM_PADRAO } from "@/loja/lib/seo/urls";
import { Resultado } from "./Resultado";

// Listagens de seleção fixa (Pronta entrega, Edição do mês): filtros, ordem e página só na query,
// aplicados no navegador como em ResultadoNaUrl. A página fica estática na CDN; o HTML pré-gerado traz
// a 1ª página sem filtros (fallback do <Suspense>). `ignorar`: filtros que a própria seleção já fixa.
export function ResultadoDaQuery({
  categoria,
  itensBase,
  ignorar = [],
  blocos = [],
  primeiraLinhaBlocos = 0,
}: {
  categoria: string;
  itensBase: Produto[];
  ignorar?: string[];
  blocos?: BlocoEditorial[];
  primeiraLinhaBlocos?: number;
}) {
  const busca = new URLSearchParams(useSearchParams().toString());
  const filtros = Object.fromEntries(Object.entries(filtrosDaQuery(busca)).filter(([chave]) => !ignorar.includes(chave)));
  return (
    <Resultado
      contexto={{ tipo: "categoria", categoria }}
      itensBase={itensBase}
      filtros={filtros}
      ordem={busca.get("ordem") ?? ORDEM_PADRAO}
      pagina={Math.max(1, Math.min(500, Number(busca.get("pagina")) || 1))}
      blocos={blocos}
      primeiraLinhaBlocos={primeiraLinhaBlocos}
    />
  );
}
