"use client";

// Mídia no navegador antes de enviar (o servidor da Vercel não tem ffmpeg nem aguenta corpo grande):
// - Foto: reduzida a 1600 px e gravada em JPEG (o WhatsApp não aceita WebP/HEIC como foto), até 5 MB.
// - Vídeo: convertido para MP4 H.264 + AAC, até 1280 px, com bitrate para caber em ~14 MB (limite do WhatsApp: 16 MB).
// - Nota de voz: o Chrome grava WebM/Opus; o WhatsApp só aceita voz em OGG/Opus, então o áudio muda de container (sem
//   recodificar quando dá). Safari grava MP4/AAC: vira OGG/Opus se o navegador codifica Opus; senão segue como áudio M4A.
// - Documento: segue como está.
// Depois, o arquivo sobe direto para o R2 (link pré-assinado, com progresso) e o servidor envia à Meta.
import type { WhatsAppMessage } from "../types";

export type TipoMidia = "image" | "video" | "audio" | "document";
export type Preparado = { blob: Blob; mime: string; nome: string; tipo: TipoMidia; duration?: number; voice?: boolean; previewUrl?: string };

const MB = 1024 * 1024;
const LIMITE: Record<TipoMidia, number> = { image: 5 * MB, video: 16 * MB, audio: 16 * MB, document: 25 * MB };
const DOCUMENTOS: Record<string, string> = { pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", txt: "text/plain", csv: "text/csv", zip: "application/zip" };

export class ErroMidia extends Error {}
const extensao = (nome: string) => nome.match(/\.([a-z0-9]{1,5})$/i)?.[1]?.toLowerCase() ?? "";
const trocarExtensao = (nome: string, nova: string) => `${nome.replace(/\.[a-z0-9]{1,5}$/i, "") || "arquivo"}.${nova}`;

export function tipoDoArquivo(arquivo: File): TipoMidia {
  if (arquivo.type.startsWith("image/") && !/svg/.test(arquivo.type)) return "image";
  if (arquivo.type.startsWith("video/")) return "video";
  if (arquivo.type.startsWith("audio/")) return "audio";
  return "document";
}

/** Prepara qualquer arquivo para o WhatsApp (comprime ou converte quando precisa). */
export async function prepararArquivo(arquivo: File, opcoes: { voz?: boolean; duracao?: number; aoProgredir?: (texto: string) => void } = {}): Promise<Preparado> {
  const tipo = tipoDoArquivo(arquivo);
  if (tipo === "image") return prepararFoto(arquivo);
  if (tipo === "video") return prepararVideo(arquivo, opcoes.aoProgredir);
  if (tipo === "audio") return prepararAudio(arquivo, Boolean(opcoes.voz), opcoes.duracao);
  const mime = DOCUMENTOS[extensao(arquivo.name)] ?? (Object.values(DOCUMENTOS).includes(arquivo.type) ? arquivo.type : "");
  if (!mime) throw new ErroMidia(`O WhatsApp não aceita arquivos .${extensao(arquivo.name) || "deste tipo"}. Envie PDF, Word, Excel, PowerPoint, TXT ou CSV.`);
  if (arquivo.size > LIMITE.document) throw new ErroMidia("Documento acima de 25 MB.");
  return { blob: arquivo, mime, nome: arquivo.name, tipo: "document" };
}

async function prepararFoto(arquivo: File): Promise<Preparado> {
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" }); }
  catch { throw new ErroMidia("Este navegador não abre esse formato de foto (ex.: HEIC). Converta para JPG ou PNG e envie de novo."); }
  const lado = 1600, escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height));
  const largura = Math.round(bitmap.width * escala), altura = Math.round(bitmap.height * escala);
  const canvas = document.createElement("canvas");
  canvas.width = largura; canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ErroMidia("Não foi possível preparar a foto.");
  ctx.fillStyle = "#fff"; // PNG com transparência fica com fundo branco em JPEG
  ctx.fillRect(0, 0, largura, altura);
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();
  let blob: Blob | null = null;
  for (const qualidade of [0.82, 0.72, 0.6, 0.48]) {
    blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", qualidade));
    if (blob && blob.size <= LIMITE.image) break;
  }
  if (!blob || blob.size > LIMITE.image) throw new ErroMidia("Não foi possível reduzir a foto para o limite do WhatsApp (5 MB).");
  return { blob, mime: "image/jpeg", nome: trocarExtensao(arquivo.name, "jpg"), tipo: "image", previewUrl: URL.createObjectURL(blob) };
}

