import type { Icon } from "@phosphor-icons/react";
import Link from "next/link";
import { css, cx } from "styled-system/css";
import { botao } from "styled-system/recipes";
import { ArrowLeft, Baby, CaretDown, Clock, Leaf, Needle, Palette, Ruler, Sparkle, Truck } from "@/loja/componentes/icones";
import { TituloSecao } from "@/loja/componentes/inicio/blocos";
import { Trilha } from "@/loja/componentes/inicio/Trilha";
import { RESPIRO_LATERAL } from "@/loja/componentes/layout/cabecalho/estilos";
import {
  DIFERENCIAIS,
  ENTREGA,
  ETAPAS,
  formatarPreco,
  PACOTES,
  PERGUNTAS,
  PRAZO_PRODUCAO,
  type Projeto,
  prazoDoProjeto,
  rotuloEstilo,
  rotuloTecido,
  rotuloTema,
} from "@/loja/lib/casas/catalogo";
import { EMPRESA } from "@/loja/lib/empresa";
import { AvisoDemonstracao } from "./AvisoDemonstracao";
import { CardProjeto } from "./CardProjeto";
import { SeletorPacote } from "./SeletorPacote";

// Partes da página do projeto no modelo da PDP da Adidas (referencia.md §12), trocando o painel de
// compra por um painel de orçamento: o projeto é feito sob encomenda, então a ação é escolher o
// pacote, juntar na seleção e pedir o orçamento ao ateliê pelo WhatsApp. Server Components.

export function TrilhaProjeto({ projeto }: { projeto: Projeto }) {
  const itens = [
    { rotulo: "Página inicial", href: "/" },
    { rotulo: "Projetos", href: "/projetos" },
  ];
  return (
    <nav aria-label="Você está em" className={trilha}>
      <Link href="/projetos" className={css({ display: { base: "none", lg: "inline-flex" }, alignItems: "center", gap: "1.5", mr: "4" })}>
        <ArrowLeft size={16} aria-hidden />
        Voltar
      </Link>
      <ol className={css({ display: "flex", flexWrap: "wrap", gap: "1" })}>
        {itens.map((item, indice) => (
          <li key={item.href} className={css({ display: "flex", gap: "1" })}>
            {indice > 0 && <span aria-hidden>/</span>}
            <Link href={item.href} className={css({ textDecoration: "underline", textUnderlineOffset: "3px" })}>
              {item.rotulo}
            </Link>
          </li>
        ))}
        <li className={css({ display: "flex", gap: "1" })}>
          <span aria-hidden>/</span>
          <span aria-current="page">{projeto.nome}</span>
        </li>
      </ol>
    </nav>
  );
}

// Painel fixo à direita (Adidas: 480 px): ateliê, selo, nome, preço "a partir de", ficha e pacotes.
export function PainelProjeto({ projeto }: { projeto: Projeto }) {
  return (
    <>
      <div
        className={css({
          gridArea: "cabecalho",
          px: { base: "4", md: "8", lg: "0" },
          pt: { base: "3", lg: "0" },
          pb: { base: "6", lg: "0" },
        })}
      >
        <p className={css({ display: { base: "none", lg: "block" }, fontSize: "md", color: "texto" })}>Projetos • {EMPRESA.nomeFantasia}</p>
        <p className={selo}>{rotuloTema(projeto.tema)}</p>
        <h1 className={titulo}>{projeto.nome}</h1>
        {projeto.chamada && <p className={css({ mt: "1", fontSize: "md", fontWeight: "medium", color: "escuro" })}>{projeto.chamada}</p>}
        <p className={css({ mt: "4", fontSize: "xl", fontWeight: "bold", color: "escuro", fontVariantNumeric: "tabular-nums" })}>
          <span className={css({ mr: "2", fontSize: "sm", fontWeight: "normal", color: "textoSuave" })}>a partir de</span>
          {formatarPreco(projeto.precoAPartirDe)}
        </p>
        <AvisoDemonstracao className={css({ mt: "2" })} />
      </div>

      <div className={css({ gridArea: "compra", px: { base: "4", md: "8", lg: "0" }, mt: "6" })}>
        <FichaEmIcones projeto={projeto} />
        <PaletaProjeto projeto={projeto} />

        <div className={css({ mt: "6" })}>
          <SeletorPacote slug={projeto.slug} nome={projeto.nome} precoBase={projeto.precoAPartirDe} pacotes={PACOTES} />
        </div>
      </div>
    </>
  );
}

type Dado = { icone: Icon; rotulo: string; valor: string };

