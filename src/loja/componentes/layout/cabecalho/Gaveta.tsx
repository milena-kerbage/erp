"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, type RefObject, type SyntheticEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { css, cx } from "styled-system/css";

// Base comum das gavetas e diálogos da loja (lululemon-referencia.md §1.6 e §2.2;
// lululemon-animacoes-edicao.md §1). Tudo é <dialog> nativo em showModal(): fica na camada do topo
// (acima do cabeçalho), prende o foco e deixa o resto da página inerte; o globalCss trava a rolagem
// da página (html hidden, body clip e scrollbar-gutter estável, sem o "pulo" da barra).
// - Gaveta: painel pela direita, translateX(100%) → 0 em 500 ms ease-out (a de detalhes da PDP em
//   cubic-bezier(.2,0,0,1)), véu em fade até 50% em 500 ms; a saída é o inverso (ease-in).
// - Modal: caixa central com fade-in-up de 50 px em 125 ms; sai só com fade.
// A saída sempre espera o fim da transição (transitionend, com prazo de segurança) antes de fechar o
// <dialog>. Esc e o clique no véu fecham com animação; o foco volta ao gatilho. Com
// prefers-reduced-motion, abre e fecha sem deslocamento (o globalCss zera as durações).
// Troca de página (TransicaoPagina): toda gaveta aberta começa a fechar quando o caminho muda (os
// links das gavetas já fecham no clique; isto cobre o resto) e, enquanto aberta, ganha nome próprio
// de transição (classe loja-dialogo), então fica por cima do conteúdo que troca e sai deslizando.

export const DURACAO_GAVETA = 500;
const FOLGA = 120; // prazo extra para o transitionend (aba em segundo plano não anima)

