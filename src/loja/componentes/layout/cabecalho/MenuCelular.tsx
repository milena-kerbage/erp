"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import { ArrowLeft, List, X } from "@/loja/componentes/icones";
import { Midia } from "@/loja/componentes/inicio/Midia";
import { EMPRESA } from "@/loja/lib/empresa";
import { DURACAO_GAVETA, esperarTransicao, Gaveta, useGaveta } from "./Gaveta";
import type { CardMenu, ColunaMenu, ItemMenu } from "./menu";
import { LINKS_UTILITARIOS, type LinkUtilitario } from "./navegacao";

// Menu do celular e do tablet (lululemon-referencia.md §2.2 a §2.4): gaveta de tela cheia pela
// direita. Nível 1: categorias em 28 px, sem divisórias, o link da Edição do mês e, no pé, os links de
// conta e atendimento em 18 px cinza. Tocar numa categoria empilha o nível 2 (outra gaveta que entra
// pela direita em 500 ms, sem véu), com "voltar" e o rótulo do nível anterior: a grade de cards 5:6
// (2×N, 8 entre colunas e 24 entre linhas) e, abaixo, os subgrupos que abrem o nível 3 e os links.
// "Voltar" fecha só o nível atual (desliza para fora); "fechar" fecha tudo. Só o nível do topo fica
// acessível (os de baixo ficam inertes) e o foco acompanha: entra no "voltar" do novo nível e, ao
// voltar, retorna ao item que abriu o nível.

type Nivel = { id: number; item: ItemMenu; coluna?: ColunaMenu };

export function MenuCelular({ itens, links }: { itens: ItemMenu[]; links: LinkUtilitario[] }) {
  const { aberta, abrir, fechar } = useGaveta();
  const [pilha, setPilha] = useState<Nivel[]>([]);
  const [saindo, setSaindo] = useState<number | null>(null); // id do nível que está saindo
  const proximoId = useRef(1);
  const origens = useRef(new Map<number, HTMLElement>()); // botão que abriu cada nível
  const focoPendente = useRef<HTMLElement | null>(null);

  // Ao fechar a gaveta, a pilha zera depois da animação de saída.
  useEffect(() => {
    if (aberta) return;
    const tempo = window.setTimeout(() => {
      setPilha([]);
      setSaindo(null);
      origens.current.clear();
    }, DURACAO_GAVETA + 150);
    return () => window.clearTimeout(tempo);
  }, [aberta]);

  function empilhar(nivel: Omit<Nivel, "id">, origem: HTMLElement) {
    const id = proximoId.current++;
    origens.current.set(id, origem);
    setPilha((atual) => [...atual, { ...nivel, id }]);
  }

  // O nível do topo desliza para fora; quando termina, sai da pilha e o foco volta à origem.
  function voltar(id: number, elemento: HTMLElement) {
    if (saindo !== null) return;
    setSaindo(id);
    esperarTransicao(elemento, DURACAO_GAVETA, () => {
      focoPendente.current = origens.current.get(id) ?? null;
      origens.current.delete(id);
      setPilha((atual) => atual.filter((nivel) => nivel.id !== id));
      setSaindo(null);
    });
  }

  // O foco volta ao item que abriu o nível só depois do re-render: até lá o nível de baixo está inerte.
  useEffect(() => {
    const alvo = focoPendente.current;
    focoPendente.current = null;
    alvo?.focus({ preventScroll: true });
  }, [pilha]);

  const topo = pilha.length ? pilha[pilha.length - 1].id : 0;

  return (
    <>
      <button type="button" aria-label="Menu" aria-haspopup="dialog" onClick={abrir} className={hamburguer}>
        <List size={24} aria-hidden />
      </button>

      <Gaveta aberta={aberta} aoFechar={fechar} rotulo="Menu" largura="tela" rolagem="interna">
        <div className={nivelEstilo} inert={topo !== 0}>
          <div className={topoNivel}>
            <Link href="/" onClick={fechar} aria-label={`${EMPRESA.nomeFantasia}, página inicial`} className={css({ display: "flex" })}>
              <Image src="/vitrine/marca/logotipo-horizontal-green.svg" alt="" width={80} height={20} className={css({ h: "5", w: "auto" })} />
            </Link>
            <BotaoFechar aoFechar={fechar} autofoco />
          </div>

          <nav aria-label="Categorias" className={css({ flex: "1", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "10" })}>
            <ul>
              {itens.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={(evento) => empilhar({ item }, evento.currentTarget)} className={itemNivel1}>
                    <span className={item.destaque ? brilho : undefined}>{item.rotulo}</span>
                  </button>
                </li>
              ))}
              <li>
                <Link href={LINKS_UTILITARIOS.edicao.href} onClick={fechar} className={itemNivel1}>
                  {LINKS_UTILITARIOS.edicao.rotulo}
                </Link>
              </li>
            </ul>

            <ul>
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={link.externo ? undefined : fechar}
                    className={linkSecundario}
                    {...(link.externo ? { target: "_blank", rel: "noopener" } : {})}
                  >
                    {link.rotulo}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {pilha.map((nivel, indice) => (
          <PainelNivel
            key={nivel.id}
            nivel={nivel}
            anterior={indice === 0 ? "Menu" : pilha[indice - 1].item.rotulo}
            topo={nivel.id === topo}
            saindo={saindo === nivel.id}
            aoVoltar={(elemento) => voltar(nivel.id, elemento)}
            aoFechar={fechar}
            aoAbrir={empilhar}
          />
        ))}
      </Gaveta>
    </>
  );
}

