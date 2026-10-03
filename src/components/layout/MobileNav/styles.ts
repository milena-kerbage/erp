import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import Link from "next/link";
import { transientOptions } from "@/lib/emotion/transient";
import { EASE_OUT, fadeIn } from "@/styles/animations";
import { backdropExit, DOCK_SPACE, sheetExit, sheetStyles } from "@/styles/sheet";
import { DOCK_EASE } from "@/lib/dock";

/* ---------- Dock (barra flutuante de baixo) ---------- */

/** Botão que chega ao dock: aparece crescendo e saindo do desfoque. */
const swap = keyframes`
  from { opacity: 0; transform: scale(0.82); filter: blur(4px); }
  to { opacity: 1; transform: none; filter: none; }
`;

/**
 * Só existe no celular e fica sempre visível, por cima de folhas e janelas.
 * A largura acompanha o conteúdo (medida e animada), então ele encolhe quando
 * vira [✕ | ☰] e cresce de volta com o "Buscar".
 */
export const Dock = styled.div`
  display: none;

  ${({ theme }) => theme.media.md} {
    position: fixed;
    bottom: calc(${({ theme }) => theme.spacing(4)} + env(safe-area-inset-bottom));
    left: 50%;
    z-index: ${({ theme }) => theme.zIndex.toast + 50};
    /* Conteúdo centrado: ao crescer ou encolher, corta igual dos dois lados */
    display: flex;
    justify-content: center;
    height: 3.125rem;
    overflow: hidden;
    border: 1px solid ${({ theme }) => theme.colors.border.subtle};
    border-radius: 1.0625rem;
    background-color: ${({ theme }) => theme.palette.neutral[0]};
    transform: translateX(-50%);
    transition: width 380ms ${DOCK_EASE};
  }
`;

/**
 * Fundo escurecido atrás dos dropdowns do celular. É um elemento de verdade
 * (não sombra): o toque nele só fecha a folha e nunca arrasta nem clica a
 * página de trás.
 */
export const SheetBackdrop = styled.div`
  display: none;

  ${({ theme }) => theme.media.md} {
    position: fixed;
    inset: 0;
    z-index: ${({ theme }) => theme.zIndex.dropdown - 1};
    display: block;
    background-color: ${({ theme }) => theme.colors.overlay};
    animation: ${fadeIn} 200ms ease-out;
    touch-action: none;

    &[data-closing] {
      ${backdropExit};
    }
  }
`;

/** Conteúdo do dock na largura natural (é o que o dock mede). */
export const DockInner = styled.div`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 9px;
  height: 100%;
  padding: 3px;
  white-space: nowrap;

  /* Divisor entre todas as opções (anda e entra junto com o botão) */
  > * {
    position: relative;
  }

  > * + *::before {
    content: "";
    position: absolute;
    top: 50%;
    left: -5px;
    width: 1px;
    height: 1.375rem;
    background-color: ${({ theme }) => theme.colors.border.subtle};
    transform: translateY(-50%);
    pointer-events: none;
  }

  /* Botão que acabou de trocar entra suave */
  > * {
    animation: ${swap} 320ms ${DOCK_EASE} both;
  }

  @media (prefers-reduced-motion: reduce) {
    > * {
      animation: none;
    }
  }
`;

