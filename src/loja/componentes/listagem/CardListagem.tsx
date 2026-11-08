"use client";

import Link from "next/link";
import { useState } from "react";
import { css, cx } from "styled-system/css";
import { ArrowLeft, ArrowRight } from "@/loja/componentes/icones";
import { BotaoFavoritar } from "@/loja/componentes/produto/BotaoFavoritar";
import { classeDaCor } from "@/loja/componentes/produto/cores";
import type { CorProduto, FotoGaleria, VarianteCor } from "@/loja/componentes/produto/dados";
import { FotoSlide } from "@/loja/componentes/produto/FotoSlide";
import { DESCONTO_PIX_PERCENTUAL } from "@/loja/lib/carrinho/totais";
import { formatarPreco } from "@/loja/lib/formatacao/moeda";

export type DadosCard = {
  slug: string;
  nome: string;
  nomeBase: string;
  nomeVariacao?: string;
  preco: string;
  selo?: string;
  cores: CorProduto[];
  fotos: FotoGaleria[];
};

const MAX_AMOSTRAS = 5;
const ROTULO_PIX = `${DESCONTO_PIX_PERCENTUAL}% OFF no Pix`;

// Card da listagem (lululemon-pdp.md §3 e §6), coerente com o card da home (mesma foto 5:6, selo em
// pílula clara no canto inferior esquerdo, amostras de 24 com anel duplo, nome 16/500): no hover a 2ª
// foto entra em crossfade, aparecem as setas em pílula (72 × 40) no canto inferior direito e a barra
// fina de progresso na base. Abaixo: bolinhas + "+N", nome com a variação em cinza e o coração, nome
// da cor e preço (e o selo "5% OFF no Pix"). Celular: sem bolinhas, "N cores" à esquerda e o preço à
// direita.
// Troca de cor (lululemon-animacoes-edicao.md §2): hover numa bolinha mostra o balão com o nome da cor;
// o clique troca, sem sair da página, as fotos do card pelas do produto-irmão, move o anel e troca o
// nome da cor, o nome, o selo, o preço e o link (que passa a abrir o irmão). Cor sem produto-irmão
// (peça feita em várias cores) só mostra o nome no balão.
export function CardListagem({ dados }: { dados: DadosCard }) {
  const [indice, setIndice] = useState(0);
  const [corEscolhida, setCorEscolhida] = useState(() => dados.cores.find((cor) => cor.atual)?.rotulo ?? dados.cores[0]?.rotulo);
  const atual: VarianteCor = dados.cores.find((cor) => cor.rotulo === corEscolhida)?.variante ?? dados;
  const total = atual.fotos.length;
  const extras = Math.max(0, dados.cores.length - MAX_AMOSTRAS);
  const rotuloCores = dados.cores.length > 1 ? `${dados.cores.length} cores` : (corEscolhida ?? "");

  function mover(passo: 1 | -1) {
    setIndice((posicao) => (posicao + passo + total) % total);
  }

  function escolher(cor: CorProduto) {
    if (!cor.variante) return;
    setCorEscolhida(cor.rotulo);
    setIndice(0);
  }

  return (
    <article
      className={cx("group", card)}
      onPointerEnter={(evento) => {
        if (evento.pointerType === "mouse" && total > 1) setIndice((posicao) => (posicao === 0 ? 1 : posicao));
      }}
      onPointerLeave={(evento) => {
        if (evento.pointerType === "mouse") setIndice(0);
      }}
    >
      <div className={midia}>
        {/* A troca de cor remonta as fotos (key), que entram com fade. */}
        <div key={atual.slug} className={conjuntoFotos}>
          {atual.fotos.map((foto, posicao) => (
            <div key={`${foto.tom}-${posicao}`} data-visivel={posicao === indice || undefined} className={camada}>
              <FotoSlide foto={foto} tingir sizes="(min-width: 992px) 33vw, (min-width: 768px) 50vw, 100vw" className={css({ w: "full", h: "full" })} />
            </div>
          ))}
        </div>
        {atual.selo && <span className={selo}>{atual.selo}</span>}
        {total > 1 && (
          <>
            {/* biome-ignore lint/a11y/useSemanticElements: grupo de dois botões em linha */}
            <div role="group" aria-label={`Fotos de ${atual.nome}`} className={setas}>
              <button type="button" aria-label="Foto anterior" onClick={() => mover(-1)}>
                <ArrowLeft size={18} aria-hidden />
              </button>
              <button type="button" aria-label="Próxima foto" onClick={() => mover(1)}>
                <ArrowRight size={18} aria-hidden />
              </button>
            </div>
            <div aria-hidden className={progresso}>
              <span className={segmento} style={{ width: `${100 / total}%`, transform: `translateX(${indice * 100}%)` }} />
            </div>
          </>
        )}
      </div>

      <div className={info}>
        {dados.cores.length > 0 && (
          <ul aria-label="Cores" className={amostras}>
            {dados.cores.slice(0, MAX_AMOSTRAS).map((cor) => (
              <li key={cor.rotulo} className={itemAmostra}>
                {cor.variante ? (
                  <button
                    type="button"
                    aria-pressed={cor.rotulo === corEscolhida}
                    aria-label={`Ver na cor ${cor.rotulo}`}
                    onClick={() => escolher(cor)}
                    className={amostra}
                  >
                    <span className={cx(miolo, classeDaCor(cor.rotulo))} />
                  </button>
                ) : (
                  <span role="img" aria-label={cor.rotulo} data-atual={cor.rotulo === corEscolhida || undefined} className={amostra}>
                    <span className={cx(miolo, classeDaCor(cor.rotulo))} />
                  </span>
                )}
                <span aria-hidden className={balao}>
                  {cor.rotulo}
                </span>
              </li>
            ))}
            {extras > 0 && <li className={css({ fontSize: "sm", color: "textoSuave" })}>+{extras}</li>}
          </ul>
        )}

        <div className={linhaNome}>
          <h3 className={nome}>
            <Link href={`/produto/${atual.slug}`} className={linkCobre}>
              {atual.nomeBase}
              {atual.nomeVariacao && <span className={css({ color: "textoSuave" })}> {atual.nomeVariacao}</span>}
            </Link>
          </h3>
          <span className={css({ position: "relative", zIndex: "[1]", flexShrink: "0" })}>
            <BotaoFavoritar slug={atual.slug} nome={atual.nome} variante="linha" />
          </span>
        </div>

        <div className={linhaPreco}>
          <span aria-live="polite" className={cx(css({ display: { base: "none", md: "inline" } }), css({ color: "texto" }))}>
            {corEscolhida}
          </span>
          <span className={css({ display: { md: "none" }, color: "texto" })}>{rotuloCores}</span>
          <span className={css({ color: "escuro", whiteSpace: "nowrap" })}>{formatarPreco(atual.preco)}</span>
        </div>
        <p className={pix}>{ROTULO_PIX}</p>
      </div>
    </article>
  );
}

