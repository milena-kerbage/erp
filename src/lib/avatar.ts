import { Avatar, Style, type StyleDefinition } from "@dicebear/core";
import gaze from "@dicebear/styles/gaze.json";
import { theme } from "@/styles/theme";

/**
 * Avatar ilustrado (DiceBear "Gaze", licença CC0) para quem não tem foto.
 *
 * Gerado localmente — nada é enviado a serviços externos. Use como seed um
 * identificador estável (ex.: id do lead), não dados pessoais.
 */
const gazeStyle = new Style(gaze as unknown as StyleDefinition);

/** Fundos claros dos tons pastel do sistema (escolhidos pelo seed). */
const backgrounds = Object.values(theme.tones)
  .filter((tone) => tone !== theme.tones.neutral)
  .map((tone) => tone.bg);

const cache = new Map<string, string>();

export function generatedAvatarUrl(seed: string) {
  let url = cache.get(seed);
  if (!url) {
    url = new Avatar(gazeStyle, { seed, backgroundColor: backgrounds }).toDataUri();
    cache.set(seed, url);
  }
  return url;
}
