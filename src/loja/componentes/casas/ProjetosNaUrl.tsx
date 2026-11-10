"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import type { Projeto } from "@/loja/lib/casas/catalogo";
import { REGRAS_SEO } from "@/loja/lib/seo/config";
import { interpretarUrlListagem } from "@/loja/lib/seo/urls";
import { ResultadoProjetos } from "./ListagemProjetos";

// Personalizado com os filtros e a ordem da URL (?tema=…&ordem=…) aplicados no navegador, como
// ResultadoNaUrl na listagem de produtos: a página fica estática na CDN e o HTML pré-gerado traz a grade
// sem filtros (fallback do <Suspense>). URL fora da forma canônica: o proxy responde 308 nas entradas.
export function ProjetosNaUrl({ projetos, categoria, existentes }: { projetos: Projeto[]; categoria: string; existentes: string[] }) {
  const busca = useSearchParams();
  const router = useRouter();
  const categorias = useMemo(() => new Set(existentes), [existentes]);
  const resultado = useMemo(
    () => interpretarUrlListagem(`/${categoria}`, new URLSearchParams(busca.toString()), categorias, REGRAS_SEO),
    [categoria, busca, categorias],
  );
  const destino = resultado.tipo === "redirecionar" ? resultado.destino : null;
  useEffect(() => {
    if (destino) router.replace(destino, { scroll: false });
  }, [destino, router]);
  return (
    <ResultadoProjetos
      projetos={projetos}
      categoria={categoria}
      filtrosDaUrl={resultado.tipo === "ok" ? resultado.listagem.filtros : {}}
      ordemDaUrl={resultado.tipo === "ok" ? resultado.listagem.ordem : undefined}
    />
  );
}
