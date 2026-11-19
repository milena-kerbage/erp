// Mídia das conversas do WhatsApp (padrão do ERP da Le Ange, adaptado à Vercel + R2):
// - Envio: o navegador comprime (imagem/vídeo) e converte a nota de voz para OGG/Opus; o arquivo sobe direto para o R2
//   por link pré-assinado (fora do limite de 4,5 MB da função), o servidor lê do R2, envia à Meta (/{phone}/media) e
//   manda a mensagem com o id recebido. Sem R2 (desenvolvimento), arquivos de até 4 MB vêm direto no corpo.
// - Visualização: a mídia recebida é baixada da Meta uma vez, guardada no R2 e servida por link assinado (com Range, para
//   áudio e vídeo); as próximas aberturas não voltam à Meta.
import { randomUUID } from 'node:crypto';
import { inspectUpload, presignDownload, presignUpload, readBinary, readPrefix, storageDriver, storeBinary } from '../storage/r2.ts';
import { downloadMedia, effectiveConfiguration, messageById, metaErrorMessage, MIME_PERMITIDOS, phoneNumber, readBytes, sendMessage, setMessageMediaKey, WhatsAppError, type JsonObject } from './core.ts';

export type TipoMidia = 'image' | 'video' | 'audio' | 'document';
// Limites da Cloud API por tipo (imagem 5 MB; vídeo e áudio 16 MB; documento até 100 MB, aqui 25 MB).
const LIMITES: Record<TipoMidia, number> = { image: 5 * 1024 * 1024, video: 16 * 1024 * 1024, audio: 16 * 1024 * 1024, document: 25 * 1024 * 1024 };
const ACEITOS: Record<TipoMidia, RegExp> = {
  image: /^image\/(jpeg|png)$/,
  video: /^video\/(mp4|3gpp)$/,
  audio: /^audio\/(ogg|mpeg|mp4|aac|amr)$/,
  document: /^(application\/(pdf|msword|vnd\.openxmlformats-officedocument\.[a-z.]+|vnd\.ms-excel|vnd\.ms-powerpoint|zip|vnd\.oasis\.opendocument\.[a-z]+)|text\/(plain|csv))$/,
};
const EXTENSAO: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'video/mp4': 'mp4', 'video/3gpp': '3gp', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/amr': 'amr', 'application/pdf': 'pdf', 'text/plain': 'txt', 'text/csv': 'csv' };
const tipoBase = (mime: unknown) => String(mime ?? '').split(';')[0].trim().toLowerCase();
const extensaoDe = (mime: string, nome?: string) => EXTENSAO[mime] || (nome?.match(/\.([a-z0-9]{1,5})$/i)?.[1]?.toLowerCase() ?? 'bin');

function validar(tipo: unknown, mimeBruto: unknown, tamanho: unknown): { tipo: TipoMidia; mime: string; tamanho: number } {
  if (typeof tipo !== 'string' || !(tipo in LIMITES)) throw new WhatsAppError(400, 'Tipo de arquivo inválido.', 'INVALID_MEDIA_TYPE');
  const mime = tipoBase(mimeBruto), bytes = Number(tamanho), t = tipo as TipoMidia;
  if (!ACEITOS[t].test(mime)) throw new WhatsAppError(415, t === 'audio' ? 'O WhatsApp aceita áudio OGG/Opus, MP3, M4A ou AAC.' : t === 'image' ? 'O WhatsApp aceita fotos JPG ou PNG.' : t === 'video' ? 'O WhatsApp aceita vídeos MP4 (H.264).' : 'Formato de documento não aceito pelo WhatsApp.', 'UNSUPPORTED_MEDIA');
  if (!Number.isSafeInteger(bytes) || bytes < 1) throw new WhatsAppError(400, 'Tamanho do arquivo inválido.', 'INVALID_MEDIA_SIZE');
  if (bytes > LIMITES[t]) throw new WhatsAppError(413, `Arquivo grande demais: o limite do WhatsApp para ${t === 'image' ? 'fotos' : t === 'video' ? 'vídeos' : t === 'audio' ? 'áudios' : 'documentos'} é ${Math.round(LIMITES[t] / 1024 / 1024)} MB.`, 'MEDIA_TOO_LARGE');
  return { tipo: t, mime, tamanho: bytes };
}

/** 1º passo: reserva a chave no R2 e devolve o link de upload (ou pede envio direto quando não há R2). */
export async function prepararEnvio(input: JsonObject) {
  phoneNumber(input.phone);
  const { tipo, mime, tamanho } = validar(input.tipo, input.mime, input.size);
  if (storageDriver() !== 'r2') return { modo: 'direto' as const, limite: 4 * 1024 * 1024 };
  const key = `private/whatsapp/out/${randomUUID()}.${extensaoDe(mime, String(input.filename ?? ''))}`;
  return { modo: 'r2' as const, key, url: await presignUpload(key, mime, tamanho), tipo };
}

// Assinatura dos primeiros bytes: o arquivo é o que diz ser (não confia só no tipo informado).
function assinaturaConfere(tipo: TipoMidia, mime: string, inicio: Buffer) {
  const hex = inicio.subarray(0, 12).toString('hex');
  if (mime === 'image/jpeg') return hex.startsWith('ffd8ff');
  if (mime === 'image/png') return hex.startsWith('89504e47');
  if (mime === 'audio/ogg') return inicio.subarray(0, 4).toString('latin1') === 'OggS';
  if (tipo === 'video' || mime === 'audio/mp4') return inicio.subarray(4, 8).toString('latin1') === 'ftyp';
  if (mime === 'application/pdf') return inicio.subarray(0, 4).toString('latin1') === '%PDF';
  return true;
}

