"use client";

// O visual das conversas é o do ERP da Le Ange (inbox.module.css), regra por regra, nas cores deste ERP: lista 22rem |
// conversa sobre o fundo pontilhado | ficha 23rem. A raiz define os mesmos nomes de variável de lá a partir do tema
// daqui (claro e escuro), e cada coluna leva as regras da sua parte com os mesmos nomes de classe. Uma troca só: a tinta
// do texto se chama --color-ink (lá, --color-label), porque o Emotion lê "label:" dentro do CSS como nome da classe.
import { css, keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { DOCK_CLEARANCE } from "@/styles/sheet";

const rise = keyframes`from { opacity: 0; transform: translateY(0.375rem); }`;
const pendingShine = keyframes`from { background-position: 125% 0; } to { background-position: -125% 0; }`;
const recorderIn = keyframes`from { opacity: 0; transform: translateY(0.25rem); }`;
const recPulse = keyframes`50% { opacity: 0.25; }`;
const pickerIn = keyframes`from { opacity: 0; transform: translate(-50%, 0.25rem) scale(0.96); }`;
const sheetIn = keyframes`from { opacity: 0; transform: translateY(0.5rem); }`;

/** A tela: as variáveis da Le Ange nas cores do ERP, e as três colunas. */
export const Raiz = styled.div`
  --color-bg: ${({ theme }) => theme.colors.background.surface};
  --color-elevated: ${({ theme }) => theme.colors.background.elevated};
  --color-border: ${({ theme }) => theme.colors.border.subtle};
  --color-ink: ${({ theme }) => theme.colors.text.primary};
  --color-label-secondary: ${({ theme }) => theme.colors.text.secondary};
  --color-label-tertiary: color-mix(in oklab, ${({ theme }) => theme.colors.text.primary} 42%, transparent);
  --color-fill-quaternary: color-mix(in oklab, ${({ theme }) => theme.colors.text.primary} 5%, transparent);
  --color-fill-tertiary: color-mix(in oklab, ${({ theme }) => theme.colors.text.primary} 8%, transparent);
  --color-fill-secondary: color-mix(in oklab, ${({ theme }) => theme.colors.text.primary} 13%, transparent);
  --color-focus: ${({ theme }) => theme.colors.primary.main};
  --color-brand: ${({ theme }) => theme.colors.primary.main};
  --sys-green: ${({ theme }) => theme.colors.primary.main};
  --sys-blue: ${({ theme }) => theme.tones.blue.fg};
  --sys-orange: ${({ theme }) => theme.colors.warning};
  --sys-red: ${({ theme }) => theme.colors.danger};
  --sys-purple: ${({ theme }) => theme.tones.lavender.fg};
  --sys-yellow: ${({ theme }) => (theme.mode === "dark" ? "#ffd60a" : "#c99700")};
  --line: 0.0625rem solid ${({ theme }) => theme.colors.border.subtle};
  --list-width: 22rem;
  /* A ficha da oportunidade ganhou a aba WhatsApp: 25rem para as quatro abas caberem numa linha. */
  --panel-width: 25rem;
  --tone-contact: ${({ theme }) => theme.colors.background.elevated};
  --tone-agent: ${({ theme }) => theme.colors.chat.outgoing};
  --tone-template: ${({ theme }) => theme.tones.green.soft};
  --tone-note: ${({ theme }) => theme.tones.yellow.soft};
  --tick-read: ${({ theme }) => theme.colors.chat.read};
  --author-template: ${({ theme }) => theme.tones.green.fg};
  --author-note: ${({ theme }) => theme.tones.yellow.fg};
  --font-mono: ${({ theme }) => theme.fonts.mono};
  --chat-bg: ${({ theme }) => theme.palette.neutral[50]};
  --chat-dots: ${({ theme }) => theme.colors.chat.dots};
  --glass-layer-bg: color-mix(in oklab, ${({ theme }) => theme.colors.background.surface} 82%, transparent);
  --glass-layer-blur: blur(16px);
  --shadow-sm: ${({ theme }) => theme.shadows.sm};
  --shadow-md: ${({ theme }) => theme.shadows.md};
  --shadow-lg: 0 12px 40px rgb(0 0 0 / ${({ theme }) => (theme.mode === "dark" ? 0.6 : 0.14)});
  --space-1: 0.25rem; --space-1-5: 0.375rem; --space-2: 0.5rem; --space-2-5: 0.625rem; --space-3: 0.75rem; --space-4: 1rem; --space-5: 1.25rem; --space-6: 1.5rem; --space-8: 2rem;
  --radius-xs: 0.25rem; --radius-sm: 0.375rem; --radius-md: 0.5rem; --radius-lg: 0.625rem; --radius-full: 9999px;
  --text-caption-2: 0.6875rem; --text-caption-1: 0.75rem; --text-footnote: 0.8125rem; --text-subhead: 0.9375rem; --text-callout: 1rem; --text-title-3: 1.25rem;
  --duration-fast: 120ms; --duration-base: 200ms; --duration-slow: 320ms;
  --ease-standard: cubic-bezier(0.25, 0.1, 0.25, 1); --ease-settle: cubic-bezier(0.22, 1, 0.36, 1);

  position: relative;
  display: grid;
  flex: 1 1 0;
  grid-template-columns: var(--list-width) minmax(0, 1fr);
  min-height: 0;
  overflow: hidden;
  color: var(--color-ink);
  transition: grid-template-columns var(--duration-slow) var(--ease-settle);

  &[data-panel] { grid-template-columns: var(--list-width) minmax(0, 1fr) var(--panel-width); }
  /* A lista recolhida vira um trilho só com as fotos; o botão no alto abre de novo. */
  &[data-list="closed"] { --list-width: 4.25rem; }

  /* O reset do ERP já zera botões, margens e listas; aqui só o marcador, sem ganhar dos componentes do ERP. */
  :where(&) ul { list-style: none; }

  @media (prefers-reduced-motion: reduce) { transition: none; }

  @media (max-width: 1280px) {
    &[data-panel] { grid-template-columns: var(--list-width) minmax(0, 1fr); }
    &[data-panel] > [data-pane="ficha"] { position: absolute; inset-block: 0; inset-inline-end: 0; z-index: 5; width: var(--panel-width); box-shadow: var(--shadow-lg); }
  }
  @media (max-width: 960px) { --list-width: 18.5rem; }
  @media (max-width: 767px) {
    &, &[data-panel] { grid-template-columns: minmax(0, 1fr); }
    &[data-open] > [data-pane="lista"], &:not([data-open]) > [data-pane="conversa"] { display: none; }
    &[data-panel] > [data-pane="ficha"] { width: 100%; }
  }
`;

/* ------------------------------------------------------------------ lista */
export const ColunaLista = styled.aside`
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 0;
  background-color: var(--color-bg);
  border-inline-end: var(--line);

  .listHead { display: grid; gap: var(--space-3); padding: var(--space-4) var(--space-4) var(--space-2); }
  .listTitleRow { display: flex; gap: var(--space-2); align-items: center; justify-content: space-between; }
  .listTitle { font-size: var(--text-title-3); font-weight: 600; line-height: 1.2; }
  .listTitleActions { display: inline-flex; flex-shrink: 0; gap: var(--space-2); align-items: center; }
  .searchRow { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: var(--space-1); align-items: center; }
  .search {
    display: flex; gap: var(--space-2); align-items: center; height: 2.25rem; padding-inline: var(--space-3);
    color: var(--color-label-secondary); background-color: var(--color-fill-quaternary); border: 0.0625rem solid transparent; border-radius: var(--radius-md);
  }
  .search:focus-within { background-color: var(--color-elevated); border-color: var(--color-border); }
  .search svg { flex-shrink: 0; width: 1rem; height: 1rem; }
  .search input { flex: 1; min-width: 0; font: inherit; font-size: var(--text-footnote); color: var(--color-ink); background: transparent; border: 0; outline: none; }
  .search input::placeholder { color: var(--color-label-tertiary); }
  .search input::-webkit-search-cancel-button { display: none; }
  .search button { display: grid; place-items: center; color: var(--color-label-secondary); }
  .squareButton {
    position: relative; display: grid; place-items: center; width: 2.25rem; height: 2.25rem; color: var(--color-label-secondary);
    border: 0.0625rem solid var(--color-border); border-radius: var(--radius-md); transition: background-color var(--duration-fast) var(--ease-standard);
  }
  .squareButton svg { width: 1rem; height: 1rem; }
  .squareButton:hover, .squareButton[aria-expanded="true"] { color: var(--color-ink); background-color: var(--color-fill-quaternary); }
  .squareButton[aria-pressed="true"] { color: var(--color-ink); background-color: var(--color-fill-secondary); border-color: transparent; }
  .squareButton:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 1px; }
  .squareButton[data-size="sm"] { width: 2rem; height: 2rem; }
  .filterCount {
    position: absolute; top: -0.375rem; right: -0.375rem; min-width: 1.125rem; padding-inline: 0.25rem; font-size: 0.625rem; font-weight: 650; line-height: 1.125rem;
    color: #fff; text-align: center; pointer-events: none; background-color: var(--sys-green); border-radius: var(--radius-full);
  }

  /* Fechar em massa: a barra da seleção e a caixa de marcar ao lado de cada linha */
  .bulkBar {
    display: flex; align-items: center; gap: var(--space-1); padding: var(--space-1) var(--space-1) var(--space-1) var(--space-3);
    font-size: var(--text-footnote); color: var(--color-label-secondary); background: var(--color-fill-tertiary); border-radius: var(--radius-md);
  }
  .bulkBar > span { flex: 1; min-width: 0; }
  .pickRow { display: flex; align-items: center; gap: var(--space-1); padding-inline-start: var(--space-2); }
  .pickRow > button { flex: 1; min-width: 0; }
  .searchStatus { font-size: var(--text-caption-1); color: var(--color-label-secondary); }

  /* Os recortes em chip, no desenho dos filtros do WhatsApp: fio fino, canto md, o em vigor preenchido. */
  .chips { display: flex; gap: var(--space-1); align-items: center; padding: 0.1875rem; margin: -0.1875rem; overflow-x: auto; scrollbar-width: none; }
  .chips::-webkit-scrollbar { display: none; }
  .chips > * { flex-shrink: 0; }
  .chip {
    display: inline-flex; gap: 0.3125rem; align-items: center; min-height: 1.875rem; padding-inline: 0.5625rem; font-size: var(--text-footnote); font-weight: 500;
    color: var(--color-label-secondary); white-space: nowrap; background-color: transparent; border: 0.0625rem solid var(--color-border); border-radius: var(--radius-md);
    transition: background-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard);
  }
  .chip svg { width: 0.75rem; height: 0.75rem; }
  .chip:has(> svg:only-child) { padding-inline: var(--space-2); }
  @media (hover: hover) { .chip:hover { color: var(--color-ink); background-color: var(--color-fill-quaternary); } }
  .chip[aria-pressed="true"], .chip[data-pressed] { color: var(--color-ink); background-color: var(--color-fill-secondary); border-color: transparent; }
  .chip:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 1px; }
  .chipCount { font-variant-numeric: tabular-nums; color: var(--color-label-secondary); }

  .listBody { min-height: 0; padding: 0 var(--space-2) var(--space-4); overflow-y: auto; overscroll-behavior: contain; }
  .listEmpty { padding: var(--space-8) var(--space-4); font-size: var(--text-footnote); color: var(--color-label-secondary); text-align: center; }
  .listEnd { display: grid; place-items: center; min-height: var(--space-6); padding: var(--space-2) var(--space-4) var(--space-4); font-size: var(--text-caption-1); color: var(--color-label-secondary); }
  .groupTitle {
    position: sticky; top: 0; z-index: 1; display: flex; gap: var(--space-2); align-items: center; padding: var(--space-3) var(--space-2) var(--space-1);
    font-size: var(--text-caption-1); font-weight: 600; color: var(--color-label-secondary); background-color: var(--color-bg);
  }
  .groupCount {
    min-width: 1.125rem; padding-inline: 0.3125rem; font-size: var(--text-caption-2); font-weight: 650; line-height: 1.125rem; color: var(--color-label-secondary);
    text-align: center; background-color: var(--color-fill-tertiary); border-radius: var(--radius-full);
  }

  /* Entrada em cascata: cada linha sobe e aparece 24 ms depois da anterior, até a 12ª. */
  .itemEnter, .groupTitle { animation: ${rise} 260ms var(--ease-standard) both; animation-delay: calc(min(var(--i, 0), 12) * 24ms); }

  .listSkeleton li { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--space-3); align-items: center; padding: var(--space-2-5) var(--space-2); }
  .listSkeleton li > span:last-child { display: grid; gap: 0.375rem; }
  .bone {
    display: block; height: 0.75rem; border-radius: var(--radius-sm);
    background: linear-gradient(100deg, var(--color-fill-quaternary) 30%, var(--color-fill-secondary) 50%, var(--color-fill-quaternary) 70%); background-size: 250% 100%;
    animation: ${pendingShine} 1.3s var(--ease-standard) infinite;
  }

  .item {
    display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--space-3); align-items: start; width: 100%; padding: var(--space-2-5) var(--space-2);
    text-align: start; border-radius: var(--radius-lg); transition: background-color var(--duration-fast) var(--ease-standard);
  }
  @media (hover: hover) { .item:hover { background-color: var(--color-fill-quaternary); } }
  .item[data-selected] { background-color: var(--color-fill-tertiary); }
  .item:focus-visible { outline: 2px solid var(--color-focus); outline-offset: -2px; }

  /* A foto numa bolinha de borda reta; quem espera a equipe ganha o anel na cor do prazo. */
  .itemAvatar { position: relative; display: inline-flex; padding: 0.0625rem; border: 0.09375rem solid var(--ring, var(--color-border)); border-radius: 50%; }
  .itemAvatar[data-waiting] { --ring: var(--sys-orange); border-width: 0.125rem; }
  .ownerSeal {
    position: absolute; inset-block-end: -0.1875rem; inset-inline-end: -0.3125rem; display: inline-flex; border: 0.125rem solid var(--color-bg); border-radius: 50%;
  }
  .itemText { display: grid; gap: 0.125rem; min-width: 0; }
  .itemRow { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); min-width: 0; }
  .itemRow strong { overflow: hidden; font-size: var(--text-subhead); font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
  .item[data-unread] .itemRow strong { font-weight: 650; }
  .itemRow .itemName { display: inline-flex; gap: 0.375rem; align-items: center; min-width: 0; }
  .itemName > span:last-child { overflow: hidden; text-overflow: ellipsis; }
  /* Escreveu e ainda não teve resposta da equipe: um selo discreto, sem cor de alerta. */
  .newBadge {
    flex-shrink: 0; padding: 0 0.3125rem; font-size: var(--text-caption-2); font-weight: 600; line-height: 1.125rem; color: var(--color-label-secondary);
    letter-spacing: 0.01em; background-color: var(--color-fill-tertiary); border-radius: var(--radius-xs);
  }
  .newBadge[data-tone="warning"] { color: var(--sys-orange); background-color: color-mix(in srgb, var(--sys-orange) 12%, transparent); }
  .newBadge[data-tone="info"] { color: var(--sys-blue); background-color: color-mix(in srgb, var(--sys-blue) 12%, transparent); }
  .itemRow time { flex-shrink: 0; font-size: var(--text-caption-1); font-variant-numeric: tabular-nums; color: var(--color-label-secondary); }
  .item[data-unread] .itemRow time { font-weight: 600; color: var(--sys-green); }
  .preview { display: flex; align-items: center; gap: 0.25rem; min-width: 0; font-size: var(--text-footnote); color: var(--color-label-secondary); }
  .preview > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .preview svg { flex-shrink: 0; width: 0.9375rem; height: 0.9375rem; }
  .preview svg[data-read] { color: var(--tick-read); }
  .preview svg[data-failed] { color: var(--sys-red); }
  .preview svg[data-note] { color: var(--sys-yellow); }
  .preview mark { font-weight: 600; color: var(--color-ink); background: var(--color-fill-tertiary); border-radius: 0.125rem; }
  .item[data-unread] .preview { color: var(--color-ink); }
  .draftLabel { font-style: normal; font-weight: 600; color: var(--sys-blue); }
  .itemFlags { display: inline-flex; flex-shrink: 0; align-items: center; gap: 0.3rem; color: var(--color-label-tertiary); }
  .itemFlags svg { width: 0.875rem; height: 0.875rem; }
  .itemFlags svg[data-star] { color: ${({ theme }) => (theme.mode === "dark" ? "#fbbf24" : "#d97706")}; }
  /* Vista e sem resposta: o mesmo tamanho do "Novo", em contorno. */
  .replyBadge {
    padding: 0 0.3125rem; font-size: var(--text-caption-2); font-weight: 600; line-height: 1rem; color: var(--sys-orange); white-space: nowrap; letter-spacing: 0.01em;
    border: 1px solid color-mix(in srgb, var(--sys-orange) 40%, transparent); border-radius: var(--radius-xs);
  }
  .itemFlags b {
    min-width: 1.25rem; padding-inline: 0.3rem; font-size: var(--text-caption-2); font-weight: 650; line-height: 1.25rem; color: #fff; text-align: center;
    background-color: var(--sys-green); border-radius: var(--radius-full);
  }
  .itemLabels { display: flex; gap: 0.25rem; min-width: 0; overflow: hidden; }
  .itemLabels span {
    flex-shrink: 0; max-width: 7rem; padding: 0 0.3125rem; overflow: hidden; font-size: var(--text-caption-2); font-weight: 500; line-height: 1.0625rem;
    color: var(--color-label-secondary); text-overflow: ellipsis; white-space: nowrap; background-color: var(--color-fill-quaternary); border-radius: var(--radius-xs);
  }

  /* O trilho: só as fotos, o não lido num selo no canto e o nome no título. */
  &[data-rail] .listHead, &[data-rail] .itemText, &[data-rail] .groupTitle, &[data-rail] .listEmpty { display: none; }
  .railHead { display: grid; place-items: center; padding: var(--space-3) 0 var(--space-2); border-block-end: var(--line); }
  &[data-rail] { grid-template-rows: auto minmax(0, 1fr); }
  &[data-rail] .listBody { padding: var(--space-2) var(--space-1) var(--space-4); scrollbar-width: none; }
  &[data-rail] .item { grid-template-columns: auto; justify-content: center; padding: var(--space-1-5) 0; }
  .railUnread {
    position: absolute; top: -0.25rem; inset-inline-end: -0.375rem; min-width: 1.125rem; padding-inline: 0.25rem; font-size: 0.625rem; font-weight: 650; line-height: 1.125rem;
    color: #fff; text-align: center; background-color: var(--sys-green); border: 0.125rem solid var(--color-bg); border-radius: var(--radius-full);
  }

  @media (prefers-reduced-motion: reduce) { .itemEnter, .groupTitle, .bone { animation: none; } }
  /* Celular: espaço para a barra flutuante do ERP não cobrir as últimas conversas. */
  @media (max-width: 1024px) { .listBody { padding-bottom: 6rem; } }
`;

/* ------------------------------------------------------------------ conversa */
const balloes = css`
  .row { display: flex; flex-direction: column; align-items: flex-start; }
  .row[data-out] { align-items: flex-end; }
  .row[data-first] { margin-top: var(--space-2); }
  .passThrough { display: contents; }
  .templateStack { display: grid; gap: 0.125rem; max-width: min(36rem, 78%); }
  .templateStack > .bubble { max-width: 100%; }

  .bubble {
    --tail: 0.5rem; --bubble-bg: var(--tone-contact);
    position: relative; display: grid; gap: 0.25rem; max-width: min(36rem, 78%); padding: 0.375rem 0.5625rem 0.3125rem; color: var(--color-ink);
    background-color: var(--bubble-bg); border-radius: 0.75rem; box-shadow: 0 0.0625rem 0.0625rem rgb(0 0 0 / 0.06);
  }
  /* A mensagem subindo: um brilho suave atravessa a bolha até o servidor confirmar. */
  .bubble[data-pending]::after {
    position: absolute; inset: 0; pointer-events: none; content: ""; border-radius: inherit;
    background: linear-gradient(100deg, transparent 25%, color-mix(in oklab, white 42%, transparent) 50%, transparent 75%); background-size: 250% 100%;
    animation: ${pendingShine} 1.3s var(--ease-standard) infinite;
  }
  .imageSkeleton {
    display: block; width: min(16rem, 60vw); aspect-ratio: 4 / 3; border-radius: 0.5625rem;
    background: linear-gradient(100deg, color-mix(in oklab, var(--color-ink) 7%, transparent) 30%, color-mix(in oklab, var(--color-ink) 13%, transparent) 50%, color-mix(in oklab, var(--color-ink) 7%, transparent) 70%);
    background-size: 250% 100%; animation: ${pendingShine} 1.3s var(--ease-standard) infinite;
  }
  .bubble[data-tone="agent"] { --bubble-bg: var(--tone-agent); }
  .bubble[data-tone="template"] { --bubble-bg: var(--tone-template); }
  .bubble[data-tone="note"] { --bubble-bg: var(--tone-note); border: 0.0625rem dashed color-mix(in oklab, var(--sys-yellow) 60%, transparent); }
  /* O rabinho: um triângulo da cor do balão, colado no canto de cima, só no primeiro do bloco. */
  .bubble[data-first]::before { position: absolute; top: 0; width: var(--tail); height: 0.8125rem; content: ""; background-color: var(--bubble-bg); }
  .row:not([data-out]) .bubble[data-first] { border-start-start-radius: 0; }
  .row:not([data-out]) .bubble[data-first]::before { inset-inline-start: calc(var(--tail) * -1); clip-path: polygon(0 0, 100% 0, 100% 100%); }
  .row[data-out] .bubble[data-first] { border-start-end-radius: 0; }
  .row[data-out] .bubble[data-first]::before { inset-inline-end: calc(var(--tail) * -1); clip-path: polygon(0 0, 100% 0, 0 100%); }
  .bubble[data-tone="note"][data-first]::before { display: none; }
  .bubble[data-tone="note"][data-first] { border-radius: 0.75rem; }
  .bubble[data-media] { padding: 0.1875rem; }
  .bubble[data-reacted] { margin-block-end: 1.125rem; }

  .bubbleAuthor { display: inline-flex; align-items: center; gap: 0.25rem; font-size: var(--text-caption-1); font-weight: 600; color: var(--author, var(--sys-blue)); }
  .bubble[data-tone="template"] .bubbleAuthor { --author: var(--author-template); }
  .bubble[data-tone="note"] .bubbleAuthor { --author: var(--author-note); }
  .bubble[data-media] .bubbleAuthor { padding: 0.25rem 0.375rem 0; }
  .bubbleAuthor svg { width: 0.75rem; height: 0.75rem; }

  .image { display: block; width: 100%; max-width: 18rem; max-height: 20rem; object-fit: cover; border-radius: 0.5625rem; }
  .mediaLink { display: block; padding: 0; border: 0; border-radius: 0.5625rem; background: none; cursor: zoom-in; }
  .imageMissing { display: inline-flex; gap: var(--space-1-5); align-items: center; padding: var(--space-2) var(--space-3); font-size: var(--text-footnote); color: var(--color-label-secondary); }
  .imageMissing svg { width: 1rem; height: 1rem; }
  .audioBox { min-width: 15rem; padding: 0.25rem 0.25rem 0.25rem 0; }

  /* O álbum de fotos: a grade como a do WhatsApp; com número ímpar, a primeira ocupa a linha inteira. */
  .album { display: grid; grid-template-columns: 1fr 1fr; gap: 0.1875rem; width: 16rem; max-width: 100%; overflow: hidden; border-radius: calc(var(--radius-lg) - 0.25rem); }
  .album[data-odd] > :first-child { grid-column: 1 / -1; aspect-ratio: 2 / 1; }
  .albumCell { position: relative; display: block; aspect-ratio: 1; padding: 0; overflow: hidden; background-color: color-mix(in oklab, var(--color-ink) 8%, transparent); cursor: zoom-in; }
  .albumCell img { display: block; width: 100%; height: 100%; object-fit: cover; }

  .document {
    display: flex; align-items: center; gap: var(--space-2); min-width: 14rem; padding: var(--space-2); color: inherit; text-decoration: none;
    background-color: color-mix(in oklab, var(--color-ink) 5%, transparent); border-radius: 0.5rem;
  }
  .document > svg { flex-shrink: 0; width: 2rem; height: 2rem; color: var(--sys-red); }
  .document > span { display: grid; min-width: 0; }
  .document strong { overflow: hidden; font-size: var(--text-footnote); font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
  .document small { font-size: var(--text-caption-2); color: var(--color-label-secondary); }

  .text { margin: 0; font-size: var(--text-subhead); line-height: 1.4; overflow-wrap: anywhere; white-space: pre-wrap; }
  .text a { color: var(--sys-blue); text-decoration: underline; text-decoration-color: color-mix(in oklab, var(--sys-blue) 40%, transparent); text-underline-offset: 0.125rem; }
  .text code { padding: 0 0.25rem; font-family: var(--font-mono); font-size: 0.875em; background: color-mix(in oklab, var(--color-ink) 7%, transparent); border-radius: 0.25rem; }
  .bubble[data-media] .text { padding: 0.125rem 0.375rem 0; }
  /* Reserva o lugar da hora na última linha, para ela nunca cobrir o texto. */
  .spacer { display: inline-block; width: 3.75rem; }
  .row[data-out] .spacer { width: 4.75rem; }
  .template { display: grid; gap: 0.25rem; }
  .templateHeader { font-size: var(--text-subhead); font-weight: 700; line-height: 1.3; }
  .templateFooter { font-size: var(--text-caption-1); line-height: 1.3; color: var(--color-label-secondary); }

  .meta {
    position: absolute; inset-inline-end: 0.5625rem; bottom: 0.25rem; display: inline-flex; align-items: center; gap: 0.1875rem; font-size: var(--text-caption-2);
    font-variant-numeric: tabular-nums; color: var(--color-label-secondary);
  }
  .meta svg { width: 0.9375rem; height: 0.9375rem; }
  .meta svg[data-read] { color: var(--tick-read); }
  .meta[data-overlay] { inset-inline-end: 0.5rem; bottom: 0.4375rem; padding: 0.0625rem 0.375rem; color: #fff; background-color: rgb(0 0 0 / 0.35); border-radius: var(--radius-full); }
  .meta[data-overlay] svg[data-read] { color: #8fdcff; }
  /* Sem texto (áudio, documento) a hora vai para uma linha própria. */
  .bubble:not(:has(.text)):not([data-media]) .meta { position: static; justify-self: end; }
  .failed { color: var(--sys-red); }

  /* Responder, reagir e salvar na ficha: as bolinhas que aparecem ao lado da bolha ao passar o mouse. */
  .replyButton, .fileButton, .reactTrigger {
    position: absolute; top: 50%; display: grid; place-items: center; width: 1.75rem; height: 1.75rem; color: var(--color-label-secondary); background-color: var(--color-bg);
    border: var(--line); border-radius: 50%; box-shadow: var(--shadow-sm); opacity: 0; transform: translateY(-50%); transition: opacity var(--duration-fast) var(--ease-standard);
  }
  .replyButton svg, .fileButton svg, .reactTrigger svg { width: 0.875rem; height: 0.875rem; }
  .row:not([data-out]) .replyButton { inset-inline-start: calc(100% + var(--space-2)); }
  .row[data-out] .replyButton { inset-inline-end: calc(100% + var(--space-2)); }
  .row:not([data-out]) .fileButton { inset-inline-start: calc(100% + var(--space-2) + 2rem); }
  .row:not([data-out]) .fileButton[data-shift] { inset-inline-start: calc(100% + var(--space-2) + 4rem); }
  .row[data-out] .fileButton { inset-inline-end: calc(100% + var(--space-2) + 2rem); }
  .row[data-out] .fileButton[data-shift] { inset-inline-end: calc(100% + var(--space-2) + 4rem); }
  .reactAnchor { position: absolute; top: 50%; z-index: 2; width: 1.75rem; height: 1.75rem; transform: translateY(-50%); }
  .reactAnchor[data-side="out"] { inset-inline-end: calc(100% + var(--space-2) + 2rem); }
  .reactAnchor[data-side="in"] { inset-inline-start: calc(100% + var(--space-2) + 2rem); }
  .reactAnchor .reactTrigger { position: static; transform: none; }
  .bubble:hover .replyButton, .bubble:hover .fileButton, .bubble:hover .reactTrigger, .reactAnchor[data-open] .reactTrigger,
  .replyButton:focus-visible, .fileButton:focus-visible, .reactTrigger:focus-visible { opacity: 1; }
  @media (hover: none) { .replyButton, .fileButton, .reactAnchor { display: none; } }
  .reactPicker {
    position: absolute; bottom: calc(100% + var(--space-1)); inset-inline-start: 50%; display: flex; gap: 0.125rem; padding: var(--space-1); background-color: var(--color-elevated);
    border: var(--line); border-radius: var(--radius-full); box-shadow: var(--shadow-md); transform: translateX(-50%); animation: ${pickerIn} var(--duration-base) var(--ease-settle);
  }
  .reactEmoji { display: grid; place-items: center; width: 2rem; height: 2rem; font-size: 1.25rem; line-height: 1; border-radius: 50%; transition: transform var(--duration-fast) var(--ease-standard); }
  .reactEmoji:hover { transform: scale(1.18); }
  .reactEmoji[data-on] { background-color: var(--color-fill-tertiary); }
  .pill {
    position: absolute; inset-inline-end: 0.5rem; bottom: -1.125rem; z-index: 1; display: inline-flex; gap: 0.125rem; align-items: center; padding: 0.0625rem 0.375rem;
    font-size: 0.8125rem; line-height: 1.3; background-color: var(--color-elevated); border: var(--line); border-radius: var(--radius-full); box-shadow: var(--shadow-sm);
  }
  .pill small { font-size: 0.6875rem; color: var(--color-label-secondary); }
  .messageMore { position: absolute; inset-inline-end: 0.125rem; inset-block-start: 0.125rem; display: grid; place-items: center; width: 1.375rem; height: 1.375rem; color: var(--color-label-secondary); background: var(--bubble-bg); border-radius: 50%; opacity: 0; transition: opacity 0.15s; }
  .messageMore svg { width: 1rem; height: 1rem; }
  .bubble:hover .messageMore, .messageMore:focus-visible { opacity: 1; }

  .failedLine, .sendingLine { margin-top: 0.25rem; font-size: var(--text-caption-1); }
  .failedLine { color: var(--sys-red); }
  .sendingLine { color: var(--color-label-secondary); }
  .failedLine button { font-weight: 600; text-decoration: underline; text-underline-offset: 0.125rem; }

  /* A citação de uma mensagem, no campo (ao responder) e dentro do balão (o que foi respondido). */
  .replyQuote {
    display: flex; gap: var(--space-2); align-items: center; width: 100%; min-width: 0; padding: var(--space-1-5) var(--space-1-5) var(--space-1-5) var(--space-3); overflow: hidden; text-align: start;
    background-color: color-mix(in oklab, var(--quote) 9%, var(--color-fill-quaternary)); border-inline-start: 0.25rem solid var(--quote); border-radius: var(--radius-md);
  }
  .replyQuote[data-in-field] { padding-block: var(--space-2); }
  .replyQuoteCopy { display: grid; flex: 1; gap: 0.125rem; min-width: 0; }
  .replyQuoteCopy > strong { overflow: hidden; font-size: var(--text-caption-1); font-weight: 600; color: var(--quote); text-overflow: ellipsis; white-space: nowrap; }
  .replyQuoteBody { display: -webkit-box; overflow: hidden; font-size: var(--text-footnote); line-height: 1.35; color: var(--color-label-secondary); overflow-wrap: anywhere; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .replyQuoteBody:not([data-kind="text"]) { display: flex; gap: 0.3125rem; align-items: center; white-space: nowrap; }
  .replyQuoteBody svg { flex-shrink: 0; width: 0.9375rem; height: 0.9375rem; color: var(--color-label-tertiary); }
  .replyQuoteClose { display: grid; flex-shrink: 0; place-items: center; width: 1.75rem; height: 1.75rem; color: var(--color-label-secondary); border-radius: var(--radius-md); }
  .replyQuoteClose:hover { color: var(--color-ink); background-color: var(--color-fill-tertiary); }
  .bubble .replyQuote { margin-bottom: 0.25rem; }

  .templateButtons { display: grid; gap: 0.125rem; }
  .templateButtons > span {
    display: flex; gap: 0.375rem; align-items: center; justify-content: center; min-height: 2.25rem; padding: 0.375rem 0.75rem; font-size: var(--text-footnote); font-weight: 500;
    color: var(--sys-blue); background-color: var(--tone-template); border-radius: 0.75rem; box-shadow: 0 0.0625rem 0.0625rem rgb(0 0 0 / 0.06);
  }
  .templateButtons svg { flex-shrink: 0; width: 1rem; height: 1rem; }

  @media (max-width: 767px) { .bubble { max-width: 88%; } }
  @media (prefers-reduced-motion: reduce) { .bubble[data-pending]::after, .imageSkeleton { animation: none; } }
`;

const campo = css`
  /* O campo fixo no pé da conversa, por cima das mensagens. */
  .dock { position: absolute; inset-inline: 0; bottom: 0; z-index: 3; pointer-events: none; }
  .composer { position: relative; display: grid; gap: var(--space-1-5); padding: var(--space-6) 0 0; pointer-events: auto; }
  /* A caixa do campo: uma superfície só, o texto em cima e a fileira de funções embaixo. */
  .box {
    position: relative; display: grid; gap: var(--space-1); padding: var(--space-3) clamp(var(--space-3), 4%, 3rem) var(--space-2); cursor: text;
    background-color: var(--color-bg); border: 0; border-block-start: 0.0625rem solid var(--color-border);
  }
  .box[data-note] { background-color: color-mix(in oklab, var(--sys-yellow) 9%, var(--color-bg)); border-color: color-mix(in oklab, var(--sys-yellow) 40%, var(--color-border)); }
  .field {
    width: 100%; min-height: 3rem; max-height: 11rem; padding: var(--space-1) var(--space-1) 0; font: inherit; font-size: max(var(--text-subhead), 16px); line-height: 1.5;
    color: var(--color-ink); resize: none; background: transparent; border: 0; outline: none;
  }
  @media (pointer: fine) { .field { font-size: var(--text-subhead); } }
  .field::placeholder { color: var(--color-label-tertiary); }
  .tools { display: flex; gap: var(--space-2); align-items: center; justify-content: space-between; cursor: default; }
  .toolGroup { display: flex; gap: 0.125rem; align-items: center; min-width: 0; }
  .toolGroup:last-child { gap: var(--space-3); }
  .tool { display: grid; flex-shrink: 0; place-items: center; width: 2rem; height: 2rem; color: var(--color-label-secondary); border-radius: var(--radius-md); transition: background-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard); }
  .tool svg { width: 1.125rem; height: 1.125rem; }
  .tool:hover:not(:disabled), .tool[aria-expanded="true"] { color: var(--color-ink); background-color: var(--color-fill-quaternary); }
  .tool[data-on] { color: var(--color-ink); background-color: var(--color-fill-tertiary); }
  .tool:disabled { cursor: default; opacity: 0.4; }
  .tool:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 1px; }
  .toolDivider { width: 0.0625rem; height: 1rem; margin-inline: var(--space-1); background-color: var(--color-border); }
  .toolHint { display: inline-flex; gap: var(--space-3); align-items: center; overflow: hidden; font-size: var(--text-caption-2); color: var(--color-label-tertiary); white-space: nowrap; }
  .toolHint > span { display: inline-flex; gap: 0.25rem; align-items: center; }
  kbd {
    padding: 0 0.25rem; font-family: inherit; font-size: var(--text-caption-2); font-weight: 500; color: var(--color-label-secondary); background-color: var(--color-fill-quaternary);
    border: 0.0625rem solid var(--color-border); border-radius: var(--radius-xs);
  }
  /* Onde não sobra largura, as dicas de teclado saem antes de qualquer botão. */
  @container thread (max-width: 52rem) { .toolHint > span:last-child { display: none; } }
  @container thread (max-width: 42.5rem) { .toolHint { display: none; } }
  /* Mensagem | Nota interna: o seletor em largura cheia; no campo estreito, o botão do cadeado. */
  .modeSwitch { display: inline-flex; flex-shrink: 0; padding: 0.125rem; margin-inline-end: var(--space-1); background-color: var(--color-fill-tertiary); border-radius: var(--radius-md); }
  .modeSwitch button { height: 1.625rem; padding-inline: var(--space-2-5); font-size: var(--text-footnote); font-weight: 500; color: var(--color-label-secondary); white-space: nowrap; border-radius: calc(var(--radius-md) - 0.125rem); transition: background-color var(--duration-fast) var(--ease-standard); }
  .modeSwitch button[aria-pressed="true"] { color: var(--color-ink); background-color: var(--color-elevated); box-shadow: var(--shadow-sm); }
  .modeSwitch button:disabled { cursor: default; opacity: 0.5; }
  .modeNarrow { display: none; }
  @container thread (max-width: 31.5rem) { .modeSwitch { display: none; } .modeNarrow { display: grid; } }
  .send {
    display: grid; flex-shrink: 0; place-items: center; width: 2rem; height: 2rem; color: var(--color-bg); background-color: var(--color-ink); border-radius: var(--radius-md);
    transition: transform var(--duration-fast) var(--ease-standard), background-color var(--duration-fast) var(--ease-standard);
  }
  .send svg { width: 1rem; height: 1rem; }
  .send[data-soft] { color: var(--color-label-secondary); background-color: transparent; }
  @media (hover: hover) { .send[data-soft]:hover { color: var(--color-ink); background-color: var(--color-fill-quaternary); } }
  .send:active { transform: scale(0.94); }
  .send:disabled { cursor: default; opacity: 0.35; }
  .send:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }

  /* Os painéis que sobem da barra do campo, de ponta a ponta: respostas rápidas e emojis. */
  .quick, .emojiPanel {
    position: absolute; bottom: calc(100% - var(--space-6)); inset-inline: 0; z-index: 5; height: min(18rem, 50vh); overflow: hidden; background-color: var(--color-bg);
    border-block-start: var(--line); animation: ${sheetIn} var(--duration-base) var(--ease-settle);
  }
  .quick { display: grid; grid-template-rows: minmax(0, 1fr); grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .quickList { display: flex; flex-direction: column; gap: 0.125rem; min-height: 0; padding: var(--space-1-5); overflow-y: auto; border-inline-end: var(--line); }
  .quickList > button {
    display: flex; flex-shrink: 0; gap: var(--space-2); align-items: center; justify-content: space-between; min-height: 2.25rem; padding: var(--space-1-5) var(--space-2);
    font-size: var(--text-footnote); font-weight: 500; text-align: start; border-radius: var(--radius-md);
  }
  .quickList > button > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .quickList > button[data-active] { background-color: var(--color-fill-tertiary); }
  .quickList > button[data-new] { color: var(--color-label-secondary); }
  .quickPreview { display: flex; flex-direction: column; gap: var(--space-2); min-height: 0; padding: var(--space-1-5) var(--space-3) var(--space-3); overflow-y: auto; }
  .quickPreview > p { flex: 1; font-size: var(--text-footnote); line-height: 1.55; color: var(--color-ink); white-space: pre-wrap; }
  .quickKeys { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-3); font-size: var(--text-caption-2); color: var(--color-label-tertiary); }
  .quickActions { display: flex; gap: var(--space-2); }
  .quickActions button { font-size: var(--text-caption-1); font-weight: 600; color: var(--color-label-secondary); text-decoration: underline; text-underline-offset: 0.125rem; }
  .quickActions button:hover { color: var(--color-ink); }
  .popoverTitle { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--space-2); font-size: var(--text-caption-1); font-weight: 600; color: var(--color-label-secondary); }
  .quickPreview .popoverTitle { padding-inline: 0; }
  .popoverEmpty { padding: var(--space-3); font-size: var(--text-footnote); color: var(--color-label-secondary); }
  @container thread (max-width: 34rem) { .quick { grid-template-columns: 1fr; } .quickPreview { display: none; } }
  .emojiPanel { display: grid; grid-template-rows: auto minmax(0, 1fr); }
  .emojiGroups { display: flex; gap: 0.125rem; padding: var(--space-1-5) var(--space-2); overflow-x: auto; border-block-end: var(--line); scrollbar-width: none; }
  .emojiGroups button { flex-shrink: 0; height: 1.75rem; padding-inline: var(--space-2-5); font-size: var(--text-caption-1); font-weight: 500; color: var(--color-label-secondary); border-radius: var(--radius-md); }
  .emojiGroups button[aria-pressed="true"] { color: var(--color-ink); background-color: var(--color-fill-tertiary); }
  .emojiGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(2.25rem, 1fr)); align-content: start; min-height: 0; padding: var(--space-2); overflow-y: auto; }
  .emojiGrid button { display: grid; place-items: center; height: 2.25rem; font-size: 1.25rem; line-height: 1; border-radius: var(--radius-md); }
  .emojiGrid button:hover { background-color: var(--color-fill-tertiary); }

  /* Os arquivos escolhidos no "+", dentro da caixa, acima do texto. */
  .attachments { display: grid; gap: var(--space-2); }
  .attachRows, .attachThumbs { display: grid; gap: 0.375rem; }
  .attachRow { --gap: 0.1875rem; display: flex; align-items: stretch; max-width: 26rem; padding: var(--gap); background-color: var(--color-fill-tertiary); border-radius: var(--radius-lg); }
  .attachRowBody { display: flex; flex: 1; gap: var(--space-2); align-items: center; min-width: 0; min-height: 2.25rem; padding-inline: var(--space-2-5); background-color: var(--color-bg); border-radius: calc(var(--radius-lg) - var(--gap)); box-shadow: 0 0 0 0.0625rem var(--color-border); }
  .attachRowBody > svg { flex-shrink: 0; width: 1.125rem; height: 1.125rem; color: var(--color-label-secondary); }
  .attachRowBody strong { flex: 1; min-width: 0; overflow: hidden; font-size: var(--text-footnote); font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
  .attachRowBody small { flex-shrink: 0; font-size: var(--text-caption-1); color: var(--color-label-secondary); }
  .attachRowRemove { display: grid; align-self: center; place-items: center; width: 1.75rem; height: 1.75rem; margin-inline: 0.125rem; color: var(--color-label-secondary); border-radius: var(--radius-md); }
  .attachThumbs { display: flex; flex-wrap: wrap; gap: var(--space-2); padding-block-start: 0.375rem; }
  .attachThumb { position: relative; width: 4.5rem; height: 4.5rem; }
  .attachThumb img, .attachThumb video { display: block; width: 100%; height: 100%; object-fit: cover; border-radius: var(--radius-lg); box-shadow: 0 0 0 0.0625rem var(--color-border); }
  .attachThumb[data-video] { width: 12rem; height: 7rem; }
  .attachThumb video { object-fit: contain; background: #171b1b; }
  .attachSize { position: absolute; inset: auto auto 0.25rem 0.25rem; padding: 0.0625rem 0.3125rem; font-size: var(--text-caption-2); font-weight: 500; color: #fff; pointer-events: none; background-color: rgb(0 0 0 / 0.55); border-radius: var(--radius-sm); }
  .attachThumb[data-video] .attachSize { inset: 0.25rem auto auto 0.25rem; }
  .attachRemove { position: absolute; inset: -0.375rem -0.375rem auto auto; display: grid; place-items: center; width: 1.375rem; height: 1.375rem; color: var(--color-ink); background-color: var(--color-elevated); border-radius: 999px; box-shadow: 0 0 0 0.0625rem var(--color-border), var(--shadow-sm); }
  .attachRemove svg { width: 0.75rem; height: 0.75rem; }
  .attachMore { display: grid; place-items: center; width: 4.5rem; height: 4.5rem; color: var(--color-label-secondary); background-color: var(--color-fill-tertiary); border-radius: var(--radius-lg); }
  .attachMore:hover { color: var(--color-ink); background-color: var(--color-fill-secondary); }
  .drop {
    position: absolute; inset: 0.25rem; z-index: 2; display: grid; gap: 0.125rem; place-content: center; text-align: center; pointer-events: none;
    background-color: color-mix(in oklab, var(--color-bg) 92%, transparent); border: 0.09375rem dashed var(--color-label-tertiary); border-radius: var(--radius-lg);
  }
  .drop strong { display: inline-flex; gap: 0.375rem; align-items: center; justify-content: center; font-size: var(--text-footnote); font-weight: 600; }
  .drop small { font-size: var(--text-caption-1); color: var(--color-label-secondary); }

  /* Janela de 24h fechada: o aviso e o único caminho, no centro do pé da conversa; com a nota disponível, vira uma faixa. */
  .closedBlock { display: grid; gap: var(--space-2); justify-items: center; padding: var(--space-3) var(--space-4) var(--space-3); text-align: center; background-color: var(--color-bg); border-block-start: 0.0625rem solid var(--color-border); }
  .closedText { display: inline-flex; gap: 0.375rem; align-items: center; font-size: var(--text-footnote); line-height: 1.4; color: var(--color-label-secondary); }
  .closedText svg, .closedStrip > svg { flex-shrink: 0; width: 0.875rem; height: 0.875rem; color: var(--color-label-tertiary); }
  .closedStrip {
    display: flex; gap: var(--space-2); align-items: center; margin-block-end: calc(-1 * var(--space-1-5)); padding: var(--space-2) clamp(var(--space-3), 4%, 3rem); font-size: var(--text-footnote);
    line-height: 1.4; color: var(--color-label-secondary); background-color: var(--color-bg); border-block-start: 0.0625rem solid var(--color-border);
  }
  .closedStrip > span { flex: 1; min-width: 0; }

  /* A gravação de voz no lugar do texto: descartar, relógio, a onda ao vivo, pausar e enviar. */
  .recorder { --rec-accent: var(--color-brand); display: flex; gap: var(--space-2); align-items: center; min-height: 3.25rem; padding: var(--space-2); animation: ${recorderIn} var(--duration-base) var(--ease-settle); }
  .recButton, .recPlay, .recSend {
    display: grid; flex: none; place-items: center; width: 2.25rem; height: 2.25rem; padding: 0; color: var(--color-ink); background-color: var(--color-fill-tertiary); border-radius: 50%;
    transition: transform var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard), background-color var(--duration-fast) var(--ease-standard);
  }
  .recButton svg, .recPlay svg, .recSend svg { width: 1.0625rem; height: 1.0625rem; }
  .recPlay { color: var(--rec-accent); background-color: color-mix(in oklab, var(--rec-accent) 10%, transparent); }
  .recSend { width: 2.5rem; height: 2.5rem; color: var(--color-bg); background-color: var(--rec-accent); }
  .recButton:hover { background-color: var(--color-fill-secondary); }
  .recButton[data-tone="danger"]:hover { color: var(--sys-red); background-color: color-mix(in oklab, var(--sys-red) 12%, transparent); }
  .recSend:hover { background-color: color-mix(in oklab, var(--rec-accent) 86%, var(--color-bg)); }
  .recButton:active, .recPlay:active, .recSend:active { transform: scale(0.94); }
  .recButton:disabled, .recPlay:disabled { cursor: default; opacity: 0.45; }
  .recClock { display: inline-flex; flex: none; gap: var(--space-2); align-items: center; min-width: 3rem; padding-inline: var(--space-1); font-size: var(--text-subhead); font-weight: 600; font-variant-numeric: tabular-nums; color: var(--rec-accent); }
  .recDot { flex: none; width: 0.5rem; height: 0.5rem; background-color: var(--sys-red); border-radius: 50%; animation: ${recPulse} 1.2s var(--ease-standard) infinite; }
  .recWave { display: flex; flex: 1; gap: 2px; align-items: center; justify-content: flex-end; min-width: 0; height: 1.75rem; overflow: hidden; }
  .recWave i { flex: 0 0 3px; height: max(3px, calc(var(--level, 0.14) * 100%)); background-color: var(--rec-accent); border-radius: 2px; transition: height 90ms linear; }
  .recWave[data-still] i { background-color: color-mix(in oklab, var(--rec-accent) 28%, transparent); }
  .recWave[data-still] i[data-played] { background-color: var(--rec-accent); }
  .recHint { flex: none; font-size: var(--text-caption-1); color: var(--color-label-secondary); }
  .composerError { padding: 0 clamp(var(--space-3), 4%, 3rem) var(--space-2); font-size: var(--text-footnote); color: var(--sys-red); background-color: var(--color-bg); }

  /* Celular e tablet: o dock do ERP flutua no pé da tela; o campo termina logo acima dele, com o fundo preenchido. */
  @media (max-width: 1024px) { .composer::after { display: block; height: ${DOCK_CLEARANCE}; content: ""; background-color: var(--color-bg); } }
  @media (max-width: 767px) { .wideOnly { display: none; } }
  @media (max-width: 600px) { .field { min-height: 1.5rem; max-height: 24dvh; } .composer { padding-top: var(--space-2); gap: 0; } }
  @media (prefers-reduced-motion: reduce) { .recorder, .recDot, .quick, .emojiPanel { animation: none; } }
`;

export const ColunaConversa = styled.section`
  position: relative;
  isolation: isolate;
  container: thread / inline-size;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background-color: var(--chat-bg);
  background-image: radial-gradient(var(--chat-dots) 0.0625rem, transparent 0.0625rem);
  background-size: 1.125rem 1.125rem;

  .threadEmpty { display: grid; flex: 1; place-items: center; padding: var(--space-6); }
  .threadHead { display: flex; align-items: center; gap: var(--space-3); min-height: 3.75rem; padding: var(--space-2) var(--space-3) var(--space-2) var(--space-4); background-color: var(--color-bg); border-block-end: var(--line); }
  .back { display: none; margin-inline-start: calc(var(--space-1) * -1); }
  .listToggle { flex-shrink: 0; margin-inline-start: calc(var(--space-1) * -1); }
  .threadName { display: grid; flex: 1; min-width: 6rem; line-height: 1.2; text-align: start; }
  .threadName strong { overflow: hidden; font-size: var(--text-callout); font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
  .threadTitle { display: flex; gap: var(--space-1-5); align-items: center; min-width: 0; }
  .threadTitle > :last-child { flex-shrink: 0; }
  .threadMeta { overflow: hidden; font-size: var(--text-caption-1); font-variant-numeric: tabular-nums; color: var(--color-label-secondary); text-overflow: ellipsis; white-space: nowrap; }
  /* A janela de 24 horas: o cadeado aberto (verde) ou fechado (laranja) ao lado do nome; a hora fica no título. */
  .windowBadge { display: inline-grid; place-items: center; width: 1.25rem; height: 1.25rem; color: var(--badge); background-color: color-mix(in oklab, var(--badge) 14%, transparent); border-radius: var(--radius-sm); }
  .windowBadge svg { width: 0.75rem; height: 0.75rem; }
  .windowBadge[data-open] { --badge: ${({ theme }) => theme.colors.success}; }
  .windowBadge:not([data-open]) { --badge: var(--sys-orange); }

  .threadActions { display: flex; flex-shrink: 0; align-items: center; gap: var(--space-1); }
  .iconGhost { display: grid; flex-shrink: 0; place-items: center; width: 2rem; height: 2rem; color: var(--color-label-secondary); border-radius: var(--radius-md); transition: background-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard); }
  .iconGhost svg { width: 1.125rem; height: 1.125rem; }
  .iconGhost:hover, .iconGhost[aria-expanded="true"] { color: var(--color-ink); background-color: var(--color-fill-quaternary); }
  .iconGhost:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 1px; }
  .iconGhost[data-soft] { color: var(--color-ink); background-color: var(--color-fill-tertiary); }
  .starToggle[aria-pressed="true"] { color: ${({ theme }) => (theme.mode === "dark" ? "#fbbf24" : "#d97706")}; }
  .chipButton, .statusChip {
    display: inline-flex; align-items: center; gap: var(--space-1-5); height: 2rem; padding-inline: var(--space-2); font-size: var(--text-footnote); font-weight: 500; white-space: nowrap;
    border: var(--line); border-radius: var(--radius-md); transition: background-color var(--duration-fast) var(--ease-standard);
  }
  .chipButton > svg, .statusChip > svg { width: 0.75rem; height: 0.75rem; color: var(--color-label-secondary); }
  .chipLabel { max-width: 7rem; overflow: hidden; text-overflow: ellipsis; }
  .noAssignee { display: inline-grid; place-items: center; width: 1.25rem; height: 1.25rem; color: var(--color-label-secondary); background-color: var(--color-fill-tertiary); border-radius: 50%; }
  .noAssignee svg { width: 0.75rem; height: 0.75rem; }
  @media (hover: hover) { .chipButton:hover, .statusChip:hover { background-color: var(--color-fill-quaternary); } }
  .statusChip::before { width: 0.4375rem; height: 0.4375rem; content: ""; background-color: var(--dot, ${({ theme }) => theme.colors.success}); border-radius: 50%; }
  .statusChip[data-status="aguardando"] { --dot: var(--sys-orange); }
  .statusChip[data-status="resolvida"] { --dot: var(--color-label-tertiary); }
  /* Conversa estreita (ficha aberta, tela média): os botões ficam só com o sinal. */
  @container thread (max-width: 46rem) { .chipLabel { display: none; } .chipButton, .statusChip { gap: 0.25rem; padding-inline: var(--space-1-5); } }

  /* A etapa da oportunidade presa abaixo do cabeçalho, como o funil fixado da Le Ange. */
  .pinnedPipeline { z-index: 2; display: flex; flex-shrink: 0; gap: var(--space-2); align-items: center; min-height: 2.5rem; padding: 0.25rem var(--space-3) 0.25rem var(--space-4); font-size: var(--text-footnote); background: var(--color-bg); border-block-end: var(--line); }
  .pinnedPipeline > span { color: var(--color-label-secondary); white-space: nowrap; }
  .pinnedPipeline .stageButton { display: inline-flex; gap: var(--space-1-5); align-items: center; height: 1.875rem; min-width: 0; padding-inline: var(--space-2); font-weight: 600; border-radius: var(--radius-md); }
  .pinnedPipeline .stageButton:hover, .pinnedPipeline .stageButton[aria-expanded="true"] { background-color: var(--color-fill-quaternary); }
  .pinnedPipeline .stageButton > svg { width: 0.75rem; height: 0.75rem; color: var(--color-label-secondary); }
  .pinnedPipeline .stageDot { flex-shrink: 0; width: 0.5rem; height: 0.5rem; background-color: var(--tone); border-radius: 50%; }
  .pinnedPipeline .stageSteps { display: flex; flex: 1; gap: 0.1875rem; min-width: 2rem; max-width: 12rem; }
  .pinnedPipeline .stageSteps i { flex: 1; height: 0.25rem; background-color: var(--color-fill-secondary); border-radius: 0.125rem; }
  .pinnedPipeline .stageSteps i[data-on] { background-color: var(--tone); }
  .pinnedPipeline .grow { flex: 1; }
  .pinnedPipeline a, .pinnedPipeline .linkButton { flex-shrink: 0; font-weight: 500; color: var(--color-label-secondary); white-space: nowrap; text-decoration: none; }
  .pinnedPipeline a:hover, .pinnedPipeline .linkButton:hover { color: var(--color-ink); text-decoration: underline; }
  @container thread (max-width: 34rem) { .pinnedPipeline .stageSteps, .pinnedPipeline > span { display: none; } }

  .messages {
    display: flex; flex: 1; flex-direction: column; gap: 0.125rem; min-height: 0; overflow-y: auto; overscroll-behavior: contain;
    /* Embaixo, a altura do campo flutuante e um respiro: a última mensagem fica sempre acima dele. */
    padding: var(--space-3) clamp(var(--space-4), 5%, 3.5rem) calc(var(--composer-h, 8rem) + var(--space-2));
  }
  .loading { margin: auto; font-size: var(--text-footnote); color: var(--color-label-secondary); }
  .threadSkeleton { display: flex; flex-direction: column; gap: var(--space-2); margin-top: auto; }
  .skeletonBubble { display: block; width: 14rem; max-width: 70%; height: 2.25rem; border-radius: 0.75rem; background: linear-gradient(100deg, var(--color-fill-quaternary) 30%, var(--color-fill-secondary) 50%, var(--color-fill-quaternary) 70%); background-size: 250% 100%; animation: ${pendingShine} 1.3s var(--ease-standard) infinite; }
  .skeletonBubble[data-out] { align-self: flex-end; width: 18rem; }
  /* Cada dia é um grupo: o selo fica preso no topo só enquanto o dia dele está na tela. */
  .dayGroup { display: flex; flex-direction: column; gap: 0.125rem; }
  .day { position: sticky; top: 0; z-index: 2; display: flex; justify-content: center; padding-block: var(--space-2); pointer-events: none; }
  .day span {
    padding: 0.25rem var(--space-3); font-size: var(--text-caption-1); font-weight: 500; color: var(--color-label-secondary); background-color: var(--glass-layer-bg); border: var(--line);
    border-radius: var(--radius-md); box-shadow: var(--shadow-sm); -webkit-backdrop-filter: var(--glass-layer-blur); backdrop-filter: var(--glass-layer-blur);
  }
  .older { display: flex; justify-content: center; padding-block: var(--space-2); font-size: var(--text-caption-1); color: var(--color-label-tertiary); }
  .system { display: flex; justify-content: center; margin-block: var(--space-2); }
  .system span { max-width: 80%; padding: 0.3rem var(--space-3); font-size: var(--text-caption-1); color: var(--color-label-secondary); text-align: center; background-color: color-mix(in oklab, var(--color-bg) 85%, transparent); border-radius: var(--radius-md); }
  /* As mensagens entram de baixo para cima; a nova entra na hora. */
  .dayGroup:last-child > .row:nth-last-child(-n + 5) { animation: ${rise} 220ms var(--ease-standard) both; }

  .toBottom {
    position: absolute; inset-inline-end: var(--space-5); bottom: calc(var(--composer-h, 8rem) + var(--space-2)); z-index: 3; display: grid; place-items: center; width: 2.25rem; height: 2.25rem;
    color: var(--color-ink); background-color: var(--glass-layer-bg); border: var(--line); border-radius: var(--radius-md); box-shadow: var(--shadow-md);
    -webkit-backdrop-filter: var(--glass-layer-blur); backdrop-filter: var(--glass-layer-blur);
  }
  .toBottom svg { width: 1rem; height: 1rem; }
  .toBottom b { position: absolute; top: -0.375rem; inset-inline-end: -0.375rem; min-width: 1.125rem; padding-inline: 0.25rem; font-size: 0.625rem; font-weight: 650; line-height: 1.125rem; color: #fff; text-align: center; background-color: var(--sys-green); border-radius: var(--radius-full); }

  ${balloes}
  ${campo}

  @media (max-width: 767px) {
    .back { display: inline-flex; }
    .closeThread, .listToggle { display: none; }
    .threadHead { padding-inline: var(--space-2); }
    .threadActions .hideNarrow { display: none; }
  }
  @media (prefers-reduced-motion: reduce) { .dayGroup:last-child > .row, .skeletonBubble { animation: none; } }
`;

/* ------------------------------------------------------------------ ficha */
export const ColunaFicha = styled.aside`
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background-color: var(--color-bg);
  border-inline-start: var(--line);

  .fichaVoltar { display: none; }
  @media (max-width: 1024px) {
    .fichaVoltar { display: flex; flex-shrink: 0; padding: var(--space-2) var(--space-3); border-block-end: var(--line); }
    .fichaVoltar button { display: inline-flex; gap: var(--space-1-5); align-items: center; height: 2.25rem; padding-inline: var(--space-2) var(--space-3); font-size: var(--text-footnote); font-weight: 600; background-color: var(--color-fill-tertiary); border-radius: var(--radius-md); }
  }
  .fichaScroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
  /* Celular e tablet: folga para o dock do ERP não cobrir o fim da ficha. */
  @media (max-width: 1024px) { .fichaScroll { padding-bottom: ${DOCK_CLEARANCE}; } }
  .fichaTop { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); padding: var(--space-4) var(--space-3) var(--space-2) var(--space-5); background-color: var(--color-bg); }
  .fichaPerson { display: flex; gap: var(--space-3); align-items: center; margin: 0 var(--space-5) var(--space-3); padding: var(--space-3); background-color: var(--color-fill-quaternary); border-radius: ${({ theme }) => theme.radii.xl}; }
  .fichaPerson > span { display: grid; gap: 0.125rem; min-width: 0; }
  .fichaPerson strong { overflow: hidden; font-size: var(--text-callout); font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
  .fichaPerson small { font-size: var(--text-caption-1); color: var(--color-label-secondary); }
  .fichaCall { display: grid; gap: var(--space-2); margin: 0 var(--space-5) var(--space-4); padding: var(--space-3); font-size: var(--text-footnote); line-height: 1.45; color: var(--color-label-secondary); border: 0.0625rem dashed var(--color-border); border-radius: ${({ theme }) => theme.radii.xl}; }
  .fichaCall strong { font-size: var(--text-subhead); color: var(--color-ink); }
  .fichaBody { padding: 0 var(--space-5) var(--space-6); }

  /* A aba WhatsApp da ficha: grupos com o rótulo apagado em cima, no desenho dos campos da oportunidade. */
  .grupo { display: grid; gap: var(--space-2); padding-block: var(--space-4); border-block-end: var(--line); }
  .grupo:last-child { border-block-end: 0; }
  .grupo > h3 { margin: 0; font-size: var(--text-caption-1); font-weight: 600; color: var(--color-label-secondary); }
  .linha { display: grid; grid-template-columns: 7.5rem minmax(0, 1fr); gap: var(--space-3); align-items: center; min-height: 1.875rem; font-size: var(--text-footnote); }
  .linha > span:first-child { color: var(--color-label-secondary); }
  .linha > :last-child { min-width: 0; overflow-wrap: anywhere; }
  .linha button.valor { display: inline-flex; gap: var(--space-1-5); align-items: center; padding: 0.125rem var(--space-1-5); margin-inline-start: calc(var(--space-1-5) * -1); border-radius: var(--radius-md); }
  .linha button.valor:hover { background-color: var(--color-fill-quaternary); }
  .linha button.valor svg { width: 0.875rem; height: 0.875rem; color: var(--color-label-secondary); }
  .etiquetas { display: flex; flex-wrap: wrap; gap: var(--space-1-5); }
  .etiqueta { display: inline-flex; gap: 0.25rem; align-items: center; height: 1.5rem; padding-inline: var(--space-2) var(--space-1); font-size: var(--text-caption-1); font-weight: 500; background-color: var(--color-fill-tertiary); border-radius: var(--radius-sm); }
  .etiqueta button { display: grid; place-items: center; width: 1rem; height: 1rem; color: var(--color-label-secondary); border-radius: 0.1875rem; opacity: 0.6; }
  .etiqueta button:hover { opacity: 1; }
  .novaEtiqueta { display: flex; gap: var(--space-1-5); }
  .novaEtiqueta input { flex: 1; min-width: 0; height: 2rem; padding-inline: var(--space-2-5); font: inherit; font-size: var(--text-footnote); color: var(--color-ink); background: var(--color-fill-quaternary); border: 0.0625rem solid transparent; border-radius: var(--radius-md); outline: none; }
  .novaEtiqueta input:focus { background: var(--color-elevated); border-color: var(--color-border); }
  .sugestoes { display: flex; flex-wrap: wrap; gap: var(--space-1); }
  .sugestoes button { height: 1.375rem; padding-inline: var(--space-2); font-size: var(--text-caption-2); font-weight: 500; color: var(--color-label-secondary); border: 0.0625rem dashed var(--color-border); border-radius: var(--radius-sm); }
  .sugestoes button:hover { color: var(--color-ink); }
  .midias { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.25rem; }
  .midias button { position: relative; aspect-ratio: 1; padding: 0; overflow: hidden; background-color: var(--color-fill-tertiary); border-radius: var(--radius-md); cursor: zoom-in; }
  .midias img, .midias video { display: block; width: 100%; height: 100%; object-fit: cover; }
  .docs { display: grid; gap: 0.25rem; }
  .docs a { display: flex; gap: var(--space-2); align-items: center; padding: var(--space-1-5) var(--space-2); font-size: var(--text-footnote); color: inherit; text-decoration: none; border-radius: var(--radius-md); }
  .docs a:hover { background-color: var(--color-fill-quaternary); }
  .docs a svg { flex-shrink: 0; width: 1.125rem; height: 1.125rem; color: var(--color-label-secondary); }
  .docs a span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .vazio { font-size: var(--text-footnote); color: var(--color-label-secondary); }
  .numeros { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); }
  .numeros div { display: grid; gap: 0.125rem; padding: var(--space-2) var(--space-2-5); background-color: var(--color-fill-quaternary); border-radius: var(--radius-md); }
  .numeros strong { font-size: var(--text-callout); font-weight: 650; font-variant-numeric: tabular-nums; }
  .numeros small { font-size: var(--text-caption-2); color: var(--color-label-secondary); }
  .perigo { justify-self: start; font-size: var(--text-footnote); font-weight: 500; color: var(--sys-red); }
  .perigo:hover { text-decoration: underline; }
`;

/** O leque de reações e as opções da mensagem, na janela "Mensagem" (clique nos três pontos, botão direito ou toque longo). */
export const AcoesMensagem = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};

  .quickReactions { display: flex; justify-content: space-between; gap: 0.25rem; padding-bottom: ${({ theme }) => theme.spacing(2)}; }
  .quickReactions button { display: grid; flex: 1; place-items: center; height: 2.5rem; font-size: 1.375rem; cursor: pointer; background: none; border: 0; border-radius: ${({ theme }) => theme.radii.md}; }
  .quickReactions button:hover, .quickReactions button[data-on] { background-color: ${({ theme }) => theme.colors.interactive.pressed}; }
  .acao { display: flex; gap: ${({ theme }) => theme.spacing(2.5)}; align-items: center; width: 100%; min-height: 2.5rem; padding: ${({ theme }) => theme.spacing(0, 3)}; font: inherit; font-size: 0.875rem; font-weight: 500; color: ${({ theme }) => theme.colors.text.primary}; text-align: start; text-decoration: none; cursor: pointer; background: none; border: 0; border-radius: ${({ theme }) => theme.radii.md}; }
  .acao:hover { background-color: ${({ theme }) => theme.colors.interactive.hover}; }
  .acao[data-perigo] { color: ${({ theme }) => theme.colors.danger}; }
  .acao svg { flex-shrink: 0; }
