import type { ThemeMode } from "@/styles/theme";

/**
 * Cor fixa de cada origem nos gráficos (a cor segue o canal, nunca a posição
 * no ranking). Os três canais principais usam os três primeiros tons da paleta
 * de referência, validados par a par para daltonismo no claro e no escuro.
 * Passando de três, o resto entra em "Outras" (cinza).
 */
const colors: Record<ThemeMode, Record<string, string>> = {
  light: {
    Site: "#2a78d6",
    Instagram: "#eb6834",
    Indicação: "#1baf7a",
    Google: "#eda100",
    WhatsApp: "#008300",
    Evento: "#4a3aa7",
    other: "#a8ac9e",
  },
  dark: {
    Site: "#3987e5",
    Instagram: "#d95926",
    Indicação: "#199e70",
    Google: "#c98500",
    WhatsApp: "#008300",
    Evento: "#9085e9",
    other: "#5b5f56",
  },
};

export const MAX_SLICES = 3;

export function sourceColor(source: string, mode: ThemeMode) {
  return colors[mode][source] ?? colors[mode].other;
}

export const otherColor = (mode: ThemeMode) => colors[mode].other;
