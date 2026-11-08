import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { css } from "styled-system/css";
import { ATALHOS_SELECOES, SugestoesProjetos } from "@/loja/componentes/casas/comuns";
import { PedidoComSelecao, type ResumoProjeto } from "@/loja/componentes/casas/FormularioPedido";
import { GaleriaProjeto } from "@/loja/componentes/casas/GaleriaProjeto";
import { LateralProjeto } from "@/loja/componentes/casas/LateralProjeto";
import { ListagemProjetos } from "@/loja/componentes/casas/ListagemProjetos";
import {
  DetalhesProjeto,
  DiferenciaisProjetos,
  EtapasProjetos,
  PainelProjeto,
  projetosParecidos,
  TrilhaProjeto,
} from "@/loja/componentes/casas/secoes";
import { RESPIRO_LATERAL } from "@/loja/componentes/layout/cabecalho/estilos";
import { CabecalhoListagem } from "@/loja/componentes/listagem/CabecalhoListagem";
import { ContinueExplorando } from "@/loja/componentes/listagem/ContinueExplorando";
import { EsqueletoGrade } from "@/loja/componentes/listagem/Esqueleto";
import { JsonLd } from "@/loja/componentes/seo/JsonLd";
import {
  AVISO_PRECOS,
  buscarColecao,
  buscarProjeto,
  type Colecao,
  ENTREGA,
  formatarPreco,
  fotosDoProjeto,
  listarColecoes,
  listarProjetos,
  PERGUNTAS,
  PRAZO_PRODUCAO,
  type Projeto,
  prazoDoProjeto,
  resumoProjeto,
} from "@/loja/lib/casas/catalogo";
import { filtrarProjetos } from "@/loja/lib/casas/filtragem";
import { categoriasRelacionadas } from "@/loja/lib/catalogo/categorias";
import { EMPRESA } from "@/loja/lib/empresa";
import { schemaListagemProjetos, schemaProjeto, schemaTrilhaProjetos } from "@/loja/lib/seo/projetos";

// /projetos/<slug>: a página de um projeto (PDP da Adidas, referencia.md §12) ou uma das páginas do
// menu "Projetos" (navegacao.ts): seleções como /projetos/floral (listagem com filtro fixo) e
// conteúdos (/projetos/como-funciona, /projetos/orcamento). Os slugs não colidem (testado em
// tests/loja/casas.test.mjs). Tudo pré-gerado no build. A seleção (/projetos/selecao) tem rota própria.

type Props = PageProps<"/loja/projetos/[slug]">;

export function generateStaticParams() {
  return [...listarProjetos(), ...listarColecoes()].map(({ slug }) => ({ slug }));
}

function resolver(slug: string): { projeto: Projeto } | { colecao: Colecao } | null {
  const projeto = buscarProjeto(slug);
  if (projeto) return { projeto };
  const colecao = buscarColecao(slug);
  return colecao ? { colecao } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dados = resolver((await params).slug);
  if (!dados) return {};
  // Fora do índice como o resto do catálogo de exemplo (preços fictícios), até o catálogo real entrar.
  const robots = { index: false, follow: true };
  if ("projeto" in dados) {
    const { projeto } = dados;
    const capa = fotosDoProjeto(projeto)[0];
    return {
      title: `${projeto.nome}: quarto de bebê ${resumoProjeto(projeto).toLowerCase().replace(" · ", ", ")}`,
      description: `${projeto.nome}: ${projeto.descricao[0]} A partir de ${formatarPreco(projeto.precoAPartirDe)}, produção em ${prazoDoProjeto(projeto)} e entrega para todo o Brasil.`,
      alternates: { canonical: `/projetos/${projeto.slug}` },
      ...(capa ? { openGraph: { images: [{ url: capa.src, alt: capa.alt }] } } : {}),
      robots,
    };
  }
  return {
    title: `${dados.colecao.titulo} | Projetos`,
    description: dados.colecao.texto,
    alternates: { canonical: `/projetos/${dados.colecao.slug}` },
    robots,
  };
}

export default async function PaginaSlugProjetos({ params, searchParams }: Props) {
  const dados = resolver((await params).slug);
  if (!dados) notFound();
  if ("projeto" in dados) return <PaginaProjeto projeto={dados.projeto} />;
  const { colecao } = dados;
  if (colecao.tipo === "conteudo") return <PaginaConteudo colecao={colecao} />;
  return <PaginaSelecao colecao={colecao} searchParams={searchParams} />;
}

