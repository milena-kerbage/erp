/**
 * Picos de um áudio para desenhar a "onda" de mensagens de voz.
 * Lê o arquivo de verdade (Web Audio); se não conseguir, gera barras
 * estáveis a partir da URL para a interface não ficar vazia.
 */

const cache = new Map<string, Promise<number[]>>();

function fallback(url: string, bars: number) {
  let seed = 0;
  for (const char of url) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  return Array.from({ length: bars }, () => {
    seed = (seed * 16807) % 2147483647;
    return 0.25 + (seed / 2147483647) * 0.75;
  });
}

async function decode(url: string, bars: number) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const context = new AudioContext();
  try {
    const audio = await context.decodeAudioData(buffer);
    const channel = audio.getChannelData(0);
    const size = Math.floor(channel.length / bars);
    const peaks = Array.from({ length: bars }, (_, bar) => {
      let peak = 0;
      for (let i = bar * size; i < (bar + 1) * size; i += 16) {
        peak = Math.max(peak, Math.abs(channel[i]));
      }
      return peak;
    });
    const max = Math.max(...peaks, 0.01);
    // Normaliza e garante uma altura mínima para as pausas.
    return peaks.map((peak) => 0.15 + (peak / max) * 0.85);
  } finally {
    void context.close();
  }
}

export function getWaveform(url: string, bars = 36): Promise<number[]> {
  const key = `${url}#${bars}`;
  let result = cache.get(key);
  if (!result) {
    result = decode(url, bars).catch(() => fallback(url, bars));
    cache.set(key, result);
  }
  return result;
}

/** "0:08", "1:24". */
export function formatDuration(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
