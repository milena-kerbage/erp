"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { css, cx } from "styled-system/css";
import { botao } from "styled-system/recipes";
import { CaretDown, FunnelSimple, GridNine, Square, SquareSplitHorizontal, SquaresFour, X } from "@/loja/componentes/icones";
import { BarraAcoes, botaoRedondo } from "@/loja/componentes/layout/BarraAcoes";
import { Gaveta } from "@/loja/componentes/layout/cabecalho/Gaveta";
import { contarFacetas, type Faceta, filtrar, type ItemListavel, ORDENACOES } from "@/loja/lib/catalogo/listagem";
import { type Contexto, montarUrl } from "@/loja/lib/catalogo/urlsListagem";
import { ORDEM_PADRAO } from "@/loja/lib/seo/urls";

// Densidade da grade: "grande" (1 coluna, só no celular), "padrao" (2 no celular e no tablet, 3 no
// desktop) e "pequena" (3 no celular e no tablet, 4 no desktop). Chave própria: a área Projetos guarda
// "grande/pequena" com outro sentido em "mk_densidade".
type Densidade = "grande" | "padrao" | "pequena";
const CHAVE_DENSIDADE = "mk_densidade_listagem";

// Facetas mostradas como ladrilhos (o "Size" da Lululemon) e cores com bolinha (tons dos tecidos).
const COMO_LADRILHO = new Set(["tamanho", "para"]);
const CORES: Record<string, string> = {
  branco: "#FFFFFF",
  cru: "#EFE6D6",
  rose: "#E9C6C0",
  "azul-bebe": "#C9DCEB",
  "verde-salvia": "#A9B79A",
  cinza: "#C8C9C4",
};

