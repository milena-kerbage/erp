import { css, keyframes, type Theme } from "@emotion/react";
import styled from "@emotion/styled";
import { DOCK_CLEARANCE, DOCK_SPACE } from "@/styles/sheet";
import { transientOptions } from "@/lib/emotion/transient";
import { DOCK_EASE } from "@/lib/dock";
import { EASE_OUT } from "@/styles/animations";
import { controlBase, controlVariant } from "@/styles/mixins";

const paneIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
`;

/* ---------- Estrutura ---------- */

/** Barra de rolagem afastada das bordas (divisória e cantos do painel). */
const scrollInset = css`
  &::-webkit-scrollbar-track {
    margin-block: 10px;
  }
`;

/**
 * Bloco em destaque: fundo e raio dos botões, sem borda. O fundo é o hover
 * dos botões ghost já misturado ao painel (opaco, para poder ficar fixo).
 */
const softBlock = (theme: Theme) => css`
  border-radius: ${theme.radii.md};
  background-color: color-mix(in srgb, ${theme.palette.neutral[900]} 4.5%, ${theme.colors.background.surface});
`;

/**
 * Esquerda: ficha da oportunidade. Direita: chat (área principal). Ocupa o
 * painel inteiro (sem padding) e as colunas se encostam, separadas por uma
 * linha suave de cima a baixo.
 */
export const Root = styled.div`
  position: relative;
  display: grid;
  flex: 1 1 0;
  grid-template-columns: 23.5rem minmax(0, 1fr);
  min-height: 0;

  /* Celular: seletor no topo e um painel por vez (Informações ou Conversa) */
  ${({ theme }) => theme.media.md} {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);

    > [data-pane-id] {
      grid-row: 2;
    }

    &[data-pane="info"] > [data-pane-id="chat"],
    &[data-pane="chat"] > [data-pane-id="info"] {
      display: none;
    }

    /* O painel que aparece entra suave (a animação recomeça ao sair do display: none) */
    > [data-pane-id] {
      animation: ${paneIn} 280ms ${EASE_OUT};
    }

    @media (prefers-reduced-motion: reduce) {
      > [data-pane-id] {
        animation: none;
      }
    }
  }
`;

/** "Informações | Conversa" no topo da tela (só no celular), com respiro até o conteúdo. */
export const PaneSwitch = styled.div`
  display: none;

  ${({ theme }) => theme.media.md} {
    position: relative;
    display: inline-flex;
    justify-self: center;
    gap: 2px;
    margin: calc(${({ theme }) => theme.spacing(3)} + env(safe-area-inset-top)) ${({ theme }) => theme.spacing(4)}
      ${({ theme }) => theme.spacing(4)};
    padding: 3px;
    border: 1px solid ${({ theme }) => theme.colors.border.subtle};
    border-radius: 0.875rem;
    background-color: ${({ theme }) => theme.palette.neutral[100]};
  }
`;

/** Fundo branco da opção escolhida: desliza entre as opções (posição medida no JS). */
export const PaneThumb = styled.span`
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 0;
  width: var(--thumb-width, 0);
  border-radius: 0.6875rem;
  background-color: ${({ theme }) => theme.palette.neutral[0]};
  opacity: var(--thumb-opacity, 0);
  transform: translateX(var(--thumb-x, 0));
  pointer-events: none;

  [data-ready] > & {
    transition:
      transform 340ms ${DOCK_EASE},
      width 340ms ${DOCK_EASE};
  }

  @media (prefers-reduced-motion: reduce) {
    [data-ready] > & {
      transition: none;
    }
  }
`;

export const PaneSwitchItem = styled("button", transientOptions)<{ $active: boolean }>`
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing(1.5)};
  height: 2.25rem;
  padding: ${({ theme }) => theme.spacing(0, 4)};
  border-radius: 0.6875rem;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme, $active }) => ($active ? theme.colors.text.primary : theme.colors.text.muted)};
  transition: color 240ms ${EASE_OUT};

  > span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.125rem;
    height: 1.125rem;
    padding: 0 4px;
    border-radius: ${({ theme }) => theme.radii.full};
    background-color: ${({ theme }) => theme.colors.attention};
    font-size: 0.625rem;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: #fff;
  }
`;

/** Chat: só o fundo branco, sem borda (o painel recorta os cantos). */
export const Card = styled.section`
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background-color: ${({ theme }) => theme.palette.neutral[0]};

  /* Celular: mesmo fundo da página; só a linha abaixo do seletor separa */
  ${({ theme }) => theme.media.md} {
    border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
  }
