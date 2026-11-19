import { WhatsAppError, type JsonObject } from '@/lib/whatsapp/core';
import { enviarMidia, prepararEnvio } from '@/lib/whatsapp/midia';
import { api, jsonBody } from '@/lib/whatsapp/server';
import { queueApplicationEvent } from '@/lib/erp/dispatch';
export const runtime = 'nodejs';
export const maxDuration = 60;
// JSON { acao: 'preparar' } → link de upload no R2; { acao: 'enviar', key, ... } → envia à Meta e manda a mensagem.
// multipart (sem R2, até 4 MB): campo "file" + "dados" (JSON) → envia direto.
export async function POST(request: Request) {
  return api(request, async (user) => {
    const tipo = request.headers.get('content-type') || '';
    if (tipo.startsWith('multipart/form-data')) {
      if (Number(request.headers.get('content-length')) > 4.4 * 1024 * 1024) throw new WhatsAppError(413, 'Arquivo grande demais para envio direto.', 'BODY_TOO_LARGE');
      const form = await request.formData(), arquivo = form.get('file'), dados = JSON.parse(String(form.get('dados') || '{}')) as JsonObject;
      if (!(arquivo instanceof File)) throw new WhatsAppError(400, 'Anexe um arquivo.', 'MISSING_FILE');
      const resultado = await enviarMidia(dados, user.id, { bytes: Buffer.from(await arquivo.arrayBuffer()), nome: arquivo.name });
      if (!resultado.duplicate) await queueApplicationEvent('message.sent', resultado.message.id);
      return resultado;
    }
    const corpo = await jsonBody(request);
    if (corpo.acao === 'preparar') return prepararEnvio(corpo);
    if (corpo.acao === 'enviar') {
      const resultado = await enviarMidia(corpo, user.id);
      if (!resultado.duplicate) await queueApplicationEvent('message.sent', resultado.message.id);
      return resultado;
    }
    throw new WhatsAppError(400, 'Ação de mídia desconhecida.', 'INVALID_ACTION');
  }, true, 60);
}
