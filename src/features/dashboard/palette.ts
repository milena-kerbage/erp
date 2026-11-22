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
    "Loja online": "#0f9aa8",
    Facebook: "#5a6fd8",
    Instagram: "#eb6834",
    Indicação: "#1baf7a",
    Google: "#eda100",
    WhatsApp: "#008300",
    Evento: "#4a3aa7",
    other: "#a8ac9e",
  },
  dark: {
    Site: "#3987e5",
    "Loja online": "#1fb0bd",
    Facebook: "#7d8ff0",
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

/**
 * A cor da identidade de cada canal (a mesma da logo), para quando o trecho de um gráfico representa o canal em si:
 * fundo e a cor do texto que fica legível por cima. Canais sem marca própria não entram (quem chama usa o tom neutro).
 */
const identidade: Record<string, { fundo: string; texto: string }> = {
  // Sempre uma cor só por canal, sem degradê: o rosa do Instagram.
  Instagram: { fundo: "#e1306c", texto: "#ffffff" },
  WhatsApp: { fundo: "#25d366", texto: "#06381a" },
  Google: { fundo: "#4285f4", texto: "#ffffff" },
  Facebook: { fundo: "#1877f2", texto: "#ffffff" },
  // O site é o próprio ateliê: a sálvia da logo.
  Site: { fundo: "#788569", texto: "#ffffff" },
  "Loja online": { fundo: "#788569", texto: "#ffffff" },
};

export const corDaIdentidade = (source: string) => identidade[source] ?? null;
