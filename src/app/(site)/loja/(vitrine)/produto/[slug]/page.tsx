import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { css } from "styled-system/css";
import { Avaliacoes } from "@/loja/componentes/produto/Avaliacoes";
import { abasDe, coresDe, destaquesDe, dividirNome, fotosDoProduto, linhaDe, partesDaOpcao, usoDe } from "@/loja/componentes/produto/dados";
import { Destaques } from "@/loja/componentes/produto/Destaques";
import { Galeria } from "@/loja/componentes/produto/Galeria";
import { GavetaDetalhes } from "@/loja/componentes/produto/GavetaDetalhes";
import { type Look, Looks } from "@/loja/componentes/produto/Looks";
import { CompraProvider, PainelCompra, PilulaCompra } from "@/loja/componentes/produto/PainelCompra";
import { FaleComAtelie, HeroLinha, PensadoPara, PorQueVaiAmar, recuo, VoceTambem } from "@/loja/componentes/produto/secoes";
import { JsonLd } from "@/loja/componentes/seo/JsonLd";
import { buscarProduto, buscarVarios, condicoesDePagamento, listarSlugs, PRONTA_ENTREGA, type Produto } from "@/loja/lib/catalogo/exemplos";
import { fotoPrincipal } from "@/loja/lib/catalogo/fotos";
import { schemaProduto, schemaTrilha } from "@/loja/lib/seo/produto";

// Página de produto no modelo da shop.lululemon.com (lululemon-pdp.md, nov/2026), com o conteúdo do
// ateliê: área acima da dobra em grade "1fr 440" em que a galeria corre POR TRÁS do painel de compra
// (sticky a 80 px), pílula fixa "Adicionar no meu enxoval" e, abaixo da dobra, "Pensado para", "Por que você
// vai amar", gaveta de detalhes, "Fale com o ateliê", hero da linha, destaques, "Complete o enxoval",
// avaliações e "Você também pode gostar".
// params lido fora de <Suspense>: slug inexistente responde com status 404 de verdade (não 200 com
// a página de "não encontrado" dentro do streaming). Os produtos conhecidos são pré-gerados no build.

export function generateStaticParams() {
  return listarSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/loja/produto/[slug]">): Promise<Metadata> {
  const produto = buscarProduto((await params).slug);
  if (!produto) return {};
  return {
    title: produto.nome,
    description: `${produto.resumo} Enxoval feito à mão no Ateliê Milena Kerbage, com entrega para todo o Brasil.`,
    alternates: { canonical: `/produto/${produto.slug}` },
    // Catálogo de exemplo (preços fictícios): fora do índice até a API de catálogo existir.
    robots: { index: false, follow: true },
  };
}

