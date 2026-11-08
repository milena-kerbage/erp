"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import { CaretDown, FunnelSimple, MagnifyingGlass, PencilSimple, X } from "@/loja/componentes/icones";
import { botaoPrimario, botaoSecundario } from "@/loja/componentes/inicio/estilos";
import { Gaveta } from "@/loja/componentes/layout/cabecalho/Gaveta";
import {
  type AvaliacaoPublica,
  type FiltrosAvaliacao,
  formatarNota,
  LIMITES_AVALIACAO,
  ORDENS_AVALIACAO,
  type OrdemAvaliacao,
  PARA_QUEM,
  type ParaQuem,
  parametrosDosFiltros,
  RESUMO_VAZIO,
  type RespostaAvaliacoes,
  type ResumoAvaliacoes,
} from "@/loja/lib/avaliacoes/regras";
import { CartaoAvaliacao, FotosAvaliacao, type GaleriaAberta } from "./avaliacoes/CartaoAvaliacao";
import { EVENTO_ESCREVER_AVALIACAO } from "./avaliacoes/eventos";
import { FormularioAvaliacao } from "./avaliacoes/FormularioAvaliacao";
import { Estrelas } from "./Estrelas";
import { revelarAoRolar } from "./movimento";

type Filtros = Pick<FiltrosAvaliacao, "ordem" | "notas" | "comFotos" | "paraQuem">;
const FILTROS_PADRAO: Filtros = { ordem: "recentes", notas: [], comFotos: false, paraQuem: [] };

