"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import { botao } from "styled-system/recipes";
import { ResumoFixo, Valor } from "@/loja/componentes/carrinho/Resumo";
import { Trash } from "@/loja/componentes/icones";
import { RESPIRO_LATERAL } from "@/loja/componentes/layout/cabecalho/estilos";
import { formatarPreco, PACOTES } from "@/loja/lib/casas/catalogo";
import { AvisoDemonstracao } from "./AvisoDemonstracao";
import { adicionarProjeto, type ProjetoSelecionado, removerProjeto, restaurarProjeto, useProjetosSelecionados } from "./estadoSelecao";
import { FormularioPedido, itensDaSelecao, type ResumoProjeto } from "./FormularioPedido";
import { PlaceholderProjeto } from "./PlaceholderProjeto";

type Desfazer = { item: ProjetoSelecionado; posicao: number; nome: string };

function precoDoItem(projeto: ResumoProjeto, pacote: string): number {
  return projeto.precoAPartirDe + (PACOTES.find((item) => item.nome === pacote)?.acrescimo ?? 0);
}

// Seleção de projetos com a mesma interface do carrinho de produtos (PaginaCarrinho): título com a
// contagem, tabela Projetos | Pacote | A partir de, resumo fixo à direita, barra do celular, esqueleto
// ao carregar e "Desfazer" ao remover. Não há pagamento: a finalização é o formulário de orçamento,
// que abre o WhatsApp do ateliê com os projetos, os pacotes e os dados do quarto.
export function SelecaoProjetos({ projetos, numero, sugestoes }: { projetos: ResumoProjeto[]; numero: string; sugestoes: ReactNode }) {
  const selecao = useProjetosSelecionados();
  const [desfazer, setDesfazer] = useState<Desfazer | null>(null);
  const temporizador = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  if (selecao === null) return <Esqueleto />;

  const linhas = selecao.flatMap((item) => {
    const projeto = projetos.find((atual) => atual.slug === item.slug);
    return projeto ? [{ item, projeto }] : [];
  });
  const total = linhas.length;
  const estimativa = linhas.reduce((soma, { item, projeto }) => soma + precoDoItem(projeto, item.pacote), 0);
  const itens = itensDaSelecao(selecao, projetos);
  const temas = new Set(linhas.map(({ projeto }) => projeto.tema));

  function remover(item: ProjetoSelecionado, nome: string) {
    const posicao = removerProjeto(item.slug);
    setDesfazer({ item, posicao, nome });
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => setDesfazer(null), 6000);
  }

  return (
    <div className={css({ maxW: "conteudo", mx: "auto", px: RESPIRO_LATERAL, pt: "6", pb: "24" })}>
      <div
        className={css({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "4", mt: { base: "4", lg: "8" } })}
      >
        <h1 className={tituloPagina}>
          Sua seleção de projetos
          {total > 0 && (
            <span className={css({ ml: "3", fontSize: "md", letterSpacing: "normal", color: "textoSuave", whiteSpace: "nowrap" })}>
              {total} {total === 1 ? "projeto" : "projetos"}
            </span>
          )}
        </h1>
        <Link href="/projetos" className={cx(linkSublinhado, css({ display: { base: "none", md: "inline" }, whiteSpace: "nowrap" }))}>
          Continuar vendo projetos
        </Link>
      </div>

      {total === 0 ? (
        <div className={css({ py: { base: "16", lg: "24" }, textAlign: "center" })}>
          <h2 className={css({ fontSize: "3xl", fontWeight: "normal", letterSpacing: "[-0.02em]", color: "escuro" })}>
            Sua seleção está vazia
          </h2>
          <p className={css({ mt: "3", color: "textoSuave" })}>
            Escolha um projeto e o pacote para pedir o orçamento ao ateliê, ou peça direto, sem escolher.
          </p>
          <div className={css({ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "3", mt: "8" })}>
            <Link href="/projetos" className={cx(botao({ variante: "contorno", tamanho: "m" }), css({ minW: "[220px]" }))}>
              Ver os projetos
            </Link>
            <Link href="/projetos/orcamento" className={cx(botao({ variante: "escuro", tamanho: "m" }), css({ minW: "[220px]" }))}>
              Peça seu projeto
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className={grade}>
            <div>
              <section aria-label="Projetos da seleção">
                <div aria-hidden className={cabecalhoTabela}>
                  <span>Projetos</span>
                  <span>Pacote</span>
                  <span className={css({ textAlign: "right" })}>A partir de</span>
                </div>
                <ul className={css({ borderTopWidth: { base: "1px", xl: "0" }, borderColor: "borda" })}>
                  {linhas.map(({ item, projeto }, indice) => (
                    <li key={item.slug} className={linhaItem}>
                      <div className={css({ display: "flex", gap: "4", minW: "0" })}>
                        <Link href={`/projetos/${projeto.slug}`} aria-label={projeto.nome} className={miniatura}>
                          <PlaceholderProjeto nome={projeto.nome} paleta={projeto.paleta} tom={indice} tamanho={32} />
                        </Link>
                        <div className={css({ minW: "0" })}>
                          <Link href={`/projetos/${projeto.slug}`} className={nomeItem}>
                            {projeto.nome}
                          </Link>
                          <p className={css({ mt: "1.5", fontSize: "sm", color: "textoSuave" })}>{projeto.resumo}</p>
                          <button
                            type="button"
                            onClick={() => remover(item, projeto.nome)}
                            className={cx(acaoTexto, css({ mt: "3" }))}
                          >
                            <Trash size={16} aria-hidden /> Remover
                          </button>
                        </div>
                      </div>

                      <label className={css({ display: "grid", gap: "1", fontSize: "xs", color: "textoSuave" })}>
                        <span className={css({ display: { xl: "none" } })}>Pacote</span>
                        <select
                          aria-label={`Pacote do ${projeto.nome}`}
                          value={item.pacote}
                          onChange={(evento) => adicionarProjeto({ slug: item.slug, pacote: evento.target.value })}
                          className={seletor}
                        >
                          {PACOTES.map((pacote) => (
                            <option key={pacote.nome}>{pacote.nome}</option>
                          ))}
                        </select>
                      </label>

                      <p
                        className={css({
                          textAlign: "right",
                          fontSize: "lg",
                          fontWeight: "bold",
                          color: "escuro",
                          whiteSpace: "nowrap",
                          fontVariantNumeric: "tabular-nums",
                        })}
                      >
                        {formatarPreco(precoDoItem(projeto, item.pacote))}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              <section id="pedido" aria-labelledby="titulo-pedido" className={css({ mt: { base: "10", lg: "14" }, scrollMarginTop: "[120px]" })}>
                <h2 id="titulo-pedido" className={tituloResumo}>
                  Pedir orçamento
                </h2>
                <p className={css({ mt: "2", mb: "6", color: "textoSuave" })}>
                  Conte um pouco sobre o quarto. A resposta vem pelo WhatsApp, com valores, prazo e frete.
                </p>
                <FormularioPedido
                  numero={numero}
                  itens={itens}
                  temaInicial={temas.size === 1 ? [...temas][0] : ""}
                  rotuloBotao={`Pedir orçamento${total > 1 ? ` dos ${total} projetos` : ""} pelo WhatsApp`}
                />
              </section>
            </div>

            <ResumoFixo topo={120}>
              <h2 id="titulo-resumo" className={tituloResumo}>
                Resumo
              </h2>
              <dl className={css({ display: "grid", gap: "2.5", mt: "5", fontSize: "md" })}>
                {linhas.map(({ item, projeto }) => (
                  <Valor key={item.slug} rotulo={projeto.nome} valor={item.pacote} />
                ))}
              </dl>
              <div
                className={css({
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "3",
                  mt: "5",
                  pt: "5",
                  borderTopWidth: "1px",
                  borderColor: "borda",
                })}
              >
                <span className={css({ fontSize: "lg", fontWeight: "semibold", color: "escuro" })}>Estimativa</span>
                <span className={css({ fontSize: "lg", fontWeight: "bold", color: "escuro", fontVariantNumeric: "tabular-nums" })}>
                  a partir de {formatarPreco(estimativa)}
                </span>
              </div>
              <a href="#pedido" className={cx(botao({ variante: "escuro", tamanho: "g", largo: true }), css({ mt: "5" }))}>
                Preencher o pedido
              </a>
              <AvisoDemonstracao complemento="Frete combinado pelo WhatsApp." className={css({ mt: "4" })} />
            </ResumoFixo>
          </div>

          {/* Celular: o pedido sempre à mão, como no carrinho de produtos. */}
          <div data-barra-fixa className={barraCelular}>
            <span className={css({ display: "block", minW: "0" })}>
              <span className={css({ display: "block", fontSize: "xs", color: "textoSuave" })}>
                {total} {total === 1 ? "projeto" : "projetos"} · a partir de
              </span>
              <span className={css({ display: "block", fontSize: "xl", fontWeight: "bold", color: "escuro" })}>{formatarPreco(estimativa)}</span>
            </span>
            <a href="#pedido" className={botao({ variante: "escuro", tamanho: "m" })}>
              Pedir orçamento
            </a>
          </div>
        </>
      )}

      {sugestoes}

      {desfazer && (
        <div role="status" className={avisoDesfazer}>
          <span className={css({ minW: "0", truncate: true })}>{desfazer.nome} saiu da seleção.</span>
          <button
            type="button"
            onClick={() => {
              restaurarProjeto(desfazer.item, desfazer.posicao);
              setDesfazer(null);
            }}
            className={css({
              flexShrink: "0",
              fontWeight: "semibold",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
              cursor: "pointer",
            })}
          >
            Desfazer
          </button>
        </div>
      )}
    </div>
  );
}

function Esqueleto() {
  return (
    <div aria-busy="true" className={css({ maxW: "conteudo", mx: "auto", px: RESPIRO_LATERAL, pt: "6", pb: "24" })}>
      <div className={css({ w: "64", h: "10", mt: { base: "4", lg: "8" }, bg: "placeholder", borderRadius: "sm" })} />
      <div className={grade}>
        <div className={css({ display: "grid", gap: "4" })}>
          {[1, 2].map((item) => (
            <div key={item} className={css({ h: "[140px]", bg: "placeholder", borderRadius: "md" })} />
          ))}
        </div>
        <div className={css({ h: "[320px]", bg: "placeholder", borderRadius: "bloco" })} />
      </div>
    </div>
  );
}

// Mesmas medidas do carrinho de produtos (PaginaCarrinho.tsx).
const tituloPagina = css({
  fontSize: { base: "4xl", lg: "5xl" },
  fontWeight: "normal",
  lineHeight: "[1.1]",
  letterSpacing: "[-0.04em]",
  color: "escuro",
});
const tituloResumo = css({ fontSize: "2xl", fontWeight: "normal", letterSpacing: "[-0.02em]", color: "escuro" });
const linkSublinhado = css({
  fontSize: "sm",
  fontWeight: "medium",
  color: "escuro",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  cursor: "pointer",
});

const grade = css({
  display: "grid",
  gridTemplateColumns: { base: "minmax(0, 1fr)", lg: "minmax(0, 1fr) 360px", xl: "minmax(0, 1fr) 400px" },
  alignItems: "start",
  gap: { base: "10", lg: "12" },
  mt: "8",
});

const cabecalhoTabela = css({
  display: { base: "none", xl: "grid" },
  gridTemplateColumns: { xl: "minmax(0, 1fr) 200px 140px" },
  gap: "6",
  pb: "4",
  borderBottomWidth: "1px",
  borderColor: "borda",
  fontSize: "sm",
  fontWeight: "semibold",
  color: "escuro",
});

const linhaItem = css({
  display: "grid",
  gridTemplateColumns: { base: "minmax(0, 1fr) auto", xl: "minmax(0, 1fr) 200px 140px" },
  gridTemplateAreas: { base: '"info info" "pacote valor"', xl: "none" },
  alignItems: { base: "end", xl: "start" },
  gap: { base: "4", xl: "6" },
  py: "6",
  borderBottomWidth: "1px",
  borderColor: "borda",
  animation: "entrarItem",
  "& > :nth-child(1)": { gridArea: { base: "info", xl: "auto" } },
  "& > :nth-child(2)": { gridArea: { base: "pacote", xl: "auto" } },
  "& > :nth-child(3)": { gridArea: { base: "valor", xl: "auto" } },
});

const miniatura = css({
  position: "relative",
  flexShrink: "0",
  w: { base: "[96px]", md: "[120px]" },
  aspectRatio: "square",
  overflow: "hidden",
  borderRadius: "sm",
  bg: "placeholder",
});

const nomeItem = css({
  display: "block",
  fontSize: "md",
  fontWeight: "semibold",
  lineHeight: "snug",
  color: "escuro",
  _hover: { textDecoration: "underline", textUnderlineOffset: "3px" },
});

const acaoTexto = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1.5",
  fontSize: "sm",
  color: "texto",
  cursor: "pointer",
  _hover: { color: "escuro", textDecoration: "underline", textUnderlineOffset: "3px" },
});

