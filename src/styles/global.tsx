"use client";

import { Global, css, type Theme } from "@emotion/react";

const styles = (theme: Theme) => css`
  html {
    font-size: 100%;
    color-scheme: ${theme.mode};
    scroll-padding-block: 1rem 6rem;
  }

  body {
    font-family: ${theme.fonts.body};
    font-size: ${theme.fontSizes.md};
    line-height: ${theme.lineHeights.normal};
    color: ${theme.colors.text.primary};
    background-color: ${theme.colors.background.canvas};
    background-image: ${theme.colors.background.gradient};
    background-attachment: fixed;

    /* Celular: fundo branco (o degradê esverdeado destoava do chat e dos cartões) */
    ${theme.media.md} {
      background-color: ${theme.palette.neutral[0]};
      background-image: none;
    }
  }

  code,
  kbd,
  pre,
  samp {
    font-family: ${theme.fonts.mono};
  }

  /* Barra de rolagem única do sistema: fina, arredondada e sem setas */
  ::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }

  ::-webkit-scrollbar-button {
    display: none;
    width: 0;
    height: 0;
  }

  ::-webkit-scrollbar-track,
  ::-webkit-scrollbar-corner {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background-color: ${theme.colors.scrollbar.thumb};
  }

  ::-webkit-scrollbar-thumb:hover {
    background-color: ${theme.colors.scrollbar.hover};
  }

  /* Navegadores sem ::-webkit-scrollbar (Firefox) */
  @supports not selector(::-webkit-scrollbar) {
    * {
      scrollbar-width: thin;
      scrollbar-color: ${theme.colors.scrollbar.thumb} transparent;
    }
  }

  /* Campos de 16px evitam zoom automático no Safari sem bloquear o zoom manual. */
  ${theme.media.md} {
    input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]),
    textarea,
    select {
      font-size: max(1rem, 16px) !important;
      scroll-margin-block: 1rem 6rem;
    }
  }

  @media (pointer: coarse) {
    button, a, input, select, textarea { touch-action: manipulation; }
    button:not([role="switch"]), a[role="button"], input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]) {
      min-height: 44px;
    }
  }

  /* Celular: com uma folha aberta, a página de trás não rola */
  ${theme.media.md} {
    html[data-sheet-open],
    html[data-sheet-open] body {
      overflow: hidden;
      overscroll-behavior: none;
    }
  }

  /* Módulos em produção (selo "Produção"): apagados, mais nítidos no hover */
  [data-locked]:not([aria-current="page"]) > * {
    opacity: 0.45;
    transition: opacity ${theme.transitions.fast};
  }

  [data-locked]:not([aria-current="page"]):is(:hover, :focus, [data-active]) > * {
    opacity: 0.75;
  }

  ::selection {
    background-color: ${theme.colors.primary.subtle};
    color: ${theme.colors.text.primary};
  }

  :focus-visible {
    outline: 2px solid ${theme.colors.primary.main};
    outline-offset: 2px;
  }

  /* ---------- Acessibilidade (Configurações > Acessibilidade) ---------- */

  /* Tamanho do texto: tudo em rem acompanha */
  html[data-text-size="large"] {
    font-size: 112.5%;
  }

  html[data-text-size="larger"] {
    font-size: 125%;
  }

  /* Menos movimento: segue o sistema, a não ser que a pessoa escolha "Normal" */
  @media (prefers-reduced-motion: reduce) {
    html:not([data-motion="always"]) *,
    html:not([data-motion="always"]) *::before,
    html:not([data-motion="always"]) *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  html[data-motion="reduce"] *,
  html[data-motion="reduce"] *::before,
  html[data-motion="reduce"] *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  /* Links dentro de textos sempre sublinhados */
  html[data-underline-links] :is(p, dd, td, li, span) > a {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  /* Espaçamento de leitura (ajuda quem tem dislexia ou baixa visão) */
  html[data-readable-spacing] body {
    letter-spacing: 0.02em;
    word-spacing: 0.08em;
  }

  html[data-readable-spacing] :is(p, li, dd) {
    line-height: 1.75;
  }

  /* Foco sempre visível, também com o mouse (menos nos campos de digitar) */
  html[data-focus-always] :focus:not(input, textarea) {
    outline: 2px solid ${theme.colors.primary.main};
    outline-offset: 2px;
  }
`;

export function GlobalStyles() {
  return <Global styles={styles} />;
}
