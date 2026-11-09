import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { css } from "styled-system/css";
import { botao } from "styled-system/recipes";
import { ATALHOS_SELECOES } from "@/loja/componentes/casas/comuns";
import { abasDoProjeto, fotosDaGaleria, pecasDoQuarto } from "@/loja/componentes/casas/dadosProjeto";
import { GavetaProjeto } from "@/loja/componentes/casas/GavetaProjeto";
import { ListagemProjetos } from "@/loja/componentes/casas/ListagemProjetos";
import { PainelProjeto, PilulaProjeto, ProjetoProvider } from "@/loja/componentes/casas/PainelProjeto";
import {
  ConviteMontador,
  DiferenciaisProjetos,
  EtapasProjetos,
  OQueVemNoQuarto,
  OutrosProjetos,
  PaletaDoProjeto,
  projetosParecidos,
} from "@/loja/componentes/casas/secoes";
import { RESPIRO_LATERAL } from "@/loja/componentes/layout/cabecalho/estilos";
import { CabecalhoListagem } from "@/loja/componentes/listagem/CabecalhoListagem";
import { ContinueExplorando } from "@/loja/componentes/listagem/ContinueExplorando";
import { EsqueletoGrade } from "@/loja/componentes/listagem/Esqueleto";
import { Galeria } from "@/loja/componentes/produto/Galeria";
import { FaleComAtelie, PorQueVaiAmar, recuo } from "@/loja/componentes/produto/secoes";
import { JsonLd } from "@/loja/componentes/seo/JsonLd";
import {
  AVISO_PRECOS,
  buscarColecao,
  buscarOpcional,
  buscarProjeto,
  type Colecao,
  ENTREGA,
  formatarPreco,
  fotosDoProjeto,
  listarColecoes,
  listarProjetos,
  PRAZO_PRODUCAO,
  type Projeto,
  prazoDoProjeto,
  resumoProjeto,
  rotuloTema,
  variacaoProjeto,
} from "@/loja/lib/casas/catalogo";
import { filtrarProjetos } from "@/loja/lib/casas/filtragem";
import { arvoreDaLoja, indiceDaLoja } from "@/lib/loja/catalogo";
import type { Elo } from "@/loja/lib/catalogo/categorias";
import { condicoesDePagamento, type Produto } from "@/loja/lib/catalogo/exemplos";
import { fotoPrincipal } from "@/loja/lib/catalogo/fotos";
import { EMPRESA } from "@/loja/lib/empresa";
import { schemaListagemProjetos, schemaProjeto, schemaTrilhaProjetos } from "@/loja/lib/seo/projetos";

// /personalizado/<slug>: a página de um quartinho do ateliê (no padrão da página de produto,
// lululemon-pdp.md) ou uma das páginas do menu "Personalizado" (navegacao.ts): seleções como
// /personalizado/floral (listagem com filtro fixo) e conteúdos (/personalizado/como-funciona,
// /personalizado/orcamento). Os slugs não colidem (testado em tests/loja/casas.test.mjs). Tudo
// pré-gerado no build. Rota própria: /personalizado/monte-o-seu/<etapa> (o montador). Os endereços
// antigos /projetos/** respondem 308 para cá (src/loja/lib/seo/legado.ts, no proxy da loja).

type Props = PageProps<"/loja/personalizado/[slug]">;

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
      alternates: { canonical: `/personalizado/${projeto.slug}` },
      ...(capa ? { openGraph: { images: [{ url: capa.src, alt: capa.alt }] } } : {}),
      robots,
    };
  }
  return {
    title: `${dados.colecao.titulo} | Personalizado`,
    description: dados.colecao.texto,
    alternates: { canonical: `/personalizado/${dados.colecao.slug}` },
    robots,
  };
}

export default async function PaginaSlugProjetos({ params, searchParams }: Props) {
  const dados = resolver((await params).slug);
  if (!dados) notFound();
  if ("projeto" in dados) return <PaginaProjeto projeto={dados.projeto} buscarVarios={(await indiceDaLoja()).buscarVarios} />;
  const { colecao } = dados;
  if (colecao.tipo === "conteudo") return <PaginaConteudo colecao={colecao} />;
  const relacionadas = (await arvoreDaLoja()).categoriasRelacionadas(["personalizado"]).filter((elo) => !elo.href.startsWith("/personalizado"));
  return <PaginaSelecao colecao={colecao} searchParams={searchParams} relacionadas={relacionadas} />;
}