function PaginaProjeto({ projeto }: { projeto: Projeto }) {
  const parecidos = projetosParecidos(projeto, listarProjetos());
  return (
    <>
      <JsonLd dados={schemaProjeto(projeto)} />
      <JsonLd
        dados={schemaTrilhaProjetos([
          { rotulo: "Projetos", href: "/projetos" },
          { rotulo: projeto.nome, href: `/projetos/${projeto.slug}` },
        ])}
      />
      <div className={grade}>
        <TrilhaProjeto projeto={projeto} />
        <div className={css({ gridArea: "galeria" })}>
          <GaleriaProjeto nome={projeto.nome} fotos={fotosDoProjeto(projeto)} paleta={projeto.paleta} />
        </div>
        <LateralProjeto>
          <PainelProjeto projeto={projeto} />
        </LateralProjeto>
        <DetalhesProjeto projeto={projeto} />
        {/* Como "Você também poderá gostar" da PDP de produto: na coluna da galeria, abaixo dos detalhes. */}
        <div className={css({ gridArea: "sugestoes", pb: { base: "16", lg: "24" } })}>
          <SugestoesProjetos id="titulo-parecidos" titulo="Outros projetos" projetos={parecidos} />
        </div>
      </div>
    </>
  );
}

function CabecalhoColecao({ colecao }: { colecao: Colecao }) {
  return (
    <header className={css({ px: RESPIRO_LATERAL })}>
      <nav aria-label="Você está em" className={css({ pt: "5" })}>
        <ol className={css({ display: "flex", flexWrap: "wrap", gap: "2", fontSize: "xs", color: "escuro" })}>
          {[
            { rotulo: "Página inicial", href: "/" },
            { rotulo: "Projetos", href: "/projetos" },
          ].map((elo, indice) => (
            <li key={elo.href} className={css({ display: "flex", gap: "2" })}>
              {indice > 0 && <span aria-hidden>/</span>}
              <Link href={elo.href} className={css({ _hover: { textDecoration: "underline", textUnderlineOffset: "3px" } })}>
                {elo.rotulo}
              </Link>
            </li>
          ))}
        </ol>
      </nav>
      <h1 className={tituloPagina}>{colecao.titulo}</h1>
      <p className={css({ mt: "4", maxW: "leitura", fontSize: { base: "md", lg: "lg" }, lineHeight: "relaxed", color: "textoSuave" })}>
        {colecao.texto}
      </p>
    </header>
  );
}

function PaginaSelecao({ colecao, searchParams }: { colecao: Extract<Colecao, { tipo: "selecao" }>; searchParams: Props["searchParams"] }) {
  const projetos = filtrarProjetos(listarProjetos(), colecao.filtros);
  const caminho = `/projetos/${colecao.slug}`;
  return (
    <>
      <JsonLd dados={schemaListagemProjetos(colecao.titulo, caminho, projetos)} />
      <JsonLd
        dados={schemaTrilhaProjetos([
          { rotulo: "Projetos", href: "/projetos" },
          { rotulo: colecao.titulo, href: caminho },
        ])}
      />
      <CabecalhoListagem
        trilha={[{ rotulo: "Projetos", href: "/projetos" }]}
        titulo={colecao.titulo}
        total={projetos.length}
        unidade={["projeto", "projetos"]}
        atalhos={ATALHOS_SELECOES.filter((atalho) => atalho.href !== caminho)}
      />
      <Suspense fallback={<EsqueletoGrade />}>
        <ListagemProjetos projetos={projetos} categoria={`projetos/${colecao.slug}`} searchParams={searchParams} />
      </Suspense>
      <ContinueExplorando base="Projetos" categorias={categoriasRelacionadas(["projetos"]).filter((elo) => !elo.href.startsWith("/projetos"))} />
    </>
  );
}

function resumosParaFormulario(): ResumoProjeto[] {
  return listarProjetos().map((projeto) => ({
    slug: projeto.slug,
    nome: projeto.nome,
    tema: projeto.tema,
    resumo: resumoProjeto(projeto),
    precoAPartirDe: projeto.precoAPartirDe,
    paleta: projeto.paleta,
  }));
}

