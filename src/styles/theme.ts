/**
 * Escalas base. Não use direto nos componentes — prefira os tokens semânticos
 * de `theme.colors` (background, text, border...). As escalas ficam expostas
 * em `theme.palette` para casos pontuais.
 */
const palette = {
  /** Verde sálvia da marca — 500 é a cor da logo (#788569). */
  sage: {
    50: "#f4f6f0",
    100: "#e6eadf",
    200: "#cfd6c4",
    300: "#b0bb9f",
    400: "#93a081",
    500: "#788569",
    600: "#616d54",
    700: "#4d5743",
    800: "#3c4435",
    900: "#2c3227",
    950: "#1c2019",
  },
  /** Neutros quentes, levemente puxados para o verde. */
  neutral: {
    0: "#ffffff",
    25: "#fcfcf8",
    50: "#f6f7f2",
    100: "#eeefe8",
    200: "#e3e5dc",
    300: "#d2d5c9",
    400: "#a8ac9e",
    500: "#7f8478",
    600: "#5f6459",
    700: "#474b43",
    800: "#2f322c",
    900: "#1d1f1b",
  },
  terracotta: {
    500: "#c65d3b",
  },
} as const;

/**
 * Tons pastel para categorias (etapas do kanban, etiquetas).
 * - bg: fundo amplo (coluna)
 * - soft: destaque (pílula do cabeçalho, etiqueta)
 * - fg: texto/ícone — contraste AA sobre bg, soft e branco
 */
const tones = {
  neutral: { bg: "#f4f5f1", soft: "#e8e9e3", fg: "#50554b" },
  blue: { bg: "#f0f5fb", soft: "#dde8f6", fg: "#2f5f96" },
  lavender: { bg: "#f5f2fb", soft: "#e7dff6", fg: "#5e4396" },
  peach: { bg: "#fdf5ec", soft: "#f9e2c8", fg: "#8a5417" },
  rose: { bg: "#fcf1f3", soft: "#f6dce2", fg: "#96374f" },
  green: { bg: "#eff6ef", soft: "#d8ebd8", fg: "#2f6b3c" },
  yellow: { bg: "#fbf8ea", soft: "#f3e8bd", fg: "#6f5608" },
  teal: { bg: "#edf6f5", soft: "#d3ebe8", fg: "#23645e" },
} as const;

export type Tone = keyof typeof tones;

export type ThemeMode = "light" | "dark";