async function prepararVideo(arquivo: File, aoProgredir?: (texto: string) => void): Promise<Preparado> {
  const mb = await import("mediabunny");
  const input = new mb.Input({ source: new mb.BlobSource(arquivo), formats: mb.ALL_FORMATS });
  try {
    const [faixa, mime] = await Promise.all([input.getPrimaryVideoTrack(), input.getMimeType().catch(() => "")]);
    if (!faixa) throw new ErroMidia("Este vídeo não tem imagem.");
    const duracao = await input.computeDuration();
    // Já serve? MP4 com H.264 e abaixo do limite vai como está (sem perder qualidade nem tempo).
    if (mime.startsWith("video/mp4") && faixa.codec === "avc" && arquivo.size <= 15.5 * MB) return { blob: arquivo, mime: "video/mp4", nome: trocarExtensao(arquivo.name, "mp4"), tipo: "video", duration: duracao, previewUrl: URL.createObjectURL(arquivo) };
    if (!(await mb.canEncodeVideo("avc"))) throw new ErroMidia("Este navegador não converte vídeo. Use o Chrome, o Edge ou o Safari atualizados, ou envie um MP4 menor que 16 MB.");
    const alvoBits = 14 * MB * 8, audioBits = 96_000;
    const videoBits = Math.min(2_500_000, Math.floor(alvoBits / Math.max(duracao, 1)) - audioBits);
    if (videoBits < 250_000) throw new ErroMidia(`Vídeo longo demais para o WhatsApp (${Math.round(duracao / 60)} min). Envie um trecho mais curto.`);
    const maior = Math.max(faixa.displayWidth, faixa.displayHeight), escala = Math.min(1, 1280 / maior);
    const par = (valor: number) => Math.max(2, Math.round((valor * escala) / 2) * 2);
    const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }), target: new mb.BufferTarget() });
    const conversao = await mb.Conversion.init({ input, output, video: { codec: "avc", bitrate: videoBits, width: par(faixa.displayWidth), height: par(faixa.displayHeight), frameRate: 30 }, audio: { codec: "aac", bitrate: audioBits, numberOfChannels: 2, sampleRate: 44100 } });
    if (!conversao.isValid) throw new ErroMidia("Não foi possível converter este vídeo no navegador.");
    conversao.onProgress = (progresso) => aoProgredir?.(`Comprimindo o vídeo… ${Math.round(progresso * 100)}%`);
    await conversao.execute();
    const buffer = output.target.buffer;
    if (!buffer) throw new ErroMidia("A conversão do vídeo não terminou.");
    const blob = new Blob([buffer], { type: "video/mp4" });
    if (blob.size > LIMITE.video) throw new ErroMidia("Mesmo comprimido, o vídeo passou de 16 MB. Envie um trecho mais curto.");
    return { blob, mime: "video/mp4", nome: trocarExtensao(arquivo.name, "mp4"), tipo: "video", duration: duracao, previewUrl: URL.createObjectURL(blob) };
  } finally { input.dispose?.(); }
}