`;

/** Coluna da ficha: sem fundo, integrada ao painel. */
export const Aside = styled.section`
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  border-right: 1px solid ${({ theme }) => theme.colors.border.faint};

  ${({ theme }) => theme.media.md} {
    border-right: 0;
  }
`;

export const Scroll = styled.div`
  flex: 1;
  min-height: 0;
  /* Folga entre a barra de rolagem e a divisória */
  margin-right: 4px;
  overflow-y: auto;
  overscroll-behavior: contain;
  ${scrollInset};

  /* Celular: cliente, etapa e abas ficam parados; só o conteúdo da aba rola */
  ${({ theme }) => theme.media.md} {
    display: flex;
    flex-direction: column;
    margin-right: 0;
    overflow: hidden;
  }
`;

/* ---------- Ficha (esquerda) ---------- */

export const TopBar = styled.div`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(2)};

  /* Celular: o voltar mora no dock (o 1º filho é o tooltip do voltar); as ações vão para o cartão do cliente */
  ${({ theme }) => theme.media.md} {
    display: contents;

    > :first-child {
      display: none;
    }
  }
`;

export const TopBarActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};

  /* Celular: só as ações; o responsável fica nos Detalhes (sobra largura para o e-mail) */
  ${({ theme }) => theme.media.md} {
    grid-column: 2;
    grid-row: 1;
    align-self: start;

    > :first-child {
      display: none;
    }
  }
`;

/** Faixa fixa no topo da ficha (voltar, ações e cliente); o resto rola por baixo. */
export const ProfileDock = styled.div`
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(4, 3, 4, 5)};
  background-color: ${({ theme }) => theme.colors.background.surface};

  /* Celular: cartão do cliente (dados à esquerda, responsável e ações à direita) que rola junto */
  ${({ theme }) => theme.media.md} {
    position: static;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: ${({ theme }) => theme.spacing(3)};
    flex-shrink: 0;
    margin: ${({ theme }) => theme.spacing(0, 4)};
    padding: ${({ theme }) => theme.spacing(3.5)};
    /* Um cartão só com a etapa logo abaixo */
    border: 1px solid ${({ theme }) => theme.colors.border.subtle};
    border-bottom: 0;
    border-radius: ${({ theme }) => theme.radii.lg} ${({ theme }) => theme.radii.lg} 0 0;
    background-color: ${({ theme }) => theme.palette.neutral[0]};
  }
`;

/** Cliente em destaque: bloco com fundo, sem borda. */
export const Profile = styled.div`
  ${({ theme }) => softBlock(theme)};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(4)};
  padding: ${({ theme }) => theme.spacing(4)};

  ${({ theme }) => theme.media.md} {
    grid-column: 1;
    grid-row: 1;
    gap: ${({ theme }) => theme.spacing(3)};
    min-width: 0;
    padding: 0;
    background: transparent;

    /* Avatar menor no celular */
    > span:first-of-type {
      width: 3rem !important;
      height: 3rem !important;
    }
  }
`;

export const ProfileTexts = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

export const ProfileName = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  line-height: ${({ theme }) => theme.lineHeights.tight};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const ProfileMeta = styled.span`
  overflow: hidden;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  white-space: nowrap;
  text-overflow: ellipsis;
`;

/** Responsável: o mesmo botão secundário do header, com o avatar dentro. */
export const OwnerButton = styled.button`
  ${({ theme }) => controlBase(theme)};
  ${({ theme }) => controlVariant(theme, "secondary")};
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;

  &[aria-expanded="true"] {
    border-color: ${({ theme }) => theme.colors.border.default};
  }
`;

/* ---------- Funil e etapa ---------- */

/** Funil e etapa: bloco com fundo, no mesmo padrão do cliente. */
export const StageSection = styled.div`
  ${({ theme }) => softBlock(theme)};
  margin: ${({ theme }) => theme.spacing(0, 3, 5, 5)};
  padding: ${({ theme }) => theme.spacing(3, 3.5, 3.5)};

  ${({ theme }) => theme.media.md} {
    flex-shrink: 0;
    margin: ${({ theme }) => theme.spacing(0, 4, 3)};
    padding: ${({ theme }) => theme.spacing(3, 3.5, 3.5)};
    /* Continua o cartão do cliente, separado por uma linha fina */
    border: 1px solid ${({ theme }) => theme.colors.border.subtle};
    border-top-color: ${({ theme }) => theme.colors.border.faint};
    border-radius: 0 0 ${({ theme }) => theme.radii.lg} ${({ theme }) => theme.radii.lg};
    background-color: ${({ theme }) => theme.palette.neutral[0]};
  }
`;