export const theme = {
  /** Claro ou escuro (Configurações > Acessibilidade > Aparência). */
  mode: "light" as ThemeMode,
  palette,
  tones,

  colors: {
    brand: palette.sage[500],

    primary: {
      main: palette.sage[600],
      hover: palette.sage[700],
      /** Estado ativo/selecionado (pílulas, itens de menu). */
      strong: palette.sage[800],
      subtle: palette.sage[100],
      contrast: palette.neutral[0],
    },

    background: {
      /** Cor sólida média do fundo (anéis de indicadores, fallback). */
      canvas: "#eeefe7",
      /** Fundo da aplicação: linho claro → sálvia suave. */
      gradient: "linear-gradient(135deg, #f6f3ec 0%, #e4e9dd 100%)",
      /** Painel principal de conteúdo: branco com um sopro de verde. */
      surface: "#fbfcf9",
      /** Elementos elevados: botões, cards, menus. */
      elevated: palette.neutral[0],
      hover: palette.neutral[0],
    },

    text: {
      primary: palette.neutral[900],
      secondary: palette.neutral[600],
      muted: "#6b7065",
      inverse: palette.neutral[0],
      brand: palette.sage[600],
    },

    border: {
      /** Linha quase invisível entre colunas e linhas de tabela. */
      faint: "rgba(29, 31, 27, 0.06)" as string,
      subtle: palette.neutral[200],
      default: palette.neutral[300],
      strong: palette.neutral[400],
    },

    /** Fundo atrás de janelas modais. */
    overlay: "rgba(18, 20, 17, 0.28)" as string,
    /** Brilho que passa nos esqueletos de carregamento. */
    shimmer: "rgba(255, 255, 255, 0.65)" as string,
    scrollbar: {
      thumb: "rgba(29, 31, 27, 0.07)" as string,
      hover: "rgba(29, 31, 27, 0.16)" as string,
    },

    /** Ponto de notificação / novidade. */
    attention: palette.terracotta[500],

    success: "#3d7a4f",
    warning: "#b7791f",
    danger: "#c2452d",
    info: "#3e6f8e",

    /** Camadas de hover/press sobre qualquer fundo. */
    interactive: {
      hover: "rgba(29, 31, 27, 0.045)",
      pressed: "rgba(29, 31, 27, 0.08)",
    },

    /** Conversas (chat da oportunidade / WhatsApp). */
    chat: {
      incoming: "#f1f2f6",
      outgoing: "#e3ecf9",
      /** Botão de play e ondas do áudio enviado/recebido. */
      audioAccent: "#bcd3f0",
      read: "#3b82c4",
      /** Pontilhado do fundo da conversa. */
      dots: "rgba(29, 31, 27, 0.1)" as string,
    },

    tooltip: {
      background: palette.neutral[900],
      text: palette.neutral[25],
    },
  },

  fonts: {
    body: "var(--font-inter), system-ui, -apple-system, sans-serif",
    /** Fonte da marca: apenas títulos de destaque definidos no manual. */
    display: "var(--font-scarlett), Georgia, serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  },

  fontSizes: {
    xs: "0.75rem",
    sm: "0.875rem",
    md: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
  },

  fontWeights: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeights: {
    none: 1,
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },

  /** Escala de 4px: spacing(4) = 1rem (16px). Aceita vários valores. */
  spacing: (...values: number[]) =>
    values.map((value) => `${value * 0.25}rem`).join(" "),

  /** Cantos suaves: controles usam md (8px), superfícies xl/2xl. */
  radii: {
    none: "0",
    xs: "0.25rem",
    sm: "0.375rem",
    md: "0.5rem",
    lg: "0.625rem",
    xl: "0.75rem",
    "2xl": "1rem",
    full: "9999px",
  },

  shadows: {
    xs: "0 1px 2px rgba(29, 31, 27, 0.04)",
    sm: "0 1px 3px rgba(29, 31, 27, 0.08), 0 1px 2px rgba(29, 31, 27, 0.04)",
    md: "0 4px 12px rgba(29, 31, 27, 0.08)",
    lg: "0 12px 32px rgba(29, 31, 27, 0.12)",
  },

  /** Dimensões fixas da estrutura da aplicação. */
  layout: {
    sidebarCollapsed: "4.5rem",
    sidebarExpanded: "15rem",
    headerHeight: "3.5rem",
    panelGap: "0.75rem",
    panelRadius: "1rem",
  },

  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },

  /**
   * Desktop-first: o estilo base é o de desktop e estas queries aplicam
   * ajustes para telas MENORES OU IGUAIS ao breakpoint.
   * Ex.: `${theme.media.md} { ... }` vale até 768px.
   */
  media: {
    xl: "@media (max-width: 1280px)",
    lg: "@media (max-width: 1024px)",
    md: "@media (max-width: 768px)",
    sm: "@media (max-width: 640px)",
  },

  transitions: {
    fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
    normal: "250ms cubic-bezier(0.4, 0, 0.2, 1)",
    slow: "400ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  zIndex: {
    sidebar: 900,
    sticky: 1100,
    header: 1200,
    overlay: 1300,
    modal: 1400,
    /* Acima do modal: dropdowns abertos dentro de uma janela ficam visíveis */
    dropdown: 1450,
    toast: 1500,
    tooltip: 1600,
  },
} as const;

export type AppTheme = typeof theme;

/* ---------- Modo escuro ---------- */

/** Escalas invertidas: neutral[0] continua sendo "a superfície" e 900 "o texto". */
const darkPalette = {
  sage: {
    50: "#212720",
    100: "#283026",
    200: "#333d2f",
    300: "#46523f",
    400: "#63725a",
    500: "#859673",
    600: "#a2b38f",
    700: "#b9c8a8",
    800: "#cfdbc1",
    900: "#e3ebd8",
    950: "#f1f5ec",
  },
  neutral: {
    0: "#1c1e1b",
    25: "#20221f",
    50: "#252724",
    100: "#2b2d29",
    200: "#333630",
    300: "#3f423b",
    400: "#5b5f56",
    500: "#80857a",
    600: "#a4a99d",
    700: "#c3c7bb",
    800: "#dcdfd5",
    900: "#eef0ea",
  },
  terracotta: { 500: "#e07a57" },
};

