"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import type { BlocoEditorial } from "@/loja/lib/catalogo/edicoes";
import type { Produto } from "@/loja/lib/catalogo/exemplos";
import { REGRAS_SEO } from "@/loja/lib/seo/config";
import { interpretarUrlListagem, ORDEM_PADRAO } from "@/loja/lib/seo/urls";
import { Resultado } from "./Resultado";

// Grade da categoria com os filtros, a ordem e a página da URL (?cor=…&ordem=…&pagina=…) aplicados no
// navegador. A página da categoria fica estática na CDN (uma cópia por caminho, sem função a cada
// visita); o HTML pré-gerado traz a 1ª página sem filtro (o fallback do <Suspense>, para o Google e para
// quem chega sem JavaScript) e, ao hidratar, este componente troca pela versão filtrada.
// URL fora da forma canônica: o proxy já responde 308 nas entradas; aqui só a navegação interna.
export function ResultadoNaUrl({
  caminho,
  existentes,
  itensBase,
  blocos,
  primeiraLinhaBlocos,
}: {
  caminho: string;
  existentes: string[];
  itensBase: Produto[];
  blocos: BlocoEditorial[];
  primeiraLinhaBlocos: number;
}) {
  const busca = useSearchParams();
  const router = useRouter();
  const categorias = useMemo(() => new Set(existentes), [existentes]);
  const resultado = useMemo(
    () => interpretarUrlListagem(caminho, new URLSearchParams(busca.toString()), categorias, REGRAS_SEO),
    [caminho, busca, categorias],
  );
  const destino = resultado.tipo === "redirecionar" ? resultado.destino : null;
  useEffect(() => {
    if (destino) router.replace(destino, { scroll: false });
  }, [destino, router]);

  // Enquanto redireciona (ou com filtro inválido), a grade sem os filtros da URL.
  const sem = resultado.tipo === "ok" ? null : interpretarUrlListagem(caminho, new URLSearchParams(), categorias, REGRAS_SEO);
  const listagem = resultado.tipo === "ok" ? resultado.listagem : sem?.tipo === "ok" ? sem.listagem : null;
  if (!listagem) return null;
  return (
    <Resultado
      contexto={{ tipo: "categoria", categoria: listagem.categoria }}
      itensBase={itensBase}
      filtros={listagem.filtros}
      ordem={listagem.ordem ?? ORDEM_PADRAO}
      pagina={listagem.pagina ?? 1}
      blocos={blocos}
      primeiraLinhaBlocos={primeiraLinhaBlocos}
    />
  );
}

