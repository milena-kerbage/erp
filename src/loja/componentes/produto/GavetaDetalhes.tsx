"use client";

import { type KeyboardEvent, useState } from "react";
import { css } from "styled-system/css";
import { CaretRight, X } from "@/loja/componentes/icones";
import { Gaveta } from "@/loja/componentes/layout/cabecalho/Gaveta";
import type { AbaDetalhes } from "./dados";

// Linhas "Detalhes ›" e "Tecido e cuidados ›" e a gaveta que elas abrem (lululemon-pdp.md §1.7 e §6):
// <dialog> pela direita com 680 px, dividido em coluna cinza de 240 (nome, abas verticais e SKU) e
// coluna branca de 440 (título de 40, seções de 28 e listas de 16). No celular, tela cheia e branca:
// nome 14/500 e fechar no topo, abas horizontais sublinhadas, título de 28 e seções de 22.
// Véu, Esc, foco preso, trava da página e animação vêm da Gaveta base; a curva é a medida na
// referência para esta gaveta: transform .5s cubic-bezier(.2,0,0,1).
export function GavetaDetalhes({ nome, sku, abas }: { nome: string; sku: string; abas: AbaDetalhes[] }) {
  const [aberta, setAberta] = useState(false);
  const [ativa, setAtiva] = useState<AbaDetalhes["chave"]>("detalhes");
  const aba = abas.find((item) => item.chave === ativa) ?? abas[0];

  function abrir(chave: AbaDetalhes["chave"]) {
    setAtiva(chave);
    setAberta(true);
  }

  function navegar(evento: KeyboardEvent<HTMLDivElement>) {
    const indice = abas.findIndex((item) => item.chave === ativa);
    const passo = ["ArrowDown", "ArrowRight"].includes(evento.key) ? 1 : ["ArrowUp", "ArrowLeft"].includes(evento.key) ? -1 : 0;
    if (!passo) return;
    evento.preventDefault();
    const proxima = abas[(indice + passo + abas.length) % abas.length];
    setAtiva(proxima.chave);
    evento.currentTarget.querySelector<HTMLElement>(`[data-aba="${proxima.chave}"]`)?.focus();
  }

  return (
    <>
      <ul className={linhas}>
        {abas.map((item) => (
          <li key={item.chave}>
            <button type="button" aria-haspopup="dialog" onClick={() => abrir(item.chave)} className={linha}>
              {item.titulo}
              <CaretRight size={14} aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      <Gaveta aberta={aberta} aoFechar={() => setAberta(false)} rotulo={`${aba.titulo}: ${nome}`} largura="tela" curva="detalhes" classePainel={larguraPainel}>
        <div className={layout}>
          <div className={lateral}>
            <p className={nomeProduto}>{nome}</p>
            <div role="tablist" aria-label="Informações do produto" tabIndex={-1} onKeyDown={navegar} className={abasEstilo}>
              {abas.map((item) => (
                <button
                  key={item.chave}
                  type="button"
                  role="tab"
                  id={`aba-${item.chave}`}
                  data-aba={item.chave}
                  aria-selected={item.chave === ativa}
                  aria-controls="painel-detalhes"
                  tabIndex={item.chave === ativa ? 0 : -1}
                  onClick={() => setAtiva(item.chave)}
                  className={abaEstilo}
                >
                  {item.titulo}
                </button>
              ))}
            </div>
            <p className={skuEstilo}>SKU · {sku}</p>
          </div>

          <div id="painel-detalhes" role="tabpanel" aria-labelledby={`aba-${aba.chave}`} className={conteudo}>
            <h2 className={tituloGaveta}>{aba.titulo}</h2>
            {aba.grupos.map((grupo) => (
              <section key={grupo.titulo} className={css({ mt: { base: "8", md: "10" } })}>
                <h3 className={tituloGrupo}>{grupo.titulo}</h3>
                <ul className={lista}>
                  {grupo.itens.map(([rotulo, valor]) => (
                    <li key={rotulo}>{rotulo.startsWith("Item ") ? valor : `${rotulo}: ${valor}`}</li>
                  ))}
                </ul>
              </section>
            ))}
            {aba.nota && <p className={nota}>{aba.nota}</p>}
          </div>

          <button type="button" data-autofoco aria-label="Fechar" onClick={() => setAberta(false)} className={fechar}>
            <X size={16} aria-hidden />
          </button>
        </div>
      </Gaveta>
    </>
  );
}

const linhas = css({ w: { base: "full", desktop: "[44.5%]" }, borderTopWidth: "1px", borderColor: "borda" });

const linha = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  w: "full",
  minH: "[60px]",
  borderBottomWidth: "1px",
  borderColor: "borda",
  fontSize: "sm",
  fontWeight: "medium",
  color: "escuro",
  textAlign: "left",
  cursor: "pointer",
  "& svg": { transition: "transform", transitionDuration: "normal", transitionTimingFunction: "assinatura" },
  _hover: { "& svg": { transform: "translateX(4px)" } },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
  _motionReduce: { _hover: { "& svg": { transform: "none" } } },
});

const larguraPainel = css({ w: { md: "gavetaDetalhes" }, maxW: { md: "full" } });

const layout = css({ position: "relative", display: "flex", flexDirection: { base: "column", md: "row" }, minH: "full", flex: "1" });

const lateral = css({
  display: "flex",
  flexDirection: "column",
  flexShrink: "0",
  w: { md: "colunaGaveta" },
  px: { base: "4", md: "6" },
  pt: { base: "5", md: "8" },
  pb: { md: "6" },
  bg: { base: "superficie", md: "fundoProduto" },
});

const nomeProduto = css({
  pr: { base: "14", md: "0" },
  fontSize: { base: "sm", md: "2xl" },
  fontWeight: { base: "medium", md: "normal" },
  lineHeight: { base: "texto", md: "subtitulo" },
  color: "escuro",
});

const abasEstilo = css({
  display: "flex",
  flexDirection: { base: "row", md: "column" },
  alignItems: "flex-start",
  gap: { base: "6", md: "4" },
  mt: { base: "6", md: "8" },
  borderBottomWidth: { base: "1px", md: "0" },
  borderColor: "borda",
  _focusVisible: { outline: "none" },
});

const abaEstilo = css({
  pb: { base: "3", md: "0" },
  fontSize: "sm",
  lineHeight: "texto",
  color: "textoSuave",
  textAlign: "left",
  cursor: "pointer",
  textDecoration: { md: "underline" },
  textUnderlineOffset: "[4px]",
  textDecorationColor: { md: "transparent" },
  borderBottomWidth: { base: "2px", md: "0" },
  borderColor: "transparent",
  mb: { base: "[-1px]", md: "0" },
  transitionProperty: "color, text-decoration-color, border-color",
  transitionDuration: "normal",
  _hover: { color: "escuro" },
  "&[aria-selected=true]": { color: "escuro", textDecorationColor: { md: "escuro" }, borderColor: { base: "escuro", md: "transparent" } },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const skuEstilo = css({ display: { base: "none", md: "block" }, mt: "auto", pt: "8", fontSize: "sm", color: "textoSuave" });

const conteudo = css({ flex: "1", minW: "0", px: { base: "4", md: "6" }, pt: { base: "6", md: "8" }, pb: "12", bg: "superficie" });

const tituloGaveta = css({
  pr: { md: "14" },
  fontSize: { base: "subtitulo", md: "bloco" },
  fontWeight: "normal",
  lineHeight: "bloco",
  letterSpacing: "bloco",
  color: "escuro",
});

const tituloGrupo = css({ fontSize: { base: "destaque", md: "subtitulo" }, fontWeight: "normal", lineHeight: "subtitulo", color: "escuro" });

const lista = css({
  display: "grid",
  gap: "3.5",
  mt: "4",
  pl: "5",
  listStyleType: "disc",
  fontSize: { base: "sm", md: "md" },
  lineHeight: "texto",
  color: "texto",
  "& li::marker": { color: "escuro" },
});

const nota = css({ mt: "10", fontSize: "sm", lineHeight: "texto", color: "textoSuave" });

const fechar = css({
  position: "absolute",
  top: { base: "3", md: "6" },
  right: { base: "3", md: "6" },
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  w: "10",
  h: "10",
  borderRadius: "pilula",
  bg: "fundoSutil",
  color: "escuro",
  cursor: "pointer",
  transitionProperty: "background-color",
  transitionDuration: "normal",
  _hover: { bg: "superficieSuave" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