// Página do projeto com a estrutura e as medidas da página de produto: no desktop, grade "1fr 440" com a
// galeria sticky correndo POR TRÁS do painel; no celular, galeria em 100% com a barra de progresso e
// o painel subindo por cima. Abaixo da dobra: "Por que você vai amar", gaveta de detalhes, "O que vem no
// quarto", "Paleta do quartinho", "Fale com o ateliê", a linha do tempo "Passo a passo", diferenciais
// e "Outros quartinhos". O quartinho vai para a mesma sacola dos produtos.
function PaginaProjeto({ projeto, buscarVarios }: { projeto: Projeto; buscarVarios: (slugs: string[]) => Produto[] }) {
  const parecidos = projetosParecidos(projeto, listarProjetos());
  const pecas = pecasDoQuarto(projeto);
  // Só liga à peça avulsa que existe no catálogo.
  const existentes = new Set(buscarVarios(pecas.flatMap((peca) => peca.produto ?? [])).map((produto) => produto.slug));
  const pecasComLink = pecas.map((peca) => (peca.produto && existentes.has(peca.produto) ? peca : { ...peca, produto: undefined }));
  // Confirmação "Adicionado ao seu enxoval": as peças avulsas que combinam com o quarto.
  const sugestoes = buscarVarios([...existentes]).map((produto) => ({
    slug: produto.slug,
    nome: produto.nome,
    pix: condicoesDePagamento(produto.preco)?.pix ?? produto.preco,
    precisaEscolher: Boolean(produto.variacao),
    foto: fotoPrincipal(produto),
  }));
  const trilha = [
    { rotulo: "Personalizado", href: "/personalizado" },
    { rotulo: rotuloTema(projeto.tema), href: `/personalizado/${projeto.tema}` },
  ];

  return (
    <article className={pdp}>
      <JsonLd dados={schemaProjeto(projeto)} />
      <JsonLd
        dados={schemaTrilhaProjetos([
          { rotulo: "Personalizado", href: "/personalizado" },
          { rotulo: projeto.nome, href: `/personalizado/${projeto.slug}` },
        ])}
      />

      <ProjetoProvider
        dados={{
          slug: projeto.slug,
          nome: projeto.nome,
          variacao: variacaoProjeto(projeto),
          precoBase: projeto.precoAPartirDe,
          paleta: projeto.paleta,
          prazo: prazoDoProjeto(projeto),
          trilha,
          opcionais: projeto.opcionais.flatMap((id) => {
            const opcional = buscarOpcional(id);
            return opcional ? [{ id: opcional.id, nome: opcional.nome, curto: opcional.curto, apoio: opcional.apoio, preco: opcional.preco }] : [];
          }),
        }}
        sugestoes={sugestoes}
      >
        <section aria-label="Escolha do quartinho" className={acimaDaDobra}>
          <div aria-hidden className={reservaGaleria} />
          <Galeria nome={projeto.nome} fotos={fotosDaGaleria(projeto)} temComplementos={false} />
          <aside aria-label="Pacote e pedido" className={painel}>
            <div aria-hidden className={extensao} />
            <PainelProjeto />
          </aside>
        </section>

        <PorQueVaiAmar texto={projeto.descricao[0]} />
        <div className={css({ mt: { base: "10", desktop: "16" } })}>
          <div className={recuo}>
            <GavetaProjeto nome={projeto.nome} rodape={`Produção em ${prazoDoProjeto(projeto)}`} abas={abasDoProjeto(projeto)} />
          </div>
        </div>
        <OQueVemNoQuarto projeto={projeto} pecas={pecasComLink} />
        <PaletaDoProjeto projeto={projeto} />
        <FaleComAtelie nome={projeto.nome} />
        <EtapasProjetos pdp />
        <DiferenciaisProjetos pdp />
        <OutrosProjetos projetos={parecidos} />
        <PilulaProjeto />
      </ProjetoProvider>
    </article>
  );
}

