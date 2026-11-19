"use client";

// Sons sintetizados (sem arquivo), como no ERP da Le Ange: envio sobe 587→880 Hz, recebimento 784→1046 Hz.
const CHAVE = "erp:whatsapp:sons";
let contexto: AudioContext | null = null;
const ultimo: Record<string, number> = {};

export const sonsLigados = () => { try { return localStorage.getItem(CHAVE) !== "0"; } catch { return true; } };
export const ligarSons = (ligado: boolean) => { try { localStorage.setItem(CHAVE, ligado ? "1" : "0"); } catch { /* sem armazenamento */ } };

export function tocar(tipo: "envio" | "recebimento") {
  if (!sonsLigados() || typeof window === "undefined") return;
  const agora = Date.now(), intervalo = tipo === "recebimento" ? 1500 : 300;
  if (agora - (ultimo[tipo] ?? 0) < intervalo) return;
  ultimo[tipo] = agora;
  try {
    contexto ??= new AudioContext();
    if (contexto.state === "suspended") void contexto.resume();
    const [de, para] = tipo === "envio" ? [587, 880] : [784, 1046];
    const oscilador = contexto.createOscillator(), ganho = contexto.createGain(), t = contexto.currentTime;
    oscilador.type = "sine";
    oscilador.frequency.setValueAtTime(de, t);
    oscilador.frequency.exponentialRampToValueAtTime(para, t + 0.09);
    ganho.gain.setValueAtTime(0.0001, t);
    ganho.gain.exponentialRampToValueAtTime(0.07, t + 0.015);
    ganho.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    oscilador.connect(ganho).connect(contexto.destination);
    oscilador.start(t);
    oscilador.stop(t + 0.24);
  } catch { /* navegador sem Web Audio */ }
}
