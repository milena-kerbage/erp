"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { css, cx } from "styled-system/css";
import { Midia } from "@/loja/componentes/inicio/Midia";
import type { ColunaMenu, ItemMenu, LinkMenu } from "./menu";
import type { LinkUtilitario } from "./navegacao";

// Painel do mega menu (lululemon-referencia.md §1.5): continua a pílula (mesma largura, cantos de
// baixo de 8 px), abre sem transição e segue o conteúdo até 960 px. Grade de 1.45fr + 5 colunas,
// 40 entre linhas e 32 entre colunas, 32/20/20 de respiro. Todo painel tem mídia: colunas de links
// (A) com o bloco editorial 16:9 (B) ou cards 5:6 (C) no espaço à direita, ou só cards (C).
// Na primeira abertura, as colunas entram com fade de 5 px em 300 ms, escalonadas de 100 ms.
export function PainelMegaMenu({
  item,
  id,
  servico,
  entrada,
  aoNavegar,
}: {
  item: ItemMenu;
  id: string;
  servico: LinkUtilitario[];
  entrada: boolean;
  aoNavegar: () => void;
}) {
  const { painel } = item;
  let ordem = 0;
  const atraso = (): CSSProperties | undefined => (entrada ? { animationDelay: `${++ordem * 100}ms` } : undefined);
  const classeColuna = entrada ? entrarColuna : undefined;

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: só fecha o painel depois de um clique num link
    // biome-ignore lint/a11y/noStaticElementInteractions: idem
    <div id={id} className={painelEstilo} onClick={(evento) => (evento.target as HTMLElement).closest("a") && aoNavegar()}>
      {painel.tipo === "cards" ? (
        <ul aria-label={item.rotulo} className={listaCards}>
          {painel.cards.map((card) => (
            <li key={card.href} className={classeColuna} style={atraso()}>
              <Link href={card.href} className={cx("group", css({ display: "block" }))}>
                <Midia src={card.src} tom={card.tom} icone={card.icone} zoom sizes="20vw" className={css({ aspectRatio: "[5 / 6]" })} />
                <span className={legendaCard}>{card.rotulo}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <div className={cx(css({ gridColumn: "1" }), classeColuna)} style={atraso()}>
            <ListaDestaques links={painel.destaques} />
            {painel.secundarios.length > 0 && (
              <div className={css({ mt: "6" })}>
                <ListaDestaques links={painel.secundarios} />
              </div>
            )}
          </div>
          {painel.colunas.map((coluna) => (
            <Coluna key={coluna.titulo} coluna={coluna} className={classeColuna} style={atraso()} />
          ))}
          {painel.promo ? (
            // Variante B: bloco editorial 16:9 nas 3 últimas colunas.
            <Link href={painel.promo.href} className={cx("group", promo, classeColuna)} style={atraso()}>
              <Midia
                src={painel.promo.src}
                tom={painel.promo.tom}
                icone={painel.promo.icone}
                zoom
                sizes="40vw"
                className={css({ aspectRatio: "video" })}
              />
              <span className={css({ display: "block", mt: "4", fontSize: "sm", fontWeight: "medium", lineHeight: "texto", color: "escuro" })}>
                {painel.promo.titulo}
              </span>
              <span className={css({ display: "block", mt: "2", fontSize: "sm", lineHeight: "texto", color: "textoSuave" })}>
                {painel.promo.descricao}
              </span>
            </Link>
          ) : (
            <CardsNoEspaco painel={painel} className={classeColuna} style={atraso()} />
          )}
        </>
      )}

      <ul aria-label="Atendimento" className={linhaServico}>
        {servico.map((link) => (
          <li key={link.href}>
            <a href={link.href} className={linkColuna} {...(link.externo ? { target: "_blank", rel: "noopener" } : {})}>
              {link.rotulo}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ListaDestaques({ links }: { links: LinkMenu[] }) {
  return (
    <ul>
      {links.map((link) => (
        <li key={link.rotulo} className={itemDestaque}>
          <a href={link.href} className={linkDestaque} {...(link.externo ? { target: "_blank", rel: "noopener" } : {})}>
            {link.rotulo}
          </a>
        </li>
      ))}
    </ul>
  );
}

// Variante C dentro do painel de colunas: os cards 5:6 ocupam as colunas que sobram à direita
// (o painel tem 5 colunas depois da de destaques), 12 entre eles e 32 de recuo, como o bloco editorial.
function CardsNoEspaco({
  painel,
  className,
  style,
}: {
  painel: Extract<ItemMenu["painel"], { tipo: "colunas" }>;
  className?: string;
  style?: CSSProperties;
}) {
  const usadas = painel.colunas.reduce((total, coluna) => total + (coluna.links.length > 13 ? 2 : 1), 0);
  const livres = Math.min(5 - usadas, painel.cards.length);
  if (livres <= 0) return null;
  return (
    <ul
      className={cx(cardsNoEspaco, className)}
      style={{ ...style, gridColumn: `span ${livres} / -1`, gridTemplateColumns: `repeat(${livres}, minmax(0, 1fr))` }}
    >
      {painel.cards.slice(0, livres).map((card) => (
        <li key={card.href}>
          <Link href={card.href} className={cx("group", css({ display: "block", _focusVisible: { outline: "none", boxShadow: "anelFoco" } }))}>
            <Midia src={card.src} tom={card.tom} icone={card.icone} zoom sizes="15vw" className={css({ aspectRatio: "[5 / 6]" })} />
            <span className={legendaCard}>{card.rotulo}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// Coluna de links (título 14/500 com 16 de margem; links 14/400 a 28 px por linha). Com mais de 13
// links vira um grupo de 2 colunas (o título ocupa as duas), como na referência.
function Coluna({ coluna, className, style }: { coluna: ColunaMenu; className?: string; style?: CSSProperties }) {
  const dupla = coluna.links.length > 13;
  return (
    <div className={cx(dupla && css({ gridColumn: "span 2" }), className)} style={style}>
      <Link href={coluna.href} className={tituloColuna}>
        {coluna.titulo}
      </Link>
      <ul className={dupla ? css({ columnCount: "2", columnGap: "8" }) : undefined}>
        {coluna.links.map((link) => (
          <li key={link.href} className={css({ breakInside: "avoid" })}>
            <Link href={link.href} className={linkColuna}>
              {link.rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const painelEstilo = css({
  position: "absolute",
  top: "[100%]",
  left: "0",
  right: "0",
  display: "grid",
  gridTemplateColumns: "[1.45fr repeat(5, 1fr)]",
  alignItems: "start",
  rowGap: "10",
  columnGap: "8",
  pt: "8",
  px: "5",
  pb: "5",
  // Nunca passa da tela (pílula + 16 de folga); se passar, rola por dentro sem arrastar a página.
  maxH: "[min(960px, calc(100dvh - 80px))]",
  overflowY: "auto",
  overscrollBehavior: "contain",
  zIndex: "[2]",
  bg: "superficie",
  borderBottomRadius: "md",
});

const entrarColuna = css({ animation: "entrarColuna", _motionReduce: { animation: "[none]" } });

// Coluna 1: links grandes de 18 px em cinza, ~33 px por linha (o primeiro sem respiro em cima).
const itemDestaque = css({
  py: "1",
  _first: { pt: "0" },
  _last: { pb: "0" },
});

const linkDestaque = css({
  fontSize: "lg",
  lineHeight: "texto",
  color: "textoSuave",
  transition: "colors",
  transitionDuration: "normal",
  _hover: { color: "escuro" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco", borderRadius: "xs" },
});

const tituloColuna = css({
  display: "inline-block",
  mb: "4",
  fontSize: "sm",
  fontWeight: "medium",
  lineHeight: "texto",
  color: "escuro",
  _hover: { textDecoration: "underline", textUnderlineOffset: "[4px]" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco", borderRadius: "xs" },
});

const linkColuna = css({
  display: "inline-block",
  py: "1",
  fontSize: "sm",
  lineHeight: "texto",
  color: "textoSuave",
  transition: "colors",
  transitionDuration: "normal",
  _hover: { color: "escuro" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco", borderRadius: "xs" },
});

// Bloco editorial: ocupa as 3 últimas colunas, com 32 de recuo; legenda abaixo da mídia, nunca sobre ela.
const promo = css({
  gridColumn: "[span 3 / -1]",
  ml: "8",
  display: "block",
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

// Variante C: cards 5:6 de largura igual, 12 entre eles, ocupando a linha inteira.
const listaCards = css({
  gridColumn: "[1 / -1]",
  display: "grid",
  gridTemplateColumns: "[repeat(auto-fit, minmax(120px, 1fr))]",
  gridAutoRows: "[1fr]",
  gap: "3",
});

const cardsNoEspaco = css({ display: "grid", gap: "3", ml: "8" });

const legendaCard = css({ display: "block", pt: "4", fontSize: "sm", fontWeight: "medium", lineHeight: "texto", color: "escuro" });

// Linha de serviço: canto inferior direito, 24 entre os links.
const linhaServico = css({
  gridColumn: "[1 / -1]",
  display: "flex",
  justifyContent: "flex-end",
  gap: "6",
});
