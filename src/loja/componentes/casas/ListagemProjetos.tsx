import Link from "next/link";
import { css } from "styled-system/css";
import { RESPIRO_LATERAL } from "@/loja/componentes/layout/cabecalho/estilos";
import { type Projeto } from "@/loja/lib/casas/catalogo";
import { AvisoDemonstracao } from "./AvisoDemonstracao";
import { filtrarProjetos, limparFiltros, ordenarProjetos, type ProjetoFiltravel } from "@/loja/lib/casas/filtragem";
import { ORDEM_PADRAO } from "@/loja/lib/seo/urls";
import { AreaProjetos } from "./AreaProjetos";
import { CardMonteOSeu, CardProjeto } from "./CardProjeto";

// Resultado de Projetos no mesmo fluxo da listagem de produtos (Resultado + AreaListagem): com os
// filtros e a ordem já lidos da URL, filtra, ordena e entrega a grade à área interativa (barra
// flutuante + gaveta). A gaveta recebe só o essencial de cada projeto para contar os filtros ao vivo no
// navegador. Sem async nem APIs do servidor: renderiza no HTML estático (fallback sem filtros) e no
// navegador (ProjetosNaUrl, com os filtros da query), para a página ficar inteira na CDN.
export function ResultadoProjetos({
  projetos,
  categoria,
  filtrosDaUrl,
  ordemDaUrl,
}: {
  projetos: Projeto[];
  categoria: string;
  filtrosDaUrl: Record<string, string[]>;
  ordemDaUrl?: string;
}) {
  const filtros = limparFiltros(projetos, filtrosDaUrl);
  const ordem = ordemDaUrl || ORDEM_PADRAO;
  const filtrados = ordenarProjetos(filtrarProjetos(projetos, filtros), ordem);
  const essenciais: ProjetoFiltravel[] = projetos.map(({ slug, tema, estilo, tecido, precoAPartirDe, prazoDiasUteis }) => ({
    slug,
    tema,
    estilo,
    tecido,
    precoAPartirDe,
    prazoDiasUteis,
  }));

  const vazio = (
    <div className={css({ px: RESPIRO_LATERAL, py: "24", textAlign: "center" })}>
      <p className={css({ fontSize: "2xl", color: "escuro" })}>Nenhum quartinho com esses filtros.</p>
      <p className={css({ mt: "2", color: "textoSuave" })}>Tire algum filtro ou conte para o ateliê o quartinho que você imagina.</p>
      <div className={css({ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "5", mt: "6" })}>
        <Link href={`/${categoria}`} scroll={false} className={linkSublinhado}>
          Limpar filtros
        </Link>
        <Link href="/personalizado/monte-o-seu" className={linkSublinhado}>
          Monte o seu quartinho
        </Link>
      </div>
    </div>
  );

  return (
    <AreaProjetos
      categoria={categoria}
      filtros={filtros}
      ordem={ordem}
      projetos={essenciais}
      grade={
        filtrados.length > 0 ? (
          <>
            <GradeProjetos projetos={filtrados} />
            <AvisoDemonstracao className={aviso} />
          </>
        ) : (
          vazio
        )
      }
    />
  );
}

// Grade de produtos da Lululemon: 2 px de espaço branco entre os cards; grande 1/2/3 colunas,
// pequena 2/3/4 (data-densidade da área, botões "Visualização"). O 1º card é a entrada do "Monte o
// seu quartinho" (projeto personalizado).
export function GradeProjetos({ projetos }: { projetos: Projeto[] }) {
  return (
    <ul className={grade}>
      <li>
        <CardMonteOSeu />
      </li>
      {projetos.map((projeto, indice) => (
        <li key={projeto.slug}>
          <CardProjeto
            projeto={projeto}
            tom={indice}
            carregarCedo={indice < 3}
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          />
        </li>
      ))}
    </ul>
  );
}

const grade = css({
  display: "grid",
  gridTemplateColumns: { base: "repeat(1, minmax(0, 1fr))", md: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" },
  gap: "[2px]",
  "[data-densidade=pequena] &": {
    gridTemplateColumns: { base: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" },
  },
});

const aviso = css({ px: RESPIRO_LATERAL, mt: "6", fontSize: "xs", color: "textoSuave" });

const linkSublinhado = css({
  fontSize: "sm",
  fontWeight: "medium",
  color: "escuro",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
});