/* ---------- Conteúdo das abas ---------- */

export const TabsArea = styled.div`
  padding: ${({ theme }) => theme.spacing(0, 3, 5, 5)};

  /* Gruda logo abaixo do cliente (altura medida em --profile-dock) */
  [role="tablist"] {
    position: sticky;
    top: var(--profile-dock, 0px);
    z-index: 1;
    background-color: ${({ theme }) => theme.colors.background.surface};
  }

  /*
   * Celular: as abas ficam paradas e só o painel da aba rola (sem fundo
   * chapado, que viraria uma faixa sobre o degradê); cada bloco (Contato,
   * Evento...) vira um cartão.
   */
  ${({ theme }) => theme.media.md} {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding: 0;

    > div {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 0;
    }

    [role="tablist"] {
      position: static;
      margin: ${({ theme }) => theme.spacing(0, 4)};
      background-color: transparent;
    }

    [role="tabpanel"] {
      flex: 1;
      min-height: 0;
      padding: ${({ theme }) => theme.spacing(3, 4)} ${DOCK_SPACE};
      overflow-y: auto;
      overscroll-behavior: contain;
    }

    [role="tabpanel"] > section {
      gap: ${({ theme }) => theme.spacing(3)};
      padding: ${({ theme }) => theme.spacing(3.5, 4)};
      border: 1px solid ${({ theme }) => theme.colors.border.subtle};
      border-radius: ${({ theme }) => theme.radii.lg};
      background-color: ${({ theme }) => theme.palette.neutral[0]};
    }

    [role="tabpanel"] > section + section {
      margin-top: ${({ theme }) => theme.spacing(2)};
      padding-top: ${({ theme }) => theme.spacing(3.5)};
    }

    [role="tabpanel"] dl {
      gap: ${({ theme }) => theme.spacing(3)};
    }
  }
`;

export const TagList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing(1.5)};
`;

export const LinkList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};
`;

export const LinkRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1)};
  padding-right: ${({ theme }) => theme.spacing(1)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
  transition: border-color ${({ theme }) => theme.transitions.fast};

  &:hover,
  &:focus-within {
    border-color: ${({ theme }) => theme.colors.border.default};
  }

  > a {
    display: flex;
    flex: 1;
    align-items: center;
    gap: ${({ theme }) => theme.spacing(2.5)};
    min-width: 0;
    padding: ${({ theme }) => theme.spacing(2, 2.5)};
    border-radius: inherit;
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.text.primary};

    > svg {
      flex-shrink: 0;
      color: ${({ theme }) => theme.colors.text.muted};
    }

    > svg:last-of-type {
      margin-left: auto;
    }
  }

  /* Remover aparece só no hover, como o copiar dos campos */
  > button {
    opacity: 0;
  }

  &:hover > button,
  > button:focus-visible {
    opacity: 1;
  }

  @media (hover: none) {
    > button {
      opacity: 1;
    }
  }
`;

export const LinkForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};
  padding: ${({ theme }) => theme.spacing(3)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme }) => theme.palette.neutral[0]};

  input {
    height: 2rem;
    padding: ${({ theme }) => theme.spacing(0, 2.5)};
    border: 1px solid ${({ theme }) => theme.colors.border.subtle};
    border-radius: ${({ theme }) => theme.radii.sm};
    outline: none;
    font-size: 0.8125rem;
    transition:
      border-color ${({ theme }) => theme.transitions.fast},
      box-shadow ${({ theme }) => theme.transitions.fast};

    &::placeholder {
      color: ${({ theme }) => theme.colors.text.muted};
    }

    &:focus {
      border-color: ${({ theme }) => theme.palette.sage[400]};
      box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary.subtle};
    }
  }

  > div {
    display: flex;
    justify-content: flex-end;
    gap: ${({ theme }) => theme.spacing(2)};
  }
`;

export const LinksFooter = styled.div`
  display: flex;
  margin: ${({ theme }) => theme.spacing(1, 0, 0, -2)};
`;