// Área da listagem no modelo da Lululemon: filtros ativos em pílulas, a grade (children) e a barra
// flutuante embaixo ao centro ("Visualização" grande/pequena + filtros com contador), que abre a
// gaveta à direita (440 px): filtros ativos, retirada no ateliê, ordenação, facetas em sanfona e
// rodapé fixo "Limpar tudo / Ver N produtos" com a contagem ao vivo.
export function AreaListagem({
  contexto,
  filtros,
  ordem,
  itensBase,
  grade,
  children,
}: {
  contexto: Contexto;
  filtros: Record<string, string[]>;
  ordem: string;
  itensBase: ItemListavel[];
  grade: ReactNode; // a grade (ou o estado vazio): a barra fixa acompanha só ela
  children?: ReactNode; // paginação e o que vem depois
}) {
  const router = useRouter();
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const [densidade, setDensidade] = useState<Densidade>("padrao");
  const [rolou, setRolou] = useState(false);

  // O rótulo "Ver" da pílula some ao rolar a página (e volta no topo).
  useEffect(() => {
    const medir = () => setRolou(window.scrollY > 120);
    medir();
    window.addEventListener("scroll", medir, { passive: true });
    return () => window.removeEventListener("scroll", medir);
  }, []);
  const [selecao, setSelecao] = useState(filtros);
  const [ordemEscolhida, setOrdemEscolhida] = useState(ordem);

  useEffect(() => {
    try {
      const salva = window.localStorage.getItem(CHAVE_DENSIDADE);
      if (salva === "grande" || salva === "padrao" || salva === "pequena") setDensidade(salva);
    } catch {
      // sem storage: fica a padrão
    }
  }, []);

  function trocarDensidade(valor: Densidade) {
    setDensidade(valor);
    try {
      window.localStorage.setItem(CHAVE_DENSIDADE, valor);
    } catch {
      // segue sem lembrar
    }
  }

  const facetasAplicadas = useMemo(() => contarFacetas(itensBase, filtros), [itensBase, filtros]);
  const facetasSelecao = useMemo(() => contarFacetas(itensBase, selecao), [itensBase, selecao]);
  const totalSelecao = useMemo(() => filtrar(itensBase, selecao).length, [itensBase, selecao]);
  const ativos = chipsAtivos(filtros, facetasAplicadas);
  const quantidadeAtivos = ativos.length;

  function abrir() {
    setSelecao(filtros);
    setOrdemEscolhida(ordem);
    setGavetaAberta(true);
  }

  function alternar(chave: string, valor: string) {
    setSelecao((atual) => {
      const valores = atual[chave] ?? [];
      const proximos = valores.includes(valor) ? valores.filter((item) => item !== valor) : [...valores, valor];
      const { [chave]: _antigos, ...resto } = atual;
      return proximos.length ? { ...resto, [chave]: proximos } : resto;
    });
  }

  function aplicar() {
    setGavetaAberta(false);
    router.push(montarUrl(contexto, selecao, ordemEscolhida), { scroll: false });
  }

  return (
    <div data-densidade={densidade} className={css({ position: "relative", mt: { base: "6", desktop: "16" } })}>
      {ativos.length > 0 && (
        <div className={linhaAtivos}>
          {ativos.map((chip) => (
            <Link
              key={`${chip.chave}-${chip.valor}`}
              href={montarUrl(contexto, removerValor(filtros, chip.chave, chip.valor), ordem)}
              scroll={false}
              aria-label={`Remover filtro ${chip.rotulo}`}
              className={pilulaAtiva}
            >
              {chip.rotulo}
              <X size={14} aria-hidden />
            </Link>
          ))}
          <Link
            href={montarUrl(contexto, {}, ordem)}
            scroll={false}
            className={css({ fontSize: "sm", textDecoration: "underline", textUnderlineOffset: "3px" })}
          >
            Limpar tudo
          </Link>
        </div>
      )}

      {/* Visualização e filtros ficam na barra flutuante da listagem (BarraAcoes), no modelo da
          Lululemon. O pb do bloco garante que o fim da grade não fique atrás dela. */}
      <div className={css({ position: "relative", pb: "20" })}>
        <BarraAcoes rotulo="Visualização e filtros">
          {/* Pílula "Ver" (lululemon-pdp.md §3 e §6): rótulo que some ao rolar e as densidades, a ativa
              em pílula escura com ícone branco; no celular 3 opções (1, 2 e 3 colunas). */}
          {/* biome-ignore lint/a11y/useSemanticElements: grupo de botões de alternância numa barra (fieldset quebraria o layout em linha) */}
          <div role="group" aria-label="Visualização da grade" data-rolou={rolou || undefined} className={grupoVer}>
            <span aria-hidden className={rotuloVer}>
              Ver
            </span>
            <button
              type="button"
              aria-label="1 coluna"
              aria-pressed={densidade === "grande"}
              onClick={() => trocarDensidade("grande")}
              className={cx(botaoDensidade, css({ display: { md: "none" } }))}
            >
              <Square size={16} aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Fotos grandes"
              aria-pressed={densidade === "padrao"}
              data-grande-equivale={densidade === "grande" || undefined}
              onClick={() => trocarDensidade("padrao")}
              className={botaoDensidade}
            >
              <SquareSplitHorizontal size={16} aria-hidden className={css({ display: { desktop: "none" } })} />
              <SquaresFour size={16} aria-hidden className={css({ display: { base: "none", desktop: "block" } })} />
            </button>
            <button
              type="button"
              aria-label="Fotos pequenas"
              aria-pressed={densidade === "pequena"}
              onClick={() => trocarDensidade("pequena")}
              className={botaoDensidade}
            >
              <GridNine size={16} aria-hidden />
            </button>
          </div>
          <button
            type="button"
            onClick={abrir}
            aria-haspopup="dialog"
            aria-label={quantidadeAtivos ? `Filtros e ordenação, ${quantidadeAtivos} aplicados` : "Filtros e ordenação"}
            className={botaoRedondo}
          >
            <FunnelSimple size={18} aria-hidden />
            {quantidadeAtivos > 0 && <span className={contador}>{quantidadeAtivos}</span>}
          </button>
        </BarraAcoes>
        {grade}
      </div>

      {children}

      <Gaveta aberta={gavetaAberta} aoFechar={() => setGavetaAberta(false)} rotuloId="titulo-filtros" largura="busca" rolagem="interna">
        <div className={css({ display: "flex", flexDirection: "column", flex: "1", minH: "0" })}>
          <div className={css({ flex: "1", minH: "0", overflowY: "auto", overscrollBehavior: "contain", px: "6", pt: "6", pb: "8" })}>
            <div className={css({ display: "flex", alignItems: "center", justifyContent: "space-between" })}>
              <h2
                id="titulo-filtros"
                className={css({ fontSize: "4xl", fontWeight: "normal", letterSpacing: "[-0.03em]", color: "escuro" })}
              >
                Filtros
              </h2>
              <button type="button" aria-label="Fechar filtros" data-autofoco onClick={() => setGavetaAberta(false)} className={botaoFechar}>
                <X size={20} />
              </button>
            </div>

            {chipsAtivos(selecao, facetasSelecao).length > 0 && (
              <div className={css({ display: "flex", flexWrap: "wrap", gap: "2", mt: "4" })}>
                {chipsAtivos(selecao, facetasSelecao).map((chip) => (
                  <button
                    key={`${chip.chave}-${chip.valor}`}
                    type="button"
                    onClick={() => alternar(chip.chave, chip.valor)}
                    className={pilulaAtiva}
                  >
                    {chip.rotulo}
                    <X size={14} aria-hidden />
                  </button>
                ))}
              </div>
            )}

            <div className={css({ mt: "6", pb: "6", borderBottomWidth: "1px", borderColor: "borda" })}>
              <label
                className={css({ display: "flex", alignItems: "center", gap: "3", fontSize: "lg", color: "escuro", cursor: "pointer" })}
              >
                <input
                  type="checkbox"
                  checked={(selecao.retirada ?? []).includes("sim")}
                  onChange={() => alternar("retirada", "sim")}
                  className={caixa}
                />
                Pronta para retirar no ateliê
              </label>
              <Link
                href="/ajuda/entregas"
                className={css({
                  display: "inline-block",
                  mt: "1",
                  ml: "8",
                  fontSize: "sm",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                })}
              >
                Retirada grátis em Fortaleza
              </Link>
            </div>

            <details open className={sanfona}>
              <summary className={tituloSanfona}>
                Ordenar por
                <CaretDown size={20} aria-hidden className={seta} />
              </summary>
              <div role="radiogroup" aria-label="Ordenar por" className={css({ display: "grid", gap: "3", pb: "6" })}>
                {ORDENACOES.map((opcao) => (
                  <label key={opcao.valor} className={linhaOpcao}>
                    <input
                      type="radio"
                      name="ordem"
                      checked={(ordemEscolhida || ORDEM_PADRAO) === opcao.valor}
                      onChange={() => setOrdemEscolhida(opcao.valor)}
                      className={radio}
                    />
                    {opcao.rotulo}
                  </label>
                ))}
              </div>
            </details>

            {facetasSelecao
              .filter((faceta) => faceta.chave !== "retirada")
              .map((faceta) => (
                <details key={faceta.chave} open={(selecao[faceta.chave]?.length ?? 0) > 0} className={sanfona}>
                  <summary className={tituloSanfona}>
                    {faceta.titulo}
                    <CaretDown size={20} aria-hidden className={seta} />
                  </summary>
                  <OpcoesFaceta
                    faceta={faceta}
                    selecionados={selecao[faceta.chave] ?? []}
                    aoAlternar={(valor) => alternar(faceta.chave, valor)}
                  />
                </details>
              ))}
          </div>

          <div className={rodapeGaveta}>
            <button type="button" onClick={() => setSelecao({})} className={botao({ variante: "contorno", tamanho: "m", largo: true })}>
              Limpar tudo
            </button>
            <button
              type="button"
              onClick={aplicar}
              disabled={totalSelecao === 0}
              className={botao({ variante: "escuro", tamanho: "m", largo: true })}
            >
              {totalSelecao === 0 ? "Nenhuma peça" : `Ver ${totalSelecao} ${totalSelecao === 1 ? "peça" : "peças"}`}
            </button>
          </div>
        </div>
      </Gaveta>
    </div>
  );
}