export function prefereMenosMovimento(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Espera a transição de `alvo` terminar (ou o prazo) e chama `aoTerminar`. Devolve o cancelamento.
export function esperarTransicao(alvo: HTMLElement, duracao: number, aoTerminar: () => void): () => void {
  let feito = false;
  const concluir = () => {
    if (feito) return;
    feito = true;
    alvo.removeEventListener("transitionend", aoFim);
    window.clearTimeout(tempo);
    aoTerminar();
  };
  const aoFim = (evento: TransitionEvent) => {
    if (evento.target === alvo) concluir();
  };
  alvo.addEventListener("transitionend", aoFim);
  const tempo = window.setTimeout(concluir, prefereMenosMovimento() ? 0 : duracao + FOLGA);
  return () => {
    feito = true;
    alvo.removeEventListener("transitionend", aoFim);
    window.clearTimeout(tempo);
  };
}

export function useGaveta() {
  const [aberta, setAberta] = useState(false);
  const abrir = useCallback(() => setAberta(true), []);
  const fechar = useCallback(() => setAberta(false), []);
  return { aberta, abrir, fechar };
}

// Ciclo de vida de um <dialog> animado. O estado visual fica em data-estado no próprio <dialog>
// ("aberta" | "saindo"; sem atributo = estado inicial, fora da tela), escrito direto no DOM para a
// transição de entrada sempre partir do estado inicial já calculado (sem depender do lote do React).
export function useDialogoAnimado({
  aberta,
  aoFechar,
  aoFechado,
  duracao = DURACAO_GAVETA,
}: {
  aberta: boolean;
  aoFechar: () => void; // pedido de fechar (Esc, véu): quem usa põe `aberta` em false
  aoFechado?: () => void; // depois que o <dialog> fechou de fato (fim da animação de saída)
  duracao?: number;
}): {
  dialogo: RefObject<HTMLDialogElement | null>;
  alvo: RefObject<HTMLDivElement | null>;
  montada: boolean;
  propsDialogo: { onCancel: (evento: SyntheticEvent<HTMLDialogElement>) => void; onClose: () => void };
} {
  const dialogo = useRef<HTMLDialogElement>(null);
  const alvo = useRef<HTMLDivElement>(null); // elemento cuja transição marca o fim da saída
  const gatilho = useRef<HTMLElement | null>(null);
  const abertaAtual = useRef(aberta);
  const aoFecharAtual = useRef(aoFechar);
  const aoFechadoAtual = useRef(aoFechado);
  const [montada, setMontada] = useState(false);
  const caminho = usePathname();
  const caminhoAnterior = useRef(caminho);

  useEffect(() => {
    if (caminhoAnterior.current === caminho) return;
    caminhoAnterior.current = caminho;
    if (abertaAtual.current) aoFecharAtual.current();
  }, [caminho]);

  useEffect(() => {
    abertaAtual.current = aberta;
    aoFecharAtual.current = aoFechar;
    aoFechadoAtual.current = aoFechado;
  });

  useLayoutEffect(() => {
    const elemento = dialogo.current;
    if (!elemento) return;
    if (aberta) {
      if (!elemento.open) {
        const ativo = document.activeElement;
        gatilho.current = ativo instanceof HTMLElement && ativo !== document.body ? ativo : null;
        delete elemento.dataset.estado;
        elemento.showModal();
        // Foco inicial no fechar (data-autofoco), como na referência, sem rolar nada.
        elemento.querySelector<HTMLElement>("[data-autofoco]")?.focus({ preventScroll: true });
        void elemento.offsetWidth; // calcula o estado inicial (fora da tela) antes de animar
      }
      elemento.dataset.estado = "aberta";
      setMontada(true);
      return;
    }
    if (!elemento.open) return;
    elemento.dataset.estado = "saindo";
    return esperarTransicao(alvo.current ?? elemento, duracao, () => elemento.close());
  }, [aberta, duracao]);

  const onClose = useCallback(() => {
    const elemento = dialogo.current;
    if (elemento) delete elemento.dataset.estado;
    setMontada(false);
    // Devolve o foco ao gatilho (se ele ainda existe e o foco ficou perdido no body).
    const anterior = gatilho.current;
    gatilho.current = null;
    const foco = document.activeElement;
    if (anterior?.isConnected && (!foco || foco === document.body || elemento?.contains(foco))) anterior.focus({ preventScroll: true });
    // Fechado por fora (ex.: o navegador força o fechamento no 2º Esc seguido): sincroniza o estado.
    if (abertaAtual.current) aoFecharAtual.current();
    aoFechadoAtual.current?.();
  }, []);

  const onCancel = useCallback((evento: SyntheticEvent<HTMLDialogElement>) => {
    evento.preventDefault(); // Esc fecha com a animação de saída
    aoFecharAtual.current();
  }, []);

  return { dialogo, alvo, montada, propsDialogo: { onCancel, onClose } };
}

// Gaveta modal pela direita. "busca": 440 px a partir de 768 (tela cheia no celular); "tela": sempre
// tela cheia (quem usa pode limitar a largura por classePainel). rolagem "painel": o painel rola;
// "interna": o painel recorta e o conteúdo rola por conta própria (menu com níveis, rodapé fixo).
export function Gaveta({
  aberta,
  aoFechar,
  rotulo,
  rotuloId,
  largura,
  curva = "gaveta",
  rolagem = "painel",
  children,
  classePainel,
}: {
  aberta: boolean;
  aoFechar: () => void;
  rotulo?: string;
  rotuloId?: string; // id do título visível (aria-labelledby), no lugar de `rotulo`
  largura: "busca" | "tela";
  curva?: "gaveta" | "detalhes";
  rolagem?: "painel" | "interna";
  children: ReactNode;
  classePainel?: string;
}) {
  const { dialogo, alvo, montada, propsDialogo } = useDialogoAnimado({ aberta, aoFechar });

  return (
    <dialog ref={dialogo} aria-label={rotuloId ? undefined : rotulo} aria-labelledby={rotuloId} {...propsDialogo} className={casca}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: o véu só fecha ao toque; Esc e o botão fechar cobrem o teclado */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: idem */}
      <div className={veu} onClick={aoFechar} />
      <div
        ref={alvo}
        className={cx(
          painel,
          curva === "detalhes" ? curvaDetalhes : curvaGaveta,
          rolagem === "interna" ? rolagemInterna : rolagemPainel,
          largura === "busca" ? larguraBusca : larguraTela,
          classePainel,
        )}
      >
        {(aberta || montada) && children}
      </div>
    </dialog>
  );
}