export const LinkTexts = styled.span`
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;

  small {
    overflow: hidden;
    font-size: ${({ theme }) => theme.fontSizes.xs};
    color: ${({ theme }) => theme.colors.text.muted};
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;

export const Mono = styled.code`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.8125rem;
`;

export const Dropzone = styled("button", transientOptions)<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1)};
  width: 100%;
  margin: ${({ theme }) => theme.spacing(4, 0, 3)};
  padding: ${({ theme }) => theme.spacing(5, 4)};
  border: 1.5px dashed ${({ theme, $active }) => ($active ? theme.palette.sage[400] : theme.colors.border.default)};
  border-radius: ${({ theme }) => theme.radii.lg};
  background-color: ${({ theme, $active }) => ($active ? theme.palette.sage[50] : "transparent")};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.8125rem;
  transition:
    border-color ${({ theme }) => theme.transitions.fast},
    background-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.palette.sage[400]};
  }

  strong {
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  small {
    font-size: ${({ theme }) => theme.fontSizes.xs};
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

export const FileList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};
`;

export const Notice = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(6, 2)};
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
  text-align: center;
`;

/* ---------- Chat (direita) ---------- */

export const ChatHeader = styled.header`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
  height: 3.75rem;
  padding: ${({ theme }) => theme.spacing(0, 3, 0, 5)};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};

  /* Celular: cabeçalho da conversa em tela cheia (voltar, contato e ações) */
  ${({ theme }) => theme.media.md} {
    &[data-hide-mobile] {
      display: none;
    }

    gap: ${({ theme }) => theme.spacing(2)};
    height: calc(3.5rem + env(safe-area-inset-top));
    padding: env(safe-area-inset-top) ${({ theme }) => theme.spacing(1.5)} 0 ${({ theme }) => theme.spacing(1)};
  }
`;

export const ChatTitle = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
`;

export const ChatName = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const ChatPhone = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;

/**
 * Área da conversa. O fundo pontilhado fica parado (não rola) e some nas
 * laterais com um degradê, deixando o efeito só no meio.
 */
export const ThreadWrap = styled.div`
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: radial-gradient(${({ theme }) => theme.colors.chat.dots} 1px, transparent 1.4px);
    background-size: 18px 18px;
    mask-image: linear-gradient(90deg, transparent 0%, #000 24%, #000 76%, transparent 100%);
    pointer-events: none;
  }
`;

export const Thread = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  /* Folga entre a barra de rolagem e a borda do painel */
  margin-right: 4px;
  padding: ${({ theme }) => theme.spacing(2, 3, 2, 4)};
  overflow-y: auto;
  overscroll-behavior: contain;
  ${scrollInset};

  /* Celular: barra de rolagem por cima, sem folga lateral */
  ${({ theme }) => theme.media.md} {
    margin-right: 0;
    padding: ${({ theme }) => theme.spacing(2, 3)};
  }
`;

/** Um dia da conversa: a data fica fixa no topo enquanto ele está visível. */
export const Day = styled.section`
  display: flex;
  flex-direction: column;
`;

/**
 * Compositor flutuando no rodapé, centralizado. O degradê atrás faz as
 * mensagens sumirem suavemente por baixo dele.
 */
export const Dock = styled.div`
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 3;
  padding: ${({ theme }) => theme.spacing(10, 6, 4)};
  background: linear-gradient(
    to top,
    ${({ theme }) => theme.palette.neutral[0]} 45%,
    color-mix(in srgb, ${({ theme }) => theme.palette.neutral[0]} 0%, transparent)
  );
  pointer-events: none;

  > * {
    max-width: 46rem;
    margin: 0 auto;
    pointer-events: auto;
  }

  /* Celular: o campo de mensagem encosta no dock flutuante (8px acima dele) */
  ${({ theme }) => theme.media.md} {
    padding: ${({ theme }) => theme.spacing(6, 3)} ${DOCK_CLEARANCE};
  }
`;

export const JumpToLatest = styled.div`
  position: absolute;
  left: 50%;
  z-index: 4;
  transform: translateX(-50%);
`;

export const DropOverlay = styled.div`
  position: absolute;
  inset: ${({ theme }) => theme.spacing(3)};
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing(2)};
  border: 1.5px dashed ${({ theme }) => theme.palette.sage[400]};
  border-radius: ${({ theme }) => theme.radii.xl};
  background-color: color-mix(in srgb, ${({ theme }) => theme.palette.sage[50]} 92%, transparent);
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.brand};
  pointer-events: none;
`;