async function prepararAudio(arquivo: File, voz: boolean, duracao?: number): Promise<Preparado> {
  const mime = arquivo.type.split(";")[0];
  // MP3/M4A/AAC/OGG escolhidos como arquivo seguem como estão (o WhatsApp aceita).
  if (!voz && /^audio\/(mpeg|mp4|aac|ogg|amr)$/.test(mime)) {
    if (arquivo.size > LIMITE.audio) throw new ErroMidia("Áudio acima de 16 MB.");
    return { blob: arquivo, mime: mime === "audio/x-m4a" ? "audio/mp4" : mime, nome: arquivo.name, tipo: "audio", duration: duracao };
  }
  const mb = await import("mediabunny");
  const input = new mb.Input({ source: new mb.BlobSource(arquivo), formats: mb.ALL_FORMATS });
  try {
    const faixa = await input.getPrimaryAudioTrack();
    if (!faixa) throw new ErroMidia("Áudio vazio.");
    const segundos = duracao ?? (await input.computeDuration());
    // OGG/Opus é o único formato de nota de voz: com Opus na origem (Chrome), só troca o container.
    if (faixa.codec === "opus" || (await mb.canEncodeAudio("opus"))) {
      const output = new mb.Output({ format: new mb.OggOutputFormat(), target: new mb.BufferTarget() });
      // Opus na origem: só troca o container (instantâneo); shiftTolerance libera a cópia apesar do pre-skip do Opus.
      const conversao = await mb.Conversion.init({ input, output, video: { discard: true }, copy: { shiftTolerance: Infinity }, audio: faixa.codec === "opus" ? {} : { codec: "opus", bitrate: 32_000, numberOfChannels: 1, sampleRate: 48_000 } });
      if (conversao.isValid) {
        await conversao.execute();
        if (output.target.buffer) return { blob: new Blob([output.target.buffer], { type: "audio/ogg" }), mime: "audio/ogg", nome: "nota-de-voz.ogg", tipo: "audio", duration: segundos, voice: true };
      }
    }
    // Sem Opus (Safari antigo): segue como M4A/AAC (o WhatsApp mostra como áudio, não como nota de voz).
    if (/^audio\/(mp4|aac)$/.test(mime)) return { blob: arquivo, mime: "audio/mp4", nome: "audio.m4a", tipo: "audio", duration: segundos };
    throw new ErroMidia("Este navegador não consegue gerar a nota de voz no formato do WhatsApp. Use o Chrome, o Edge ou o Safari atualizados.");
  } finally { input.dispose?.(); }
}

/** Sobe para o R2 com progresso (XHR) e pede ao servidor o envio à Meta. Sem R2, manda direto (até 4 MB). */
export async function enviarPreparado(phone: string, preparado: Preparado, extra: { caption?: string; replyTo?: string; clientRequestId: string; aoProgredir?: (texto: string) => void }): Promise<{ message: WhatsAppMessage }> {
  const dados = { phone, tipo: preparado.tipo, mime: preparado.mime, size: preparado.blob.size, filename: preparado.nome, duration: preparado.duration, voice: preparado.voice, caption: extra.caption, replyTo: extra.replyTo, clientRequestId: extra.clientRequestId };
  const preparo = await json<{ modo: "r2" | "direto"; key?: string; url?: string; limite?: number }>({ acao: "preparar", ...dados });
  if (preparo.modo === "r2" && preparo.url && preparo.key) {
    await subir(preparo.url, preparado.blob, preparado.mime, (fracao) => extra.aoProgredir?.(`Enviando… ${Math.round(fracao * 100)}%`));
    extra.aoProgredir?.("Confirmando o envio…");
    return json({ acao: "enviar", key: preparo.key, ...dados });
  }
  if (preparado.blob.size > (preparo.limite ?? 4 * MB)) throw new ErroMidia("Sem o storage configurado, só dá para enviar arquivos de até 4 MB.");
  const form = new FormData();
  form.set("file", preparado.blob, preparado.nome);
  form.set("dados", JSON.stringify(dados));
  const resposta = await fetch("/api/whatsapp/midia", { method: "POST", body: form, credentials: "same-origin" });
  return lerResposta(resposta);
}

async function json<T>(corpo: Record<string, unknown>): Promise<T> {
  const resposta = await fetch("/api/whatsapp/midia", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
  return lerResposta<T>(resposta);
}
async function lerResposta<T>(resposta: Response): Promise<T> {
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) throw new ErroMidia(dados?.error || `O envio falhou (HTTP ${resposta.status}).`);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("whatsapp:changed"));
  return dados as T;
}
function subir(url: string, blob: Blob, mime: string, aoProgredir: (fracao: number) => void) {
  return new Promise<void>((ok, falhar) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", mime);
    xhr.upload.onprogress = (evento) => { if (evento.lengthComputable) aoProgredir(evento.loaded / evento.total); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? ok() : falhar(new ErroMidia("O storage recusou o arquivo. Tente de novo.")));
    xhr.onerror = () => falhar(new ErroMidia("A conexão caiu durante o envio. Tente de novo."));
    xhr.send(blob);
  });
}