// Diálogo central (lululemon-animacoes-edicao.md §1, "fade-in-up"): caixa que sobe 50 px com fade em
// 125 ms; sai só com fade. Mesmo véu e mesmas regras de foco, Esc e rolagem das gavetas.
export function Modal({
  aberta,
  aoFechar,
  rotulo,
  rotuloId,
  children,
  classeCaixa,
}: {
  aberta: boolean;
  aoFechar: () => void;
  rotulo?: string;
  rotuloId?: string;
  children: ReactNode;
  classeCaixa?: string;
}) {
  const { dialogo, alvo, montada, propsDialogo } = useDialogoAnimado({ aberta, aoFechar, duracao: 125 });

  return (
    <dialog
      ref={dialogo}
      aria-label={rotuloId ? undefined : rotulo}
      aria-labelledby={rotuloId}
      {...propsDialogo}
      className={cx(casca, css({ _open: { display: "grid", placeItems: "center", p: "4" } }))}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: o véu só fecha ao toque; Esc cobre o teclado */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: idem */}
      <div className={veu} onClick={aoFechar} />
      <div ref={alvo} className={cx(caixaModal, classeCaixa)}>
        {(aberta || montada) && children}
      </div>
    </dialog>
  );
}

// O <dialog> cobre a viewport (100% de largura, que já desconta a barra de rolagem, e 100dvh, que
// não corta no celular), sem fundo próprio: o véu e o painel são filhos dele.
const casca = css({
  position: "fixed",
  inset: "0",
  w: "full",
  h: "dvh",
  maxW: "none",
  maxH: "none",
  m: "0",
  p: "0",
  border: "none",
  bg: "transparent",
  // clip, e não hidden: hidden ainda deixa o navegador rolar o <dialog> de lado. O showModal() foca o
  // primeiro controle enquanto o painel ainda está fora da tela (translateX(100%)) e o navegador
  // "rolava" o diálogo para mostrá-lo: a gaveta aparecia deslocada, cortada, sem deslizar.
  overflow: "clip",
  overscrollBehavior: "contain",
  "&::backdrop": { bg: "transparent" },
  // Na transição de página, a gaveta aberta (ou saindo) é capturada à parte e fica por cima.
  // match-element dá um nome único por elemento (duas gavetas empilhadas não colidem); sem suporte,
  // a declaração é ignorada e a gaveta só entra na captura da página.
  _open: { viewTransitionName: "match-element", viewTransitionClass: "loja-dialogo" },
});

// Véu: fade até 50% em 500 ms (ease-out na entrada, ease-in na saída). O toque nele não rola nada.
const veu = css({
  position: "absolute",
  inset: "0",
  bg: "veuMenu",
  opacity: "0",
  touchAction: "none",
  transitionProperty: "opacity",
  transitionDuration: "gaveta",
  transitionTimingFunction: "saida",
  "[data-estado=aberta] > &": { opacity: "1", transitionTimingFunction: "entrada" },
});

const painel = css({
  position: "absolute",
  top: "0",
  right: "0",
  bottom: "0",
  display: "flex",
  flexDirection: "column",
  bg: "superficie",
  transform: "translateX(100%)",
  transitionProperty: "transform",
  transitionDuration: "gaveta",
  "[data-estado=aberta] > &": { transform: "none" },
});

const curvaGaveta = css({
  transitionTimingFunction: "saida",
  "[data-estado=aberta] > &": { transitionTimingFunction: "entrada" },
});

const curvaDetalhes = css({ transitionTimingFunction: "detalhes" });

// Só rolagem vertical, contida (sem encadear na página nem o "elástico" do iOS).
const rolagemPainel = css({ overflowX: "hidden", overflowY: "auto", overscrollBehavior: "contain" });
// clip não deixa o navegador rolar o painel de lado (ex.: foco num nível que ainda está fora da tela).
const rolagemInterna = css({ overflow: "clip" });

const larguraBusca = css({ w: { base: "full", md: "gavetaBusca" }, maxW: { md: "[50%]" } });
const larguraTela = css({ w: "full" });

const caixaModal = css({
  position: "relative",
  maxW: "full",
  maxH: "[calc(100dvh - 32px)]",
  overflowY: "auto",
  overscrollBehavior: "contain",
  bg: "superficie",
  opacity: "0",
  transform: "translateY(50px)",
  transitionProperty: "opacity, transform",
  transitionDuration: "modal",
  transitionTimingFunction: "entrada",
  "[data-estado=aberta] > &": { opacity: "1", transform: "none" },
  "[data-estado=saindo] > &": { opacity: "0", transform: "none", transitionTimingFunction: "saida" },
});
