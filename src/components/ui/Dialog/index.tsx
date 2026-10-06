"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { XIcon } from "@phosphor-icons/react";
import { IconButton } from "@/components/ui/IconButton";
import { transientOptions } from "@/lib/emotion/transient";
import type { DockAction } from "@/lib/dock";
import { usePresence } from "@/lib/presence";
import { useSheetDrag } from "@/lib/sheetDrag";
import { useSheet } from "@/lib/sheets";
import { backdropExit, DOCK_SPACE, sheetExit, sheetStyles } from "@/styles/sheet";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Botões do rodapé (Cancelar, Salvar...). */
  footer?: ReactNode;
  width?: string;
  /** Altura fixa da janela (ex.: fichas com abas, para não "pular" ao trocar de aba). */
  height?: string;
  /**
   * O conteúdo cuida da própria rolagem (ex.: só a aba rola, resumo e abas
   * ficam parados). Padrão: o corpo inteiro rola.
   */
  scroll?: "body" | "content";
  /** Rodapé flutuando no centro, sobre o conteúdo, com degradê por trás. */
  floatingFooter?: boolean;
  /**
   * Celular: estas ações vão para o dock flutuante (junto do fechar) e o
   * rodapé da janela some.
   */
  dockActions?: DockAction[];
};

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const riseIn = keyframes`
  from { opacity: 0; transform: translateY(8px) scale(0.985); }
  to { opacity: 1; transform: none; }
`;

const riseOut = keyframes`
  from { opacity: 1; transform: none; }
  to { opacity: 0; transform: translateY(6px) scale(0.985); }
`;

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndex.modal};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing(6)};
  background-color: ${({ theme }) => theme.colors.overlay};
  animation: ${fadeIn} 160ms ease-out;

  &[data-closing] {
    ${backdropExit};
  }

  ${({ theme }) => theme.media.md} {
    bottom: var(--keyboard-inset, 0px);
    align-items: flex-end;
    padding: 0;
  }
`;

const Panel = styled("div", transientOptions)<{ $width: string; $height?: string }>`
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(${({ $width }) => $width}, 100%);
  height: ${({ $height }) => ($height ? `min(${$height}, calc(var(--app-height, 100dvh) - 3rem))` : "auto")};
  max-height: ${({ $height }) => ($height ? "calc(var(--app-height, 100dvh) - 3rem)" : "min(40rem, calc(var(--app-height, 100dvh) - 3rem))")};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii["2xl"]};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
  animation: ${riseIn} 220ms cubic-bezier(0.16, 1, 0.3, 1);
  outline: none;

  [data-closing] > & {
    animation: ${riseOut} 160ms ease-in forwards;
  }

  /* Celular: folha de baixo; o fim fica livre para o dock */
  ${({ theme }) => theme.media.md} {
    width: 100%;
    height: ${({ $height }) => ($height ? "calc(var(--app-height, 100dvh) * 0.92)" : "auto")};
    max-height: calc(var(--app-height, 100dvh) * 0.92);
    padding-top: ${({ theme }) => theme.spacing(3)};
    padding-bottom: ${DOCK_SPACE};
    ${({ theme }) => sheetStyles(theme)};

    [data-closing] > & {
      ${sheetExit};
    }
  }
`;

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(5, 5, 0)};
`;

const Title = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Description = styled.div`
  margin-top: ${({ theme }) => theme.spacing(1)};
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Body = styled("div", transientOptions)<{ $scroll: "body" | "content" }>`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(4)};
  min-height: 0;
  padding: ${({ theme, $scroll }) => ($scroll === "content" ? theme.spacing(5, 5, 0) : theme.spacing(5))};
  overflow-y: ${({ $scroll }) => ($scroll === "content" ? "hidden" : "auto")};
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing(2)};
  padding: ${({ theme }) => theme.spacing(0, 5, 5)};

  /* Celular: as ações foram para o dock */
  ${({ theme }) => theme.media.md} {
    &[data-dock-replaced] {
      display: none;
    }
  }
`;

/** Fundo do rodapé flutuante: some em degradê para o conteúdo passar por baixo. */
const fade = (color: string) =>
  /^#[0-9a-f]{6}$/i.test(color)
    ? `linear-gradient(to top, ${color} 45%, ${color}00)`
    : `linear-gradient(to top, ${color} 45%, transparent)`;

const FloatingFooter = styled.div`
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1;
  display: flex;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing(2)};
  padding: ${({ theme }) => theme.spacing(12, 5, 5)};
  border-radius: 0 0 ${({ theme }) => theme.radii["2xl"]} ${({ theme }) => theme.radii["2xl"]};
  background: ${({ theme }) => fade(theme.palette.neutral[0])};
  /* Só os botões recebem clique; o degradê deixa rolar o que está atrás */
  pointer-events: none;

  ${({ theme }) => theme.media.md} {
    bottom: ${DOCK_SPACE};
    border-radius: 0;

    &[data-dock-replaced] {
      display: none;
    }
  }

  > * {
    pointer-events: auto;
  }
`;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])';

/**
 * Janela modal: foca o primeiro campo, prende o Tab dentro, fecha com Esc ou
 * clique fora e devolve o foco a quem abriu.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = "28rem",
  height,
  scroll = "body",
  floatingFooter = false,
  dockActions,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useSheet(open, onClose, "other", dockActions);
  useSheetDrag(panelRef, onClose, open);
  const descriptionId = useId();
  // Fechou: fica na tela o tempo da saída, com o último conteúdo (quem abriu pode já ter limpado os dados)
  const { present, closing } = usePresence(open);
  const snapshot = useRef({ title, description, children, footer });
  if (open) snapshot.current = { title, description, children, footer };
  const view = snapshot.current;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>("input, textarea, select") ?? panel;
    first?.focus();
    return () => opener?.focus();
  }, [open]);

  if (!present) return null;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Dropdowns abertos dentro da janela (portal) tratam as próprias teclas
    if (event.defaultPrevented || !panelRef.current?.contains(event.target as Node)) return;
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (items.length === 0) return;
    const [firstItem, lastItem] = [items[0], items[items.length - 1]];
    if (event.shiftKey && document.activeElement === firstItem) {
      event.preventDefault();
      lastItem.focus();
    } else if (!event.shiftKey && document.activeElement === lastItem) {
      event.preventDefault();
      firstItem.focus();
    }
  };

  return createPortal(
    <Backdrop
      data-closing={closing ? "" : undefined}
      onPointerDown={(event) => {
        if (!closing && event.target === event.currentTarget) onClose();
      }}
    >
      <Panel
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={view.description ? descriptionId : undefined}
        tabIndex={-1}
        $width={width}
        $height={height}
        onKeyDown={handleKeyDown}
      >
        <Head>
          <div>
            <Title id={titleId}>{view.title}</Title>
            {view.description && <Description id={descriptionId}>{view.description}</Description>}
          </div>
          <IconButton icon={XIcon} label="Fechar" variant="ghost" size="sm" tooltip={false} onClick={onClose} />
        </Head>
        {view.children && <Body $scroll={scroll}>{view.children}</Body>}
        {view.footer &&
          (floatingFooter ? (
            <FloatingFooter data-dock-replaced={dockActions?.length ? "" : undefined}>{view.footer}</FloatingFooter>
          ) : (
            <Footer data-dock-replaced={dockActions?.length ? "" : undefined}>{view.footer}</Footer>
          ))}
      </Panel>
    </Backdrop>,
    document.body,
  );
}