function CabecalhoColecao({ colecao }: { colecao: Colecao }) {
  return (
    <header className={css({ px: RESPIRO_LATERAL })}>
      <nav aria-label="Você está em" className={css({ pt: "5" })}>
        <ol className={css({ display: "flex", flexWrap: "wrap", gap: "2", fontSize: "xs", color: "escuro" })}>
          {[
            { rotulo: "Página inicial", href: "/" },
            { rotulo: "Personalizado", href: "/personalizado" },
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

function PaginaSelecao({ colecao, searchParams, relacionadas }: { colecao: Extract<Colecao, { tipo: "selecao" }>; searchParams: Props["searchParams"]; relacionadas: Elo[] }) {
  const projetos = filtrarProjetos(listarProjetos(), colecao.filtros);
  const caminho = `/personalizado/${colecao.slug}`;
  return (
    <>
      <JsonLd dados={schemaListagemProjetos(colecao.titulo, caminho, projetos)} />
      <JsonLd
        dados={schemaTrilhaProjetos([
          { rotulo: "Personalizado", href: "/personalizado" },
          { rotulo: colecao.titulo, href: caminho },
        ])}
      />
      <CabecalhoListagem
        trilha={[{ rotulo: "Personalizado", href: "/personalizado" }]}
        titulo={colecao.titulo}
        total={projetos.length}
        unidade={["quartinho", "quartinhos"]}
        atalhos={ATALHOS_SELECOES.filter((atalho) => atalho.href !== caminho)}
      />
      <Suspense fallback={<EsqueletoGrade />}>
        <ListagemProjetos projetos={projetos} categoria={`personalizado/${colecao.slug}`} searchParams={searchParams} />
      </Suspense>
      <ContinueExplorando base="Personalizado" categorias={relacionadas} />
    </>
  );
}

// Conteúdos do menu: "Como funciona" (linha do tempo + convite para o montador) e "Peça seu quartinho" (convite: escolher um
// projeto pronto ou montar o seu; tudo vai para a sacola e o pedido segue pelo WhatsApp).
function PaginaConteudo({ colecao }: { colecao: Extract<Colecao, { tipo: "conteudo" }> }) {
  const caminho = `/personalizado/${colecao.slug}`;
  return (
    <>
      <JsonLd
        dados={schemaTrilhaProjetos([
          { rotulo: "Personalizado", href: "/personalizado" },
          { rotulo: colecao.titulo, href: caminho },
        ])}
      />
      <CabecalhoColecao colecao={colecao} />
      {colecao.slug === "como-funciona" ? (
        <>
          <EtapasProjetos />
          <ConviteMontador />
        </>
      ) : (
        <>
          <section aria-label="Como pedir o seu quartinho" className={css({ px: RESPIRO_LATERAL, mt: { base: "10", lg: "14" } })}>
            <ol className={caminhos}>
              {[
                {
                  titulo: "Escolha um quartinho do ateliê",
                  texto: `${listarProjetos().length} quartinhos prontos para escolher o pacote e os opcionais.`,
                  acao: { rotulo: "Ver os quartinhos", href: "/personalizado" },
                },
                {
                  titulo: "Ou monte o seu",
                  texto: "Tema, paleta e peça por peça, do kit berço à bolsa maternidade, com o total na hora.",
                  acao: { rotulo: "Monte o seu quartinho", href: "/personalizado/monte-o-seu" },
                },
                {
                  titulo: "Faça o pedido pela sacola",
                  texto: "Quartinhos e peças avulsas ficam na mesma sacola. O pedido segue pelo WhatsApp com uma vendedora.",
                  acao: { rotulo: "Ver a sacola", href: "/carrinho" },
                },
              ].map((passo, indice) => (
                <li key={passo.titulo} className={cartaoCaminho}>
                  <span className={css({ fontSize: "4xl", letterSpacing: "titulo", color: "textoSuave", fontVariantNumeric: "tabular-nums" })}>0{indice + 1}</span>
                  <h2 className={css({ mt: "4", fontSize: "xl", fontWeight: "normal", letterSpacing: "bloco", color: "escuro" })}>{passo.titulo}</h2>
                  <p className={css({ mt: "2", fontSize: "sm", lineHeight: "relaxed", color: "texto" })}>{passo.texto}</p>
                  <Link href={passo.acao.href} className={css({ mt: "auto", pt: "6" })}>
                    <span className={botao({ variante: indice === 1 ? "escuro" : "contorno", tamanho: "p" })}>{passo.acao.rotulo}</span>
                  </Link>
                </li>
              ))}
            </ol>
            <ul className={css({ display: "grid", gap: "2", mt: "6", fontSize: "sm", lineHeight: "relaxed", color: "textoSuave" })}>
              <li>Respondemos pelo WhatsApp {EMPRESA.whatsapp.exibicao}, em horário comercial.</li>
              <li>Produção em {PRAZO_PRODUCAO} depois do pedido confirmado.</li>
              <li>{ENTREGA}, com frete a combinar pelo WhatsApp. Valores &quot;a partir de&quot;, com 5% OFF no Pix.</li>
              <li className={css({ fontSize: "xs" })}>{AVISO_PRECOS}</li>
            </ul>
          </section>
          <EtapasProjetos />
        </>
      )}
      <DiferenciaisProjetos />
      <OutrosProjetos projetos={listarProjetos().slice(0, 8)} />
    </>
  );
}

// overflow-x: clip (não cria contêiner de rolagem: o sticky continua funcionando).
const pdp = css({ overflowX: "clip", bg: "fundo" });

// Mesma grade da página de produto (produto/[slug]/page.tsx): desktop "1fr 440", a galeria ocupa as
// duas colunas e o painel fica por cima na 2ª; celular e tablet, a 1ª linha com a altura da galeria e
// o painel na 2ª, subindo por cima da galeria sticky. isolation: isolate prende os z-index abaixo do
// cabeçalho.
const acimaDaDobra = css({
  position: "relative",
  isolation: "isolate",
  display: "grid",
  gridTemplateColumns: { base: "minmax(0, 1fr)", desktop: "[minmax(0, 1fr) token(sizes.painelCompra)]" },
  gridTemplateRows: { base: "auto auto", desktop: "auto" },
  pt: { desktop: "4" },
  pb: "4",
});

const reservaGaleria = css({
  display: { base: "block", desktop: "none" },
  gridColumn: "1",
  gridRow: "1",
  aspectRatio: { base: "[5 / 6]", md: "[5 / 3]" },
  mb: "[1px]",
});

const painel = css({
  position: "relative",
  zIndex: "painelProduto",
  gridColumn: { base: "1", desktop: "2" },
  gridRow: { base: "2", desktop: "1" },
  minW: "0",
  px: { base: "3", md: "5", desktop: "6" },
  pb: "8",
  bg: "fundo",
});

// Extensão branca acima do painel, por baixo da pílula do cabeçalho (como na página de produto).
const extensao = css({
  display: { base: "none", desktop: "block" },
  position: "absolute",
  top: "[calc(-1 * (token(sizes.topoCabecalho) + token(spacing.4)))]",
  insetX: "0",
  h: "[calc(token(sizes.topoCabecalho) + token(spacing.4))]",
  bg: "fundo",
});

const caminhos = css({
  display: "grid",
  gridTemplateColumns: { base: "minmax(0, 1fr)", md: "repeat(3, minmax(0, 1fr))" },
  gap: "[1px]",
  bg: "borda",
  borderRadius: "bloco",
  overflow: "hidden",
});

const cartaoCaminho = css({ display: "flex", flexDirection: "column", p: { base: "6", lg: "8" }, bg: "superficieSuave" });

const tituloPagina = css({
  mt: { base: "10", lg: "20" },
  fontFamily: "corpo",
  fontSize: { base: "4xl", md: "5xl", xl: "6xl" },
  fontWeight: "normal",
  lineHeight: "[1.1]",
  letterSpacing: "[-0.04em]",
  color: "escuro",
});
