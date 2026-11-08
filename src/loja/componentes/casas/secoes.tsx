import type { Icon } from "@phosphor-icons/react";
import Link from "next/link";
import { css, cx } from "styled-system/css";
import { botao } from "styled-system/recipes";
import { CaretRight, Leaf, Needle, Palette, Ruler, Sparkle, Truck } from "@/loja/componentes/icones";
import { TituloSecao } from "@/loja/componentes/inicio/blocos";
import { Carrossel } from "@/loja/componentes/inicio/Carrossel";
import { Trilha } from "@/loja/componentes/inicio/Trilha";
import { RESPIRO_LATERAL } from "@/loja/componentes/layout/cabecalho/estilos";
import { revelarAoRolar } from "@/loja/componentes/produto/movimento";
import { recuo } from "@/loja/componentes/produto/secoes";
import { DIFERENCIAIS, ETAPAS, PERGUNTAS, type Projeto } from "@/loja/lib/casas/catalogo";
import { MODULOS } from "@/loja/lib/casas/modulos";
import { CardProjeto } from "./CardProjeto";
import type { PecaDoQuarto } from "./dadosProjeto";
import { FotoProjeto } from "./FotoProjeto";

// Seções da área Projetos (Server Components). A página do projeto segue a página de produto
// (lululemon-pdp.md): acima da dobra, galeria + painel (PainelProjeto); abaixo, "O que vem no quarto",
// "Paleta do projeto", passo a passo, perguntas, "Por que um projeto do ateliê" e "Outros projetos".
// `pdp`: na página do projeto as seções usam o recuo da página de produto (12/20/24) para alinhar
// com a gaveta e o carrossel; nas outras páginas, o respiro lateral do site.

const paddingDe = (pdp: boolean) => (pdp ? recuo : css({ px: RESPIRO_LATERAL }));