/** Tons no escuro: fundo discreto, destaque médio e texto claro (contraste AA). */
const darkTones: Record<Tone, { bg: string; soft: string; fg: string }> = {
  neutral: { bg: "#222420", soft: "#30332d", fg: "#c9ccc2" },
  blue: { bg: "#1d242d", soft: "#2a3647", fg: "#a9c4ea" },
  lavender: { bg: "#24212c", soft: "#352e45", fg: "#c9b8ec" },
  peach: { bg: "#2a221b", soft: "#46342a", fg: "#f0c29e" },
  rose: { bg: "#2b2023", soft: "#472d33", fg: "#f0adba" },
  green: { bg: "#1d2820", soft: "#2a3d30", fg: "#a6d8b3" },
  yellow: { bg: "#29261a", soft: "#433b22", fg: "#e8d38c" },
  teal: { bg: "#1b2827", soft: "#26403e", fg: "#99d6cf" },
};

function darkColors() {
  const p = darkPalette;
  return {
    brand: p.sage[500],
    primary: {
      main: p.sage[600],
      hover: p.sage[700],
      strong: p.sage[800],
      subtle: p.sage[100],
      contrast: "#161814",
    },
    background: {
      canvas: "#131412",
      gradient: "linear-gradient(135deg, #171815 0%, #111310 100%)",
      surface: "#181a17",
      elevated: p.neutral[0],
      hover: p.neutral[0],
    },
    text: {
      primary: p.neutral[900],
      secondary: p.neutral[700],
      muted: "#8e9388",
      inverse: "#161814",
      brand: p.sage[600],
    },
    border: {
      faint: "rgba(255, 255, 255, 0.06)",
      subtle: p.neutral[200],
      default: p.neutral[300],
      strong: p.neutral[400],
    },
    overlay: "rgba(0, 0, 0, 0.55)",
    shimmer: "rgba(255, 255, 255, 0.05)",
    scrollbar: {
      thumb: "rgba(255, 255, 255, 0.08)",
      hover: "rgba(255, 255, 255, 0.18)",
    },
    attention: p.terracotta[500],
    success: "#6fbf86",
    warning: "#e0a64a",
    danger: "#ec7a63",
    info: "#7fb0d3",
    interactive: {
      hover: "rgba(255, 255, 255, 0.05)",
      pressed: "rgba(255, 255, 255, 0.09)",
    },
    chat: {
      incoming: "#24272a",
      outgoing: "#1f2d3c",
      audioAccent: "#35547a",
      read: "#7db4ea",
      dots: "rgba(255, 255, 255, 0.06)",
    },
    tooltip: {
      background: p.neutral[900],
      text: "#161814",
    },
  };
}

/**
 * Tema conforme a acessibilidade: claro ou escuro, com ou sem alto contraste
 * (textos secundários e bordas mais fortes).
 */
export function buildTheme({ dark, highContrast }: { dark: boolean; highContrast: boolean }): AppTheme {
  const p = dark ? darkPalette : palette;
  const colors = dark ? darkColors() : theme.colors;
  const built = {
    ...theme,
    mode: dark ? "dark" : "light",
    palette: p,
    tones: dark ? darkTones : tones,
    colors: {
      ...colors,
      ...(highContrast && {
        text: {
          ...colors.text,
          primary: p.neutral[900],
          secondary: p.neutral[800],
          muted: p.neutral[600],
        },
        border: {
          ...colors.border,
          subtle: p.neutral[400],
          default: p.neutral[500],
          strong: p.neutral[600],
        },
      }),
    },
    shadows: dark
      ? {
          xs: "0 1px 2px rgba(0, 0, 0, 0.3)",
          sm: "0 1px 3px rgba(0, 0, 0, 0.35)",
          md: "0 4px 12px rgba(0, 0, 0, 0.4)",
          lg: "0 12px 32px rgba(0, 0, 0, 0.5)",
        }
      : theme.shadows,
  };
  return built as unknown as AppTheme;
}
