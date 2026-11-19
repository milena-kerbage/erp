// A ficha lateral da conversa é a oportunidade (lead) do CRM com o mesmo telefone. O WhatsApp guarda o número com o país
// (5585988887777) e o CRM, só com o DDD (85988887777); o nono dígito pode faltar de um lado: todas as formas valem.
import { erpDB, initializeERP } from '../erp/core.ts';
import { storeAttachment } from '../erp/files.ts';
import type { Actor } from '../erp/access.ts';
import { phoneNumber, WhatsAppError } from './core.ts';
import { midiaBytes } from './midia.ts';

export function variantesDoTelefone(phoneInput: string) {
  const digitos = phoneInput.replace(/\D/g, '');
  const local = digitos.startsWith('55') && digitos.length >= 12 ? digitos.slice(2) : digitos;
  const formas = new Set([digitos, local]);
  if (local.length === 10) formas.add(`${local.slice(0, 2)}9${local.slice(2)}`);
  if (local.length === 11 && local[2] === '9') formas.add(`${local.slice(0, 2)}${local.slice(3)}`);
  for (const forma of [...formas]) if (forma.length === 10 || forma.length === 11) formas.add(`55${forma}`);
  return [...formas].filter(Boolean);
}

/** A oportunidade ativa mais recente com este telefone (ou nenhuma). */
export async function leadDoTelefone(phoneInput: unknown): Promise<{ id: string; name: string } | null> {
  const formas = variantesDoTelefone(phoneNumber(phoneInput));
  await initializeERP();
  const db = erpDB(), pg = db.backend === 'postgres';
  const campo = (chave: string) => pg ? `data_json::jsonb ->> '${chave}'` : `json_extract(data_json, '$.${chave}')`;
  const row = await db.prepare(`SELECT id, ${campo('name')} AS name FROM leads WHERE archived_at IS NULL AND ${campo('phone')} IN (${formas.map(() => '?').join(', ')}) ORDER BY updated DESC, id DESC LIMIT 1`).get(...formas) as { id: string; name: string | null } | undefined;
  return row ? { id: String(row.id), name: String(row.name ?? '') } : null;
}

/** "Salvar na ficha": a foto, o áudio ou o documento da mensagem vira arquivo da oportunidade. */
export async function salvarNaFicha(messageId: unknown, leadId: unknown, actor: Actor) {
  if (typeof messageId !== 'string' || !messageId || messageId.length > 300) throw new WhatsAppError(400, 'Mensagem inválida.', 'INVALID_MESSAGE_ID');
  if (typeof leadId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(leadId)) throw new WhatsAppError(400, 'Oportunidade inválida.', 'INVALID_LEAD');
  const midia = await midiaBytes(messageId);
  return storeAttachment(leadId, midia.filename, midia.mime, midia.bytes, midia.duration, actor);
}
