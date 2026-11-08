"use client";

import Link from "next/link";
import { useState } from "react";
import { css, cx } from "styled-system/css";
import { CaretDown, FunnelSimple, MagnifyingGlass, X } from "@/loja/componentes/icones";
import { botaoSecundario } from "@/loja/componentes/inicio/estilos";
import { Gaveta } from "@/loja/componentes/layout/cabecalho/Gaveta";
import { Estrelas } from "./Estrelas";
import { revelarAoRolar } from "./movimento";

const ORDENS = ["Mais recentes", "Maior nota", "Menor nota", "Mais úteis"] as const;

// Avaliações (lululemon-pdp.md §1.6 item 10 e §6): título de 64, nota com estrelas e total, busca em
// pílula à direita; à esquerda (~270) os filtros em sanfona (linhas de 68 com divisória e seta) e à
// direita a lista. NUNCA há avaliação inventada: sem avaliações, a lista mostra o estado vazio dentro
// da mesma estrutura. Celular: tudo empilhado, busca + botão redondo de filtro (os filtros abrem em gaveta).
export function Avaliacoes({
  avaliacoes,
  tamanhos,
}: {
  avaliacoes: { nota: number; total: number } | null;
  tamanhos?: { titulo: string; opcoes: string[] };
}) {
  const [termo, setTermo] = useState("");
  const [gaveta, setGaveta] = useState(false);
  const total = avaliacoes?.total ?? 0;

  const filtros = <Filtros total={total} tamanhos={tamanhos} />;

  return (
    <section id="avaliacoes" aria-labelledby="titulo-avaliacoes" className={cx(secao, revelarAoRolar)}>
      <div className={topo}>
        <div>
          <h2 id="titulo-avaliacoes" className={tituloAvaliacoes}>
            Avaliações
          </h2>
          <div className={css({ display: "flex", alignItems: "center", gap: "3", mt: "4" })}>
            {avaliacoes && <span className={css({ fontSize: { base: "subtitulo", desktop: "bloco" }, lineHeight: "none", color: "escuro" })}>{avaliacoes.nota.toFixed(1).replace(".", ",")}</span>}
            <Estrelas nota={avaliacoes?.nota ?? 0} tamanho={20} />
            <span className={css({ fontSize: "sm", color: "textoSuave" })}>({total})</span>
          </div>
        </div>
        <div className={linhaBusca}>
          <label className={busca}>
            <MagnifyingGlass size={18} aria-hidden className={css({ flexShrink: "0", color: "textoSuave" })} />
            <span className={css({ srOnly: true })}>Buscar nas avaliações</span>
            <input type="search" value={termo} onChange={(evento) => setTermo(evento.target.value)} placeholder="Buscar avaliações" className={campo} />
          </label>
          <button type="button" aria-haspopup="dialog" aria-label="Filtrar avaliações" onClick={() => setGaveta(true)} className={botaoFiltro}>
            <FunnelSimple size={18} aria-hidden />
          </button>
        </div>
      </div>

      <div className={corpo}>
        <aside aria-label="Filtros das avaliações" className={lateral}>
          {filtros}
        </aside>
        <div className={lista} aria-live="polite">
          <div className={vazio}>
            <p className={css({ fontSize: { base: "destaque", desktop: "subtitulo" }, lineHeight: "subtitulo", color: "escuro" })}>
              {termo.trim() ? `Nenhuma avaliação com “${termo.trim()}”.` : total === 0 ? "Esta peça ainda não tem avaliações." : "As avaliações aparecem aqui."}
            </p>
            <p className={css({ mt: "2", fontSize: "md", lineHeight: "texto", color: "texto" })}>
              Comprou? Conte como ficou no quartinho: a avaliação é feita pelo seu pedido.
            </p>
            <Link href="/conta/pedidos" className={cx(botaoSecundario, css({ mt: "6" }))}>
              Avaliar pelo meu pedido
            </Link>
          </div>
          <p className={css({ mt: "8", fontSize: "sm", color: "textoSuave", textAlign: { base: "center", desktop: "left" } })}>
            Mostrando 0 de {total}
          </p>
        </div>
      </div>

      <Gaveta aberta={gaveta} aoFechar={() => setGaveta(false)} rotulo="Filtrar avaliações" largura="busca">
        <div className={css({ display: "flex", alignItems: "center", justifyContent: "space-between", px: "4", pt: "4" })}>
          <p className={css({ fontSize: "subtitulo", color: "escuro" })}>Filtros</p>
          <button type="button" data-autofoco aria-label="Fechar filtros" onClick={() => setGaveta(false)} className={botaoFiltro}>
            <X size={16} aria-hidden />
          </button>
        </div>
        <div className={css({ px: "4", pb: "8" })}>{filtros}</div>
      </Gaveta>
    </section>
  );
}

function Filtros({ total, tamanhos }: { total: number; tamanhos?: { titulo: string; opcoes: string[] } }) {
  return (
    <div>
      <details className={sanfona}>
        <summary className={linhaSanfona}>
          Ordenar por
          <CaretDown size={16} aria-hidden className={seta} />
        </summary>
        <div className={opcoes}>
          {ORDENS.map((ordem, indice) => (
            <label key={ordem} className={opcao}>
              <input type="radio" name="ordem-avaliacoes" defaultChecked={indice === 0} className={caixa} />
              {ordem}
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
          {[5, 4, 3, 2, 1].map((nota) => (
            <label key={nota} className={opcao}>
              <input type="checkbox" disabled={total === 0} className={caixa} />
              <Estrelas nota={nota} tamanho={14} />
              <span className={css({ ml: "auto", color: "textoSuave" })}>0</span>
            </label>
          ))}
        </div>
      </details>
      <details className={sanfona}>
        <summary className={linhaSanfona}>
          Com fotos
          <CaretDown size={16} aria-hidden className={seta} />
        </summary>
        <div className={opcoes}>
          <label className={opcao}>
            <input type="checkbox" disabled={total === 0} className={caixa} />
            Só avaliações com fotos
            <span className={css({ ml: "auto", color: "textoSuave" })}>0</span>
          </label>
        </div>
      </details>
      {tamanhos && (
        <details className={sanfona}>
          <summary className={linhaSanfona}>
            {tamanhos.titulo}
            <CaretDown size={16} aria-hidden className={seta} />
          </summary>
          <div className={opcoes}>
            {tamanhos.opcoes.map((rotulo) => (
              <label key={rotulo} className={opcao}>
                <input type="checkbox" disabled={total === 0} className={caixa} />
                {rotulo}
                <span className={css({ ml: "auto", color: "textoSuave" })}>0</span>
              </label>
            ))}
          </div>
        </details>
      )}
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

const busca = css({
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

const lista = css({ borderTopWidth: "1px", borderColor: "borda", pt: "8" });

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
