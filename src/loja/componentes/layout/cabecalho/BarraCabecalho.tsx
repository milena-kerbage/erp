"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import { CaretDown, User } from "@/loja/componentes/icones";
import { EMPRESA } from "@/loja/lib/empresa";
import { GavetaBusca } from "./GavetaBusca";
import { PainelMegaMenu } from "./MegaMenu";
import { MenuCelular } from "./MenuCelular";
import type { ItemMenu } from "./menu";
import { LINKS_UTILITARIOS, type LinkUtilitario } from "./navegacao";
import { SacolaCabecalho } from "./SacolaCabecalho";

// Cabeçalho da loja no modelo da shop.lululemon.com (lululemon-referencia.md §1 e §2).
// Desktop (≥ 992): <header> sticky de altura 0; a pílula translúcida de 48 px (desfoque de 40 px)
// fica a 16 px do topo e a 20 px das laterais, por cima do hero, e não some ao rolar. Logo à
// esquerda, menu centralizado (14/500, sublinhado em fade de 300 ms), busca, conta e sacola à
// direita (sem seletor de região: o CEP é pedido onde importa, no frete da PDP e da sacola). O mega
// menu abre no hover sem atraso, continua a pílula (que fica opaca) e escurece a página com um véu
// de 50% em 600 ms. Esc fecha e devolve o foco ao botão de expandir do item.
// Celular e tablet (< 992): barra branca de 56 px, sticky, que some ao descer e volta ao subir
// (translateY(-100%) em 300 ms); menu em gaveta de tela cheia.
export function BarraCabecalho({
  menu,
  termos,
  servico,
  linksGaveta,
}: {
  menu: ItemMenu[];
  termos: string[];
  servico: LinkUtilitario[];
  linksGaveta: LinkUtilitario[];
}) {
  const [aberto, setAberto] = useState<string | null>(null);
  const [escondido, setEscondido] = useState(false);
  const jaAbriu = useRef(false);
  const [entrada, setEntrada] = useState(true);
  const expandir = useRef(new Map<string, HTMLButtonElement>());

  // Celular: some ao descer e volta ao subir; perto do topo acompanha a faixa promocional.
  useEffect(() => {
    let ultimo = window.scrollY;
    let quadro = 0;
    const desktop = window.matchMedia("(min-width: 62rem)");
    const medir = () => {
      quadro = 0;
      const y = window.scrollY;
      // A partir de 992 a pílula nunca some (só o celular esconde a barra ao descer).
      if (desktop.matches || y <= 60) setEscondido(false);
      else if (y > ultimo + 2) setEscondido(true);
      else if (y < ultimo - 2) setEscondido(false);
      ultimo = y;
    };
    const pedir = () => {
      if (!quadro) quadro = requestAnimationFrame(medir);
    };
    window.addEventListener("scroll", pedir, { passive: true });
    return () => {
      window.removeEventListener("scroll", pedir);
      cancelAnimationFrame(quadro);
    };
  }, []);

  function abrir(id: string) {
    setAberto(id);
  }

  function fechar() {
    if (aberto && !jaAbriu.current) {
      // A entrada escalonada das colunas só roda na primeira abertura (referência §1.5).
      jaAbriu.current = true;
      setEntrada(false);
    }
    setAberto(null);
  }

  // Esc fecha o painel (aberto pelo mouse ou pelo teclado) e devolve o foco ao botão de expandir.
  const fecharRef = useRef(fechar);
  fecharRef.current = fechar;
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (evento: globalThis.KeyboardEvent) => {
      if (evento.key !== "Escape") return;
      const botao = expandir.current.get(aberto);
      fecharRef.current();
      botao?.focus();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  const itemAberto = menu.find((item) => item.id === aberto) ?? null;

  return (
    <header data-menu-aberto={aberto ? "" : undefined} data-escondido={escondido || undefined} className={cabecalho}>
      <div className={moldura}>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: hover do mega menu; o teclado usa os botões de expandir */}
        <div
          className={pilula}
          onMouseLeave={fechar}
          onBlur={(evento) => {
            if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) fechar();
          }}
        >
          <Link href="/" aria-label={`${EMPRESA.nomeFantasia}, página inicial`} className={logo}>
            <Image
              // Versão preta oficial: a verde perde contraste sobre o vidro acinzentado em cima do hero.
              src="/vitrine/marca/logotipo-horizontal-black.svg"
              alt=""
              width={96}
              height={24}
              preload
              // 24 px de altura; 20 px entre 992 e 1199, onde o menu precisa de cada pixel.
              className={css({ h: { base: "6", desktop: "5", largo: "6" }, w: "auto", maxW: "none" })}
            />
          </Link>

          <nav aria-label="Principal" className={navegacao}>
            <ul className={css({ display: "flex", justifyContent: "center", alignItems: "center" })}>
              {menu.map((item) => {
                const ativo = aberto === item.id;
                const rotulo = <span className={cx(rotuloItem, item.destaque && brilho)}>{item.rotulo}</span>;
                return (
                  <li key={item.id} className={css({ display: "flex", alignItems: "center" })} onMouseEnter={() => abrir(item.id)}>
                    {item.soBotao ? (
                      <button
                        type="button"
                        aria-expanded={ativo}
                        aria-controls={`painel-${item.id}`}
                        data-ativo={ativo || undefined}
                        onClick={() => (ativo ? fechar() : abrir(item.id))}
                        className={linkItem}
                      >
                        {rotulo}
                      </button>
                    ) : (
                      <Link href={item.href} data-ativo={ativo || undefined} onClick={fechar} className={linkItem}>
                        {rotulo}
                      </Link>
                    )}
                    <button
                      type="button"
                      ref={(elemento) => {
                        if (elemento) expandir.current.set(item.id, elemento);
                        else expandir.current.delete(item.id);
                      }}
                      aria-expanded={ativo}
                      aria-controls={`painel-${item.id}`}
                      aria-label={`${ativo ? "Fechar" : "Abrir"} ${item.rotulo}`}
                      onClick={() => (ativo ? fechar() : abrir(item.id))}
                      className={botaoExpandir}
                    >
                      <CaretDown size={12} aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className={utilidades}>
            <GavetaBusca termos={termos} />
            <Link href={LINKS_UTILITARIOS.entrar.href} aria-label="Entrar na sua conta" className={conta}>
              <User size={16} aria-hidden />
            </Link>
            <SacolaCabecalho />
            <MenuCelular itens={menu} links={linksGaveta} />
          </div>

          {itemAberto && (
            <PainelMegaMenu
              key={entrada ? itemAberto.id : "painel"}
              item={itemAberto}
              id={`painel-${itemAberto.id}`}
              servico={servico}
              entrada={entrada}
              aoNavegar={fechar}
            />
          )}
        </div>
      </div>
    </header>
  );
}

// <header>: sticky no topo. Desktop: altura 0 (a pílula transborda por cima do hero). Celular: barra
// branca de 56 px (4 + 48 + 4) que sobe ao descer a página.
// O véu do mega menu é o ::after do header (fixo, tela inteira, sem capturar o mouse). Ele existe em
// toda largura, mas só aparece com data-menu-aberto, que só o mega menu (desktop) liga.
const cabecalho = css({
  position: "sticky",
  top: "0",
  zIndex: "cabecalho",
  h: { base: "cabecalhoCelular", desktop: "0" },
  py: { base: "1", desktop: "0" },
  bg: { base: "fundo", desktop: "transparent" },
  transition: "transform",
  transitionDuration: "sublinhado",
  transitionTimingFunction: "assinatura",
  // Sem condição de tela aninhada aqui: o Panda gera a classe e a regra com a ordem das condições
  // trocada (desktop:[&…] × [&…]:desktop) e a regra não casa. Quem limita ao celular é o JavaScript.
  "&[data-escondido]": { transform: "translateY(-100%)" },
  _after: {
    content: '""',
    position: "fixed",
    inset: "0",
    zIndex: "[-1]",
    bg: "veuMenu",
    opacity: "0",
    pointerEvents: "none",
    transitionProperty: "opacity",
    transitionDuration: "veuMenu",
    transitionTimingFunction: "assinatura",
  },
  "&[data-menu-aberto]::after": { opacity: "1" },
});

// Desktop: 16 em cima e 20 nas laterais (a pílula fica com 100% − 40).
const moldura = css({ pt: { desktop: "4" }, px: { desktop: "5" } });

// Desktop: grade auto | 1fr | auto, 48 px, cantos de 8 px, translúcida com desfoque de 40 px; opaca
// e com os cantos de baixo retos quando o mega menu abre. Celular: barra de 48 px de ponta a ponta.
const pilula = css({
  position: "relative",
  display: { base: "flex", desktop: "grid" },
  justifyContent: "space-between",
  gridTemplateColumns: "[auto 1fr auto]",
  columnGap: { desktop: "0", largo: "5" },
  alignItems: "center",
  h: "12",
  minH: { desktop: "11" },
  px: { desktop: "2" },
  py: { desktop: "1" },
  borderRadius: { desktop: "md" },
  bg: { desktop: "vidroCabecalho" },
  backdropFilter: { desktop: "auto" },
  backdropBlur: { desktop: "2xl" },
  transitionProperty: "background-color",
  transitionDuration: "normal",
  transitionTimingFunction: "assinatura",
  "[data-menu-aberto] &": { bg: "superficie", backdropFilter: "none", borderBottomRadius: "[0]" },
});

// Logo com 12 de respiro (8 em cima e embaixo no desktop, para caber nos 40 px úteis da pílula).
const logo = css({
  display: "flex",
  alignItems: "center",
  px: "3",
  py: { base: "3", desktop: "2" },
  borderRadius: "md",
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const navegacao = css({ display: { base: "none", desktop: "block" }, minW: "0" });

// Item do menu: 14/19.6, peso 500, 0 6 px (992–1199) ou 0 12 px (≥ 1200) de respiro.
const linkItem = css({
  display: "inline-flex",
  alignItems: "center",
  h: "10",
  px: { desktop: "1.5", largo: "3" },
  fontSize: "sm",
  fontWeight: "medium",
  lineHeight: "texto",
  color: "escuro",
  whiteSpace: "nowrap",
  cursor: "pointer",
  _focusVisible: { outline: "none", "& > span": { boxShadow: "anelFoco", borderRadius: "xs" } },
});

// Sublinhado: ::after de 1 px, 4 px abaixo do texto, na largura do texto; só a opacidade anima.
const rotuloItem = css({
  position: "relative",
  display: "inline-block",
  transform: "translateY(1px)",
  _after: {
    content: '""',
    position: "absolute",
    left: "0",
    right: "0",
    bottom: "[-4px]",
    h: "[1px]",
    bg: "textoSuave",
    opacity: "0",
    transitionProperty: "opacity",
    transitionDuration: "sublinhado",
    transitionTimingFunction: "assinatura",
  },
  "a:hover > &": { _after: { opacity: "1" } },
  "button:hover > &": { _after: { opacity: "1" } },
  "[data-ativo] > &": { _after: { opacity: "1" } },
});

// Item de destaque (Pronta entrega): gradiente animado no texto, 7 s, 3 vezes e para. Os tons
// (sálvia → terracota → sálvia) mantêm contraste sobre a pílula clara em todo o percurso.
const brilho = css({
  bgImage: "[linear-gradient(45deg, token(colors.marca) 0%, token(colors.promocao) 50%, token(colors.marca) 100%)]",
  bgSize: "[304% 100%]",
  backgroundClip: "text",
  color: "transparent",
  animation: "brilhoDestaque",
  _motionReduce: { animation: "[none]", color: "marca" },
});

// Botão de expandir (16×16) colado ao rótulo: invisível até receber foco pelo teclado.
const botaoExpandir = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  w: "4",
  h: "4",
  ml: "[-9px]",
  borderRadius: "pilula",
  color: "escuro",
  opacity: "0",
  cursor: "pointer",
  "& > svg": { transition: "transform", transitionDuration: "[220ms]" },
  "&[aria-expanded=true] > svg": { transform: "rotate(180deg)" },
  _focusVisible: { opacity: "1", outline: "none", boxShadow: "anelFoco" },
});

const utilidades = css({ display: "inline-flex", alignItems: "center", justifySelf: "end", pr: { desktop: "1" } });

const conta = css({
  display: { base: "none", desktop: "inline-flex" },
  alignItems: "center",
  justifyContent: "center",
  w: "8",
  h: "8",
  borderRadius: "pilula",
  color: "escuro",
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});