export const DockSearch = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2.5)};
  height: 2.625rem;
  padding: ${({ theme }) => theme.spacing(0, 3.5, 0, 3)};
  border-radius: 0.875rem;
  font-size: 0.9375rem;
  color: ${({ theme }) => theme.colors.text.muted};
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:active {
    background-color: ${({ theme }) => theme.colors.interactive.hover};
  }

  svg {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

/** Botão de ação da tela no dock; a principal é escura (com texto, se tiver). */
export const DockAction = styled("button", transientOptions)<{ $primary: boolean; $wide: boolean }>`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing(2)};
  min-width: 2.625rem;
  height: 2.625rem;
  padding: ${({ theme, $wide }) => ($wide ? theme.spacing(0, 4, 0, 3.5) : 0)};
  border-radius: 0.875rem;
  background-color: ${({ theme, $primary }) => ($primary ? theme.colors.text.primary : "transparent")};
  font-size: 0.9375rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme, $primary }) => ($primary ? theme.palette.neutral[0] : theme.colors.text.primary)};
  transition:
    background-color ${({ theme }) => theme.transitions.fast},
    opacity ${({ theme }) => theme.transitions.fast};

  &:active {
    background-color: ${({ theme, $primary }) => ($primary ? theme.colors.text.secondary : theme.colors.interactive.hover)};
  }

  &:disabled {
    background-color: ${({ theme, $primary }) => ($primary ? theme.palette.neutral[300] : "transparent")};
    opacity: ${({ $primary }) => ($primary ? 1 : 0.4)};
  }
`;

/** Paginador (‹ 2/5 ›): uma opção só, sem divisores por dentro. */
export const DockPagerGroup = styled.span`
  display: inline-flex;
  align-items: center;
`;

/** "2/5": onde se está no paginador (a etapa vai para o leitor de tela). */
export const DockPage = styled.span`
  display: inline-flex;
  align-items: baseline;
  justify-content: center;
  min-width: 2.25rem;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};

  strong {
    font-size: 0.9375rem;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
`;

export const DockButton = styled.button`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.625rem;
  height: 2.625rem;
  border-radius: 0.875rem;
  color: ${({ theme }) => theme.colors.text.primary};
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:active {
    background-color: ${({ theme }) => theme.colors.interactive.hover};
  }

  &:disabled {
    color: ${({ theme }) => theme.colors.text.muted};
    opacity: 0.4;
  }
`;

/** Ponto de conversa não lida sobre o botão do menu. */
export const DockDot = styled.span`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 0.5rem;
  height: 0.5rem;
  border: 2px solid ${({ theme }) => theme.palette.neutral[0]};
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.attention};
  box-sizing: content-box;
`;

/* ---------- Menu em tela cheia ---------- */

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
`;

export const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndex.overlay};
  background-color: ${({ theme }) => theme.colors.overlay};
  animation: ${fadeIn} 200ms ease-out;

  &[data-closing] {
    ${backdropExit};
  }
`;

/** Menu como folha que sobe de baixo, quase da altura da tela. */
export const Sheet = styled.div`
  position: fixed;
  /* Um pouco mais baixa que a tela: sobra folga no topo */
  top: calc(env(safe-area-inset-top) + ${({ theme }) => theme.spacing(12)});
  right: 0;
  bottom: 0;
  left: 0;
  z-index: ${({ theme }) => theme.zIndex.overlay};
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
  outline: none;
  ${({ theme }) => sheetStyles(theme)};

  &[data-closing] {
    ${sheetExit};
  }
`;

export const SheetScroll = styled.div`
  flex: 1;
  min-height: 0;
  padding: ${({ theme }) => theme.spacing(6, 3)} ${DOCK_SPACE};
  overflow-y: auto;
  overscroll-behavior: contain;

  /* Tudo entra em cascata */
  > * {
    animation: ${fadeUp} 320ms ${EASE_OUT} both;
  }

  ${Array.from({ length: 12 }, (_, index) => `> *:nth-child(${index + 1}) { animation-delay: ${40 + index * 25}ms; }`).join("\n")}
`;

export const Search = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2.5)};
  height: 2.75rem;
  margin: ${({ theme }) => theme.spacing(0, 0, 2)};
  padding: ${({ theme }) => theme.spacing(0, 3.5)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: 0.625rem;
  color: ${({ theme }) => theme.colors.text.muted};

  &:focus-within {
    border-color: ${({ theme }) => theme.palette.sage[400]};
  }

  input {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: 0;
    outline: none;
    background: transparent;
    /* 16px: o iOS não dá zoom ao focar */
    font-size: 1rem;
    color: ${({ theme }) => theme.colors.text.primary};

    &::placeholder {
      color: ${({ theme }) => theme.colors.text.muted};
    }

    &::-webkit-search-cancel-button {
      display: none;
    }
  }
`;

export const List = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const rowStyles = `
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 2.875rem;
  text-align: left;
`;

export const Row = styled(Link)`
  ${rowStyles};
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(0, 3)};
  border-radius: 0.625rem;
  font-size: 0.9375rem;
  color: ${({ theme }) => theme.colors.text.primary};
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &[aria-current="page"] {
    background-color: ${({ theme }) => theme.colors.interactive.pressed};
    font-weight: ${({ theme }) => theme.fontWeights.medium};
  }

  &:active {
    background-color: ${({ theme }) => theme.colors.interactive.hover};
  }

  > svg:first-of-type {
    flex-shrink: 0;
  }

  > span:first-of-type {
    flex: 1;
    min-width: 0;
  }