const card = css({ position: "relative", h: "full", bg: "fundo" });

const midia = css({ position: "relative", aspectRatio: "[5 / 6]", overflow: "hidden", bg: "fundoProduto" });

const conjuntoFotos = css({ position: "absolute", inset: "0", animation: "aparecerFoto" });

const camada = css({
  position: "absolute",
  inset: "0",
  opacity: "0",
  transitionProperty: "opacity",
  transitionDuration: "lenta",
  transitionTimingFunction: "cruzar",
  "&[data-visivel]": { opacity: "1" },
});

const selo = css({
  position: "absolute",
  left: "3",
  bottom: "3",
  px: "2",
  py: "1",
  borderRadius: "pilula",
  bg: "controleClaro",
  fontSize: "xs",
  fontWeight: "medium",
  lineHeight: "texto",
  color: "escuro",
  pointerEvents: "none",
});

// Setas em pílula branca (72 × 40), só no hover ou no foco do card.
const setas = css({
  position: "absolute",
  right: "3",
  bottom: "3",
  zIndex: "[1]",
  display: "inline-flex",
  alignItems: "center",
  p: "1",
  borderRadius: "pilula",
  bg: "controleClaro",
  backdropFilter: "auto",
  backdropBlur: "botao",
  color: "escuro",
  opacity: "0",
  transitionProperty: "opacity",
  transitionDuration: "aparecer",
  transitionTimingFunction: "assinatura",
  "@media (hover: hover)": { _groupHover: { opacity: "1" } },
  _focusWithin: { opacity: "1" },
  "& > button": {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    w: "8",
    h: "8",
    cursor: "pointer",
    _focusVisible: { outline: "none", boxShadow: "anelFoco" },
  },
  "& > button:first-child": { borderRadius: "[1000px 0 0 1000px]" },
  "& > button:last-child": { borderRadius: "[0 1000px 1000px 0]" },
  "& > button:hover": { bg: "superficie" },
  "[data-densidade=pequena] &": { display: { base: "none", md: "inline-flex" } },
});

