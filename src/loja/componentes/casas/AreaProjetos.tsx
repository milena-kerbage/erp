"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { css } from "styled-system/css";
import { botao } from "styled-system/recipes";
import { CaretDown, FunnelSimple, GridNine, SquareSplitHorizontal, X } from "@/loja/componentes/icones";
import { BarraAcoes, botaoPilula, botaoRedondo, pilulaBarra } from "@/loja/componentes/layout/BarraAcoes";
import { Gaveta } from "@/loja/componentes/layout/cabecalho/Gaveta";
import { RESPIRO_LATERAL } from "@/loja/componentes/layout/cabecalho/estilos";
import {
  alternarFiltro,
  type Filtros,
  filtrarProjetos,
  filtrosAtivos,
  gruposDeFiltro,
  ORDENACOES_PROJETOS,
  type ProjetoFiltravel,
} from "@/loja/lib/casas/filtragem";
import { REGRAS_SEO } from "@/loja/lib/seo/config";
import { montarUrlListagem, ORDEM_PADRAO } from "@/loja/lib/seo/urls";

type Densidade = "grande" | "pequena";
const CHAVE_DENSIDADE = "mk_densidade"; // a mesma preferência da listagem de produtos

// Área de Projetos no mesmo modelo da listagem de produtos (AreaListagem, Lululemon): pílulas
// de filtros ativos acima da grade e, na barra flutuante da listagem (BarraAcoes), a pílula de
// visualização (imagens grandes ou pequenas) e o botão de filtros com contador, que abre a gaveta de
// 440 px à direita: ordenação, tema, estilo e tecido com a contagem ao vivo e o rodapé
// "Limpar tudo / Ver N projetos". A grade chega pronta do servidor (children).
export function AreaProjetos({
  categoria,
  filtros,
  ordem,
  projetos,
  grade,
}: {
  categoria: string; // "projetos" ou "projetos/floral": base das URLs do motor
  filtros: Filtros;
  ordem: string;
  projetos: ProjetoFiltravel[];
  grade: ReactNode;
}) {
  const router = useRouter();
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const [densidade, setDensidade] = useState<Densidade>("grande");
  const [selecao, setSelecao] = useState(filtros);
  const [ordemEscolhida, setOrdemEscolhida] = useState(ordem);

  useEffect(() => {
    try {
      const salva = window.localStorage.getItem(CHAVE_DENSIDADE);
      if (salva === "grande" || salva === "pequena") setDensidade(salva);
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

  const url = (novos: Filtros, novaOrdem = ordem) => montarUrlListagem({ categoria, filtros: novos, ordem: novaOrdem }, REGRAS_SEO).url;
  const ativos = filtrosAtivos(filtros);
  const gruposSelecao = useMemo(() => gruposDeFiltro(projetos, selecao), [projetos, selecao]);
  const totalSelecao = useMemo(() => filtrarProjetos(projetos, selecao).length, [projetos, selecao]);

  function abrir() {
    setSelecao(filtros);
    setOrdemEscolhida(ordem);
    setGavetaAberta(true);
  }

  function aplicar() {
    setGavetaAberta(false);
    router.push(url(selecao, ordemEscolhida), { scroll: false });
  }

  return (
    <div data-densidade={densidade} className={css({ position: "relative", mt: { base: "8", lg: "14" } })}>
      {ativos.length > 0 && (
        <div className={linhaAtivos}>
          {ativos.map((ativo) => (
            <Link
              key={`${ativo.chave}-${ativo.valor}`}
              href={url(alternarFiltro(filtros, ativo.chave, ativo.valor))}
              scroll={false}
              aria-label={`Remover filtro ${ativo.rotulo}`}
              className={pilulaAtiva}
            >
              {ativo.rotulo}
              <X size={14} aria-hidden />
            </Link>
          ))}
          <Link href={url({})} scroll={false} className={css({ fontSize: "sm", textDecoration: "underline", textUnderlineOffset: "3px" })}>
            Limpar tudo
          </Link>
        </div>
      )}

      {/* O pb do bloco garante que o fim da grade não fique atrás da barra flutuante. */}
      <div className={css({ position: "relative", pb: "20" })}>
        <BarraAcoes rotulo="Visualização e filtros">
          {/* biome-ignore lint/a11y/useSemanticElements: grupo de botões de alternância numa barra (fieldset quebraria o layout em linha) */}
          <div role="group" aria-label="Visualização da grade" className={pilulaBarra}>
            <button
              type="button"
              aria-label="Imagens grandes"
              aria-pressed={densidade === "grande"}
              onClick={() => trocarDensidade("grande")}
              className={botaoPilula}
            >
              <SquareSplitHorizontal size={16} />
            </button>
            <button
              type="button"
              aria-label="Imagens pequenas"
              aria-pressed={densidade === "pequena"}
              onClick={() => trocarDensidade("pequena")}
              className={botaoPilula}
            >
              <GridNine size={16} />
            </button>
          </div>
          <button
            type="button"
            onClick={abrir}
            aria-haspopup="dialog"
            aria-label={ativos.length ? `Filtros e ordenação, ${ativos.length} aplicados` : "Filtros e ordenação"}
            className={botaoRedondo}
          >
            <FunnelSimple size={18} aria-hidden />
            {ativos.length > 0 && <span className={contador}>{ativos.length}</span>}
          </button>
        </BarraAcoes>
        {grade}
      </div>

      <Gaveta aberta={gavetaAberta} aoFechar={() => setGavetaAberta(false)} rotuloId="titulo-filtros-projetos" largura="busca" rolagem="interna">
        <div className={css({ display: "flex", flexDirection: "column", flex: "1", minH: "0" })}>
          <div className={css({ flex: "1", minH: "0", overflowY: "auto", overscrollBehavior: "contain", px: "6", pt: "6", pb: "8" })}>
            <div className={css({ display: "flex", alignItems: "center", justifyContent: "space-between" })}>
              <h2
                id="titulo-filtros-projetos"
                className={css({ fontSize: "4xl", fontWeight: "normal", letterSpacing: "[-0.03em]", color: "escuro" })}
              >
                Filtros
              </h2>
              <button type="button" aria-label="Fechar filtros" data-autofoco onClick={() => setGavetaAberta(false)} className={botaoFechar}>
                <X size={20} />
              </button>
            </div>

            {filtrosAtivos(selecao).length > 0 && (
              <div className={css({ display: "flex", flexWrap: "wrap", gap: "2", mt: "4" })}>
                {filtrosAtivos(selecao).map((ativo) => (
                  <button
                    key={`${ativo.chave}-${ativo.valor}`}
                    type="button"
                    onClick={() => setSelecao((atual) => alternarFiltro(atual, ativo.chave, ativo.valor))}
                    className={pilulaAtiva}
                  >
                    {ativo.rotulo}
                    <X size={14} aria-hidden />
                  </button>
                ))}
              </div>
            )}

            <details open className={sanfona}>
              <summary className={tituloSanfona}>
                Ordenar por
                <CaretDown size={20} aria-hidden className={seta} />
              </summary>
              <div role="radiogroup" aria-label="Ordenar por" className={css({ display: "grid", gap: "3", pb: "6" })}>
                {ORDENACOES_PROJETOS.map((opcao) => (
                  <label key={opcao.valor} className={linhaOpcao}>
                    <input
                      type="radio"
                      name="ordem-projetos"
                      checked={(ordemEscolhida || ORDEM_PADRAO) === opcao.valor}
                      onChange={() => setOrdemEscolhida(opcao.valor)}
                      className={caixa}
                    />
                    {opcao.rotulo}
                  </label>
                ))}
              </div>
            </details>

            {gruposSelecao.map((grupo) => (
              <details key={grupo.chave} open className={sanfona}>
                <summary className={tituloSanfona}>
                  {grupo.titulo}
                  <CaretDown size={20} aria-hidden className={seta} />
                </summary>
                <div className={css({ display: "grid", gap: "3", pb: "6" })}>
                  {grupo.opcoes.map((opcao) => (
                    <label key={opcao.valor} className={linhaOpcao} data-vazia={opcao.total === 0 && !opcao.ativo ? "" : undefined}>
                      <input
                        type="checkbox"
                        checked={opcao.ativo}
                        disabled={opcao.total === 0 && !opcao.ativo}
                        onChange={() => setSelecao((atual) => alternarFiltro(atual, grupo.chave, opcao.valor))}
                        className={caixa}
                      />
                      <span className={css({ flex: "1" })}>{opcao.rotulo}</span>
                      <span className={css({ fontSize: "sm", color: "textoSuave" })}>{opcao.total}</span>
                    </label>
                  ))}
                </div>
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
              {totalSelecao === 0 ? "Nenhum projeto" : `Ver ${totalSelecao} ${totalSelecao === 1 ? "projeto" : "projetos"}`}
            </button>
          </div>
        </div>
      </Gaveta>
    </div>
  );
}

// Estilos iguais aos da gaveta de produtos (src/loja/componentes/listagem/AreaListagem.tsx).
const linhaAtivos = css({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2", px: RESPIRO_LATERAL, pb: "6" });

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

const linhaOpcao = css({
  display: "flex",
  alignItems: "center",
  gap: "3",
  fontSize: "md",
  color: "escuro",
  cursor: "pointer",
  "&[data-vazia]": { color: "textoSuave", cursor: "not-allowed" },
});

const caixa = css({ w: "5", h: "5", accentColor: "[#050505]", cursor: "pointer", _disabled: { cursor: "not-allowed" } });

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