// Avaliações (lululemon-pdp.md §1.6 item 10 e §6): título de 64, nota com estrelas e total, busca em
// pílula à direita; à esquerda (~270) os filtros em sanfona (linhas de 68 com divisória e seta) e à
// direita a lista. Só avaliações REAIS e APROVADAS pela moderação do ERP: a primeira página vem
// renderizada do servidor (cache por produto) e filtros, ordem, busca e "Ver mais" chamam /api/avaliacoes.
// Sem avaliações, a lista mostra o estado vazio "Seja a primeira a avaliar" dentro da mesma estrutura.
// Celular: tudo empilhado, busca + botão redondo de filtro (os filtros abrem em gaveta).
export function Avaliacoes({ produto, inicial }: { produto: { slug: string; nome: string }; inicial: RespostaAvaliacoes | null }) {
  const [resumo, setResumo] = useState<ResumoAvaliacoes>(inicial?.resumo ?? RESUMO_VAZIO);
  const [itens, setItens] = useState<AvaliacaoPublica[]>(inicial?.avaliacoes ?? []);
  const [total, setTotal] = useState(inicial?.total ?? 0);
  const [temMais, setTemMais] = useState(inicial?.pagina.temMais ?? false);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_PADRAO);
  const [termo, setTermo] = useState("");
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const [gaveta, setGaveta] = useState(false);
  const [formulario, setFormulario] = useState(false);
  const [galeria, setGaleria] = useState<GaleriaAberta | null>(null);
  const [galeriaAberta, setGaleriaAberta] = useState(false);
  const pedido = useRef(0);
  const primeiraCarga = useRef(inicial !== null);

  const carregar = useCallback(
    async (offset: number, automatica = false) => {
      // A carga automática sem filtros (servidor sem dados) falha em silêncio: fica o estado vazio.
      const silencioso = automatica && filtros === FILTROS_PADRAO && !busca;
      const numero = ++pedido.current;
      setCarregando(true);
      setFalhou(false);
      try {
        const resposta = await fetch(`/api/avaliacoes?${parametrosDosFiltros(produto.slug, { ...filtros, busca, offset })}`);
        if (!resposta.ok) throw new Error(String(resposta.status));
        const dados = (await resposta.json()) as RespostaAvaliacoes;
        if (numero !== pedido.current) return;
        setResumo(dados.resumo);
        setTotal(dados.total);
        setTemMais(dados.pagina.temMais);
        setItens((atuais) => (offset ? [...atuais, ...dados.avaliacoes.filter((nova) => !atuais.some((item) => item.id === nova.id))] : dados.avaliacoes));
      } catch {
        if (numero === pedido.current && !silencioso) setFalhou(true);
      } finally {
        if (numero === pedido.current) setCarregando(false);
      }
    },
    [produto.slug, filtros, busca],
  );

  // Filtros, ordem ou busca mudaram: recarrega da 1ª página. Na montagem, só se o servidor não trouxe dados.
  useEffect(() => {
    if (primeiraCarga.current) {
      primeiraCarga.current = false;
      return;
    }
    void carregar(0, true);
  }, [carregar]);

  // Busca com espera de 350 ms depois da última tecla.
  useEffect(() => {
    const espera = window.setTimeout(() => setBusca(termo.trim().slice(0, LIMITES_AVALIACAO.busca)), 350);
    return () => window.clearTimeout(espera);
  }, [termo]);

  // "Seja a primeira a avaliar" do painel de compra abre o formulário daqui.
  useEffect(() => {
    const abrir = () => setFormulario(true);
    window.addEventListener(EVENTO_ESCREVER_AVALIACAO, abrir);
    return () => window.removeEventListener(EVENTO_ESCREVER_AVALIACAO, abrir);
  }, []);

  const filtrando = filtros.notas.length > 0 || filtros.comFotos || filtros.paraQuem.length > 0 || busca !== "";
  const limparFiltros = () => {
    setFiltros(FILTROS_PADRAO);
    setTermo("");
    setBusca("");
  };
  const painelFiltros = <PainelFiltros filtros={filtros} resumo={resumo} aoMudar={setFiltros} />;

  return (
    <section id="avaliacoes" aria-labelledby="titulo-avaliacoes" className={cx(secao, revelarAoRolar)}>
      <div className={topo}>
        <div>
          <h2 id="titulo-avaliacoes" className={tituloAvaliacoes}>
            Avaliações
          </h2>
          <div className={css({ display: "flex", alignItems: "center", gap: "3", mt: "4" })}>
            {resumo.total > 0 && (
              <span className={css({ fontSize: { base: "subtitulo", desktop: "bloco" }, lineHeight: "none", color: "escuro" })}>{formatarNota(resumo.media)}</span>
            )}
            <Estrelas nota={resumo.media} tamanho={20} />
            <span className={css({ fontSize: "sm", color: "textoSuave" })}>
              ({resumo.total}
              <span className={css({ srOnly: true })}> {resumo.total === 1 ? "avaliação" : "avaliações"}</span>)
            </span>
          </div>
        </div>
        <div className={css({ display: "flex", flexDirection: { base: "column", md: "row" }, alignItems: { base: "stretch", md: "center" }, gap: "3" })}>
          <div className={linhaBusca}>
            <label className={buscaEstilo}>
              <MagnifyingGlass size={18} aria-hidden className={css({ flexShrink: "0", color: "textoSuave" })} />
              <span className={css({ srOnly: true })}>Buscar nas avaliações</span>
              <input
                type="search"
                value={termo}
                maxLength={LIMITES_AVALIACAO.busca}
                onChange={(evento) => setTermo(evento.target.value)}
                placeholder="Buscar avaliações"
                className={campo}
              />
            </label>
            <button type="button" aria-haspopup="dialog" aria-label="Filtrar avaliações" onClick={() => setGaveta(true)} className={botaoFiltro}>
              <FunnelSimple size={18} aria-hidden />
            </button>
          </div>
          <button type="button" aria-haspopup="dialog" onClick={() => setFormulario(true)} className={cx(botaoPrimario, css({ flexShrink: "0" }))}>
            <PencilSimple size={16} aria-hidden />
            Escrever uma avaliação
          </button>
        </div>
      </div>

      <div className={corpo}>
        <aside aria-label="Filtros das avaliações" className={lateral}>
          {painelFiltros}
        </aside>
        <div className={lista} aria-busy={carregando}>
          {itens.length > 0 ? (
            <div className={css({ opacity: carregando && !temMais ? "0.6" : "1", transition: "opacity", transitionDuration: "normal" })}>
              {itens.map((avaliacao) => (
                <CartaoAvaliacao
                  key={avaliacao.id}
                  avaliacao={avaliacao}
                  aoAbrirFoto={(nova) => {
                    setGaleria(nova);
                    setGaleriaAberta(true);
                  }}
                />
              ))}
            </div>
          ) : resumo.total === 0 && !filtrando ? (
            <div className={vazio}>
              <p className={css({ fontSize: { base: "destaque", desktop: "subtitulo" }, lineHeight: "subtitulo", color: "escuro" })}>Seja a primeira a avaliar</p>
              <p className={css({ mt: "2", fontSize: "md", lineHeight: "texto", color: "texto" })}>
                Esta peça ainda não tem avaliações. Comprou com o ateliê? Conte como ficou no quartinho e, se quiser, mande fotos.
              </p>
              <button type="button" aria-haspopup="dialog" onClick={() => setFormulario(true)} className={cx(botaoSecundario, css({ mt: "6" }))}>
                Escrever uma avaliação
              </button>
            </div>
          ) : (
            <div className={vazio}>
              <p className={css({ fontSize: { base: "destaque", desktop: "subtitulo" }, lineHeight: "subtitulo", color: "escuro" })}>
                {carregando ? "Carregando avaliações…" : busca ? `Nenhuma avaliação com “${busca}”.` : "Nenhuma avaliação com esses filtros."}
              </p>
              {!carregando && (
                <button type="button" onClick={limparFiltros} className={cx(botaoSecundario, css({ mt: "6" }))}>
                  Limpar filtros
                </button>
              )}
            </div>
          )}

          {falhou && (
            <p role="alert" className={css({ mt: "6", fontSize: "sm", color: "erro" })}>
              Não foi possível carregar as avaliações agora.{" "}
              <button type="button" onClick={() => void carregar(0)} className={css({ textDecoration: "underline", cursor: "pointer" })}>
                Tentar de novo
              </button>
            </p>
          )}

          <div className={css({ display: "grid", justifyItems: { base: "center", desktop: "start" }, gap: "4", mt: "8" })}>
            <p aria-live="polite" className={css({ fontSize: "sm", color: "textoSuave" })}>
              Mostrando {itens.length} de {total}
            </p>
            {temMais && (
              <button type="button" disabled={carregando} onClick={() => void carregar(itens.length)} className={cx(botaoSecundario, css({ _disabled: { opacity: "0.6", cursor: "progress" } }))}>
                {carregando ? "Carregando…" : "Ver mais avaliações"}
              </button>
            )}
          </div>
        </div>
      </div>

      <Gaveta aberta={gaveta} aoFechar={() => setGaveta(false)} rotulo="Filtrar avaliações" largura="busca">
        <div className={css({ display: "flex", alignItems: "center", justifyContent: "space-between", px: "4", pt: "4" })}>
          <p className={css({ fontSize: "subtitulo", color: "escuro" })}>Filtros</p>
          <button type="button" data-autofoco aria-label="Fechar filtros" onClick={() => setGaveta(false)} className={botaoFiltro}>
            <X size={16} aria-hidden />
          </button>
        </div>
        <div className={css({ px: "4", pb: "8" })}>
          {painelFiltros}
          <div className={css({ display: "grid", gap: "3", mt: "6" })}>
            <button type="button" onClick={() => setGaveta(false)} className={botaoPrimario}>
              Ver {total} {total === 1 ? "avaliação" : "avaliações"}
            </button>
            {filtrando && (
              <button type="button" onClick={limparFiltros} className={botaoSecundario}>
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      </Gaveta>

      <FormularioAvaliacao aberta={formulario} aoFechar={() => setFormulario(false)} produto={produto} />
      <FotosAvaliacao galeria={galeria} aberta={galeriaAberta} aoFechar={() => setGaleriaAberta(false)} />
    </section>
  );
}

function PainelFiltros({ filtros, resumo, aoMudar }: { filtros: Filtros; resumo: ResumoAvaliacoes; aoMudar: (filtros: Filtros) => void }) {
  const alternar = <T,>(lista: T[], valor: T) => (lista.includes(valor) ? lista.filter((item) => item !== valor) : [...lista, valor]);
  const vazio = resumo.total === 0;
  return (
    <div>
      <details className={sanfona} open>
        <summary className={linhaSanfona}>
          Ordenar por
          <CaretDown size={16} aria-hidden className={seta} />
        </summary>
        <div className={opcoes}>
          {(Object.entries(ORDENS_AVALIACAO) as [OrdemAvaliacao, string][]).map(([valor, rotulo]) => (
            <label key={valor} className={opcao}>
              <input
                type="radio"
                name="ordem-avaliacoes"
                checked={filtros.ordem === valor}
                disabled={vazio}
                onChange={() => aoMudar({ ...filtros, ordem: valor })}
                className={caixa}
              />
              {rotulo}
            </label>
          ))}
        </div>
      </details>
      <details className={sanfona}>
        <summary className={linhaSanfona}>
          Nota
          <CaretDown size={16} aria-hidden className={seta} />
        </summary>
        <div className={opcoes}>
          {[5, 4, 3, 2, 1].map((nota) => {
            const quantidade = resumo.porNota[String(nota) as keyof ResumoAvaliacoes["porNota"]];
            return (
              <label key={nota} className={opcao}>
                <input
                  type="checkbox"
                  checked={filtros.notas.includes(nota)}
                  disabled={quantidade === 0 && !filtros.notas.includes(nota)}
                  onChange={() => aoMudar({ ...filtros, notas: alternar(filtros.notas, nota) })}
                  className={caixa}
                />
                <Estrelas nota={nota} tamanho={14} />
                <span className={css({ srOnly: true })}>{nota === 1 ? "1 estrela" : `${nota} estrelas`}</span>
                <span className={css({ ml: "auto", color: "textoSuave" })}>{quantidade}</span>
              </label>
            );
          })}
        </div>
      </details>
      <details className={sanfona}>
        <summary className={linhaSanfona}>
          Com fotos
          <CaretDown size={16} aria-hidden className={seta} />
        </summary>
        <div className={opcoes}>
          <label className={opcao}>
            <input
              type="checkbox"
              checked={filtros.comFotos}
              disabled={resumo.comFotos === 0 && !filtros.comFotos}
              onChange={() => aoMudar({ ...filtros, comFotos: !filtros.comFotos })}
              className={caixa}
            />
            Só avaliações com fotos
            <span className={css({ ml: "auto", color: "textoSuave" })}>{resumo.comFotos}</span>
          </label>
        </div>
      </details>
      <details className={sanfona}>
        <summary className={linhaSanfona}>
          Para quem
          <CaretDown size={16} aria-hidden className={seta} />
        </summary>
        <div className={opcoes}>
          {(Object.entries(PARA_QUEM) as [ParaQuem, string][]).map(([valor, rotulo]) => (
            <label key={valor} className={opcao}>
              <input
                type="checkbox"
                checked={filtros.paraQuem.includes(valor)}
                disabled={resumo.paraQuem[valor] === 0 && !filtros.paraQuem.includes(valor)}
                onChange={() => aoMudar({ ...filtros, paraQuem: alternar(filtros.paraQuem, valor) })}
                className={caixa}
              />
              {rotulo}
              <span className={css({ ml: "auto", color: "textoSuave" })}>{resumo.paraQuem[valor]}</span>
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}

const tituloAvaliacoes = css({
  fontSize: { base: "blocoTablet", md: "secaoTablet", desktop: "secao" },
  fontWeight: "normal",
  lineHeight: "titulo",
  letterSpacing: "titulo",
  color: "escuro",
});

const secao = css({ px: { base: "3", md: "5", desktop: "6" }, my: { base: "16", desktop: "24" }, scrollMarginTop: "20" });

const topo = css({
  display: "flex",
  flexDirection: { base: "column", desktop: "row" },
  alignItems: { base: "stretch", desktop: "flex-end" },
  justifyContent: "space-between",
  gap: "6",
});

const linhaBusca = css({ display: "flex", alignItems: "center", gap: "3" });

const buscaEstilo = css({
  display: "flex",
  alignItems: "center",
  gap: "2",
  flex: { base: "1", desktop: "none" },
  w: { desktop: "[320px]" },
  h: "11",
  px: "4",
  borderRadius: "pilula",
  borderWidth: "1px",
  borderColor: "borda",
  bg: "superficie",
  _focusWithin: { borderColor: "escuro", boxShadow: "anelFoco" },
});

const campo = css({ flex: "1", minW: "0", fontSize: "md", color: "escuro", outline: "none", _placeholder: { color: "textoSuave" } });

const botaoFiltro = css({
  display: { base: "inline-flex", desktop: "none" },
  alignItems: "center",
  justifyContent: "center",
  flexShrink: "0",
  w: "10",
  h: "10",
  borderRadius: "pilula",
  bg: "fundoSutil",
  color: "escuro",
  cursor: "pointer",
  _hover: { bg: "superficieSuave" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const corpo = css({
  display: "grid",
  gridTemplateColumns: { base: "minmax(0, 1fr)", desktop: "[270px minmax(0, 1fr)]" },
  gap: { base: "8", desktop: "16" },
  mt: { base: "8", desktop: "12" },
});

const lateral = css({ display: { base: "none", desktop: "block" } });

const lista = css({ borderTopWidth: "1px", borderColor: "borda", pt: "8", minW: "0" });

const vazio = css({ maxW: "[560px]" });

const sanfona = css({ borderBottomWidth: "1px", borderColor: "borda", _first: { borderTopWidth: "1px" } });

const linhaSanfona = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  minH: "[68px]",
  fontSize: "sm",
  fontWeight: "medium",
  color: "escuro",
  cursor: "pointer",
  listStyle: "none",
  "&::-webkit-details-marker": { display: "none" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const seta = css({ transition: "transform", transitionDuration: "normal", transitionTimingFunction: "assinatura", "details[open] &": { transform: "rotate(180deg)" } });

const opcoes = css({ display: "grid", gap: "3", pb: "6" });

const opcao = css({ display: "flex", alignItems: "center", gap: "3", fontSize: "sm", color: "escuro", cursor: "pointer", "&:has(input:disabled)": { cursor: "default", color: "textoSuave" } });

const caixa = css({ w: "4", h: "4", accentColor: "escuro", cursor: "inherit" });
