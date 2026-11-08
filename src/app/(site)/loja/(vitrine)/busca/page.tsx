import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { css } from "styled-system/css";
import { RESPIRO_LATERAL } from "@/loja/componentes/layout/cabecalho/estilos";
import { TERMOS_MAIS_BUSCADOS } from "@/loja/componentes/layout/cabecalho/navegacao";
import { CabecalhoListagem } from "@/loja/componentes/listagem/CabecalhoListagem";
import { ContinueExplorando } from "@/loja/componentes/listagem/ContinueExplorando";
import { EsqueletoGrade, EsqueletoTopo } from "@/loja/componentes/listagem/Esqueleto";
import { Resultado } from "@/loja/componentes/listagem/Resultado";
import { buscarCategoria, categoriasRelacionadas } from "@/loja/lib/catalogo/categorias";
import { listarProdutos } from "@/loja/lib/catalogo/exemplos";
import { buscarTexto, filtrar } from "@/loja/lib/catalogo/listagem";
import { filtrosDaQuery } from "@/loja/lib/catalogo/urlsListagem";
import { montarUrlBusca, normalizarBusca, ORDEM_PADRAO } from "@/loja/lib/seo/urls";

// Resultado da busca interna com a mesma listagem da categoria (Lululemon). Nunca indexável:
// noindex aqui e /busca bloqueado no robots.txt (seo.md §3.6).
export const metadata: Metadata = {
  title: "Busca",
  robots: { index: false, follow: true },
};

export default function PaginaBusca({ searchParams }: PageProps<"/loja/busca">) {
  return (
    <Suspense
      fallback={
        <>
          <EsqueletoTopo />
          <EsqueletoGrade />
        </>
      }
    >
      <ConteudoBusca searchParams={searchParams} />
    </Suspense>
  );
}

async function ConteudoBusca({ searchParams }: Pick<PageProps<"/loja/busca">, "searchParams">) {
  const bruto = await searchParams;
  const busca = new URLSearchParams();
  for (const [chave, valor] of Object.entries(bruto)) {
    for (const item of Array.isArray(valor) ? valor : [valor ?? ""]) busca.append(chave, item);
  }
  const termo = normalizarBusca(busca.get("q"));
  const encontrados = termo ? buscarTexto(listarProdutos(), termo) : [];
  const filtros = filtrosDaQuery(busca);
  const pagina = Math.max(1, Math.min(500, Number(busca.get("pagina")) || 1));

  // Fotos do topo: as categorias onde os resultados estão (atalho para a listagem completa).
  const categorias = [...new Set(encontrados.map((produto) => produto.caminho))]
    .map((caminho) => buscarCategoria(caminho.slice(1)))
    .filter((categoria) => categoria !== null)
    .map((categoria) => ({ rotulo: categoria.rotulo, href: `/${categoria.chave}` }))
    .slice(0, 4);

  return (
    <>
      <CabecalhoListagem
        trilha={[]}
        titulo={termo ? `Resultados para “${termo}”` : "O que você procura?"}
        total={filtrar(encontrados, filtros).length}
        atalhos={categorias}
      />
      {encontrados.length > 0 ? (
        <Resultado
          contexto={{ tipo: "busca", termo }}
          itensBase={encontrados}
          filtros={filtros}
          ordem={busca.get("ordem") ?? ORDEM_PADRAO}
          pagina={pagina}
        />
      ) : (
        <section aria-label="Sugestões de busca" className={css({ px: RESPIRO_LATERAL, py: "16" })}>
          <p className={css({ fontSize: "xl", color: "escuro" })}>
            {termo ? "Não achamos nada com esse termo. Que tal um destes?" : "Comece por um dos termos mais buscados:"}
          </p>
          <ul className={css({ display: "flex", flexWrap: "wrap", gap: "2", mt: "6" })}>
            {TERMOS_MAIS_BUSCADOS.map((sugestao) => (
              <li key={sugestao}>
                <Link href={montarUrlBusca(sugestao)} className={sugestaoEstilo}>
                  {sugestao}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <ContinueExplorando
        base={termo || "o enxoval"}
        categorias={categoriasRelacionadas(categorias.map((categoria) => categoria.href.slice(1)))}
      />
    </>
  );
}

const sugestaoEstilo = css({
  display: "inline-flex",
  alignItems: "center",
  px: "6",
  py: "2",
  borderRadius: "full",
  bg: "superficieSuave",
  fontSize: "md",
  fontWeight: "medium",
  color: "escuro",
  _hover: { bg: "borda" },
});