async function enviarParaMeta(bytes: Buffer, mime: string, nome: string, fetcher: typeof fetch) {
  const config = await effectiveConfiguration();
  if (!config.configured) throw new WhatsAppError(503, 'Complete a configuração do WhatsApp.', 'NOT_CONFIGURED');
  const form = new FormData();
  form.set('messaging_product', 'whatsapp');
  form.set('type', mime);
  form.set('file', new Blob([new Uint8Array(bytes)], { type: mime }), nome);
  let resposta: Response;
  try { resposta = await fetcher(`https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/media`, { method: 'POST', body: form, headers: { Authorization: `Bearer ${config.accessToken}` }, signal: AbortSignal.timeout(60_000), cache: 'no-store', redirect: 'error' }); }
  catch { throw new WhatsAppError(502, 'A Meta não recebeu o arquivo. Tente de novo.', 'META_UNAVAILABLE'); }
  let corpo: JsonObject = {};
  try { corpo = JSON.parse((await readBytes(resposta, 256 * 1024)).toString('utf8')); } catch { /* resposta vazia */ }
  const id = typeof corpo.id === 'string' ? corpo.id : '';
  if (!resposta.ok || !/^[0-9]{5,40}$/.test(id)) {
    const codigo = Number((corpo.error as JsonObject | undefined)?.code);
    throw new WhatsAppError(502, Number.isFinite(codigo) ? metaErrorMessage(codigo) : 'A Meta recusou o arquivo. Confira o formato e o tamanho.', 'META_REJECTED');
  }
  return id;
}

/** 2º passo: lê do R2 (ou do corpo), confere, envia à Meta e manda a mensagem (idempotente por clientRequestId). */
export async function enviarMidia(input: JsonObject, autor: string, arquivoDireto?: { bytes: Buffer; nome: string }, fetcher: typeof fetch = fetch) {
  const phone = phoneNumber(input.phone);
  const { tipo, mime, tamanho } = validar(input.tipo, input.mime, arquivoDireto ? arquivoDireto.bytes.length : input.size);
  const nome = (typeof input.filename === 'string' && input.filename ? input.filename : `whatsapp.${extensaoDe(mime)}`).replace(/[\\/\r\n"]/g, '_').slice(0, 200);
  let bytes: Buffer, key: string | null = null;
  if (arquivoDireto) bytes = arquivoDireto.bytes;
  else {
    key = typeof input.key === 'string' && /^private\/whatsapp\/out\/[a-f0-9-]{36}\.[a-z0-9]{1,5}$/.test(input.key) ? input.key : null;
    if (!key) throw new WhatsAppError(400, 'Arquivo não encontrado. Envie de novo.', 'INVALID_MEDIA_KEY');
    const info = await inspectUpload(key);
    if (info.size !== tamanho || info.size > LIMITES[tipo]) throw new WhatsAppError(400, 'O arquivo enviado não confere com o informado.', 'MEDIA_MISMATCH');
    if (!assinaturaConfere(tipo, mime, (await readPrefix(key)).bytes)) throw new WhatsAppError(415, 'O conteúdo do arquivo não corresponde ao tipo informado.', 'MEDIA_SIGNATURE');
    bytes = await readBinary(key, LIMITES[tipo]);
  }
  if (!assinaturaConfere(tipo, mime, bytes)) throw new WhatsAppError(415, 'O conteúdo do arquivo não corresponde ao tipo informado.', 'MEDIA_SIGNATURE');
  const assetId = await enviarParaMeta(bytes, mime, nome, fetcher);
  return sendMessage({
    phone, type: tipo, clientRequestId: input.clientRequestId, caption: input.caption, replyTo: input.replyTo, author: autor,
    media: { id: assetId, key, mime, filename: nome, size: bytes.length, duration: Number(input.duration) || undefined, voice: tipo === 'audio' && input.voice === true && mime === 'audio/ogg' },
  }, fetcher);
}

/** Para mostrar na conversa: link assinado do R2 (com cache) ou, sem R2, os bytes. */
export async function midiaParaVer(messageId: string, fetcher: typeof fetch = fetch): Promise<{ url: string } | { bytes: Buffer; mime: string; filename: string }> {
  const encontrada = await messageById(messageId);
  if (!encontrada) throw new WhatsAppError(404, 'Mídia não encontrada.', 'MEDIA_NOT_FOUND');
  const { row } = encontrada, mime = tipoBase(row.mime_type) || 'application/octet-stream', nome = row.filename || `whatsapp-${row.id.slice(-12)}`;
  const r2 = storageDriver() === 'r2';
  if (row.media_key && r2) return { url: await presignDownload(row.media_key, { type: mime, filename: nome }) };
  const baixada = await downloadMedia(messageId, fetcher, 25 * 1024 * 1024);
  if (!MIME_PERMITIDOS.test(baixada.mime)) throw new WhatsAppError(415, 'Tipo de arquivo não suportado.', 'UNSUPPORTED_MEDIA');
  if (r2) {
    const key = `private/whatsapp/in/${randomUUID()}.${extensaoDe(baixada.mime, baixada.filename)}`;
    await storeBinary(key, baixada.bytes, baixada.mime);
    await setMessageMediaKey(messageId, key);
    return { url: await presignDownload(key, { type: baixada.mime, filename: baixada.filename }) };
  }
  return baixada;
}