function OpcoesFaceta({
  faceta,
  selecionados,
  aoAlternar,
}: {
  faceta: Faceta;
  selecionados: string[];
  aoAlternar: (valor: string) => void;
}) {
  if (COMO_LADRILHO.has(faceta.chave)) {
    return (
      <div className={css({ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "2", pb: "6" })}>
        {faceta.opcoes.map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            aria-pressed={selecionados.includes(opcao.valor)}
            onClick={() => aoAlternar(opcao.valor)}
            className={ladrilho}
          >
            {opcao.rotulo}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className={css({ display: "grid", gap: "3", pb: "6" })}>
      {faceta.opcoes.map((opcao) => (
        <label key={opcao.valor} className={linhaOpcao}>
          <input type="checkbox" checked={selecionados.includes(opcao.valor)} onChange={() => aoAlternar(opcao.valor)} className={caixa} />
          {faceta.chave === "cor" && (
            <span aria-hidden className={bolinha} style={{ background: CORES[opcao.valor] ?? "var(--colors-placeholder-forte)" }} />
          )}
          <span className={css({ flex: "1" })}>{opcao.rotulo}</span>
          <span className={css({ fontSize: "sm", color: "textoSuave" })}>{opcao.total}</span>
        </label>
      ))}
    </div>
  );
}

type Chip = { chave: string; valor: string; rotulo: string };

function chipsAtivos(filtros: Record<string, string[]>, facetas: Faceta[]): Chip[] {
  const chips: Chip[] = [];
  for (const [chave, valores] of Object.entries(filtros)) {
    for (const valor of valores) {
      const rotulo =
        chave === "retirada"
          ? "Retirar no ateliê"
          : (facetas.find((faceta) => faceta.chave === chave)?.opcoes.find((opcao) => opcao.valor === valor)?.rotulo ?? valor);
      chips.push({ chave, valor, rotulo });
    }
  }
  return chips;
}

function removerValor(filtros: Record<string, string[]>, chave: string, valor: string): Record<string, string[]> {
  const restantes = (filtros[chave] ?? []).filter((item) => item !== valor);
  const { [chave]: _removida, ...outros } = filtros;
  return restantes.length ? { ...outros, [chave]: restantes } : outros;
}

// Grupo "Ver" dentro da barra flutuante: rótulo de 14/500 que recolhe ao rolar e botões de 36; o
// ativo vira pílula escura com ícone branco, os outros ficam com o ícone em cinza.
const grupoVer = css({ position: "relative", display: "flex", alignItems: "center", gap: "0.5" });

const rotuloVer = css({
  display: "inline-block",
  overflow: "hidden",
  maxW: "[40px]",
  pl: "2.5",
  pr: "1",
  fontSize: "sm",
  fontWeight: "medium",
  color: "escuro",
  whiteSpace: "nowrap",
  transitionProperty: "max-width, opacity, padding",
  transitionDuration: "aparecer",
  transitionTimingFunction: "assinatura",
  "[data-rolou] > &": { maxW: "0", opacity: "0", px: "0" },
});

const botaoDensidade = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  w: "11",
  h: "9",
  borderRadius: "pilula",
  color: "textoSuave",
  cursor: "pointer",
  transitionProperty: "background-color, color",
  transitionDuration: "normal",
  transitionTimingFunction: "assinatura",
  "@media (hover: hover)": { _hover: { color: "escuro" } },
  "&[aria-pressed=true]": { bg: "escuro", color: "fundo", "@media (hover: hover)": { _hover: { color: "fundo" } } },
  // "1 coluna" escolhida no celular vale como a padrão a partir do tablet.
  "&[data-grande-equivale]": { md: { bg: "escuro", color: "fundo" } },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const linhaAtivos = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "2",
  px: { base: "3", md: "5", desktop: "10" },
  pb: "6",
});

