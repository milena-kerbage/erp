"use client";

import Link from "next/link";
import { useRouter, useSelectedLayoutSegment } from "next/navigation";
import { type CSSProperties, createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import { ConfirmacaoCarrinho, type Sugestao } from "@/loja/componentes/carrinho/ConfirmacaoCarrinho";
import { adicionarAoCarrinho, atualizarItem, type ItemCarrinho, useItensCarrinho } from "@/loja/componentes/carrinho/estado";
import { botaoContorno, largo, linkAcao } from "@/loja/componentes/carrinho/estilos";
import { Selecao } from "@/loja/componentes/checkout/Campo";
import { ArrowCounterClockwise, ArrowLeft, ArrowRight, CaretRight, Check, Info, MagnifyingGlass, PencilSimple, Plus, WhatsappLogo } from "@/loja/componentes/icones";
import { prefereMenosMovimento } from "@/loja/componentes/layout/cabecalho/Gaveta";
import { DESCONTO_PIX_PERCENTUAL, decimal, PRODUCAO_PROJETO, textoPrazo } from "@/loja/lib/carrinho/totais";
import { buscarProjeto, formatarPreco, listarProjetos } from "@/loja/lib/casas/catalogo";
import {
  buscarEtapa,
  ETAPA_DO_ERRO,
  ETAPAS_MONTADOR,
  ehEtapa,
  errosDaEtapa,
  etapaAlcancavel,
  etapaAnterior,
  etapaDoGrupo,
  etapaValida,
  hrefEtapa,
  type IdEtapa,
  indiceEtapa,
  normalizarVisitadas,
  primeiraPendenteAntes,
  proximaEtapa,
} from "@/loja/lib/casas/etapas";
import {
  alternarModulo,
  bordadoLimpo,
  buscarModulo,
  buscarPaleta,
  contagemDoGrupo,
  type ErrosQuartinho,
  escolherOpcao,
  GRUPOS_MODULOS,
  type GrupoModulo,
  idQuartinho,
  incluido,
  LIMITE_BORDADO,
  linhasDoQuartinho,
  type Modulo,
  modulosDoGrupo,
  nomeDoQuartinho,
  normalizarQuartinho,
  opcoesCompletas,
  PRECO_BORDADO,
  type Paleta,
  type PecaCatalogo,
  paletasDoTema,
  precoDoEscolhido,
  precoDoModulo,
  precoDoQuartinho,
  type Quartinho,
  quartinhoDoProjeto,
  quartinhoVazio,
  resumoOpcoes,
  TAMANHOS_BERCO,
  TEMAS,
  temPecasDeBerco,
  usarPeca,
} from "@/loja/lib/casas/modulos";
import { AvisoDemonstracao } from "./AvisoDemonstracao";
import type { PecaParecida } from "./dadosMontador";
import {
  amostra,
  amostras,
  botaoCompra,
  botaoOpcaoLargo,
  circulo,
  linhaRotulo,
  linkTrilha,
  mensagemErro,
  parcelamento,
  precoBotao,
  rotulo,
  rotuloBotao,
  seloPix,
  valor,
} from "./estilosPainel";
import { FotoProjeto } from "./FotoProjeto";
import { type MiniaturaPeca, MiniaturasMontador } from "./MiniaturasMontador";
import { ModalParecidas } from "./ModalParecidas";
import { PreviaQuartinho } from "./PreviaQuartinho";

// "Monte o seu quartinho" (/personalizado/monte-o-seu/<etapa>): o quartinho personalizado, uma etapa
// por página (lib/casas/etapas.ts): 1. Tema e paleta · 2. Berço · 3. Quarto · 4. Banho, passeio e
// maternidade · 5. Bordado · 6. Resumo. O Montador fica no layout da rota e não remonta entre as
// etapas: guarda o quartinho, o progresso no topo (passos já visitados clicáveis, o atual em destaque
// e o check nos concluídos), o resumo lateral (prévia animada do quarto, miniaturas em carrossel com
// o visualizador em tela cheia e o total) e, no celular, a barra fixa com "Voltar" e "Continuar".
// Cada página só escolhe a etapa (EtapaDoMontador). "Continuar" valida a etapa (ex.: o tamanho do
// berço quando há peça de berço) e não deixa seguir sem o obrigatório; quem chega por URL a uma etapa
// adiante com pendência antes volta para ela. O rascunho fica no navegador (mk_montador: quartinho,
// bordado e etapas visitadas) entre as etapas e as visitas. Com ?projeto=<slug>, começa do quartinho
// do ateliê; com ?editar=<id>, edita o quartinho que está na sacola (o ?editar= segue em todas as
// etapas). As regras (preço, validação, item da sacola) ficam em lib/casas/modulos.ts.

const RASCUNHO = "mk_montador";
const DURACAO_REALCE = 1600;

type Rascunho = { quartinho: Quartinho; comBordado: boolean; visitadas: IdEtapa[] };

function lerRascunho(): Rascunho | null {
  try {
    const bruto = window.localStorage.getItem(RASCUNHO);
    if (!bruto) return null;
    const valor = JSON.parse(bruto);
    return { quartinho: normalizarQuartinho(valor?.quartinho), comBordado: Boolean(valor?.comBordado), visitadas: normalizarVisitadas(valor?.visitadas) };
  } catch {
    return null;
  }
}

function gravarRascunho(rascunho: Rascunho | null) {
  try {
    if (rascunho) window.localStorage.setItem(RASCUNHO, JSON.stringify(rascunho));
    else window.localStorage.removeItem(RASCUNHO);
  } catch {
    // sem storage: segue sem rascunho
  }
}

const vazio = (quartinho: Quartinho) => !quartinho.tema && !quartinho.paleta && quartinho.modulos.length === 0 && !quartinho.tamanhoBerco;

// A peça do catálogo guardada no navegador vale só se ainda está entre as parecidas do módulo; o nome
// e o preço vêm do catálogo atual (nunca do que ficou salvo).
function conferirPecas(quartinho: Quartinho, parecidas: Record<string, PecaParecida[]>): Quartinho {
  return {
    ...quartinho,
    modulos: quartinho.modulos.map((item) => {
      if (!item.peca) return item;
      const atual = parecidas[item.id]?.find((peca) => peca.slug === item.peca?.slug);
      return atual ? { ...item, peca: { slug: atual.slug, nome: atual.nome, preco: atual.preco } } : { id: item.id, opcoes: item.opcoes };
    }),
  };
}

type Confirmado = { nome: string; detalhe: string; preco: number; paleta?: string[] };

type ContextoMontador = {
  quartinho: Quartinho;
  comBordado: boolean;
  etapa: IdEtapa;
  edicao: boolean;
  erros: ErrosQuartinho; // pendências da etapa atual, depois de tentar seguir
  cores?: string[];
  total: number;
  parecidas: Record<string, PecaParecida[]>;
  mudar: (novo: Quartinho, mensagem?: string) => void;
  ligarBordado: (ligado: boolean) => void;
  abrirParecidas: (id: string) => void;
  irPara: (id: IdEtapa) => void;
  adicionar: (depois: "confirmar" | "pedido") => void;
  recomecar: () => void;
};

const Contexto = createContext<ContextoMontador | null>(null);

function useMontador(): ContextoMontador {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useMontador fora do Montador");
  return valor;
}

export function Montador({ sugestoes, parecidas, children }: { sugestoes: Sugestao[]; parecidas: Record<string, PecaParecida[]>; children: ReactNode }) {
  const router = useRouter();
  const segmento = useSelectedLayoutSegment();
  const etapa: IdEtapa = ehEtapa(segmento) ? segmento : "tema";
  const itens = useItensCarrinho();
  const [quartinho, setQuartinho] = useState<Quartinho>(quartinhoVazio());
  const [comBordado, setComBordado] = useState(false);
  const [visitadas, setVisitadas] = useState<IdEtapa[]>([]);
  const [pronto, setPronto] = useState(false);
  const [restaurado, setRestaurado] = useState(false);
  const [edicao, setEdicao] = useState<ItemCarrinho | null>(null);
  const [tentou, setTentou] = useState<Partial<Record<IdEtapa, boolean>>>({});
  const [confirmado, setConfirmado] = useState<Confirmado | null>(null);
  const [anuncio, setAnuncio] = useState("");
  const [recente, setRecente] = useState<string | null>(null);
  const [parecidasDe, setParecidasDe] = useState<string | null>(null);
  const [direcao, setDirecao] = useState<"avancar" | "voltar">("avancar");
  const iniciado = useRef(false);
  const etapaAnteriorRef = useRef(etapa);
  const editar = edicao?.slug ?? null;

  // Ponto de partida (uma vez, depois de ler a sacola): ?editar= (quartinho da sacola), ?projeto=
  // (quartinho do ateliê) ou o rascunho salvo.
  useEffect(() => {
    if (iniciado.current || itens === null) return;
    iniciado.current = true;
    const busca = new URLSearchParams(window.location.search);
    const idEdicao = busca.get("editar");
    const projeto = buscarProjeto(busca.get("projeto") ?? "");
    const naSacola = idEdicao ? itens.find((item) => item.tipo === "personalizado" && item.slug === idEdicao) : undefined;
    if (naSacola?.quartinho) {
      setQuartinho(conferirPecas(normalizarQuartinho(naSacola.quartinho), parecidas));
      setComBordado(Boolean(naSacola.quartinho.bordado));
      setVisitadas(ETAPAS_MONTADOR.map((item) => item.id));
      setEdicao(naSacola);
    } else {
      const rascunho = lerRascunho();
      if (projeto) {
        setQuartinho(quartinhoDoProjeto(projeto));
        setVisitadas(["tema"]);
        setAnuncio(`${projeto.nome} carregado. Ajuste as peças etapa por etapa.`);
      } else if (rascunho && !vazio(rascunho.quartinho)) {
        setQuartinho(conferirPecas(rascunho.quartinho, parecidas));
        setComBordado(rascunho.comBordado);
        setVisitadas(rascunho.visitadas);
        setRestaurado(true);
      }
      // ?projeto= vale uma vez: sai da URL para recarregar a página não apagar os ajustes.
      if (busca.has("projeto") || (idEdicao && !naSacola)) router.replace(hrefEtapa(ehEtapa(segmento) ? segmento : "tema"), { scroll: false });
    }
    setPronto(true);
  }, [itens, parecidas, router, segmento]);

  const final: Quartinho = { ...quartinho, bordado: comBordado ? bordadoLimpo(quartinho.bordado) : undefined };

  // Rascunho a cada mudança (fora da edição de um item da sacola, que tem o próprio "Salvar").
  useEffect(() => {
    if (!pronto || edicao) return;
    gravarRascunho(vazio(quartinho) && !comBordado ? null : { quartinho, comBordado, visitadas });
  }, [quartinho, comBordado, visitadas, pronto, edicao]);

  // A cada etapa: quem chegou por URL com pendência numa etapa anterior volta para ela; senão, a
  // etapa conta como visitada (vira clicável no progresso).
  // biome-ignore lint/correctness/useExhaustiveDependencies: roda só quando a etapa muda ou o montador fica pronto
  useEffect(() => {
    if (!pronto) return;
    const pendente = primeiraPendenteAntes(etapa, final, { comBordado });
    if (pendente) {
      const texto = Object.values(errosDaEtapa(pendente, final, { comBordado }))[0];
      setTentou((atual) => ({ ...atual, [pendente]: true }));
      setAnuncio(texto ? `Antes de seguir: ${texto}` : "Complete a etapa anterior para seguir.");
      router.replace(hrefEtapa(pendente, editar), { scroll: false });
      return;
    }
    setVisitadas((atual) => (atual.includes(etapa) ? atual : ETAPAS_MONTADOR.map((item) => item.id).filter((id) => id === etapa || atual.includes(id))));
  }, [etapa, pronto]);

  // Troca de etapa: direção da entrada (avançar ou voltar, também pelos botões do navegador), rolagem
  // até o topo do montador e foco no título da etapa nova.
  useEffect(() => {
    const anterior = etapaAnteriorRef.current;
    if (anterior === etapa) return;
    etapaAnteriorRef.current = etapa;
    setDirecao(indiceEtapa(etapa) >= indiceEtapa(anterior) ? "avancar" : "voltar");
    const reduzir = prefereMenosMovimento();
    const topo = document.getElementById("montador");
    if (topo && topo.getBoundingClientRect().top < 0) topo.scrollIntoView({ block: "start", behavior: reduzir ? "auto" : "smooth" });
    window.requestAnimationFrame(() => document.getElementById("titulo-etapa")?.focus({ preventScroll: true }));
  }, [etapa]);

  // O halo da peça recém-incluída some sozinho.
  useEffect(() => {
    if (!recente) return;
    const tempo = window.setTimeout(() => setRecente(null), DURACAO_REALCE);
    return () => window.clearTimeout(tempo);
  }, [recente]);

  const erros: ErrosQuartinho = tentou[etapa] ? errosDaEtapa(etapa, final, { comBordado }) : {};
  const total = precoDoQuartinho(final);
  const paleta = buscarPaleta(quartinho.paleta);
  const cores = paleta?.cores.map((cor) => cor.hex);

  function mudar(novo: Quartinho, mensagem?: string) {
    // A peça que entrou (ou mudou de opção) ganha o realce na prévia.
    const mudou = novo.modulos.find((item) => {
      const antes = quartinho.modulos.find((velho) => velho.id === item.id);
      return !antes || JSON.stringify(antes) !== JSON.stringify(item);
    });
    if (mudou) setRecente(mudou.id);
    setQuartinho(novo);
    if (mensagem) setAnuncio(mensagem);
  }

  function recomecar() {
    setQuartinho(quartinhoVazio());
    setComBordado(false);
    setTentou({});
    setVisitadas(["tema"]);
    setRestaurado(false);
    gravarRascunho(null);
    setAnuncio("Quartinho recomeçado.");
    if (etapa !== "tema") router.push(hrefEtapa("tema", editar), { scroll: false });
  }

  function irPara(destino: IdEtapa) {
    if (destino === etapa) return;
    router.push(hrefEtapa(destino, editar), { scroll: false });
  }

  // Leva o foco ao primeiro campo com problema da etapa (a mensagem aparece junto dele).
  function mostrarPendencia(texto: string | undefined) {
    setAnuncio(`Falta pouco: ${texto ?? "complete esta etapa"}`);
    window.requestAnimationFrame(() => {
      const alvo = document.querySelector<HTMLElement>("#montador [data-erro]") ?? document.getElementById("titulo-etapa");
      const reduzir = prefereMenosMovimento();
      alvo?.scrollIntoView({ block: "center", behavior: reduzir ? "auto" : "smooth" });
      (alvo?.closest("fieldset")?.querySelector<HTMLElement>("button, input, select") ?? alvo?.querySelector<HTMLElement>("button, input, select") ?? alvo)?.focus({
        preventScroll: true,
      });
    });
  }

  function continuar() {
    const encontrados = errosDaEtapa(etapa, final, { comBordado });
    if (Object.keys(encontrados).length > 0) {
      setTentou((atual) => ({ ...atual, [etapa]: true }));
      mostrarPendencia(Object.values(encontrados)[0]);
      return;
    }
    const proxima = proximaEtapa(etapa);
    if (!proxima) return;
    setVisitadas((atual) => (atual.includes(proxima) ? atual : [...atual, proxima]));
    irPara(proxima);
  }

  function voltar() {
    const anterior = etapaAnterior(etapa);
    if (anterior) irPara(anterior);
  }

  function adicionar(depois: "confirmar" | "pedido") {
    const encontrados = errosDaEtapa("resumo", final, { comBordado });
    if (Object.keys(encontrados).length > 0) {
      setTentou((atual) => ({ ...atual, resumo: true }));
      if (etapa !== "resumo") irPara("resumo");
      else mostrarPendencia(Object.values(encontrados)[0]);
      return;
    }
    const novo: ItemCarrinho = { tipo: "personalizado", slug: idQuartinho(final), quantidade: edicao?.quantidade ?? 1, quartinho: final };
    if (edicao) {
      // O rascunho (outro quartinho em andamento) fica como está.
      atualizarItem(edicao, novo);
      router.push(depois === "pedido" ? "/checkout" : "/carrinho");
      return;
    }
    adicionarAoCarrinho(novo);
    gravarRascunho(null);
    setRestaurado(false);
    if (depois === "pedido") {
      router.push("/checkout");
      return;
    }
    const linhas = linhasDoQuartinho(final);
    setConfirmado({
      nome: nomeDoQuartinho(final),
      detalhe: `${linhas.length} ${linhas.length === 1 ? "item" : "itens"}: ${linhas.map((linha) => linha.nome).join(", ")}`,
      preco: precoDoQuartinho(final),
      paleta: cores,
    });
  }

  const moduloParecidas = parecidasDe ? (buscarModulo(parecidasDe) ?? null) : null;
  const contexto: ContextoMontador = {
    quartinho,
    comBordado,
    etapa,
    edicao: Boolean(edicao),
    erros,
    cores,
    total,
    parecidas,
    mudar,
    ligarBordado: (ligado) => {
      setComBordado(ligado);
      setAnuncio(ligado ? `Bordado do nome incluído: mais ${formatarPreco(PRECO_BORDADO)}.` : "Sem bordado.");
    },
    abrirParecidas: setParecidasDe,
    irPara,
    adicionar,
    recomecar,
  };

  const dadosEtapa = buscarEtapa(etapa);
  const proxima = proximaEtapa(etapa);

  return (
    <Contexto.Provider value={contexto}>
      <div id="montador" className={pagina}>
        <header className={cabecalho}>
          <nav aria-label="Você está em" className={css({ fontSize: "sm", lineHeight: "texto", color: "escuro" })}>
            <ol className={css({ display: "flex", flexWrap: "wrap" })}>
              {[
                { rotulo: "Personalizado", href: "/personalizado" },
                { rotulo: "Monte o seu quartinho", href: hrefEtapa("tema", editar) },
              ].map((elo, indice) => (
                <li key={elo.href}>
                  {indice > 0 && (
                    <span aria-hidden className={css({ mx: "1" })}>
                      /
                    </span>
                  )}
                  <Link href={elo.href} className={linkTrilha}>
                    {elo.rotulo}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
          <h1 className={tituloPagina}>
            {edicao ? "Editar o meu quartinho" : "Monte o seu quartinho"}
            <span className={css({ color: "textoSuave" })}> Quartinho personalizado</span>
          </h1>
          <Progresso etapa={etapa} quartinho={final} comBordado={comBordado} visitadas={visitadas} aoIr={irPara} />
          {(restaurado || edicao) && (
            <p role="status" className={avisoRascunho}>
              <Info size={16} aria-hidden className={css({ flexShrink: "0" })} />
              <span>
                {edicao ? "Você está editando o quartinho que está na sacola." : "Continuamos de onde você parou: o rascunho fica salvo neste navegador."}
              </span>
              <button type="button" onClick={recomecar} className={cx(linkAcao, css({ fontSize: "inherit", ml: "auto" }))}>
                Recomeçar
              </button>
            </p>
          )}
        </header>

        <div className={grade}>
          <div className={colunaEtapa}>
            <div key={etapa} data-direcao={direcao} className={entradaEtapa}>
              {children}
            </div>
            {etapa !== "resumo" && (
              <div className={navegacaoDesktop}>
                {etapaAnterior(etapa) ? (
                  <button type="button" onClick={voltar} className={botaoVoltar}>
                    <ArrowLeft size={18} aria-hidden /> Voltar
                  </button>
                ) : (
                  <span />
                )}
                <button type="button" onClick={continuar} className={botaoContinuar}>
                  Continuar{proxima ? `: ${buscarEtapa(proxima)?.rotulo}` : ""}
                  <ArrowRight size={18} aria-hidden />
                </button>
              </div>
            )}
          </div>

          <ResumoLateral quartinho={final} total={total} recente={recente} etapa={etapa} aoContinuar={continuar} />
        </div>
      </div>

      {/* Celular e tablet: "Voltar" e "Continuar" sempre à mão, com o total. */}
      <div data-barra-fixa data-visivel className={barraCelular}>
        <button type="button" onClick={voltar} disabled={!etapaAnterior(etapa)} aria-label="Voltar à etapa anterior" className={botaoVoltarCelular}>
          <ArrowLeft size={20} aria-hidden />
        </button>
        <p className={css({ minW: "0", flex: "1" })}>
          <span className={css({ display: "block", fontSize: "xs", color: "textoSuave", truncate: true })}>
            {indiceEtapa(etapa) + 1}/{ETAPAS_MONTADOR.length} · {dadosEtapa?.rotulo} · a partir de
          </span>
          <span className={css({ display: "block", fontSize: "md", fontWeight: "medium", color: "escuro" })}>{formatarPreco(total)}</span>
        </p>
        {etapa === "resumo" ? (
          <button type="button" onClick={() => adicionar("confirmar")} className={cx(botaoCompra, css({ flexShrink: "0", px: "5" }))}>
            {edicao ? "Salvar na sacola" : "Adicionar"}
          </button>
        ) : (
          <button type="button" onClick={continuar} className={cx(botaoCompra, css({ flexShrink: "0", px: "5" }))}>
            Continuar <ArrowRight size={18} aria-hidden />
          </button>
        )}
      </div>

      <ModalParecidas
        modulo={moduloParecidas}
        pecas={parecidasDe ? (parecidas[parecidasDe] ?? []) : []}
        emUso={quartinho.modulos.find((item) => item.id === parecidasDe)?.peca?.slug}
        aoFechar={() => setParecidasDe(null)}
        aoUsar={(peca: PecaCatalogo | undefined) => {
          if (!moduloParecidas) return;
          mudar(
            usarPeca(quartinho, moduloParecidas.id, peca),
            peca ? `${moduloParecidas.nome}: ${peca.nome}, a partir de ${formatarPreco(peca.preco)}.` : `${moduloParecidas.nome}: de volta às opções do ateliê.`,
          );
          setParecidasDe(null);
        }}
      />

      <ConfirmacaoCarrinho
        aberta={confirmado !== null}
        aoFechar={() => {
          setConfirmado(null);
          recomecar();
        }}
        item={{
          nome: confirmado?.nome ?? "",
          detalhe: confirmado?.detalhe,
          quantidade: 1,
          preco: decimal((confirmado?.preco ?? 0) * 100),
          pix: decimal(Math.round((confirmado?.preco ?? 0) * (100 - DESCONTO_PIX_PERCENTUAL))),
          paleta: confirmado?.paleta ?? [],
        }}
        sugestoes={sugestoes}
      />

      <p role="status" aria-live="polite" className={css({ srOnly: true })}>
        {anuncio}
      </p>
    </Contexto.Provider>
  );
}

// Progresso no topo: os 6 passos ligados por uma linha que se preenche até o atual. Já visitados (e
// sem pendência antes) são botões; o atual fica em destaque (aria-current="step"); os concluídos
// ganham o check. No celular, só os números (o nome da etapa vem logo abaixo, no título dela).
function Progresso({
  etapa,
  quartinho,
  comBordado,
  visitadas,
  aoIr,
}: {
  etapa: IdEtapa;
  quartinho: Quartinho;
  comBordado: boolean;
  visitadas: IdEtapa[];
  aoIr: (id: IdEtapa) => void;
}) {
  const atual = indiceEtapa(etapa);
  return (
    <nav aria-label="Etapas do montador" className={css({ mt: "2" })}>
      <ol className={listaProgresso} style={{ "--progresso": atual / (ETAPAS_MONTADOR.length - 1) } as CSSProperties}>
        {ETAPAS_MONTADOR.map((item, indice) => {
          const ehAtual = item.id === etapa;
          const concluida = !ehAtual && visitadas.includes(item.id) && etapaValida(item.id, quartinho, { comBordado }) && indice < ETAPAS_MONTADOR.length - 1;
          const clicavel = !ehAtual && etapaAlcancavel(item.id, quartinho, visitadas, { comBordado });
          const conteudo = (
            <>
              <span aria-hidden className={bolinhaPasso}>
                {concluida ? <Check size={14} weight="bold" className={css({ animation: "saltar" })} /> : indice + 1}
              </span>
              <span className={rotuloPasso}>
                <span className={css({ srOnly: true })}>Etapa {indice + 1}: </span>
                {item.rotulo}
                {concluida && <span className={css({ srOnly: true })}> (concluída)</span>}
              </span>
            </>
          );
          return (
            <li key={item.id} aria-current={ehAtual ? "step" : undefined} data-concluida={concluida || undefined} data-atual={ehAtual || undefined} className={passo}>
              {clicavel ? (
                <button type="button" onClick={() => aoIr(item.id)} className={botaoPasso}>
                  {conteudo}
                </button>
              ) : (
                <span aria-disabled={!ehAtual || undefined} className={botaoPasso}>
                  {conteudo}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// A página de cada etapa (app/.../monte-o-seu/[etapa]/page.tsx) mostra a etapa pelo contexto.
export function EtapaDoMontador({ etapa }: { etapa: IdEtapa }) {
  const dados = buscarEtapa(etapa);
  if (!dados) return null;
  if (etapa === "tema") return <EtapaTema />;
  if (etapa === "bordado") return <EtapaBordado />;
  if (etapa === "resumo") return <EtapaResumo />;
  return <EtapaPecas grupos={dados.grupos} />;
}

// Cabeçalho de cada etapa: "Etapa 2 de 6", título de 28 (recebe o foco ao trocar de etapa) e o apoio;
// o erro aparece logo abaixo, ao vivo.
function CabecalhoEtapa({ erro }: { erro?: string }) {
  const { etapa } = useMontador();
  const dados = buscarEtapa(etapa);
  return (
    <div className={css({ display: "grid", gap: "2" })}>
      <p className={css({ fontSize: "sm", color: "textoSuave", fontVariantNumeric: "tabular-nums" })}>
        Etapa {indiceEtapa(etapa) + 1} de {ETAPAS_MONTADOR.length}
      </p>
      <h2 id="titulo-etapa" tabIndex={-1} className={tituloEtapa}>
        {dados?.titulo}
      </h2>
      <p className={css({ fontSize: "sm", lineHeight: "texto", color: "textoSuave" })}>{dados?.apoio}</p>
      <div aria-live="polite">
        {erro && (
          <p id="erro-etapa" className={mensagemErro}>
            {erro}
          </p>
        )}
      </div>
    </div>
  );
}

// 1. Tema e paleta: o tema filtra as paletas (as do tema e as neutras); a paleta em bolinhas de 44/36
// com as 3 cores; e, opcional, começar de um quartinho do ateliê.
function EtapaTema() {
  const { quartinho, erros, mudar } = useMontador();
  const erro = erros.paleta;
  const [paletaEmFoco, setPaletaEmFoco] = useState<Paleta | null>(null);
  const paletas = paletasDoTema(quartinho.tema);
  const atual = buscarPaleta(quartinho.paleta);
  const mostrada = paletaEmFoco ?? atual;
  const projetos = listarProjetos().filter((projeto) => !quartinho.tema || projeto.tema === quartinho.tema || projeto.tema === "neutro");

  return (
    <section aria-labelledby="titulo-etapa" className={etapaSecao}>
      <CabecalhoEtapa erro={erro} />
      <div className={corpoEtapa}>
        <fieldset data-erro={(erro && !quartinho.tema) || undefined} className={css({ minW: "0" })}>
          <legend className={cx(linhaRotulo, css({ float: "left", w: "full" }))}>
            <span data-erro={(erro && !quartinho.tema) || undefined} className={rotulo}>
              Tema
            </span>
            {quartinho.tema && <span className={valor}>{TEMAS.find((tema) => tema.id === quartinho.tema)?.rotulo}</span>}
          </legend>
          <div className={tresColunas}>
            {TEMAS.map((tema) => (
              <button
                key={tema.id}
                type="button"
                aria-pressed={quartinho.tema === tema.id}
                onClick={() => {
                  // Trocar o tema mantém a paleta se ela continua valendo para o novo tema.
                  const continua = paletasDoTema(tema.id).some((paleta) => paleta.id === quartinho.paleta);
                  mudar({ ...quartinho, tema: tema.id, paleta: continua ? quartinho.paleta : undefined }, `Tema: ${tema.rotulo}.`);
                }}
                className={botaoOpcaoLargo}
              >
                {tema.rotulo}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset data-erro={(erro && quartinho.tema && !atual) || undefined} className={css({ minW: "0" })}>
          <legend className={cx(linhaRotulo, css({ float: "left", w: "full" }))}>
            <span data-erro={(erro && !atual) || undefined} className={rotulo}>
              Paleta
            </span>
            {mostrada && <span className={valor}>{mostrada.nome}</span>}
          </legend>
          <ul className={cx(amostras, css({ clear: "both" }))}>
            {paletas.map((paleta) => (
              <li key={paleta.id}>
                <button
                  type="button"
                  aria-pressed={quartinho.paleta === paleta.id}
                  aria-label={`${paleta.nome}: ${paleta.cores.map((cor) => cor.nome).join(", ")}`}
                  onPointerEnter={() => setPaletaEmFoco(paleta)}
                  onPointerLeave={() => setPaletaEmFoco(null)}
                  onFocus={() => setPaletaEmFoco(paleta)}
                  onBlur={() => setPaletaEmFoco(null)}
                  onClick={() => mudar({ ...quartinho, tema: quartinho.tema ?? paleta.tema, paleta: paleta.id }, `Paleta ${paleta.nome}.`)}
                  className={amostra}
                >
                  <span className={circulo} style={{ backgroundImage: gradientePaleta(paleta) }} />
                </button>
              </li>
            ))}
          </ul>
          <p className={css({ mt: "3", fontSize: "sm", lineHeight: "texto", color: "textoSuave" })}>
            {mostrada ? mostrada.cores.map((cor) => cor.nome).join(" · ") : "Toque numa bolinha para ver as cores."}
          </p>
        </fieldset>

        <Selecao
          id="montador-projeto"
          rotulo="Começar de um quartinho do ateliê (opcional)"
          value={quartinho.base ?? ""}
          dica="Preenche o tema, a paleta e as peças do quartinho. Depois é só ajustar nas próximas etapas."
          onChange={(evento) => {
            const projeto = buscarProjeto(evento.target.value);
            if (projeto) mudar(quartinhoDoProjeto(projeto, quartinho), `${projeto.nome} carregado: ${quartinhoDoProjeto(projeto).modulos.length} peças.`);
            else mudar({ ...quartinho, base: undefined });
          }}
        >
          <option value="">Começar do zero</option>
          {projetos.map((projeto) => (
            <option key={projeto.slug} value={projeto.slug}>
              {projeto.nome}
            </option>
          ))}
        </Selecao>
      </div>
    </section>
  );
}

// "Americano", "Padrão", "Mini berço": cabe nos 3 botões do celular (o nome inteiro vai no aria-label).
function rotuloCurtoBerco(tamanho: string): string {
  const curto = tamanho.split(" · ")[0];
  const semBerco = curto.replace(/^Berço\s+/, "");
  return semBerco === curto ? curto : semBerco.charAt(0).toUpperCase() + semBerco.slice(1);
}

// Bolinha da paleta: as 3 cores em fatias (a cor é dado do quartinho, por isso vai em style).
function gradientePaleta(paleta: Paleta): string {
  const passo = 100 / paleta.cores.length;
  return `conic-gradient(${paleta.cores.map((cor, indice) => `${cor.hex} ${indice * passo}% ${(indice + 1) * passo}%`).join(", ")})`;
}

// 2 a 4. Peças: os grupos da etapa com a contagem e, no Berço, o tamanho do colchão (obrigatório
// quando há peça de berço). Cada módulo é um card: foto 5:6 nos tons da paleta, nome, "a partir de",
// descrição, opções em chips, "Incluir/Remover" e "Ver peças parecidas".
function EtapaPecas({ grupos }: { grupos: GrupoModulo[] }) {
  const { quartinho, erros, mudar } = useMontador();
  const comKit = incluido(quartinho, "kit-berco");
  const precisaTamanho = temPecasDeBerco(quartinho);
  const erro = erros.tamanhoBerco ?? erros.modulos;
  return (
    <section aria-labelledby="titulo-etapa" className={etapaSecao}>
      <CabecalhoEtapa erro={erro} />
      <div className={corpoEtapa}>
        {GRUPOS_MODULOS.filter((grupo) => grupos.includes(grupo.id)).map((grupo) => {
          const { escolhidos, total } = contagemDoGrupo(quartinho, grupo.id);
          return (
            <section key={grupo.id} aria-labelledby={`grupo-${grupo.id}`} data-erro={(erros.modulos && grupo.id === grupos[0]) || undefined} className={css({ minW: "0" })}>
              <div className={cabecalhoGrupo}>
                <h3 id={`grupo-${grupo.id}`} className={css({ fontSize: "xl", fontWeight: "normal", letterSpacing: "bloco", color: "escuro" })}>
                  {grupo.nome}
                </h3>
                <p aria-live="polite" className={css({ fontSize: "sm", color: escolhidos > 0 ? "escuro" : "textoSuave", whiteSpace: "nowrap" })}>
                  {escolhidos} de {total} {total === 1 ? "escolhido" : "escolhidos"}
                </p>
              </div>
              <p className={css({ mt: "1", fontSize: "sm", color: "textoSuave" })}>{grupo.apoio}</p>

              {grupo.id === "berco" && (
                <fieldset
                  id="tamanho-berco"
                  data-erro={erros.tamanhoBerco ? "" : undefined}
                  className={css({ minW: "0", mt: "5", scrollMarginTop: "24" })}
                  aria-describedby={erros.tamanhoBerco ? "erro-etapa" : "apoio-tamanho-berco"}
                >
                  <legend className={cx(linhaRotulo, css({ float: "left", w: "full" }))}>
                    <span data-erro={erros.tamanhoBerco ? "" : undefined} className={rotulo}>
                      Tamanho do berço
                    </span>
                    {quartinho.tamanhoBerco && <span className={valor}>{quartinho.tamanhoBerco.split(" · ")[0]}</span>}
                  </legend>
                  <div className={tresColunas}>
                    {TAMANHOS_BERCO.map((tamanho) => (
                      <button
                        key={tamanho}
                        type="button"
                        aria-pressed={quartinho.tamanhoBerco === tamanho}
                        aria-label={tamanho}
                        onClick={() => mudar({ ...quartinho, tamanhoBerco: tamanho }, `Tamanho do berço: ${tamanho}.`)}
                        className={botaoOpcaoLargo}
                      >
                        {rotuloCurtoBerco(tamanho)}
                      </button>
                    ))}
                  </div>
                  <p id="apoio-tamanho-berco" className={css({ mt: "3", fontSize: "sm", lineHeight: "texto", color: "textoSuave" })}>
                    {quartinho.tamanhoBerco
                      ? `Colchão de ${quartinho.tamanhoBerco.split(" · ")[1]}.`
                      : precisaTamanho
                        ? "Obrigatório para as peças de berço."
                        : "Para as peças de berço: americano 70 × 130, padrão 60 × 130 ou mini berço 50 × 90 cm."}
                  </p>
                </fieldset>
              )}

              <ul className={listaModulos}>
                {modulosDoGrupo(grupo.id).map((modulo, indice) => (
                  <CartaoModulo key={modulo.id} modulo={modulo} tom={indice} noKit={comKit && Boolean(modulo.noKitBerco)} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </section>
  );
}

function CartaoModulo({ modulo, tom, noKit }: { modulo: Modulo; tom: number; noKit: boolean }) {
  const { quartinho, cores, parecidas, mudar, abrirParecidas } = useMontador();
  const escolhido = quartinho.modulos.find((item) => item.id === modulo.id);
  const opcoes = opcoesCompletas(modulo, escolhido?.opcoes);
  const preco = escolhido ? precoDoEscolhido(escolhido) : precoDoModulo(modulo, opcoes);
  const paleta = cores ? [cores[tom % cores.length], cores[(tom + 1) % cores.length]] : undefined;
  const temParecidas = (parecidas[modulo.id]?.length ?? 0) > 0;
  const peca = escolhido?.peca;

  return (
    <li data-incluido={escolhido ? "" : undefined} className={cartaoModulo}>
      <div className={css({ position: "relative", alignSelf: "start" })}>
        <FotoProjeto paleta={paleta} icone={modulo.icone} bolinhas={false} className={css({ aspectRatio: "[5 / 6]", w: "full" })} />
        {escolhido && (
          <span aria-hidden className={seloIncluido}>
            <Check size={14} weight="bold" />
          </span>
        )}
      </div>

      <div className={css({ display: "flex", flexDirection: "column", gap: "3", minW: "0" })}>
        <div className={css({ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", columnGap: "3", rowGap: "1" })}>
          <h4 className={css({ fontSize: "md", fontWeight: "medium", lineHeight: "texto", color: "escuro" })}>{modulo.nome}</h4>
          <p className={css({ fontSize: "sm", color: "escuro", whiteSpace: "nowrap" })}>
            <span className={css({ fontSize: "xs", color: "textoSuave" })}>a partir de </span>
            <span key={preco} className={css({ display: "inline-block", animation: "surgir" })}>
              {formatarPreco(preco)}
            </span>
          </p>
        </div>
        <p className={css({ fontSize: "sm", lineHeight: "texto", color: "textoSuave" })}>
          {modulo.descricao}
          {noKit && <span className={css({ display: "block", mt: "1", color: "alerta" })}>Já vem no kit berço: avulso, entra como reposição ou outro modelo.</span>}
        </p>

        {peca ? (
          <div className={caixaPeca}>
            <p className={css({ fontSize: "xs", color: "textoSuave" })}>Peça do catálogo no lugar das opções</p>
            <p className={css({ fontSize: "sm", fontWeight: "medium", color: "escuro" })}>{peca.nome}</p>
            <button
              type="button"
              onClick={() => mudar(usarPeca(quartinho, modulo.id, undefined), `${modulo.nome}: de volta às opções do ateliê.`)}
              className={cx(linkAcao, css({ justifySelf: "start", fontSize: "xs" }))}
            >
              Voltar às opções do ateliê
            </button>
          </div>
        ) : (
          modulo.variacoes.map((variacao) => (
            // biome-ignore lint/a11y/useSemanticElements: grupo de botões alternáveis (aria-pressed)
            <div key={variacao.id} role="group" aria-label={`${variacao.titulo} de ${modulo.nome}`}>
              <p className={css({ mb: "2", fontSize: "xs", fontWeight: "medium", color: "escuro" })}>
                {variacao.titulo}
                <span className={css({ fontWeight: "normal", color: "textoSuave" })}> · {opcoes[variacao.id]}</span>
              </p>
              <div className={css({ display: "flex", flexWrap: "wrap", gap: "2" })}>
                {variacao.opcoes.map((opcao) => {
                  const marcada = Boolean(escolhido) && opcoes[variacao.id] === opcao.rotulo;
                  return (
                    <button
                      key={opcao.rotulo}
                      type="button"
                      aria-pressed={marcada}
                      data-sugerida={(!escolhido && opcoes[variacao.id] === opcao.rotulo) || undefined}
                      onClick={() =>
                        mudar(escolherOpcao(quartinho, modulo.id, variacao.id, opcao.rotulo), `${modulo.nome}: ${opcao.rotulo}${escolhido ? "" : ", incluído no quartinho"}.`)
                      }
                      className={chip}
                    >
                      {marcada && <Check size={12} weight="bold" aria-hidden className={css({ animation: "saltar" })} />}
                      {opcao.rotulo}
                      {opcao.acrescimo > 0 && <span className={css({ color: "textoSuave", "[aria-pressed=true] > &": { color: "inherit" } })}>+{formatarPreco(opcao.acrescimo)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}

        <div className={css({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4", mt: "1" })}>
          <button
            type="button"
            aria-pressed={Boolean(escolhido)}
            aria-label={escolhido ? `Remover ${modulo.nome}` : `Incluir ${modulo.nome}`}
            onClick={() => mudar(alternarModulo(quartinho, modulo.id), escolhido ? `${modulo.nome} saiu do quartinho.` : `${modulo.nome} incluído: a partir de ${formatarPreco(preco)}.`)}
            className={botaoIncluir}
          >
            {escolhido ? (
              <>
                <Check size={16} aria-hidden className={css({ animation: "saltar" })} /> Incluído · Remover
              </>
            ) : (
              <>
                <Plus size={16} aria-hidden /> Incluir
              </>
            )}
          </button>
          {temParecidas && (
            <button type="button" aria-haspopup="dialog" onClick={() => abrirParecidas(modulo.id)} className={cx(linkAcao, linkParecidas)}>
              <MagnifyingGlass size={14} aria-hidden /> Ver peças parecidas
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

// 5. Bordado do nome (opcional): sem ou com bordado; com, o nome (até 20 letras).
function EtapaBordado() {
  const { quartinho, comBordado, erros, mudar, ligarBordado } = useMontador();
  const erro = erros.bordado;
  return (
    <section aria-labelledby="titulo-etapa" className={etapaSecao}>
      <CabecalhoEtapa erro={erro} />
      <div className={corpoEtapa}>
        <p className={css({ fontSize: "sm", lineHeight: "texto", color: "texto" })}>
          Mais {formatarPreco(PRECO_BORDADO)}. O ateliê confirma a fonte e a cor da linha pelo WhatsApp.
        </p>
        <fieldset className={css({ minW: "0" })}>
          <legend className={cx(linhaRotulo, css({ float: "left", w: "full" }))}>
            <span className={rotulo}>Bordado</span>
            <span className={valor}>{comBordado ? `Com bordado · +${formatarPreco(PRECO_BORDADO)}` : "Sem bordado"}</span>
          </legend>
          <div className={duasColunas}>
            {[false, true].map((ligado) => (
              <button key={String(ligado)} type="button" aria-pressed={comBordado === ligado} onClick={() => ligarBordado(ligado)} className={botaoOpcaoLargo}>
                {ligado ? "Com bordado" : "Sem bordado"}
              </button>
            ))}
          </div>
        </fieldset>
        {comBordado && (
          <div data-erro={erro ? "" : undefined} className={css({ display: "grid", gap: "1.5", maxW: "[420px]", animation: "surgir" })}>
            <label htmlFor="montador-bordado" className={rotulo}>
              Nome a bordar
            </label>
            <input
              id="montador-bordado"
              type="text"
              autoComplete="off"
              maxLength={LIMITE_BORDADO}
              value={quartinho.bordado ?? ""}
              aria-invalid={erro ? true : undefined}
              aria-describedby={erro ? "erro-etapa" : "montador-bordado-dica"}
              placeholder="Ex.: Helena"
              onChange={(evento) => mudar({ ...quartinho, bordado: evento.target.value })}
              className={campoTexto}
            />
            <p id="montador-bordado-dica" className={css({ fontSize: "xs", color: "textoSuave" })}>
              Até {LIMITE_BORDADO} letras ({(quartinho.bordado ?? "").length}/{LIMITE_BORDADO}).
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

// 6. Resumo: as peças por grupo (com "Editar" levando de volta à etapa), o berço, o bordado, o frete
// e a produção, o total "a partir de", as pendências (se houver) e os botões da sacola.
function EtapaResumo() {
  const { quartinho, comBordado, edicao, erros, total, adicionar, recomecar, irPara } = useMontador();
  const bordado = comBordado ? bordadoLimpo(quartinho.bordado) : "";
  const paleta = buscarPaleta(quartinho.paleta);
  const pendencias = (Object.keys(erros) as Array<keyof ErrosQuartinho>).map((chave) => ({ chave, texto: erros[chave] as string }));
  const grupos = GRUPOS_MODULOS.map((grupo) => ({ grupo, itens: quartinho.modulos.filter((item) => buscarModulo(item.id)?.grupo === grupo.id) })).filter(
    (bloco) => bloco.itens.length > 0,
  );

  return (
    <section aria-labelledby="titulo-etapa" className={etapaSecao}>
      <CabecalhoEtapa />
      <div className={corpoEtapa}>
        <BlocoResumo titulo="Tema e paleta" aoEditar={() => irPara("tema")}>
          <p className={css({ fontSize: "sm", color: "texto" })}>
            {[TEMAS.find((tema) => tema.id === quartinho.tema)?.rotulo, paleta && `${paleta.nome} (${paleta.cores.map((cor) => cor.nome).join(", ")})`]
              .filter(Boolean)
              .join(" · ") || "Ainda não escolhidos"}
          </p>
        </BlocoResumo>

        {grupos.length === 0 ? (
          <BlocoResumo titulo="Peças" aoEditar={() => irPara("berco")}>
            <p className={css({ fontSize: "sm", color: "textoSuave" })}>Nenhuma peça ainda.</p>
          </BlocoResumo>
        ) : (
          grupos.map(({ grupo, itens }) => (
            <BlocoResumo key={grupo.id} titulo={grupo.nome} aoEditar={() => irPara(etapaDoGrupo(grupo.id))}>
              <dl className={css({ display: "grid", gap: "3" })}>
                {itens.map((item) => {
                  const modulo = buscarModulo(item.id);
                  if (!modulo) return null;
                  return (
                    <div key={item.id} className={linhaResumo}>
                      <dt className={css({ minW: "0", fontSize: "sm", color: "texto" })}>
                        {modulo.nome}
                        <span className={css({ display: "block", fontSize: "xs", color: "textoSuave" })}>
                          {item.peca ? `Peça do catálogo: ${item.peca.nome}` : resumoOpcoes(modulo, item.opcoes)}
                        </span>
                      </dt>
                      <dd className={css({ fontSize: "sm", color: "escuro", whiteSpace: "nowrap" })}>{formatarPreco(precoDoEscolhido(item))}</dd>
                    </div>
                  );
                })}
                {grupo.id === "berco" && quartinho.tamanhoBerco && (
                  <div className={linhaResumo}>
                    <dt className={css({ fontSize: "sm", color: "texto" })}>Tamanho do berço</dt>
                    <dd className={css({ fontSize: "sm", color: "escuro", textAlign: "right" })}>{quartinho.tamanhoBerco}</dd>
                  </div>
                )}
              </dl>
            </BlocoResumo>
          ))
        )}

        <BlocoResumo titulo="Bordado do nome" aoEditar={() => irPara("bordado")}>
          <div className={linhaResumo}>
            <p className={css({ fontSize: "sm", color: "texto" })}>{bordado ? `“${bordado}”` : "Sem bordado"}</p>
            {bordado && <p className={css({ fontSize: "sm", color: "escuro" })}>{formatarPreco(PRECO_BORDADO)}</p>}
          </div>
        </BlocoResumo>

        <dl className={css({ display: "grid", gap: "3", fontSize: "sm", lineHeight: "texto" })}>
          <div className={linhaResumo}>
            <dt className={css({ color: "texto" })}>Frete</dt>
            <dd className={css({ color: "escuro" })}>A combinar pelo WhatsApp</dd>
          </div>
          <div className={linhaResumo}>
            <dt className={css({ color: "texto" })}>Produção</dt>
            <dd className={css({ color: "escuro" })}>{textoPrazo(PRODUCAO_PROJETO)}</dd>
          </div>
          <div className={cx(linhaResumo, css({ pt: "4", borderTopWidth: "1px", borderColor: "borda", color: "escuro" }))}>
            <dt className={css({ fontSize: "md", fontWeight: "medium" })}>Total estimado</dt>
            <dd>
              <span className={css({ color: "textoSuave" })}>a partir de </span>
              <span className={css({ fontSize: "md", fontWeight: "medium" })}>{formatarPreco(total)}</span>
            </dd>
          </div>
        </dl>
        <p className={css({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2", fontSize: "xs", color: "textoSuave" })}>
          <span className={seloPix}>{DESCONTO_PIX_PERCENTUAL}% OFF no Pix</span>
          Frete a combinar. A vendedora confirma os valores no WhatsApp.
        </p>

        {pendencias.length > 0 && (
          <div role="alert" data-erro="" className={caixaPendencias}>
            <p className={css({ fontWeight: "medium", color: "erro" })}>Falta pouco para adicionar:</p>
            <ul className={css({ display: "grid", gap: "1", mt: "1" })}>
              {pendencias.map((pendencia) => (
                <li key={pendencia.chave}>
                  <button
                    type="button"
                    onClick={() => irPara(ETAPA_DO_ERRO[pendencia.chave])}
                    className={cx(linkAcao, css({ fontSize: "inherit", color: "erro", textAlign: "left" }))}
                  >
                    {pendencia.texto}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={css({ display: "grid", gap: "3", gridTemplateColumns: { base: "1fr", md: "repeat(2, minmax(0, 1fr))" } })}>
          <button id="adicionar-quartinho" type="button" onClick={() => adicionar("confirmar")} className={cx(botaoCompra, largo)}>
            <span className={rotuloBotao}>{edicao ? "Salvar alterações na sacola" : "Adicionar no meu enxoval"}</span>
            <span className={precoBotao}>{formatarPreco(total)}</span>
          </button>
          <button type="button" onClick={() => adicionar("pedido")} className={cx(botaoContorno, largo)}>
            <WhatsappLogo size={20} aria-hidden /> Fazer pedido pelo WhatsApp
          </button>
        </div>
        <p className={parcelamento}>
          <Info size={16} aria-hidden className={css({ flexShrink: "0" })} />
          <span>O pedido vai pela sacola, junto com as outras peças. Nada é cobrado no site.</span>
        </p>
        <div className={css({ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "3" })}>
          <AvisoDemonstracao />
          {!edicao && (
            <button type="button" onClick={recomecar} className={cx(linkAcao, css({ display: "inline-flex", alignItems: "center", gap: "1", fontSize: "xs" }))}>
              <ArrowCounterClockwise size={14} aria-hidden /> Recomeçar
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function BlocoResumo({ titulo, aoEditar, children }: { titulo: string; aoEditar: () => void; children: ReactNode }) {
  return (
    <div className={blocoResumo}>
      <div className={css({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "3", mb: "3" })}>
        <h3 className={css({ fontSize: "md", fontWeight: "medium", color: "escuro" })}>{titulo}</h3>
        <button type="button" onClick={aoEditar} className={cx(linkAcao, css({ display: "inline-flex", alignItems: "center", gap: "1", fontSize: "xs" }))}>
          <PencilSimple size={12} aria-hidden /> Editar <span className={css({ srOnly: true })}>{titulo}</span>
        </button>
      </div>
      {children}
    </div>
  );
}

// Resumo lateral (fixo no desktop, como o da sacola): a prévia animada do quarto, as miniaturas em
// carrossel (abrem o visualizador em tela cheia), o total e o "Continuar".
function ResumoLateral({
  quartinho,
  total,
  recente,
  etapa,
  aoContinuar,
}: {
  quartinho: Quartinho;
  total: number;
  recente: string | null;
  etapa: IdEtapa;
  aoContinuar: () => void;
}) {
  const { edicao, adicionar } = useMontador();
  const paleta = buscarPaleta(quartinho.paleta);
  const cores = paleta?.cores.map((cor) => cor.hex);
  const proxima = proximaEtapa(etapa);
  const pecas: MiniaturaPeca[] = quartinho.modulos.flatMap((item, indice) => {
    const modulo = buscarModulo(item.id);
    if (!modulo) return [];
    return [
      {
        id: item.id,
        nome: modulo.nome,
        detalhe: item.peca ? item.peca.nome : resumoOpcoes(modulo, item.opcoes),
        preco: precoDoEscolhido(item),
        icone: modulo.icone,
        paleta: cores ? [cores[indice % cores.length], cores[(indice + 1) % cores.length]] : undefined,
      },
    ];
  });

  return (
    <aside id="resumo-quartinho" aria-labelledby="titulo-resumo-quartinho" className={resumo}>
      <div className={css({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "3" })}>
        <h2 id="titulo-resumo-quartinho" className={tituloResumo}>
          Seu quartinho
        </h2>
        <p aria-live="polite" className={css({ fontSize: "xs", color: "textoSuave" })}>
          {quartinho.modulos.length} {quartinho.modulos.length === 1 ? "peça" : "peças"}
        </p>
      </div>
      <p className={css({ mt: "1", fontSize: "sm", color: "textoSuave" })}>
        {[TEMAS.find((tema) => tema.id === quartinho.tema)?.rotulo, paleta?.nome].filter(Boolean).join(" · ") || "Escolha o tema e a paleta"}
      </p>

      <PreviaQuartinho quartinho={quartinho} recente={recente} className={css({ mt: "4" })} />
      <MiniaturasMontador pecas={pecas} />
      {pecas.length === 0 && <p className={css({ mt: "3", fontSize: "sm", color: "textoSuave" })}>As peças que você incluir aparecem aqui e no quarto acima.</p>}

      <div aria-live="polite" aria-atomic="true" className={css({ mt: "5", pt: "4", borderTopWidth: "1px", borderColor: "borda" })}>
        <div className={css({ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "3", color: "escuro" })}>
          <span className={css({ fontSize: "md", fontWeight: "medium" })}>Total estimado</span>
          <span className={css({ textAlign: "right" })}>
            <span className={css({ fontSize: "sm", color: "textoSuave" })}>a partir de </span>
            <span key={total} className={css({ display: "inline-block", fontSize: "md", fontWeight: "medium", animation: "surgir" })}>
              {formatarPreco(total)}
            </span>
          </span>
        </div>
        <p className={css({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2", mt: "2", fontSize: "xs", color: "textoSuave" })}>
          <span className={seloPix}>{DESCONTO_PIX_PERCENTUAL}% OFF no Pix</span>
          Frete a combinar.
        </p>
      </div>

      <div className={css({ display: { base: "none", desktop: "grid" }, gap: "3", mt: "5" })}>
        {etapa === "resumo" ? (
          <button type="button" onClick={() => adicionar("confirmar")} className={cx(botaoCompra, largo)}>
            <span className={rotuloBotao}>{edicao ? "Salvar alterações na sacola" : "Adicionar no meu enxoval"}</span>
            <span className={precoBotao}>{formatarPreco(total)}</span>
          </button>
        ) : (
          <button type="button" onClick={aoContinuar} className={cx(botaoCompra, largo)}>
            <span className={rotuloBotao}>Continuar{proxima ? `: ${buscarEtapa(proxima)?.rotulo}` : ""}</span>
            <ArrowRight size={18} aria-hidden />
          </button>
        )}
      </div>
      <Link href="/personalizado" className={cx(linkAcao, css({ display: "inline-flex", alignItems: "center", gap: "1", mt: "4", fontSize: "xs" }))}>
        Prefere um quartinho pronto do ateliê? Ver os quartinhos
        <CaretRight size={12} aria-hidden />
      </Link>
    </aside>
  );
}

// Contêiner da sacola (lululemon-sacola.md §2): até 1440, margens 12/20/40; grade de 12 colunas com a
// etapa nas colunas 1–7 e o resumo fixo nas 9–12 a partir de 992. No celular, espaço embaixo para a
// barra fixa.
const pagina = css({
  maxW: "sacola",
  mx: "auto",
  px: { base: "3", md: "5", desktop: "10" },
  pt: { base: "6", desktop: "10" },
  pb: { base: "32", desktop: "16" },
  scrollMarginTop: "[calc(token(sizes.topoCabecalho) + token(spacing.2))]",
});

const cabecalho = css({ display: "grid", gap: "4", minW: "0", mb: { base: "6", desktop: "10" } });

const grade = css({
  display: "grid",
  gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
  columnGap: { base: "2", desktop: "5" },
  rowGap: { base: "10", desktop: "8" },
  alignItems: "start",
});

const tituloPagina = css({
  fontSize: { base: "subtitulo", md: "4xl" },
  fontWeight: "normal",
  lineHeight: "titulo",
  letterSpacing: "titulo",
  color: "escuro",
  textWrap: "balance",
});

// Progresso: linha de fundo e a parte preenchida até o passo atual (--progresso de 0 a 1), passando
// pelo centro das bolinhas (32 px: a linha fica a 15 px do topo).
const listaProgresso = css({
  position: "relative",
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  _before: {
    content: '""',
    position: "absolute",
    top: "[15px]",
    left: "[calc(100% / 12)]",
    right: "[calc(100% / 12)]",
    h: "[2px]",
    bg: "borda",
  },
  _after: {
    content: '""',
    position: "absolute",
    top: "[15px]",
    left: "[calc(100% / 12)]",
    h: "[2px]",
    w: "[calc((100% - 100% / 6) * var(--progresso, 0))]",
    bg: "marca",
    transitionProperty: "width",
    transitionDuration: "gaveta",
    transitionTimingFunction: "assinatura",
  },
});

const passo = css({ position: "relative", zIndex: "[1]", display: "flex", justifyContent: "center", minW: "0" });

const botaoPasso = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "2",
  minW: "0",
  maxW: "full",
  px: "1",
  borderRadius: "md",
  color: "textoSuave",
  "&:is(button)": { cursor: "pointer", color: "escuro", _hover: { "& > span:first-child": { borderColor: "escuro" } } },
  "&[aria-disabled=true]": { cursor: "not-allowed", opacity: "[0.6]" },
  "[data-atual] > &": { color: "escuro" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const bolinhaPasso = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  w: "8",
  h: "8",
  borderRadius: "pilula",
  borderWidth: "1px",
  borderColor: "borda",
  bg: "superficie",
  fontSize: "xs",
  fontVariantNumeric: "tabular-nums",
  transitionProperty: "background-color, border-color, color, box-shadow",
  transitionDuration: "lenta",
  transitionTimingFunction: "padrao",
  "[data-concluida] &": { bg: "marca", borderColor: "marca", color: "superficie" },
  "[data-atual] &": { bg: "escuro", borderColor: "escuro", color: "fundo", boxShadow: "[0 0 0 4px token(colors.marcaSuave)]" },
});

const rotuloPasso = css({
  display: { base: "none", md: "block" },
  maxW: "full",
  fontSize: "xs",
  textAlign: "center",
  lineHeight: "texto",
  textWrap: "balance",
  "[data-atual] &": { fontWeight: "medium" },
});

const avisoRascunho = css({
  display: "flex",
  alignItems: "center",
  gap: "2",
  px: "4",
  py: "3",
  borderRadius: "md",
  bg: "fundoSutil",
  fontSize: "sm",
  lineHeight: "texto",
  color: "texto",
});

const colunaEtapa = css({ gridColumn: { base: "1 / -1", desktop: "1 / span 7" }, minW: "0" });

// Entrada da etapa nova pelo lado em que se anda (avançar: da direita; voltar: da esquerda).
const entradaEtapa = css({
  animation: "entrarEtapa",
  "&[data-direcao=voltar]": { animation: "voltarEtapa" },
});

const etapaSecao = css({ minW: "0", scrollMarginTop: "24" });

const corpoEtapa = css({ display: "grid", gap: { base: "6", desktop: "8" }, mt: "6" });

const tituloEtapa = css({
  fontSize: "subtitulo",
  fontWeight: "normal",
  lineHeight: "bloco",
  letterSpacing: "bloco",
  color: "escuro",
  _focus: { outline: "none" },
});

const navegacaoDesktop = css({
  display: { base: "none", desktop: "flex" },
  alignItems: "center",
  justifyContent: "space-between",
  gap: "4",
  mt: "10",
  pt: "6",
  borderTopWidth: "1px",
  borderColor: "borda",
});

const botaoVoltar = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "2",
  minH: "12",
  px: "5",
  borderRadius: "pilula",
  borderWidth: "1px",
  borderColor: "escuro",
  fontSize: "md",
  color: "escuro",
  cursor: "pointer",
  transitionProperty: "background-color",
  transitionDuration: "normal",
  _hover: { bg: "fundoSutil" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const botaoContinuar = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "2",
  minH: "12",
  px: "6",
  borderRadius: "pilula",
  bg: "escuro",
  fontSize: "md",
  fontWeight: "medium",
  color: "fundo",
  cursor: "pointer",
  transitionProperty: "background-color",
  transitionDuration: "normal",
  _hover: { bg: "texto", "& svg": { transform: "translateX(3px)" } },
  "& svg": { transitionProperty: "transform", transitionDuration: "normal" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

// Botões de 44 em 3 colunas iguais (tema, tamanho do berço).
const tresColunas = css({ clear: "both", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "3", pt: "3" });
const duasColunas = css({ clear: "both", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "3", pt: "3" });

const cabecalhoGrupo = css({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "3", pb: "3", borderBottomWidth: "1px", borderColor: "escuro" });

const listaModulos = css({ display: "grid", gap: "3", mt: "5" });

// Card do módulo: foto 5:6 (104 no celular, 140 no desktop) e o conteúdo, de cantos retos como os cards
// de produto. Sobe de leve no hover; incluído ganha a borda sálvia e o fundo de linho.
const cartaoModulo = css({
  display: "grid",
  gridTemplateColumns: { base: "[104px minmax(0, 1fr)]", md: "[140px minmax(0, 1fr)]" },
  columnGap: { base: "3", md: "5" },
  p: { base: "3", md: "4" },
  borderWidth: "1px",
  borderColor: "borda",
  bg: "superficie",
  transitionProperty: "background-color, border-color, box-shadow, transform",
  transitionDuration: "lenta",
  transitionTimingFunction: "padrao",
  _hover: { borderColor: "contornoAmostra", boxShadow: "suave", transform: "translateY(-2px)" },
  "&[data-incluido]": { borderColor: "marca", bg: "linho", boxShadow: "[inset 0 0 0 1px token(colors.marca)]" },
  _motionReduce: { _hover: { transform: "none" } },
});

const seloIncluido = css({
  position: "absolute",
  top: "2",
  left: "2",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  w: "7",
  h: "7",
  borderRadius: "pilula",
  bg: "marca",
  color: "superficie",
  boxShadow: "suave",
  animation: "saltar",
});

const caixaPeca = css({ display: "grid", gap: "1", px: "3", py: "2.5", borderRadius: "md", bg: "superficie", borderWidth: "1px", borderColor: "marca" });

// Opção do módulo: pílula de 36 (sugerida = a padrão de um módulo ainda fora, com contorno mais forte).
const chip = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1.5",
  minH: "9",
  px: "3",
  borderRadius: "pilula",
  borderWidth: "1px",
  borderColor: "borda",
  bg: "superficie",
  fontSize: "sm",
  color: "escuro",
  cursor: "pointer",
  transitionProperty: "border-color, background-color, color, transform",
  transitionDuration: "normal",
  transitionTimingFunction: "assinatura",
  _hover: { borderColor: "escuro" },
  _active: { transform: "scale(0.97)" },
  "&[data-sugerida]": { borderColor: "contornoAmostra" },
  "&[aria-pressed=true]": { borderColor: "escuro", bg: "escuro", color: "fundo" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const botaoIncluir = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "2",
  minH: "11",
  px: "5",
  borderRadius: "pilula",
  borderWidth: "1px",
  borderColor: "escuro",
  bg: "transparent",
  fontSize: "sm",
  fontWeight: "medium",
  color: "escuro",
  cursor: "pointer",
  transitionProperty: "background-color, color, transform",
  transitionDuration: "normal",
  transitionTimingFunction: "assinatura",
  _hover: { bg: "fundoSutil" },
  _active: { transform: "scale(0.98)" },
  "&[aria-pressed=true]": { bg: "escuro", color: "fundo", _hover: { bg: "texto" } },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const linkParecidas = css({ display: "inline-flex", alignItems: "center", gap: "1.5", fontSize: "xs" });

const campoTexto = css({
  w: "full",
  h: "12",
  px: "4",
  borderRadius: "campo",
  borderWidth: "1px",
  borderColor: "borda",
  bg: "superficie",
  fontSize: "md",
  color: "escuro",
  _hover: { borderColor: "escuro" },
  _focusVisible: { outline: "none", borderColor: "escuro", boxShadow: "anelFoco" },
  "&[aria-invalid=true]": { borderColor: "erro" },
});

const blocoResumo = css({ px: { base: "4", md: "5" }, py: "4", borderRadius: "lg", borderWidth: "1px", borderColor: "borda", bg: "superficie" });

const resumo = css({
  gridColumn: { base: "1 / -1", desktop: "9 / span 4" },
  position: { desktop: "sticky" },
  top: { desktop: "[calc(token(sizes.topoCabecalho) + token(spacing.6))]" },
  alignSelf: "start",
  minW: "0",
  p: { base: "4", desktop: "5" },
  borderRadius: "bloco",
  bg: "fundoProduto",
  scrollMarginTop: "24",
});

const tituloResumo = css({ fontSize: "subtitulo", fontWeight: "normal", lineHeight: "bloco", letterSpacing: "bloco", color: "escuro" });

const linhaResumo = css({ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "3" });

const caixaPendencias = css({ px: "4", py: "3", borderRadius: "md", bg: "alertaSuave", fontSize: "sm", lineHeight: "texto" });

// Celular e tablet: barra fixa com "Voltar", a etapa, o total e "Continuar".
const barraCelular = css({
  position: "fixed",
  insetX: "0",
  bottom: "0",
  zIndex: "barraSacola",
  display: { base: "flex", desktop: "none" },
  alignItems: "center",
  gap: "3",
  px: "3",
  pt: "3",
  pb: "[calc(12px + env(safe-area-inset-bottom))]",
  bg: "fundo",
  borderTopWidth: "1px",
  borderColor: "borda",
  animation: "subirFolha",
});

const botaoVoltarCelular = css({
  flexShrink: "0",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  w: "12",
  h: "12",
  borderRadius: "pilula",
  borderWidth: "1px",
  borderColor: "escuro",
  color: "escuro",
  cursor: "pointer",
  _disabled: { borderColor: "borda", color: "desabilitado", cursor: "default" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});