`;

export const RowButton = styled.button`
  ${rowStyles};
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(0, 3)};
  border-radius: 0.625rem;
  font-size: 0.9375rem;
  color: ${({ theme }) => theme.colors.text.primary};
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:active {
    background-color: ${({ theme }) => theme.colors.interactive.hover};
  }

  > span:first-of-type {
    flex: 1;
    min-width: 0;
  }
`;

/** Linha que não navega (ex.: Tema, com o seletor à direita). */
export const RowStatic = styled.div`
  ${rowStyles};
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(0, 3)};
  font-size: 0.9375rem;
  color: ${({ theme }) => theme.colors.text.primary};

  > span:first-of-type {
    flex: 1;
  }
`;

export const Chevron = styled.span`
  display: inline-flex;
  flex: 0 0 auto !important;
  color: ${({ theme }) => theme.colors.text.muted};
`;

export const Count = styled.span`
  display: inline-flex;
  flex: 0 0 auto !important;
  align-items: center;
  justify-content: center;
  min-width: 1.375rem;
  height: 1.375rem;
  padding: ${({ theme }) => theme.spacing(0, 1.5)};
  border-radius: ${({ theme }) => theme.radii.full};
  background-color: ${({ theme }) => theme.tones.blue.soft};
  font-size: 0.6875rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.tones.blue.fg};
`;

export const Separator = styled.hr`
  height: 1px;
  margin: ${({ theme }) => theme.spacing(2, -3)};
  border: 0;
  background-color: ${({ theme }) => theme.colors.border.subtle};
`;

/** Pessoa logada, com o sino ao lado. */
export const Profile = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(2, 3)};

  > div {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  strong {
    overflow: hidden;
    font-size: 0.9375rem;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: ${({ theme }) => theme.colors.text.primary};
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  small {
    font-size: ${({ theme }) => theme.fontSizes.xs};
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

/** Claro / escuro. */
export const ThemeSwitch = styled.div`
  display: inline-flex;
  flex-shrink: 0;
  gap: 2px;
  padding: 3px;
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme }) => theme.colors.interactive.pressed};
`;

export const ThemeOption = styled("button", transientOptions)<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.125rem;
  height: 1.875rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  background-color: ${({ theme, $active }) => ($active ? theme.palette.neutral[0] : "transparent")};
  color: ${({ theme, $active }) => ($active ? theme.colors.text.primary : theme.colors.text.muted)};
  transition: background-color ${({ theme }) => theme.transitions.fast};
`;

export const PlainButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text.primary};

  &:active {
    background-color: ${({ theme }) => theme.colors.interactive.hover};
  }
`;

/** Cabeçalho do subpainel (ex.: seções de Configurações). */
export const SubHead = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  margin-bottom: ${({ theme }) => theme.spacing(2)};

  strong {
    font-size: 1.0625rem;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

export const Empty = styled.p`
  padding: ${({ theme }) => theme.spacing(4, 3)};
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;