// Indicador fino de progresso na base da foto (qual foto aparece), visível no hover.
const progresso = css({
  position: "absolute",
  insetX: "0",
  bottom: "0",
  h: "[2px]",
  bg: "[color-mix(in srgb, token(colors.escuro) 12%, transparent)]",
  opacity: "0",
  transitionProperty: "opacity",
  transitionDuration: "aparecer",
  "@media (hover: hover)": { _groupHover: { opacity: "1" } },
  _groupFocusWithin: { opacity: "1" },
});

const segmento = css({ display: "block", h: "full", bg: "escuro", transition: "transform", transitionDuration: "aparecer", transitionTimingFunction: "assinatura" });

const info = css({
  px: { base: "3", desktop: "5" },
  pt: { base: "3", desktop: "4" },
  pb: { base: "6", desktop: "8" },
  "[data-densidade=pequena] &": { px: { base: "2", desktop: "4" }, pb: { base: "4", desktop: "6" } },
});

const amostras = css({
  position: "relative",
  zIndex: "[1]",
  display: { base: "none", md: "flex" },
  alignItems: "center",
  flexWrap: "wrap",
  gap: "2",
  mb: "3",
});

const itemAmostra = css({ position: "relative", display: "flex" });

// Mesmo desenho das amostras da home: 24 com a cor em 20; a escolhida com anel duplo (branco + escuro),
// que se move com uma transição curta.
const amostra = css({
  display: "flex",
  cursor: "pointer",
  transitionProperty: "border-color, box-shadow",
  transitionDuration: "controle",
  alignItems: "center",
  justifyContent: "center",
  w: "6",
  h: "6",
  borderRadius: "pilula",
  borderWidth: "1px",
  borderColor: "contornoAmostra",
  "&[aria-pressed=true], &[data-atual]": { borderColor: "escuro", boxShadow: "[inset 0 0 0 2px token(colors.superficie)]" },
  "&:is(span)": { cursor: "default" },
  _hover: { borderColor: "escuro" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

// Balão com o nome da cor, ACIMA da bolinha (pílula clara, borda fina, texto 14, sombra suave): no
// hover e no foco pelo teclado. A primeira bolinha alinha o balão à esquerda para não sair do card.
export const balao = css({
  position: "absolute",
  bottom: "[calc(100% + 8px)]",
  left: "[50%]",
  zIndex: "[2]",
  transform: "translateX(-50%)",
  px: "2.5",
  py: "1",
  borderRadius: "pilula",
  borderWidth: "1px",
  borderColor: "borda",
  bg: "superficie",
  boxShadow: "suave",
  fontSize: "sm",
  lineHeight: "texto",
  color: "escuro",
  whiteSpace: "nowrap",
  pointerEvents: "none",
  opacity: "0",
  transitionProperty: "opacity",
  transitionDuration: "controle",
  "li:first-child > &": { left: "0", transform: "none" },
  "@media (hover: hover)": { "li:hover > &": { opacity: "1" } },
  "li:has(:focus-visible) > &": { opacity: "1" },
});

const miolo = css({ display: "block", w: "5", h: "5", borderRadius: "pilula" });

const linhaNome = css({ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "3" });

const nome = css({
  fontSize: "md",
  fontWeight: "medium",
  lineHeight: "texto",
  color: "escuro",
  textWrap: "pretty",
  lineClamp: "2",
  "[data-densidade=pequena] &": { fontSize: { base: "xs", md: "sm" } },
});

// O link do nome cobre o card inteiro (bolinhas, coração e setas ficam por cima).
const linkCobre = css({
  _after: { content: '""', position: "absolute", inset: "0" },
  _groupHover: { textDecoration: "underline", textUnderlineOffset: "[4px]", textDecorationThickness: "1px" },
  _focusVisible: { outline: "none", _after: { boxShadow: "[inset 0 0 0 3px token(colors.foco)]" } },
});

const pix = css({ mt: "1", fontSize: "xs", lineHeight: "texto", color: "sucesso", textAlign: "right" });

const linhaPreco = css({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "3",
  mt: { base: "2", desktop: "4" },
  fontSize: "sm",
  lineHeight: "texto",
  "[data-densidade=pequena] &": { fontSize: { base: "xs", md: "sm" }, flexWrap: "wrap" },
});