// Ficha do projeto, compacta para o painel: grade de 3 colunas, cada dado com ícone de traço fino
// ao lado do rótulo em caixa alta e do valor.
export function FichaEmIcones({ projeto }: { projeto: Projeto }) {
  const dados: Dado[] = [
    { icone: Baby, rotulo: "Tema", valor: rotuloTema(projeto.tema) },
    { icone: Sparkle, rotulo: "Estilo", valor: rotuloEstilo(projeto.estilo) },
    { icone: Needle, rotulo: "Tecido", valor: rotuloTecido(projeto.tecido).split(" ")[0] },
    { icone: Clock, rotulo: "Produção", valor: prazoDoProjeto(projeto) },
    { icone: Truck, rotulo: "Entrega", valor: "Todo o Brasil" },
    { icone: Palette, rotulo: "Cores", valor: String(projeto.paleta.length) },
  ];
  return (
    <dl className={gradeFicha}>
      {dados.map(({ icone: Icone, rotulo, valor }) => (
        <div key={rotulo} className={css({ display: "flex", alignItems: "flex-start", gap: "2", minW: "0" })}>
          <Icone size={20} weight="light" aria-hidden className={css({ flexShrink: "0", mt: "0.5", color: "texto" })} />
          <div className={css({ display: "flex", flexDirection: "column", minW: "0" })}>
            <dt className={rotuloFicha}>{rotulo}</dt>
            <dd className={css({ fontSize: "sm", fontWeight: "semibold", color: "escuro", whiteSpace: "nowrap" })}>{valor}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

// Paleta do projeto: bolinhas com o nome de cada cor (a cor é dado do projeto, por isso vai em style).
export function PaletaProjeto({ projeto }: { projeto: Projeto }) {
  return (
    <div className={css({ py: "5", borderBottomWidth: "1px", borderColor: "borda" })}>
      <p className={rotuloFicha}>Paleta</p>
      <ul className={css({ display: "flex", flexWrap: "wrap", gap: "4", mt: "3" })}>
        {projeto.paleta.map((cor) => (
          <li key={cor.hex} className={css({ display: "flex", alignItems: "center", gap: "2", fontSize: "sm", color: "escuro" })}>
            <span aria-hidden className={amostra} style={{ backgroundColor: cor.hex }} />
            {cor.nome}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Sanfonas no padrão da PDP (linhas de 80 px): descrição, o que inclui, ficha, pacotes e perguntas.
export function DetalhesProjeto({ projeto }: { projeto: Projeto }) {
  const ficha: Array<[string, string]> = [
    ["Tema", rotuloTema(projeto.tema)],
    ["Estilo", rotuloEstilo(projeto.estilo)],
    ["Tecido principal", rotuloTecido(projeto.tecido)],
    ["Paleta", projeto.paleta.map((cor) => cor.nome).join(", ")],
    ["Prazo de produção", `${prazoDoProjeto(projeto)} (projetos do ateliê: ${PRAZO_PRODUCAO})`],
    ["Entrega", ENTREGA],
  ];
  return (
    <div className={css({ gridArea: "detalhes", px: { base: "0", lg: "16" }, mt: { base: "10", lg: "16" } })}>
      <details className={sanfona} open>
        <summary className={linhaSanfona}>
          <span>Sobre o {projeto.nome}</span>
          <CaretDown size={20} aria-hidden className={seta} />
        </summary>
        <div className={cx(conteudoSanfona, css({ display: "grid", gap: "3" }))}>
          {projeto.descricao.map((paragrafo) => (
            <p key={paragrafo}>{paragrafo}</p>
          ))}
        </div>
      </details>
      <details className={sanfona} open>
        <summary className={linhaSanfona}>
          <span>O que vem no projeto</span>
          <CaretDown size={20} aria-hidden className={seta} />
        </summary>
        <div className={conteudoSanfona}>
          <ul className={css({ display: "grid", gap: "2" })}>
            {projeto.pecas.map((peca) => (
              <li key={peca}>{peca}</li>
            ))}
          </ul>
          <p className={css({ mt: "4", fontSize: "sm", color: "textoSuave" })}>
            As peças acima são as do pacote Completo. No Essencial vêm o kit berço e a cortina; no Completo personalizado, também o
            bordado do nome e peças exclusivas.
          </p>
          {projeto.opcionais.length > 0 && (
            <p className={css({ mt: "3", fontSize: "sm", color: "texto" })}>Também dá para incluir: {projeto.opcionais.join("; ")}.</p>
          )}
        </div>
      </details>
      <details className={sanfona}>
        <summary className={linhaSanfona}>
          <span>Ficha do projeto</span>
          <CaretDown size={20} aria-hidden className={seta} />
        </summary>
        <div className={conteudoSanfona}>
          <table className={css({ w: "full", borderCollapse: "collapse", fontSize: "sm" })}>
            <tbody>
              {ficha.map(([nome, valor]) => (
                <tr key={nome} className={css({ borderBottomWidth: "1px", borderColor: "borda" })}>
                  <th scope="row" className={celulaNome}>
                    {nome}
                  </th>
                  <td className={css({ py: "3", color: "texto" })}>{valor}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={css({ mt: "4", fontSize: "xs", lineHeight: "relaxed", color: "textoSuave" })}>
            Cores, peças e medidas podem ser ajustadas no orçamento.
          </p>
        </div>
      </details>
      <details className={sanfona}>
        <summary className={linhaSanfona}>
          <span>Pacotes</span>
          <CaretDown size={20} aria-hidden className={seta} />
        </summary>
        <dl className={cx(conteudoSanfona, css({ display: "grid", gap: "5" }))}>
          {PACOTES.map((pacote) => (
            <div key={pacote.nome}>
              <dt className={css({ fontWeight: "semibold", color: "escuro" })}>
                {pacote.nome} · a partir de {formatarPreco(projeto.precoAPartirDe + pacote.acrescimo)}
              </dt>
              <dd className={css({ mt: "1" })}>{pacote.itens.join("; ")}.</dd>
            </div>
          ))}
        </dl>
      </details>
      <details className={cx(sanfona, css({ borderBottomWidth: "1px" }))}>
        <summary className={linhaSanfona}>
          <span>Perguntas frequentes</span>
          <CaretDown size={20} aria-hidden className={seta} />
        </summary>
        <dl className={cx(conteudoSanfona, css({ display: "grid", gap: "5" }))}>
          {PERGUNTAS.map((item) => (
            <div key={item.pergunta}>
              <dt className={css({ fontWeight: "semibold", color: "escuro" })}>{item.pergunta}</dt>
              <dd className={css({ mt: "1" })}>{item.resposta}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}

// Ícone de cada diferencial, na ordem de DIFERENCIAIS (mesmo traço fino dos destaques da PDP).
const ICONES_DIFERENCIAIS: Icon[] = [Palette, Needle, Leaf, Ruler, Truck];

// "Por que um projeto do ateliê": mesmo padrão dos destaques da PDP — no desktop, à esquerda o título
// fixo ao rolar, com o texto de apoio e o convite para o orçamento; à direita, os 5 diferenciais em
// lista com ícone em círculo e divisórias finas. No celular, tudo empilhado.
export function DiferenciaisProjetos({ id = "titulo-diferenciais" }: { id?: string }) {
  return (
    <section
      aria-labelledby={id}
      className={css({
        px: RESPIRO_LATERAL,
        mt: { base: "16", lg: "24" },
        display: "grid",
        gridTemplateColumns: { base: "minmax(0, 1fr)", lg: "minmax(0, 5fr) minmax(0, 7fr)" },
        gap: { base: "8", lg: "16" },
        alignItems: "start",
      })}
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
        <Link href="/projetos/orcamento" className={botao({ variante: "escuro", tamanho: "m" })}>
          Peça seu projeto
        </Link>
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
export function EtapasProjetos({ id = "titulo-etapas" }: { id?: string }) {
  return (
    <section aria-labelledby={id} className={css({ px: RESPIRO_LATERAL, mt: { base: "16", lg: "24" } })}>
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

const trilha = css({
  display: "flex",
  alignItems: "center",
  gridArea: { base: "trilha", lg: "galeria" },
  alignSelf: "start",
  zIndex: "[1]",
  px: { base: "4", md: "8", lg: "6" },
  pt: { base: "4", lg: "5" },
  pb: { base: "0", lg: "3" },
  fontSize: "sm",
  color: "escuro",
});

const selo = css({
  display: "inline-block",
  mt: { base: "3", lg: "4" },
  px: "2",
  py: "1",
  borderRadius: "sm",
  bg: "marcaSuave",
  fontSize: "sm",
  color: "escuro",
  textTransform: "uppercase",
});

const titulo = css({
  mt: "2",
  fontFamily: "titulo",
  fontSize: { base: "2xl", lg: "3xl" },
  fontWeight: "extrabold",
  lineHeight: "snug",
  letterSpacing: "wide",
  textTransform: "uppercase",
  color: "escuro",
});

const gradeFicha = css({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  columnGap: "3",
  rowGap: "4",
  py: "5",
  borderTopWidth: "1px",
  borderBottomWidth: "1px",
  borderColor: "borda",
});

const rotuloFicha = css({
  fontSize: "2xs",
  fontWeight: "medium",
  letterSpacing: "[0.12em]",
  textTransform: "uppercase",
  color: "textoSuave",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

const amostra = css({ w: "5", h: "5", borderRadius: "full", borderWidth: "1px", borderColor: "borda", flexShrink: "0" });

const sanfona = css({ borderTopWidth: "1px", borderColor: "borda" });

const linhaSanfona = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  px: { base: "4", lg: "8" },
  py: "6",
  fontSize: "md",
  fontWeight: "semibold",
  color: "escuro",
  cursor: "pointer",
  listStyle: "none",
  "&::-webkit-details-marker": { display: "none" },
  _hover: { bg: "fundoSutil" },
});

const seta = css({ transition: "transform", transitionDuration: "normal", "details[open] &": { transform: "rotate(180deg)" } });

const conteudoSanfona = css({ px: { base: "4", lg: "8" }, pb: "8", fontSize: "md", lineHeight: "relaxed", color: "texto" });

const celulaNome = css({ py: "3", pr: "6", w: "[42%]", textAlign: "left", fontWeight: "medium", color: "escuro", verticalAlign: "top" });