`;

/** Menu no ponto do clique (botão direito / toque longo), em portal: fora da raiz, usa o tema direto. */
export const MenuFlutuante = styled.div`
  position: fixed;
  z-index: 80;
  min-width: 13rem;
  max-width: 18rem;
  padding: ${({ theme }) => theme.spacing(1)};
  background: ${({ theme }) => theme.colors.background.elevated};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.md};

  button { display: flex; gap: ${({ theme }) => theme.spacing(2.5)}; align-items: center; width: 100%; padding: ${({ theme }) => theme.spacing(2, 2.5)}; font: inherit; font-size: 0.8125rem; font-weight: 500; color: ${({ theme }) => theme.colors.text.primary}; text-align: left; cursor: pointer; background: none; border: 0; border-radius: ${({ theme }) => theme.radii.md}; }
  button:hover, button:focus-visible { background: ${({ theme }) => theme.colors.interactive.hover}; outline: none; }
  button[data-perigo] { color: ${({ theme }) => theme.colors.danger}; }
  hr { height: 1px; margin: ${({ theme }) => theme.spacing(1, 0)}; background: ${({ theme }) => theme.colors.border.subtle}; border: 0; }
  [data-reacoes] { display: flex; gap: 2px; padding: ${({ theme }) => theme.spacing(1)}; }
  [data-reacoes] button { justify-content: center; width: 2.25rem; height: 2.25rem; padding: 0; font-size: 1.25rem; }
`;