function PainelNivel({
  nivel,
  anterior,
  topo,
  saindo,
  aoVoltar,
  aoFechar,
  aoAbrir,
}: {
  nivel: Nivel;
  anterior: string;
  topo: boolean;
  saindo: boolean;
  aoVoltar: (elemento: HTMLElement) => void;
  aoFechar: () => void;
  aoAbrir: (nivel: Omit<Nivel, "id">, origem: HTMLElement) => void;
}) {
  const painel = useRef<HTMLDivElement>(null);

  // Entra pela direita: o estado inicial (fora da tela) é calculado antes de marcar "aberto", direto no
  // DOM, para a transição sempre rodar. O foco vai para o "voltar" do novo nível.
  useLayoutEffect(() => {
    const elemento = painel.current;
    if (!elemento) return;
    void elemento.offsetWidth;
    elemento.dataset.estado = "aberto";
    elemento.querySelector<HTMLElement>("[data-voltar]")?.focus({ preventScroll: true });
  }, []);

  useLayoutEffect(() => {
    const elemento = painel.current;
    if (elemento && saindo) elemento.dataset.estado = "saindo";
  }, [saindo]);

  const { item, coluna } = nivel;
  const conteudo = item.painel;

  return (
    <div ref={painel} className={cx(nivelEstilo, empilhado)} inert={!topo || saindo}>
      <div className={topoNivel}>
        <button type="button" data-voltar onClick={() => painel.current && aoVoltar(painel.current)} className={voltarBotao}>
          <span className={controleRedondo}>
            <ArrowLeft size={24} aria-hidden />
          </span>
          <span className={css({ fontSize: "md", fontWeight: "medium", color: "escuro" })}>{anterior}</span>
        </button>
        <BotaoFechar aoFechar={aoFechar} />
      </div>

      {coluna ? (
        // Nível 3: título (link da coluna) e a lista em 18/500 escuro.
        <div>
          <Link href={coluna.href} onClick={aoFechar} className={tituloNivel}>
            {coluna.titulo}
          </Link>
          <ul className={css({ mt: "4" })}>
            {coluna.links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} onClick={aoFechar} className={linkForte}>
                  {link.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div>
          {item.soBotao ? (
            <p className={tituloNivel}>{item.rotulo}</p>
          ) : (
            <Link href={item.href} onClick={aoFechar} className={tituloNivel}>
              {item.rotulo}
            </Link>
          )}

          <GradeCards cards={conteudo.cards} aoNavegar={aoFechar} />

          {conteudo.tipo === "colunas" && (
            <>
              {/* Subgrupos que abrem o nível 3 (18/500 escuro). */}
              <ul className={css({ mt: "6" })}>
                {conteudo.colunas.map((sub) => (
                  <li key={sub.titulo}>
                    <button type="button" onClick={(evento) => aoAbrir({ item, coluna: sub }, evento.currentTarget)} className={linkForte}>
                      {sub.titulo}
                    </button>
                  </li>
                ))}
              </ul>
              {/* Links diretos (18/400 cinza). */}
              <ul className={css({ mt: "6" })}>
                {[...conteudo.destaques, ...conteudo.secundarios].map((link) => (
                  <li key={link.rotulo}>
                    <a
                      href={link.href}
                      onClick={link.externo ? undefined : aoFechar}
                      className={linkSecundario}
                      {...(link.externo ? { target: "_blank", rel: "noopener" } : {})}
                    >
                      {link.rotulo}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Grade de cards 5:6 do nível 2: 2 colunas, 8 entre colunas e 24 entre linhas, legenda 18/500.
function GradeCards({ cards, aoNavegar }: { cards: CardMenu[]; aoNavegar: () => void }) {
  if (!cards.length) return null;
  return (
    <ul className={css({ display: "grid", gridTemplateColumns: "[repeat(2, minmax(0, 1fr))]", columnGap: "2", rowGap: "6", mt: "4" })}>
      {cards.map((card) => (
        <li key={card.href}>
          <Link href={card.href} onClick={aoNavegar} className={cx("group", cardLink)}>
            <Midia src={card.src} tom={card.tom} icone={card.icone} zoom sizes="50vw" className={css({ aspectRatio: "[5 / 6]" })} />
            <span className={css({ display: "block", pt: "4", fontSize: "lg", fontWeight: "medium", lineHeight: "texto", color: "escuro" })}>
              {card.rotulo}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// `autofoco`: recebe o foco quando a gaveta abre (Gaveta.tsx procura data-autofoco).
function BotaoFechar({ aoFechar, autofoco = false }: { aoFechar: () => void; autofoco?: boolean }) {
  return (
    <button type="button" aria-label="Fechar" data-autofoco={autofoco || undefined} onClick={aoFechar} className={controleRedondo}>
      <X size={16} aria-hidden />
    </button>
  );
}

const hamburguer = css({
  display: { base: "inline-flex", desktop: "none" },
  alignItems: "center",
  justifyContent: "center",
  w: "12",
  h: "12",
  color: "escuro",
  cursor: "pointer",
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

// Cada nível ocupa a gaveta inteira e rola por conta própria (só na vertical, sem encadear na
// página): 12 de respiro lateral, 24 entre os blocos, 40 no pé.
const nivelEstilo = css({
  position: "absolute",
  inset: "0",
  display: "flex",
  flexDirection: "column",
  gap: "6",
  px: "3",
  pb: "10",
  bg: "superficie",
  overflowX: "hidden",
  overflowY: "auto",
  overscrollBehavior: "contain",
});

// Níveis 2 e 3: gavetas empilhadas por cima, entrando pela direita em 500 ms (ease-out) e saindo no
// inverso (ease-in), sem véu.
const empilhado = css({
  transform: "translateX(100%)",
  transitionProperty: "transform",
  transitionDuration: "gaveta",
  transitionTimingFunction: "saida",
  "&[data-estado=aberto]": { transform: "none", transitionTimingFunction: "entrada" },
  "&[data-estado=saindo]": { transform: "translateX(100%)", transitionTimingFunction: "saida" },
});

// Cabeçalho de 64 px (24 em cima): logo ou "voltar" à esquerda, fechar à direita.
const topoNivel = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexShrink: "0",
  h: "16",
  pt: "6",
});

const controleRedondo = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: "0",
  w: "10",
  h: "10",
  borderRadius: "pilula",
  bg: "vidroCabecalho",
  color: "escuro",
  cursor: "pointer",
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const voltarBotao = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "2",
  cursor: "pointer",
  _focusVisible: { outline: "none", "& > span:first-child": { boxShadow: "anelFoco" } },
});

// Nível 1: 28/33.6, peso 400, 44 por linha, sem divisórias nem setas.
const itemNivel1 = css({
  display: "flex",
  alignItems: "center",
  w: "full",
  minH: "11",
  py: "1",
  textAlign: "left",
  fontSize: "subtitulo",
  fontWeight: "normal",
  lineHeight: "bloco",
  color: "escuro",
  cursor: "pointer",
  _focusVisible: { outline: "none", textDecoration: "underline", textUnderlineOffset: "[6px]" },
});

const tituloNivel = css({
  display: "flex",
  alignItems: "center",
  minH: "11",
  fontSize: "subtitulo",
  fontWeight: "normal",
  lineHeight: "bloco",
  color: "escuro",
  _focusVisible: { outline: "none", textDecoration: "underline", textUnderlineOffset: "[6px]" },
});

const cardLink = css({ display: "block", _focusVisible: { outline: "none", boxShadow: "anelFoco" } });

// 18/25.2, peso 500, escuro, 44 por linha (subgrupos do nível 2 e lista do nível 3).
const linkForte = css({
  display: "flex",
  alignItems: "center",
  w: "full",
  minH: "11",
  py: "2",
  textAlign: "left",
  fontSize: "lg",
  fontWeight: "medium",
  lineHeight: "texto",
  color: "escuro",
  cursor: "pointer",
  _focusVisible: { outline: "none", textDecoration: "underline", textUnderlineOffset: "[4px]" },
});

// 18/25.2, peso 400, cinza, 44 por linha (links diretos e pé da gaveta).
const linkSecundario = css({
  display: "flex",
  alignItems: "center",
  minH: "11",
  py: "1",
  fontSize: "lg",
  lineHeight: "texto",
  color: "textoSuave",
  _hover: { color: "escuro" },
  _focusVisible: { outline: "none", textDecoration: "underline", textUnderlineOffset: "[4px]" },
});

// Texto com brilho (item de destaque), igual ao do desktop.
const brilho = css({
  bgImage: "[linear-gradient(45deg, token(colors.marca) 0%, token(colors.promocao) 50%, token(colors.marca) 100%)]",
  bgSize: "[304% 100%]",
  backgroundClip: "text",
  color: "transparent",
  animation: "brilhoDestaque",
  _motionReduce: { animation: "[none]", color: "marca" },
});
