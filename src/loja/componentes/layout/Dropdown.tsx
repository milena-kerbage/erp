"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { css, cx } from "styled-system/css";

// Dropdown da loja no MESMO PADRÃO dos dropdowns do ERP (src/components/ui/Popover e Menu), em Panda CSS:
// - junto ao gatilho, alinhado ao fim, abre para baixo e inverte para cima quando não cabe;
// - fecha no clique fora, no Esc (o foco volta ao gatilho), no Tab e ao trocar de página;
// - entra com fade + 4 px; superfície branca, borda sutil, sombra suave, cantos de 12 com linhas de 40
//   recuadas (cantos de 6) e divisores de ponta a ponta; título curto; ícone por item;
// - teclado: setas, Home/End e Esc; papel ARIA de menu (menuitem);
// - celular (< 768): vira folha que sobe da base, com véu, de ponta a ponta.
// Vai para o <body> por portal: a pílula do cabeçalho tem backdrop-filter, que prenderia o position fixed.

type Posicao = { top: number; left: number; lado: "baixo" | "cima"; largura: number };
const MARGEM = 8;
const DISTANCIA = 8;

export function Dropdown({
  rotulo,
  gatilho,
  classeGatilho,
  largura = 272,
  children,
}: {
  rotulo: string; // nome acessível do gatilho e do menu
  gatilho: ReactNode;
  classeGatilho?: string;
  largura?: number;
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const botao = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const pelaTecla = useRef(false);
  const caminho = usePathname();
  const id = useId();

  const fechar = useCallback((devolverFoco = false) => {
    setAberto(false);
    if (devolverFoco) botao.current?.focus();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: fecha a cada troca de página
  useEffect(() => setAberto(false), [caminho]);

  const { posicao, celular } = useFlutuante(aberto, botao, menu, largura);

  // Foco: pelo teclado, no primeiro item; pelo mouse, no próprio menu (sem destacar item).
  useEffect(() => {
    if (!aberto || !posicao) return;
    const itens = itensDo(menu.current);
    if (pelaTecla.current && itens[0]) itens[0].focus();
    else menu.current?.focus({ preventScroll: true });
  }, [aberto, posicao]);

  useEffect(() => {
    if (!aberto) return;
    const fora = (evento: PointerEvent) => {
      const alvo = evento.target as Node;
      if (!menu.current?.contains(alvo) && !botao.current?.contains(alvo)) fechar();
    };
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [aberto, fechar]);

  function teclaNoGatilho(evento: KeyboardEvent<HTMLButtonElement>) {
    if (["ArrowDown", "Enter", " "].includes(evento.key)) {
      evento.preventDefault();
      pelaTecla.current = true;
      setAberto(true);
    }
  }

  function teclaNoMenu(evento: KeyboardEvent<HTMLDivElement>) {
    const itens = itensDo(menu.current);
    const atual = itens.indexOf(document.activeElement as HTMLElement);
    const ir = (indice: number) => {
      evento.preventDefault();
      itens[(indice + itens.length) % itens.length]?.focus();
    };
    if (evento.key === "Escape") {
      evento.preventDefault();
      fechar(true);
    } else if (evento.key === "Tab") fechar();
    else if (evento.key === "ArrowDown") ir(atual + 1);
    else if (evento.key === "ArrowUp") ir(atual < 0 ? itens.length - 1 : atual - 1);
    else if (evento.key === "Home") ir(0);
    else if (evento.key === "End") ir(itens.length - 1);
  }

  return (
    <>
      <button
        ref={botao}
        type="button"
        id={`${id}-gatilho`}
        aria-label={rotulo}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={aberto ? `${id}-menu` : undefined}
        onClick={() => {
          pelaTecla.current = false;
          setAberto(!aberto);
        }}
        onKeyDown={teclaNoGatilho}
        className={classeGatilho}
      >
        {gatilho}
      </button>
      {aberto &&
        createPortal(
          <>
            {celular && <div aria-hidden className={veu} onPointerDown={() => fechar()} />}
            <div
              ref={menu}
              id={`${id}-menu`}
              role="menu"
              aria-label={rotulo}
              tabIndex={-1}
              onKeyDown={teclaNoMenu}
              onClick={(evento) => {
                if ((evento.target as HTMLElement).closest("[role=menuitem]")) fechar();
              }}
              data-lado={posicao?.lado}
              className={cx(superficie, celular && folha)}
              style={celular ? undefined : { top: posicao?.top ?? 0, left: posicao?.left ?? 0, width: largura, visibility: posicao ? "visible" : "hidden" }}
            >
              {celular && <span aria-hidden className={alca} />}
              {children}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}

/**
 * Posição do conteúdo flutuante junto ao gatilho (o mesmo cálculo do usePopover do ERP): abre para
 * baixo e inverte para cima quando não cabe. Com largura fixa alinha pelo fim do gatilho; com
 * "gatilho" tem a largura do gatilho e alinha pelo início (campos de seleção). `celular` (< 768)
 * indica que o conteúdo vira folha da base.
 */
export function useFlutuante(aberto: boolean, gatilho: RefObject<HTMLElement | null>, conteudo: RefObject<HTMLElement | null>, largura: number | "gatilho") {
  const [posicao, setPosicao] = useState<Posicao | null>(null);
  const [celular, setCelular] = useState(false);

  const posicionar = useCallback(() => {
    const gatilhoRect = gatilho.current?.getBoundingClientRect();
    const elemento = conteudo.current;
    if (!gatilhoRect || !elemento) return;
    const w = largura === "gatilho" ? gatilhoRect.width : largura;
    const altura = elemento.offsetHeight;
    const abaixo = window.innerHeight - gatilhoRect.bottom;
    const lado = abaixo < altura + DISTANCIA + MARGEM && gatilhoRect.top > abaixo ? "cima" : "baixo";
    const top = lado === "baixo" ? gatilhoRect.bottom + DISTANCIA : Math.max(MARGEM, gatilhoRect.top - DISTANCIA - altura);
    const inicio = largura === "gatilho" ? gatilhoRect.left : gatilhoRect.right - w;
    const left = Math.min(Math.max(MARGEM, inicio), window.innerWidth - w - MARGEM);
    setPosicao({ top, left, lado, largura: w });
  }, [gatilho, conteudo, largura]);

  useLayoutEffect(() => {
    if (!aberto) {
      setPosicao(null);
      return;
    }
    const consulta = window.matchMedia("(max-width: 47.99rem)");
    setCelular(consulta.matches);
    posicionar();
    const reposicionar = () => {
      setCelular(consulta.matches);
      posicionar();
    };
    window.addEventListener("resize", reposicionar);
    window.addEventListener("scroll", reposicionar, true);
    return () => {
      window.removeEventListener("resize", reposicionar);
      window.removeEventListener("scroll", reposicionar, true);
    };
  }, [aberto, posicionar]);

  return { posicao, celular };
}

function itensDo(menu: HTMLElement | null): HTMLElement[] {
  return menu ? [...menu.querySelectorAll<HTMLElement>("[role=menuitem]:not([aria-disabled=true])")] : [];
}

/** Título curto que descreve a escolha (ex.: "Sua conta"). */
export function TituloDropdown({ children }: { children: ReactNode }) {
  return <p className={titulo}>{children}</p>;
}

/** Bloco livre no topo (ex.: avatar, nome e e-mail da cliente). */
export function CabecalhoDropdown({ children }: { children: ReactNode }) {
  return <div className={cabecalho}>{children}</div>;
}

/** Divisor de ponta a ponta (atravessa o recuo). */
export function DivisorDropdown() {
  return <div role="separator" className={divisor} />;
}

type PropsItem = { icone?: ReactNode; children: ReactNode; meta?: ReactNode; desabilitado?: boolean };

// Como no ERP, o ponteiro move o foco: um único item destacado (mouse e teclado juntos).
const focarNoPonteiro = (evento: { currentTarget: HTMLElement }) => {
  if (document.activeElement !== evento.currentTarget) evento.currentTarget.focus({ preventScroll: true });
};

/** Linha de 40 px com ícone. Com `href`, link; sem, botão (`aoEscolher`). */
export function ItemDropdown({ href, aoEscolher, icone, children, meta, desabilitado }: PropsItem & { href?: string; aoEscolher?: () => void }) {
  const conteudo = (
    <>
      {icone && <span className={iconeItem}>{icone}</span>}
      <span className={css({ flex: "1", minW: "0", truncate: true })}>{children}</span>
      {meta && <span className={metaItem}>{meta}</span>}
    </>
  );
  if (href)
    return (
      <Link role="menuitem" tabIndex={-1} href={href} onPointerMove={focarNoPonteiro} className={linha}>
        {conteudo}
      </Link>
    );
  return (
    <button role="menuitem" tabIndex={-1} type="button" aria-disabled={desabilitado || undefined} onClick={desabilitado ? undefined : aoEscolher} onPointerMove={focarNoPonteiro} className={linha}>
      {conteudo}
    </button>
  );
}

export const superficie = css({
  position: "fixed",
  zIndex: "dropdown",
  display: "flex",
  flexDirection: "column",
  maxH: "[min(28rem, calc(100dvh - 16px))]",
  overflowY: "auto",
  p: "1.5",
  borderWidth: "1px",
  borderColor: "borda",
  borderRadius: "lg",
  bg: "superficie",
  boxShadow: "media",
  outline: "none",
  fontFamily: "corpo",
  animation: "surgir",
  transformOrigin: "top right",
  "&[data-lado=cima]": { transformOrigin: "bottom right" },
});

// Celular: folha da base, de ponta a ponta, cantos de cima arredondados, com a alça.
export const folha = css({
  top: "auto",
  left: "0",
  right: "0",
  bottom: "0",
  w: "auto",
  maxH: "[78dvh]",
  px: "3",
  pt: "2",
  pb: "[calc(16px + env(safe-area-inset-bottom))]",
  borderWidth: "0",
  borderTopRadius: "bloco",
  borderBottomRadius: "[0]",
  animation: "subirFolha",
});

export const alca = css({ alignSelf: "center", flexShrink: "0", w: "10", h: "1", mb: "3", borderRadius: "pilula", bg: "placeholderForte" });

export const veu = css({ position: "fixed", inset: "0", zIndex: "dropdown", bg: "veuMenu", animation: "veuSacola" });

export const titulo = css({ px: "2.5", pt: "1.5", pb: "1", fontSize: "xs", fontWeight: "medium", color: "textoSuave" });

const cabecalho = css({ display: "flex", alignItems: "center", gap: "3", px: "2.5", py: "2" });

const divisor = css({ flexShrink: "0", h: "[1px]", mx: "-1.5", my: "1.5", bg: "borda" });

export const linha = css({
  display: "flex",
  flexShrink: "0",
  alignItems: "center",
  gap: "2.5",
  w: "full",
  minH: "10",
  px: "2.5",
  borderRadius: "sm",
  fontSize: "sm",
  color: "escuro",
  textAlign: "left",
  cursor: "pointer",
  outline: "none",
  transitionProperty: "background-color",
  transitionDuration: "rapida",
  _focus: { bg: "fundoSutil" },
  _active: { bg: "superficieSuave" },
  "&[aria-disabled=true]": { opacity: "0.45", cursor: "default" },
});

const iconeItem = css({ display: "inline-flex", flexShrink: "0", alignItems: "center", justifyContent: "center", minW: "[18px]", color: "textoSuave", "& svg": { w: "[18px]", h: "[18px]" } });

const metaItem = css({ flexShrink: "0", fontSize: "xs", color: "marca", fontWeight: "medium" });