const pilulaAtiva = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "2",
  h: "9",
  px: "3",
  borderRadius: "full",
  bg: "superficieSuave",
  fontSize: "sm",
  color: "escuro",
  cursor: "pointer",
  _hover: { bg: "borda" },
});

const contador = css({
  position: "absolute",
  top: "[-6px]",
  right: "[-6px]",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minW: "5",
  h: "5",
  px: "1",
  borderRadius: "full",
  bg: "escuro",
  color: "fundo",
  fontSize: "2xs",
  fontWeight: "bold",
});


const botaoFechar = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  w: "10",
  h: "10",
  borderRadius: "full",
  bg: "superficieSuave",
  color: "escuro",
  cursor: "pointer",
  _hover: { bg: "borda" },
});

const sanfona = css({ borderBottomWidth: "1px", borderColor: "borda" });

const tituloSanfona = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  py: "6",
  fontSize: "2xl",
  fontWeight: "normal",
  letterSpacing: "[-0.02em]",
  color: "escuro",
  cursor: "pointer",
  listStyle: "none",
  "&::-webkit-details-marker": { display: "none" },
});

const seta = css({ transition: "transform", transitionDuration: "normal", "details[open] &": { transform: "rotate(180deg)" } });

const linhaOpcao = css({ display: "flex", alignItems: "center", gap: "3", fontSize: "md", color: "escuro", cursor: "pointer" });

const caixa = css({ w: "5", h: "5", accentColor: "[#050505]", cursor: "pointer" });
const radio = cx(caixa);

const bolinha = css({ w: "5", h: "5", borderRadius: "full", borderWidth: "1px", borderColor: "borda", flexShrink: "0" });

// Ladrilhos com borda (o "Size" da Lululemon); marcado em preto.
const ladrilho = css({
  h: "11",
  borderRadius: "sm",
  borderWidth: "1px",
  borderColor: "borda",
  fontSize: "sm",
  color: "escuro",
  cursor: "pointer",
  _hover: { borderColor: "escuro" },
  "&[aria-pressed=true]": { bg: "escuro", borderColor: "escuro", color: "fundo" },
});

const rodapeGaveta = css({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "3",
  px: "6",
  py: "4",
  borderTopWidth: "1px",
  borderColor: "borda",
  bg: "fundo",
});