const seletor = css({
  h: "10",
  px: "3",
  minW: "[180px]",
  borderRadius: "sm",
  bg: "superficieSuave",
  fontSize: "md",
  fontWeight: "semibold",
  color: "escuro",
  cursor: "pointer",
});

const barraCelular = css({
  position: "fixed",
  insetX: "0",
  bottom: "0",
  zIndex: "[20]",
  display: { base: "flex", lg: "none" },
  alignItems: "center",
  justifyContent: "space-between",
  gap: "4",
  px: "4",
  pt: "3",
  pb: "[calc(12px + env(safe-area-inset-bottom))]",
  bg: "fundo",
  borderTopWidth: "1px",
  borderColor: "borda",
  boxShadow: "media",
});

const avisoDesfazer = css({
  position: "fixed",
  left: "[50%]",
  transform: "translateX(-50%)",
  // Acima da barra flutuante (24 px da base + 52 px de altura) e, no celular, da barra do total.
  bottom: { base: "[148px]", lg: "[88px]" },
  zIndex: "[30]",
  display: "flex",
  alignItems: "center",
  gap: "4",
  maxW: "[calc(100vw - 32px)]",
  px: "5",
  py: "3",
  borderRadius: "full",
  bg: "escuro",
  color: "fundo",
  fontSize: "sm",
  boxShadow: "media",
  animation: "surgir",
});