// Conteúdos do menu: "Como funciona" (etapas + perguntas) e "Peça seu projeto" (formulário).
function PaginaConteudo({ colecao }: { colecao: Extract<Colecao, { tipo: "conteudo" }> }) {
  const caminho = `/projetos/${colecao.slug}`;
  return (
    <>
      <JsonLd
        dados={schemaTrilhaProjetos([
          { rotulo: "Projetos", href: "/projetos" },
          { rotulo: colecao.titulo, href: caminho },
        ])}
      />
      <CabecalhoColecao colecao={colecao} />
      {colecao.slug === "como-funciona" ? (
        <>
          <EtapasProjetos />
          <section aria-labelledby="titulo-perguntas" className={css({ px: RESPIRO_LATERAL, mt: { base: "16", lg: "24" } })}>
            <h2 id="titulo-perguntas" className={tituloBloco}>
              Perguntas frequentes
            </h2>
            <dl
              className={css({ display: "grid", gridTemplateColumns: { base: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: "8", mt: "8" })}
            >
              {PERGUNTAS.map((item) => (
                <div key={item.pergunta} className={css({ borderTopWidth: "1px", borderColor: "escuro", pt: "4" })}>
                  <dt className={css({ fontSize: "lg", fontWeight: "semibold", color: "escuro" })}>{item.pergunta}</dt>
                  <dd className={css({ mt: "2", lineHeight: "relaxed", color: "texto" })}>{item.resposta}</dd>
                </div>
              ))}
            </dl>
          </section>
        </>
      ) : (
        <section
          aria-labelledby="titulo-formulario"
          className={css({
            display: "grid",
            gridTemplateColumns: { base: "1fr", lg: "minmax(0, 1fr) 360px" },
            gap: { base: "10", lg: "16" },
            alignItems: "start",
            px: RESPIRO_LATERAL,
            mt: { base: "10", lg: "14" },
          })}
        >
          <div className={css({ maxW: "leitura" })}>
            <h2 id="titulo-formulario" className={css({ srOnly: true })}>
              Formulário de orçamento
            </h2>
            <PedidoComSelecao numero={EMPRESA.whatsapp.numero} projetos={resumosParaFormulario()} />
          </div>
          <aside className={css({ p: "6", borderRadius: "bloco", bg: "fundoProduto", fontSize: "sm", lineHeight: "relaxed", color: "texto" })}>
            <p className={css({ fontSize: "lg", color: "escuro" })}>Como seguimos</p>
            <ul className={css({ mt: "3", display: "grid", gap: "2" })}>
              <li>Respondemos pelo WhatsApp {EMPRESA.whatsapp.exibicao}, em horário comercial.</li>
              <li>Produção em {PRAZO_PRODUCAO} depois do pedido confirmado.</li>
              <li>{ENTREGA}, com frete calculado no orçamento.</li>
            </ul>
            <p className={css({ mt: "4", fontSize: "xs", color: "textoSuave" })}>{AVISO_PRECOS}</p>
            <Link href="/projetos/como-funciona" className={css({ display: "inline-block", mt: "4", textDecoration: "underline" })}>
              Ver como funciona
            </Link>
          </aside>
        </section>
      )}
      <DiferenciaisProjetos />
      <SugestoesProjetos id="titulo-modelos" titulo="Ou escolha um projeto" projetos={listarProjetos().slice(0, 8)} />
      <div className={css({ h: { base: "16", lg: "24" } })} />
    </>
  );
}

// Desktop (Adidas): galeria + painel de 480 px fixo. Celular: trilha, nome e preço antes da galeria;
// ficha, pacotes e detalhes depois.
const grade = css({
  display: "grid",
  gridTemplateColumns: { base: "minmax(0, 1fr)", lg: "minmax(0, 1fr) 480px" },
  gridTemplateAreas: {
    base: '"trilha" "cabecalho" "galeria" "compra" "detalhes" "sugestoes"',
    lg: '"galeria lateral" "detalhes lateral" "sugestoes lateral"',
  },
  gridTemplateRows: { lg: "auto auto 1fr" },
});

const tituloPagina = css({
  mt: { base: "10", lg: "20" },
  fontFamily: "corpo",
  fontSize: { base: "4xl", md: "5xl", xl: "6xl" },
  fontWeight: "normal",
  lineHeight: "[1.1]",
  letterSpacing: "[-0.04em]",
  color: "escuro",
});

const tituloBloco = css({
  fontFamily: "corpo",
  fontSize: { base: "3xl", lg: "4xl" },
  fontWeight: "normal",
  letterSpacing: "[-0.03em]",
  color: "escuro",
});