// "O que vem no quarto": as peças do pacote Completo e os opcionais em grade de cards 5:6 (a foto é a
// composição nos tons da paleta, com o ícone da peça), com o link para a peça do catálogo quando existe.
export function OQueVemNoQuarto({ projeto, pecas }: { projeto: Projeto; pecas: PecaDoQuarto[] }) {
  const cores = projeto.paleta.map((cor) => cor.hex);
  return (
    <section aria-labelledby="titulo-quarto" className={cx(recuo, revelarAoRolar, css({ mt: { base: "16", desktop: "24" } }))}>
      <TituloSecao id="titulo-quarto" titulo="O que vem no quarto." complemento="Peça por peça, no mesmo tema." />
      <ul className={gradePecas}>
        {pecas.map((peca, indice) => (
          <li key={peca.nome} className={cx("group", css({ display: "flex", flexDirection: "column", minW: "0" }))}>
            <FotoProjeto
              paleta={[cores[indice % cores.length], cores[(indice + 1) % cores.length]]}
              icone={peca.icone}
              bolinhas={false}
              className={css({ aspectRatio: "[5 / 6]", w: "full" })}
            />
            <div className={css({ display: "grid", gap: "1", mt: "3", fontSize: "sm", lineHeight: "texto" })}>
              {peca.opcional ? (
                <p className={css({ fontSize: "xs", color: "textoSuave" })}>Opcional · {peca.opcional}</p>
              ) : (
                peca.detalhe && <p className={css({ fontSize: "xs", color: "textoSuave" })}>{peca.detalhe}</p>
              )}
              <h3 className={css({ fontSize: "sm", fontWeight: "medium", color: "escuro", textWrap: "pretty" })}>{peca.nome}</h3>
              {peca.produto && (
                <Link href={`/produto/${peca.produto}`} className={linkPeca}>
                  Ver a peça avulsa
                  <CaretRight size={12} aria-hidden />
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

const gradePecas = css({
  display: "grid",
  gridTemplateColumns: { base: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))", desktop: "repeat(4, minmax(0, 1fr))", largo: "repeat(5, minmax(0, 1fr))" },
  columnGap: { base: "2", md: "5" },
  rowGap: { base: "8", desktop: "10" },
});

const linkPeca = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1",
  justifySelf: "start",
  fontSize: "sm",
  color: "escuro",
  textDecoration: "underline",
  textUnderlineOffset: "[4px]",
  textDecorationColor: "transparent",
  transitionProperty: "text-decoration-color",
  transitionDuration: "normal",
  _hover: { textDecorationColor: "escuro" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

// "Paleta do projeto": as cores em faixas altas lado a lado (a 1ª, cor de base, mais larga), com o nome
// e o código embaixo. No celular as faixas ficam mais baixas. A cor é dado do projeto (vai em style).
export function PaletaDoProjeto({ projeto }: { projeto: Projeto }) {
  return (
    <section aria-labelledby="titulo-paleta" className={cx(recuo, revelarAoRolar, css({ mt: { base: "16", desktop: "24" } }))}>
      <TituloSecao id="titulo-paleta" titulo="Paleta do projeto." complemento="As cores que se repetem do berço à porta." />
      <ul className={faixas}>
        {projeto.paleta.map((cor, indice) => (
          <li key={cor.hex} className={css({ display: "flex", flexDirection: "column", minW: "0" })} style={{ flexGrow: indice === 0 ? 3 : 2 }}>
            <span aria-hidden className={faixa} style={{ backgroundColor: cor.hex }} />
            <span className={css({ mt: "3", fontSize: "sm", fontWeight: "medium", color: "escuro" })}>{cor.nome}</span>
            <span className={css({ fontSize: "xs", color: "textoSuave", fontVariantNumeric: "tabular-nums" })}>{cor.hex.toUpperCase()}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const faixas = css({ display: "flex", gap: { base: "2", md: "[2px]" } });

const faixa = css({
  display: "block",
  h: { base: "[160px]", md: "[280px]", desktop: "[360px]" },
  boxShadow: "[inset 0 0 0 1px token(colors.borda)]",
  transitionProperty: "transform",
  transitionDuration: "lenta",
  transitionTimingFunction: "assinatura",
});

// Perguntas frequentes dos projetos (as mesmas de "Como funciona").
export function PerguntasProjetos({ id = "titulo-perguntas", pdp = false }: { id?: string; pdp?: boolean }) {
  return (
    <section aria-labelledby={id} className={cx(paddingDe(pdp), css({ mt: { base: "16", lg: "24" } }))}>
      <TituloSecao id={id} titulo="Perguntas frequentes." complemento="Do pedido à entrega." />
      <dl className={css({ display: "grid", gridTemplateColumns: { base: "1fr", md: "repeat(2, minmax(0, 1fr))" }, columnGap: "8", rowGap: "8" })}>
        {PERGUNTAS.map((item) => (
          <div key={item.pergunta} className={css({ borderTopWidth: "1px", borderColor: "escuro", pt: "4" })}>
            <dt className={css({ fontSize: "lg", fontWeight: "medium", color: "escuro" })}>{item.pergunta}</dt>
            <dd className={css({ mt: "2", lineHeight: "relaxed", color: "texto" })}>{item.resposta}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// "Outros projetos": carrossel no padrão do "Você também pode gostar" da página de produto (título de
// 64, cards de 4 + espiada no desktop e 1 + espiada no celular, setas de contorno embaixo à direita).
export function OutrosProjetos({ projetos }: { projetos: Projeto[] }) {
  if (projetos.length === 0) return null;
  return (
    <section aria-labelledby="titulo-outros" className={cx(revelarAoRolar, css({ my: { base: "16", desktop: "24" }, containerType: "inline-size" }))}>
      <div className={cx(recuo, css({ mb: { base: "8", desktop: "12" } }))}>
        <h2 id="titulo-outros" className={tituloFaixa}>
          Outros projetos
        </h2>
        <p className={css({ mt: "2", fontSize: "sm", color: "textoSuave" })}>Do mesmo estilo e do mesmo tema primeiro.</p>
      </div>
      <Carrossel rotulo="Outros projetos" classeTrilho={trilhoOutros} classeSetas={recuo}>
        {projetos.map((projeto, indice) => (
          <li key={projeto.slug} className={itemOutros}>
            <CardProjeto projeto={projeto} tom={indice} nivelTitulo="h3" sizes="(min-width: 992px) 22vw, (min-width: 768px) 42vw, 72vw" />
          </li>
        ))}
      </Carrossel>
    </section>
  );
}

const tituloFaixa = css({
  fontSize: { base: "4xl", md: "secaoTablet", desktop: "secao" },
  fontWeight: "normal",
  lineHeight: "titulo",
  letterSpacing: "titulo",
  color: "escuro",
});

const trilhoOutros = css({ gap: { base: "3", md: "5" }, px: { base: "3", md: "5" }, scrollPaddingInline: { base: "3", md: "5" } });

// Mesma largura dos cards do "Você também pode gostar" (produto/secoes.tsx).
const itemOutros = css({
  w: {
    base: "[calc(100cqw - 112px)]",
    md: "[calc((100cqw - max(min(12cqw, 200px), 15cqw) - 20px) / 2)]",
    desktop: "[calc((100cqw - max(min(12cqw, 200px), 7.5cqw) - 60px) / 4)]",
  },
});

// Convite para o montador ("Monte o seu quartinho"): faixa clara com o título grande, o texto e as
// miniaturas de alguns módulos, e o botão escuro. Na listagem de Projetos, na página de pedido e no
// fim da página do projeto.
export function ConviteMontador({ pdp = false, titulo = "Monte o seu quartinho" }: { pdp?: boolean; titulo?: string }) {
  const amostra = MODULOS.filter((modulo) => ["kit-berco", "cortina", "tapete", "almofadas", "manta"].includes(modulo.id));
  return (
    <section aria-labelledby="titulo-convite-montador" className={cx(paddingDe(pdp), css({ mt: { base: "12", desktop: "16" } }))}>
      <div className={convite}>
        <div className={css({ display: "grid", gap: "4", justifyItems: "start", maxW: "[56ch]" })}>
          <p className={css({ fontSize: "sm", fontWeight: "medium", color: "marca" })}>Projeto personalizado</p>
          <h2 id="titulo-convite-montador" className={css({ fontSize: { base: "blocoTablet", desktop: "bloco" }, fontWeight: "normal", lineHeight: "bloco", letterSpacing: "bloco", color: "escuro" })}>
            {titulo}
          </h2>
          <p className={css({ fontSize: "md", lineHeight: "relaxed", color: "texto" })}>
            Escolha o tema, a paleta e as peças, do kit berço à bolsa maternidade, e veja o total &quot;a partir de&quot; na hora. Vai para a
            sacola com o resto do enxoval e o pedido segue pelo WhatsApp.
          </p>
          <Link href="/projetos/monte-o-seu" className={botao({ variante: "escuro", tamanho: "m" })}>
            Começar a montar
          </Link>
        </div>
        <ul aria-hidden className={miniaturas}>
          {amostra.map((modulo, indice) => (
            <li key={modulo.id} className={css({ minW: "0" })}>
              <FotoProjeto
                paleta={[["#E9E1D3", "#A3B18A", "#F3E2A9", "#C9DBEA", "#E8C4BC"][indice], "#F6F3EC"]}
                icone={modulo.icone}
                bolinhas={false}
                className={css({ aspectRatio: "[5 / 6]", w: "full" })}
              />
              <span className={css({ display: "block", mt: "2", fontSize: "xs", color: "textoSuave", truncate: true })}>{modulo.nome}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const convite = css({
  display: "grid",
  gridTemplateColumns: { base: "minmax(0, 1fr)", desktop: "minmax(0, 5fr) minmax(0, 6fr)" },
  alignItems: "center",
  gap: { base: "8", desktop: "12" },
  px: { base: "5", md: "8", desktop: "12" },
  py: { base: "8", desktop: "12" },
  borderRadius: "bloco",
  bg: "fundoProduto",
});

const miniaturas = css({ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: { base: "2", md: "3" } });

// Ícone de cada diferencial, na ordem de DIFERENCIAIS (mesmo traço fino dos destaques da PDP).
const ICONES_DIFERENCIAIS: Icon[] = [Palette, Needle, Leaf, Ruler, Truck];

// "Por que um projeto do ateliê": mesmo padrão dos destaques da PDP — no desktop, à esquerda o título
// fixo ao rolar, com o texto de apoio e o convite para o montador; à direita, os 5 diferenciais em
// lista com ícone em círculo e divisórias finas. No celular, tudo empilhado.
export function DiferenciaisProjetos({ id = "titulo-diferenciais", pdp = false }: { id?: string; pdp?: boolean }) {
  return (
    <section
      aria-labelledby={id}
      className={cx(
        paddingDe(pdp),
        css({
        mt: { base: "16", lg: "24" },
        display: "grid",
        gridTemplateColumns: { base: "minmax(0, 1fr)", lg: "minmax(0, 5fr) minmax(0, 7fr)" },
        gap: { base: "8", lg: "16" },
        alignItems: "start",
      }),
      )}
    >
      <div className={css({ position: { lg: "sticky" }, top: { lg: "[112px]" }, display: "grid", gap: "5", justifyItems: "start" })}>
        <h2
          id={id}
          className={css({
            fontSize: { base: "blocoTablet", lg: "bloco" },
            lineHeight: "bloco",
            letterSpacing: "bloco",
            fontWeight: "normal",
            color: "escuro",
          })}
        >
          Por que um projeto do ateliê.{" "}
          <span className={css({ color: "textoSuave" })}>O quartinho pensado por inteiro.</span>
        </h2>
        <p className={css({ maxW: "[46ch]", fontSize: "md", lineHeight: "relaxed", color: "textoSuave" })}>
          Em vez de juntar peças soltas, o ateliê desenha o quarto como um conjunto: tema, tecidos e medidas
          conversam entre si, do kit berço ao enfeite de porta.
        </p>
        <div className={css({ display: "flex", flexWrap: "wrap", gap: "3" })}>
          <Link href="/projetos/monte-o-seu" className={botao({ variante: "escuro", tamanho: "m" })}>
            Monte o seu quartinho
          </Link>
          <Link href="/projetos/como-funciona" className={botao({ variante: "contorno", tamanho: "m" })}>
            Como funciona
          </Link>
        </div>
      </div>

      <ol className={css({ display: "grid", borderTopWidth: "1px", borderColor: "borda" })}>
        {DIFERENCIAIS.map((item, indice) => {
          const Icone = ICONES_DIFERENCIAIS[indice] ?? Sparkle;
          return (
            <li
              key={item.titulo}
              className={css({
                display: "grid",
                gridTemplateColumns: "[auto minmax(0, 1fr)]",
                gap: { base: "4", lg: "6" },
                alignItems: "start",
                py: { base: "5", lg: "7" },
                borderBottomWidth: "1px",
                borderColor: "borda",
              })}
            >
              <span
                aria-hidden
                className={css({
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  w: "12",
                  h: "12",
                  borderRadius: "full",
                  bg: "marcaSuave",
                  color: "marca",
                })}
              >
                <Icone size={22} weight="light" />
              </span>
              <div className={css({ display: "grid", gap: "1.5" })}>
                <h3
                  className={css({
                    fontSize: { base: "lg", lg: "xl" },
                    fontWeight: "normal",
                    letterSpacing: "[-0.02em]",
                    color: "escuro",
                  })}
                >
                  {item.titulo}
                </h3>
                <p className={css({ maxW: "[60ch]", fontSize: { base: "sm", lg: "md" }, lineHeight: "relaxed", color: "textoSuave" })}>
                  {item.texto}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// "Como funciona": as 5 etapas, da escolha à entrega.
export function EtapasProjetos({ id = "titulo-etapas", pdp = false }: { id?: string; pdp?: boolean }) {
  return (
    <section aria-labelledby={id} className={cx(paddingDe(pdp), css({ mt: { base: "16", lg: "24" } }))}>
      <TituloSecao id={id} titulo="Passo a passo." complemento="Da escolha à entrega." />
      <ol
        className={css({
          display: "grid",
          gridTemplateColumns: { base: "1fr", md: "repeat(5, minmax(0, 1fr))" },
          gap: "[1px]",
          bg: "borda",
          borderRadius: "bloco",
          overflow: "hidden",
        })}
      >
        {ETAPAS.map((etapa, indice) => (
          <li key={etapa.titulo} className={css({ bg: "superficieSuave", p: { base: "6", lg: "8" } })}>
            <span
              className={css({
                fontSize: "4xl",
                fontWeight: "normal",
                letterSpacing: "[-0.04em]",
                color: "textoSuave",
                fontVariantNumeric: "tabular-nums",
              })}
            >
              0{indice + 1}
            </span>
            <h3 className={css({ mt: "4", fontFamily: "corpo", fontSize: "lg", fontWeight: "semibold", color: "escuro" })}>
              {etapa.titulo}
            </h3>
            <p className={css({ mt: "2", fontSize: "sm", lineHeight: "relaxed", color: "texto" })}>{etapa.texto}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

// Vitrine de projetos (Lululemon "What's new?"): ~3,5 cards por tela com setas embaixo à direita.
export function VitrineProjetos({
  id,
  titulo,
  complemento,
  projetos,
  acao,
}: {
  id: string;
  titulo: string;
  complemento: string;
  projetos: Projeto[];
  acao?: { rotulo: string; href: string };
}) {
  return (
    <section aria-labelledby={id} className={css({ px: RESPIRO_LATERAL, mt: { base: "16", lg: "24" } })}>
      <TituloSecao
        id={id}
        titulo={titulo}
        complemento={complemento}
        acao={
          acao && (
            <Link href={acao.href} className={botao({ variante: "escuro", tamanho: "p" })}>
              {acao.rotulo}
            </Link>
          )
        }
      />
      <Trilha rotulo={titulo} setas="abaixo" className={css({ gap: "[2px]" })}>
        {projetos.map((projeto, indice) => (
          <li key={projeto.slug} className={css({ w: { base: "[82%]", md: "[44%]", lg: "[calc((100% - 3 * 2px) / 3.5)]" } })}>
            <CardProjeto projeto={projeto} tom={indice} nivelTitulo="h3" sizes="(min-width: 1024px) 28vw, (min-width: 768px) 44vw, 82vw" />
          </li>
        ))}
      </Trilha>
    </section>
  );
}

// Projetos parecidos: mesmo estilo primeiro, depois mesmo tema, depois o preço mais próximo.
export function projetosParecidos(projeto: Projeto, todos: Projeto[], quantidade = 8): Projeto[] {
  return todos
    .filter((outro) => outro.slug !== projeto.slug)
    .sort(
      (a, b) =>
        Number(b.estilo === projeto.estilo) - Number(a.estilo === projeto.estilo) ||
        Number(b.tema === projeto.tema) - Number(a.tema === projeto.tema) ||
        Math.abs(a.precoAPartirDe - projeto.precoAPartirDe) - Math.abs(b.precoAPartirDe - projeto.precoAPartirDe),
    )
    .slice(0, quantidade);
}