export default async function PaginaProduto({ params }: PageProps<"/loja/produto/[slug]">) {
  const produto = buscarProduto((await params).slug);
  if (!produto) notFound();
  const complementos = buscarVarios(produto.complementos).slice(0, 4);
  const semelhantes = buscarVarios(produto.semelhantes).slice(0, 8);
  const pagamento = condicoesDePagamento(produto.preco);
  const { base, variacao } = dividirNome(produto.nome);
  const fotos = fotosDoProduto(produto);
  // Selo "Novo" nas cores cujo produto-irmão é novidade.
  const novos = new Set(buscarVarios(produto.irmaos?.itens.map((irmao) => irmao.slug) ?? []).filter((irmao) => irmao.selo === "Novidade").map((irmao) => irmao.slug));
  const categoria = produto.trilha.at(-1) ?? { rotulo: "Produtos", href: "/" };

  // Confirmação do carrinho: primeiro o que completa o enxoval, depois os semelhantes, até 8.
  const sugestoes = [...complementos, ...semelhantes.filter((outro) => !complementos.includes(outro))].slice(0, 8).map((outro) => ({
    slug: outro.slug,
    nome: outro.nome,
    pix: condicoesDePagamento(outro.preco)?.pix ?? outro.preco,
    precisaEscolher: Boolean(outro.variacao),
    foto: fotoPrincipal(outro),
  }));

  const peca = (outro: Produto) => ({ slug: outro.slug, nome: outro.nome, preco: outro.preco, foto: fotosDoProduto(outro)[0] });
  const looks: Look[] = [
    { titulo: "Peças que combinam", pecas: complementos.map(peca) },
    { titulo: `Mais ${categoria.rotulo.toLowerCase()}`, pecas: semelhantes.slice(0, 4).map(peca) },
    { titulo: "Mais do ateliê", pecas: semelhantes.slice(4, 8).map(peca) },
  ].filter((look) => look.pecas.length >= 2);

  return (
    <article data-pagina-produto className={pdp}>
      <JsonLd dados={schemaProduto(produto, complementos)} />
      <JsonLd dados={schemaTrilha(produto)} />

      <CompraProvider
        dados={{
          slug: produto.slug,
          nome: produto.nome,
          nomeBase: base,
          nomeVariacao: variacao,
          preco: produto.preco,
          pix: pagamento?.pix ?? produto.preco,
          parcelas: pagamento?.parcelas ?? 1,
          valorParcela: pagamento?.valorParcela ?? produto.preco,
          trilha: produto.trilha,
          cores: coresDe(produto, novos, { variantes: false }),
          variacao: produto.variacao,
          personalizacao: produto.personalizacao,
          prontaEntrega: produto.atributos.entrega?.includes(PRONTA_ENTREGA) ?? false,
          avaliacoes: produto.avaliacoes,
          foto: fotoPrincipal(produto),
        }}
        sugestoes={sugestoes}
      >
        <section aria-label="Compra" className={acimaDaDobra}>
          <div aria-hidden className={reservaGaleria} />
          <Galeria nome={produto.nome} fotos={fotos} temComplementos={looks.length > 0} />
          <aside aria-label="Escolha e compra" className={painel}>
            <div aria-hidden className={extensao} />
            <PainelCompra />
          </aside>
        </section>

        <PensadoPara uso={usoDe(produto)} />
        <PorQueVaiAmar texto={produto.resumo} />
        <div className={css({ mt: { base: "10", desktop: "16" } })}>
          <div className={recuo}>
            <GavetaDetalhes nome={produto.nome} sku={produto.sku} abas={abasDe(produto)} />
          </div>
        </div>
        <FaleComAtelie nome={produto.nome} />
        <HeroLinha linha={linhaDe(produto)} />
        <Destaques frase="Feito à mão no ateliê, peça por peça." destaques={destaquesDe(produto)} fotos={fotos} />
        <Looks looks={looks} href={produto.trilha[0]?.href ?? "/"} />
        <Avaliacoes
          avaliacoes={produto.avaliacoes}
          tamanhos={produto.variacao && { titulo: produto.variacao.titulo, opcoes: produto.variacao.opcoes.map((opcao) => partesDaOpcao(opcao.rotulo).curto) }}
        />
        <VoceTambem produtos={semelhantes} />
        <PilulaCompra />
      </CompraProvider>
    </article>
  );
}

// overflow-x: clip (não cria contêiner de rolagem: o sticky continua funcionando).
const pdp = css({ overflowX: "clip", bg: "fundo" });

// Desktop: "1fr 440", 16 em cima e embaixo; a galeria ocupa as duas colunas e o painel fica por cima
// na 2ª. Com os 64 reservados pelo <main>, a área começa 80 px abaixo da faixa promocional, 16 abaixo da
// pílula do cabeçalho (como a referência: y 113 = 33 + 80), e não encosta nela.
// Celular e tablet: 1ª linha com a altura da galeria (reserva 5:6 / 5:3 + 1 px da barra) e o painel
// na 2ª, subindo por cima da galeria sticky.
// isolation: isolate prende os z-index de dentro (painel, controles da galeria) num contexto próprio,
// abaixo do cabeçalho (z-index cabecalho): a pílula do cabeçalho fica sempre por cima do painel e da
// galeria, em qualquer rolagem.
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

// Extensão branca de 80 px acima do painel (64 da reserva do <main> + 16 da área), POR BAIXO da
// pílula do cabeçalho: as fotos não aparecem na faixa atrás do cabeçalho ao lado do painel.
const extensao = css({
  display: { base: "none", desktop: "block" },
  position: "absolute",
  top: "[calc(-1 * (token(sizes.topoCabecalho) + token(spacing.4)))]",
  insetX: "0",
  h: "[calc(token(sizes.topoCabecalho) + token(spacing.4))]",
  bg: "fundo",
});
