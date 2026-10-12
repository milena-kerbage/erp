import { databaseFor, type Database } from '../database.ts';
import { effectiveConfiguration, environmentConfiguration, integrationSettingsSchema } from './config.ts';
export { effectiveConfiguration } from './config.ts';
import { createHash, createHmac, timingSafeEqual, randomUUID } from 'node:crypto';

export class WhatsAppError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code = 'WHATSAPP_ERROR') { super(message); this.status = status; this.code = code; }
}
export type JsonObject = Record<string, unknown>;
export type ConsentStatus = 'unknown' | 'granted' | 'revoked';
export type Message = { id: string; phone: string; direction: 'inbound' | 'outbound'; type: string; text: string; status: string; createdAt: string; isRead: boolean; error?: string; mediaId?: string; mimeType?: string; filename?: string };
type ContactRow = { phone: string; name: string; consent_status: ConsentStatus; consent_source: string; consent_updated: number | null; opted_out: number; last_inbound: number | null; updated: number };
type MessageRow = { id: string; phone: string; direction: 'inbound' | 'outbound'; type: string; text: string; status: string; created: number; status_rank: number; error: string | null; media_id: string | null; mime_type: string | null; filename: string | null; is_read: number };
type SendRow = { request_key: string; payload_hash: string; message_id: string; state: string; created: number };
export type Template = { id?: string; name: string; language: string; status: string; category: string; parameter_format?: string; components: JsonObject[] };
export const DAY = 24 * 60 * 60 * 1000;
export const mediaMaximumBytes = () => (process.env.VERCEL === '1' ? 3 : 16) * 1024 * 1024;
const iso = (value: number | null) => value === null ? null : new Date(value).toISOString();
const object = (value: unknown): JsonObject => value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const string = (value: unknown, maximum = 500) => typeof value === 'string' ? value.slice(0, maximum) : '';
export const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
export function phoneNumber(value: unknown) {
  const phone = typeof value === 'string' ? value.replace(/^\+/, '') : '';
  if (!/^[1-9][0-9]{7,14}$/.test(phone)) throw new WhatsAppError(400, 'Informe o telefone internacional com DDI, apenas números.', 'INVALID_PHONE');
  return phone;
}
export function retentionDays() {
  const value = Number(process.env.WHATSAPP_RETENTION_DAYS || 90);
  return Number.isInteger(value) && value >= 1 && value <= 3650 ? value : 90;
}
export function configuration() { return environmentConfiguration(); }
async function configured() { const config = await effectiveConfiguration(); if (!config.configured) throw new WhatsAppError(503, 'Complete a configuração da integração no servidor.', 'NOT_CONFIGURED'); return config; }

const sqliteSchema = `PRAGMA journal_mode = DELETE; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA secure_delete = ON;
    CREATE TABLE IF NOT EXISTS contacts (phone TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '', consent_status TEXT NOT NULL DEFAULT 'unknown', consent_source TEXT NOT NULL DEFAULT '', consent_updated INTEGER, opted_out INTEGER NOT NULL DEFAULT 0, last_inbound INTEGER, updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, phone TEXT NOT NULL REFERENCES contacts(phone) ON DELETE CASCADE, direction TEXT NOT NULL, type TEXT NOT NULL, text TEXT NOT NULL, status TEXT NOT NULL, status_rank INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL, error TEXT, media_id TEXT, mime_type TEXT, filename TEXT, is_read INTEGER NOT NULL DEFAULT 0);
    CREATE INDEX IF NOT EXISTS messages_phone_created ON messages(phone, created);
    CREATE TABLE IF NOT EXISTS consent_audit (id TEXT PRIMARY KEY, phone TEXT NOT NULL REFERENCES contacts(phone) ON DELETE CASCADE, status TEXT NOT NULL, source TEXT NOT NULL, actor TEXT NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS webhook_events (event_key TEXT PRIMARY KEY, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS send_requests (request_key TEXT PRIMARY KEY, payload_hash TEXT NOT NULL, message_id TEXT NOT NULL, phone TEXT NOT NULL REFERENCES contacts(phone) ON DELETE CASCADE, state TEXT NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS pending_statuses (message_id TEXT PRIMARY KEY, status TEXT NOT NULL, rank INTEGER NOT NULL, error TEXT, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS suppression (phone_hash TEXT PRIMARY KEY, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS deletion_audit (id TEXT PRIMARY KEY, actor TEXT NOT NULL, verification_hash TEXT NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, until INTEGER NOT NULL);
    ${integrationSettingsSchema}`;
let database: Database | undefined;
export function db() { database = databaseFor('whatsapp', process.env.WHATSAPP_DB_PATH || '.data/whatsapp.sqlite', sqliteSchema); return database; }
export async function closeDatabase() { await database?.close(); database = undefined; }
export async function limited(key: string, max = 60, window = 60_000) {
  const database = db(), now = Date.now();
  return database.transaction(async () => {
    await database.prepare('DELETE FROM rate_limits WHERE until < ?').run(now);
    await database.prepare('INSERT INTO rate_limits VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = rate_limits.count + 1').run(digest(key), now + window);
    return (await database.prepare('SELECT count FROM rate_limits WHERE key = ?').get(digest(key)) as {count: number}).count > max;
  });
}
async function suppressionHash(phone: string, suppliedSecret?: string) {
  const secret = suppliedSecret === undefined ? (await effectiveConfiguration()).suppressionSecret : suppliedSecret;
  if (secret.length < 32) throw new WhatsAppError(503, 'Configure a proteção da lista de supressão no servidor.', 'SUPPRESSION_NOT_CONFIGURED');
  return createHmac('sha256', secret).update(phone).digest('hex');
}
async function suppressed(phone: string, secret?: string) { return Boolean(await db().prepare('SELECT 1 FROM suppression WHERE phone_hash = ?').get(await suppressionHash(phone, secret))); }
async function lockContact(phone: string) {
  if (db().backend === 'postgres') await db().prepare('SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(?, 0))').get(`whatsapp-contact:${phone}`);
}
async function ensureContact(phone: string, name = '', now = Date.now()) {
  await db().prepare(`INSERT INTO contacts (phone, name, updated) VALUES (?, ?, ?) ON CONFLICT(phone) DO UPDATE SET name = CASE WHEN excluded.name <> '' THEN excluded.name ELSE contacts.name END, updated = greatest(contacts.updated, excluded.updated)`).run(phone, name, now);
}
export async function setConsent(input: JsonObject, actor: string) {
  const phone = phoneNumber(input.phone), status = input.status;
  const source = typeof input.source === 'string' ? input.source.trim() : '';
  if (!['granted', 'revoked'].includes(String(status)) || source.length < 5 || source.length > 500) throw new WhatsAppError(400, 'Registre autorização ou revogação com a origem e a evidência (5 a 500 caracteres).', 'INVALID_CONSENT');
  const database = db(), now = Date.now(), hash = await suppressionHash(phone);
  await database.transaction(async () => {
    await lockContact(phone);
    await ensureContact(phone);
    await database.prepare('UPDATE contacts SET consent_status = ?, consent_source = ?, consent_updated = ?, opted_out = ?, updated = ? WHERE phone = ?').run(String(status), source, now, status === 'revoked' ? 1 : 0, now, phone);
    await database.prepare('INSERT INTO consent_audit VALUES (?, ?, ?, ?, ?, ?)').run(randomUUID(), phone, String(status), source, actor, now);
    if (status === 'granted') await database.prepare('DELETE FROM suppression WHERE phone_hash = ?').run(hash);
    else await database.prepare('INSERT INTO suppression VALUES (?, ?) ON CONFLICT(phone_hash) DO UPDATE SET created = excluded.created').run(hash, now);
  });
  return await conversation(phone);
}
export async function deleteContact(phoneInput: unknown, evidence?: {actor: string; verification: string}) {
  const phone = phoneNumber(phoneInput), database = db(), hash = await suppressionHash(phone);
  return database.transaction(async () => {
    await lockContact(phone);
    const messages = await database.prepare('SELECT id FROM messages WHERE phone = ?').all(phone) as {id: string}[];
    for (const message of messages) await database.prepare('DELETE FROM pending_statuses WHERE message_id = ?').run(message.id);
    const deleted = (await database.prepare('DELETE FROM contacts WHERE phone = ?').run(phone)).changes;
    await database.prepare('INSERT INTO suppression VALUES (?, ?) ON CONFLICT(phone_hash) DO UPDATE SET created = excluded.created').run(hash, Date.now());
    if (evidence) await database.prepare('INSERT INTO deletion_audit VALUES (?, ?, ?, ?)').run(randomUUID(), evidence.actor, digest(evidence.verification), Date.now());
    return { deleted: Number(deleted), suppressed: true };
  });
}
export async function pruneRetention(now = Date.now()) {
  const days = (await effectiveConfiguration()).retentionDays, cutoff = now - days * DAY, database = db();
  return database.transaction(async () => {
    const messages = (await database.prepare('DELETE FROM messages WHERE created < ?').run(cutoff)).changes;
    await database.prepare('DELETE FROM send_requests WHERE created < ?').run(cutoff);
    await database.prepare('DELETE FROM webhook_events WHERE created < ?').run(cutoff);
    await database.prepare('DELETE FROM pending_statuses WHERE created < ?').run(cutoff);
    await database.prepare('DELETE FROM consent_audit WHERE created < ?').run(cutoff);
    await database.prepare('DELETE FROM deletion_audit WHERE created < ?').run(cutoff);
    await database.prepare('DELETE FROM integration_audit WHERE created < ?').run(cutoff);
    await database.prepare('DELETE FROM contacts WHERE updated < ? AND NOT EXISTS(SELECT 1 FROM messages WHERE messages.phone = contacts.phone)').run(cutoff);
    await database.prepare('INSERT INTO metadata VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run('lastRetentionAt', new Date(now).toISOString());
    return { messages: Number(messages), retentionDays: days };
  });
}
async function maintenance() {
  const row = await db().prepare("SELECT value FROM metadata WHERE key = 'lastRetentionAt'").get() as {value: string} | undefined;
  if (!row || Date.now() - Date.parse(row.value) > 60 * 60 * 1000) await pruneRetention();
}
function messageFromRow(row: MessageRow): Message { return { id: row.id, phone: row.phone, direction: row.direction, type: row.type, text: row.text, status: row.status, createdAt: iso(row.created)!, isRead: Boolean(row.is_read), ...(row.error ? { error: row.error } : {}), ...(row.media_id ? {mediaId: row.media_id} : {}), ...(row.mime_type ? {mimeType: row.mime_type} : {}), ...(row.filename ? {filename: row.filename} : {}) }; }
type ConversationRow = ContactRow & {last_text: string | null; last_created: number | null; unread_count: number};
const summarySql = `SELECT contacts.*, (SELECT text FROM messages WHERE messages.phone = contacts.phone ORDER BY created DESC, id DESC LIMIT 1) AS last_text, (SELECT created FROM messages WHERE messages.phone = contacts.phone ORDER BY created DESC, id DESC LIMIT 1) AS last_created, (SELECT COUNT(*) FROM messages WHERE messages.phone = contacts.phone AND direction = 'inbound' AND is_read = 0) AS unread_count FROM contacts`;
function conversationFromRow(row: ConversationRow) {
  return {phone: row.phone, name: row.name || row.phone, lastMessage: row.last_text || '', lastMessageAt: iso(row.last_created ?? row.updated), unreadCount: row.unread_count, serviceWindowExpiresAt: iso(row.last_inbound === null ? null : row.last_inbound + DAY), consent: {status: row.consent_status, source: row.consent_source, updatedAt: iso(row.consent_updated)}, optedOut: Boolean(row.opted_out)};
}
export async function conversation(phone: string) {
  const row = await db().prepare(`${summarySql} WHERE phone = ?`).get(phone) as ConversationRow | undefined;
  return row ? conversationFromRow(row) : null;
}
export async function conversations(limit = 100, offset = 0) {
  await maintenance();
  const rows = await db().prepare(`${summarySql} WHERE opted_out = 0 ORDER BY updated DESC LIMIT ? OFFSET ?`).all(limit, offset) as ConversationRow[];
  return rows.map(conversationFromRow);
}
export async function unreadConversationCount() {
  await maintenance();
  const row = await db().prepare(`SELECT COUNT(*) AS count FROM contacts WHERE opted_out = 0 AND EXISTS (SELECT 1 FROM messages WHERE messages.phone = contacts.phone AND direction = 'inbound' AND is_read = 0)`).get() as {count: number};
  return row.count;
}
export async function messagesFor(phoneInput: unknown, before?: string, limit = 100) {
  await maintenance(); const phone = phoneNumber(phoneInput);
  let cutoff = Date.now() + 1, beforeId = '';
  if (before) {
    if (before.length > 1000) throw new WhatsAppError(400, 'Cursor inválido.', 'INVALID_CURSOR');
    try {
      if (/^\d{4}-/.test(before)) cutoff = Date.parse(before);
      else { const cursor = JSON.parse(Buffer.from(before, 'base64url').toString('utf8')); cutoff = cursor.created; beforeId = cursor.id; if (!Number.isSafeInteger(cutoff) || typeof beforeId !== 'string' || beforeId.length > 300) throw new Error(); }
    } catch { throw new WhatsAppError(400, 'Cursor inválido.', 'INVALID_CURSOR'); }
  }
  if (!Number.isFinite(cutoff)) throw new WhatsAppError(400, 'Cursor inválido.', 'INVALID_CURSOR');
  const rows = await db().prepare('SELECT * FROM messages WHERE phone = ? AND (created < ? OR (created = ? AND id < ?)) ORDER BY created DESC, id DESC LIMIT ?').all(phone, cutoff, cutoff, beforeId, limit + 1) as MessageRow[];
  const more = rows.length > limit; rows.length = Math.min(rows.length, limit);
  rows.reverse();
  return { messages: rows.map(messageFromRow), conversation: await conversation(phone), nextBefore: more ? Buffer.from(JSON.stringify({created: rows[0].created, id: rows[0].id})).toString('base64url') : null };
}
export async function lastWebhookAt() { return (await db().prepare("SELECT value FROM metadata WHERE key = 'lastWebhookAt'").get() as {value: string} | undefined)?.value || null; }

export function signatureValid(raw: Buffer, signature: string | null, secret = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || '') {
  if (secret.length < 16 || !signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(raw).digest();
  return timingSafeEqual(expected, Buffer.from(signature.slice(7), 'hex'));
}
export function verifyChallenge(url: URL, token = process.env.WHATSAPP_VERIFY_TOKEN || '') {
  const supplied = url.searchParams.get('hub.verify_token') || '';
  const challenge = url.searchParams.get('hub.challenge') || '';
  if (token.length < 16) throw new WhatsAppError(503, 'Webhook ainda não configurado.', 'NOT_CONFIGURED');
  if (url.searchParams.get('hub.mode') !== 'subscribe' || !challenge || challenge.length > 1024 || supplied.length > 1024 || !timingSafeEqual(Buffer.from(digest(token), 'hex'), Buffer.from(digest(supplied), 'hex'))) throw new WhatsAppError(403, 'Verificação do webhook recusada.', 'INVALID_VERIFY_TOKEN');
  return challenge;
}
export async function effectiveSignatureValid(raw: Buffer, signature: string | null) { return signatureValid(raw, signature, (await effectiveConfiguration()).appSecret); }
export async function verifyEffectiveChallenge(url: URL) { return verifyChallenge(url, (await effectiveConfiguration()).verifyToken); }
const statusRank: Record<string, number> = { sending: 0, unknown: 0, accepted: 2, sent: 3, failed: 4, delivered: 5, read: 6 };
async function applyStatus(id: string, status: string, created: number, error: string | null) {
  const rank = statusRank[status]; if (rank === undefined) return;
  await db().prepare(`INSERT INTO pending_statuses VALUES (?, ?, ?, ?, ?) ON CONFLICT(message_id) DO UPDATE SET status = excluded.status, rank = excluded.rank, error = excluded.error, created = greatest(pending_statuses.created, excluded.created) WHERE excluded.rank > pending_statuses.rank`).run(id, status, rank, error, created);
  await db().prepare('UPDATE messages SET status = ?, status_rank = ?, error = ? WHERE id = ? AND status_rank < ?').run(status, rank, error, id, rank);
}
async function reconcileStatus(id: string) {
  const row = await db().prepare('SELECT * FROM pending_statuses WHERE message_id = ?').get(id) as {status: string; rank: number; error: string | null} | undefined;
  if (row) await db().prepare('UPDATE messages SET status = ?, status_rank = ?, error = ? WHERE id = ? AND status_rank < ?').run(row.status, row.rank, row.error, id, row.rank);
}
export async function receiveWebhook(payload: unknown, now = Date.now(), acceptedMessageIds?: string[]) {
  const root = object(payload), config = await effectiveConfiguration();
  if (root.object !== 'whatsapp_business_account' || !Array.isArray(root.entry)) throw new WhatsAppError(400, 'Evento WhatsApp inválido.', 'INVALID_WEBHOOK');
  if (!/^[0-9]{5,30}$/.test(config.phoneNumberId) || !/^[0-9]{5,30}$/.test(config.businessAccountId)) throw new WhatsAppError(503, 'Configure os identificadores WhatsApp no servidor.', 'NOT_CONFIGURED');
  await maintenance(); const database = db(); let processed = 0, ignored = 0;
  return database.transaction(async () => {
    for (const entryValue of array(root.entry)) {
      const entry = object(entryValue);
      if (entry.id !== config.businessAccountId) { ignored++; continue; }
      for (const changeValue of array(entry.changes)) {
        const change = object(changeValue), value = object(change.value);
        if (change.field !== 'messages' || object(value.metadata).phone_number_id !== config.phoneNumberId) { ignored++; continue; }
        const names = new Map(array(value.contacts).map(item => { const contact = object(item); return [string(contact.wa_id, 20), string(object(contact.profile).name, 200)]; }));
        for (const item of array(value.messages)) {
          const incoming = object(item), id = string(incoming.id, 300), type = string(incoming.type, 30) || 'unknown';
          let phone: string; try { phone = phoneNumber(incoming.from); } catch { ignored++; continue; }
          const timestamp = Number(incoming.timestamp) * 1000;
          if (!id || !Number.isFinite(timestamp) || timestamp < now - config.retentionDays * DAY || timestamp > now + 300_000) { ignored++; continue; }
          await lockContact(phone);
          if (await suppressed(phone, config.suppressionSecret)) { ignored++; continue; }
          const eventKey = digest(`message:${id}`);
          if (!(await database.prepare('INSERT INTO webhook_events VALUES (?, ?) ON CONFLICT(event_key) DO NOTHING').run(eventKey, now)).changes) { ignored++; continue; }
          const media = object(incoming[type]);
          const interactive = object(incoming.interactive);
          const text = type === 'text' ? string(object(incoming.text).body, 4096) : type === 'button' ? string(object(incoming.button).text, 4096) : type === 'interactive' ? string(object(interactive.button_reply).title || object(interactive.list_reply).title, 4096) : string(media.caption, 4096) || `[${type}]`;
          const created = Math.min(timestamp, now);
          await ensureContact(phone, names.get(phone), created);
          await database.prepare(`INSERT INTO messages (id, phone, direction, type, text, status, created, media_id, mime_type, filename) VALUES (?, ?, 'inbound', ?, ?, 'received', ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`).run(id, phone, type, text, created, /^[0-9]{5,40}$/.test(string(media.id, 40)) ? String(media.id) : null, string(media.mime_type, 100) || null, string(media.filename, 200) || null);
          await database.prepare('UPDATE contacts SET last_inbound = greatest(COALESCE(last_inbound, 0), ?), updated = greatest(updated, ?) WHERE phone = ?').run(created, created, phone);
          const optout = text.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
          if (['STOP', 'PARAR', 'SAIR', 'CANCELAR', 'DESCADASTRAR', 'PARE', 'NAO QUERO RECEBER MENSAGENS'].includes(optout)) {
            await database.prepare("UPDATE contacts SET consent_status = 'revoked', consent_source = 'Solicitação recebida por WhatsApp', consent_updated = ?, opted_out = 1 WHERE phone = ?").run(now, phone);
            await database.prepare('INSERT INTO consent_audit VALUES (?, ?, ?, ?, ?, ?)').run(randomUUID(), phone, 'revoked', 'Solicitação recebida por WhatsApp', 'webhook', now);
            await database.prepare('INSERT INTO suppression VALUES (?, ?) ON CONFLICT(phone_hash) DO UPDATE SET created = excluded.created').run(await suppressionHash(phone, config.suppressionSecret), now);
          }
          acceptedMessageIds?.push(id); processed++;
        }
        for (const item of array(value.statuses)) {
          const status = object(item), id = string(status.id, 300), state = string(status.status, 30);
          const timestamp = Number(status.timestamp) * 1000;
          if (!id || !Number.isFinite(timestamp) || timestamp < now - config.retentionDays * DAY || timestamp > now + 300_000) { ignored++; continue; }
          const eventKey = digest(`status:${id}:${state}:${timestamp}`);
          if (!(await database.prepare('INSERT INTO webhook_events VALUES (?, ?) ON CONFLICT(event_key) DO NOTHING').run(eventKey, now)).changes) { ignored++; continue; }
          const requestKey = string(status.biz_opaque_callback_data, 100);
          const request = await database.prepare('SELECT * FROM send_requests WHERE request_key = ?').get(requestKey) as SendRow | undefined;
          if (request && request.message_id.startsWith('local.')) {
            await database.prepare('UPDATE messages SET id = ? WHERE id = ?').run(id, request.message_id);
            await database.prepare("UPDATE send_requests SET message_id = ?, state = 'accepted' WHERE request_key = ?").run(id, requestKey);
          }
          const errorCode = Number(object(array(status.errors)[0]).code);
          await applyStatus(id, state, now, Number.isFinite(errorCode) ? `Meta: ${errorCode}` : null); processed++;
        }
      }
    }
    await database.prepare('INSERT INTO metadata VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run('lastWebhookAt', new Date(now).toISOString());
    return {processed, ignored};
  });
}

export async function graph(path: string, options: RequestInit = {}, fetcher: typeof fetch = fetch): Promise<JsonObject> {
  const config = await configured();
  if (!/^\/?[0-9]{5,40}(?:\/[a-z_]+)?(?:\?[^#]*)?$/.test(path)) throw new WhatsAppError(500, 'Recurso Graph inválido.', 'INVALID_GRAPH_PATH');
  let response: Response;
  try {
    response = await fetcher(`https://graph.facebook.com/${config.apiVersion}/${path.replace(/^\//, '')}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers, Authorization: `Bearer ${config.accessToken}` }, signal: AbortSignal.timeout(15_000), cache: 'no-store', redirect: 'error' });
  } catch { throw new WhatsAppError(502, 'A Meta não confirmou a operação. Verifique o histórico antes de reenviar.', 'META_UNAVAILABLE'); }
  let body: JsonObject;
  try { const raw = await readBytes(response, 2 * 1024 * 1024); body = object(JSON.parse(raw.toString('utf8'))); } catch { throw new WhatsAppError(502, 'Resposta inválida da Meta.', 'META_INVALID_RESPONSE'); }
  if (!response.ok || body.error) {
    const code = Number(object(body.error).code);
    throw new WhatsAppError(response.status === 429 ? 429 : 502, Number.isFinite(code) ? `A Meta recusou a operação (código ${code}). Confira permissões, conta e configuração no painel da Meta.` : 'A Meta recusou a operação. Confira a configuração no painel da Meta.', 'META_REJECTED');
  }
  return body;
}
export async function listTemplates(fetcher: typeof fetch = fetch) {
  const config = await configured(); let after = '', pages = 0, more = false; const templates: Template[] = [];
  do {
    const query = new URLSearchParams({fields: 'id,name,language,status,category,components,parameter_format', limit: '100', ...(after ? {after} : {})});
    const result = await graph(`${config.businessAccountId}/message_templates?${query}`, {}, fetcher);
    for (const value of array(result.data)) {
      const row = object(value);
      if (typeof row.name === 'string' && typeof row.language === 'string') templates.push({id: string(row.id), name: string(row.name), language: string(row.language, 30), status: string(row.status, 30), category: string(row.category, 30), parameter_format: string(row.parameter_format, 30), components: array(row.components).map(object)});
    }
    const paging = object(result.paging); more = Boolean(paging.next); after = string(object(paging.cursors).after, 1000); pages++;
  } while (more && after && pages < 20);
  return {templates, truncated: more && (!after || pages >= 20)};
}
export async function diagnostics(fetcher: typeof fetch = fetch) {
  const config = await configured();
  const [phone, subscriptions] = await Promise.all([
    graph(`${config.phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating`, {}, fetcher),
    graph(`${config.businessAccountId}/subscribed_apps`, {}, fetcher),
  ]);
  return {ok: true, phoneNumber: {id: string(phone.id), displayPhoneNumber: string(phone.display_phone_number), verifiedName: string(phone.verified_name), qualityRating: string(phone.quality_rating)}, subscriptions: array(subscriptions.data).map(value => { const data = object(object(value).whatsapp_business_api_data); return {id: string(data.id), name: string(data.name)}; }), checkedAt: new Date().toISOString()};
}
async function permissionToSend(phone: string, type: string) {
  const row = await db().prepare('SELECT * FROM contacts WHERE phone = ?').get(phone) as ContactRow | undefined;
  if (await suppressed(phone) || row?.opted_out) throw new WhatsAppError(409, 'Contato retirado da lista de comunicações. Obtenha uma nova autorização comprovada antes de contatar.', 'OPTED_OUT');
  if (row?.consent_status !== 'granted') throw new WhatsAppError(409, 'Registre uma autorização comprovada para este contato antes de enviar.', 'CONSENT_REQUIRED');
  if (type === 'text' && (!row.last_inbound || Date.now() >= row.last_inbound + DAY)) throw new WhatsAppError(409, 'A janela de atendimento de 24 horas está fechada. Use um template aprovado.', 'WINDOW_CLOSED');
}
export async function sendMessage(input: JsonObject, fetcher: typeof fetch = fetch) {
  const config = await configured(), phone = phoneNumber(input.phone), type = input.type;
  const requestKey = typeof input.clientRequestId === 'string' ? input.clientRequestId : '';
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(requestKey)) throw new WhatsAppError(400, 'Informe uma chave única clientRequestId com 8 a 100 caracteres.', 'INVALID_REQUEST_ID');
  if (type !== 'text' && type !== 'template') throw new WhatsAppError(400, 'Envie texto ou template aprovado.', 'INVALID_MESSAGE_TYPE');
  const payload: JsonObject = { messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, type, biz_opaque_callback_data: requestKey };
  let display = '';
  if (type === 'text') {
    if (typeof input.text !== 'string' || !input.text.trim() || input.text.length > 4096) throw new WhatsAppError(400, 'O texto deve ter de 1 a 4096 caracteres.', 'INVALID_TEXT');
    display = input.text.trim(); payload.text = {body: display, preview_url: false};
  } else {
    const template = object(input.template), name = string(template.name), language = string(template.language, 30);
    if (!/^[a-z0-9_]{1,512}$/.test(name) || !/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(language)) throw new WhatsAppError(400, 'Nome ou idioma do template inválido.', 'INVALID_TEMPLATE');
    const components = array(template.components);
    if (components.length > 1 || components.some(value => object(value).type !== 'body')) throw new WhatsAppError(400, 'Esta integração suporta templates de texto com parâmetros no corpo.', 'UNSUPPORTED_TEMPLATE');
    const parameters = array(object(components[0]).parameters);
    if (parameters.length > 30 || parameters.some(value => object(value).type !== 'text' || !string(object(value).text, 1025).trim() || string(object(value).text, 1025).length > 1024)) throw new WhatsAppError(400, 'Use apenas parâmetros de texto, com até 1024 caracteres.', 'INVALID_PARAMETERS');
    payload.template = {name, language: {code: language}, ...(components.length ? {components: [{type: 'body', parameters: parameters.map(value => ({type: 'text', text: String(object(value).text)}))}]} : {})};
    display = `[Template: ${name} (${language})] ${parameters.map(value => string(object(value).text, 1024)).join(' · ')}`.trim();
  }
  const hash = digest(JSON.stringify(payload)), database = db();
  const existing = await database.prepare('SELECT * FROM send_requests WHERE request_key = ?').get(requestKey) as SendRow | undefined;
  if (existing) {
    if (existing.payload_hash !== hash) throw new WhatsAppError(409, 'Esta chave já foi usada com outro conteúdo.', 'REQUEST_ID_CONFLICT');
    const row = await database.prepare('SELECT * FROM messages WHERE id = ?').get(existing.message_id) as MessageRow | undefined;
    if (row && existing.state === 'accepted') return {message: messageFromRow(row), duplicate: true};
    throw new WhatsAppError(409, 'Este envio já foi iniciado. Verifique o histórico e aguarde a confirmação antes de criar outro envio.', 'SEND_ALREADY_STARTED');
  }
  await permissionToSend(phone, type);
  if (type === 'template') {
    const requested = object(input.template), remote = await listTemplates(fetcher);
    const approved = remote.templates.find(template => template.name === requested.name && template.language === requested.language && template.status === 'APPROVED');
    if (!approved) throw new WhatsAppError(409, 'O template ainda não está aprovado ou não existe nesta conta e idioma.', 'TEMPLATE_NOT_APPROVED');
    const unsupported = approved.parameter_format === 'NAMED' || approved.components.some(component => component.type === 'HEADER' && (component.format !== 'TEXT' || /\{\{/.test(string(component.text, 4096))) || component.type === 'BUTTONS' && array(component.buttons).some(button => /\{\{/.test(string(object(button).url))));
    if (unsupported) throw new WhatsAppError(400, 'Este template requer mídia, parâmetros nomeados ou botões variáveis, ainda não suportados.', 'UNSUPPORTED_TEMPLATE');
    const body = approved.components.find(component => component.type === 'BODY');
    const expected = new Set(string(body?.text, 4096).match(/\{\{[0-9]+\}\}/g) || []).size;
    const received = array(object(array(object(payload.template).components)[0]).parameters).length;
    if (expected !== received) throw new WhatsAppError(400, `Este template requer ${expected} parâmetros de texto no corpo.`, 'TEMPLATE_PARAMETERS_MISMATCH');
  }
  // Revalida após a leitura remota e reserva antes do envio: repetição nunca dispara um segundo POST na Meta.
  await permissionToSend(phone, type);
  const localId = `local.${randomUUID()}`, now = Date.now();
  await database.transaction(async () => {
    await lockContact(phone);
    await permissionToSend(phone, type);
    const reserved = await database.prepare('INSERT INTO send_requests VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(request_key) DO NOTHING').run(requestKey, hash, localId, phone, 'sending', now);
    if (!reserved.changes) throw new WhatsAppError(409, 'Este envio já foi iniciado.', 'SEND_ALREADY_STARTED');
    await database.prepare("INSERT INTO messages (id, phone, direction, type, text, status, created) VALUES (?, ?, 'outbound', ?, ?, 'sending', ?)").run(localId, phone, type, display, now);
    await database.prepare('UPDATE contacts SET updated = ? WHERE phone = ?').run(now, phone);
  });
  try {
    const response = await graph(`${config.phoneNumberId}/messages`, {method: 'POST', body: JSON.stringify(payload)}, fetcher);
    const id = string(object(array(response.messages)[0]).id, 300);
    if (!id) throw new WhatsAppError(502, 'A Meta não retornou o identificador da mensagem.', 'META_INVALID_RESPONSE');
    await database.transaction(async () => {
      const request = await database.prepare('SELECT * FROM send_requests WHERE request_key = ?').get(requestKey) as SendRow | undefined;
      if (!request) throw new WhatsAppError(409, 'O contato foi excluído durante o envio. Confirme o estado na Meta.', 'CONTACT_DELETED');
      if (request.message_id.startsWith('local.')) await database.prepare("UPDATE messages SET id = ?, status = 'accepted', status_rank = 2 WHERE id = ?").run(id, request.message_id);
      await database.prepare("UPDATE send_requests SET message_id = ?, state = 'accepted' WHERE request_key = ?").run(id, requestKey);
      await reconcileStatus(id);
    });
    const row = await database.prepare('SELECT * FROM messages WHERE id = ?').get(id) as MessageRow | undefined;
    if (!row) throw new WhatsAppError(409, 'O contato foi excluído durante o envio. Confirme o estado na Meta.', 'CONTACT_DELETED');
    return {message: messageFromRow(row), duplicate: false};
  } catch (error) {
    const knownFailure = error instanceof WhatsAppError && error.code === 'META_REJECTED';
    await database.prepare('UPDATE messages SET status = ?, error = ? WHERE id = ? AND status_rank = 0').run(knownFailure ? 'failed' : 'unknown', knownFailure ? 'Envio recusado pela Meta.' : 'Confirmação pendente; não reenviar automaticamente.', localId);
    await database.prepare("UPDATE send_requests SET state = ? WHERE request_key = ? AND state = 'sending'").run(knownFailure ? 'failed' : 'unknown', requestKey);
    throw error;
  }
}
export async function markRead(messageId: unknown, fetcher: typeof fetch = fetch) {
  if (typeof messageId !== 'string' || messageId.length > 300) throw new WhatsAppError(400, 'Mensagem inválida.', 'INVALID_MESSAGE_ID');
  const message = await db().prepare("SELECT * FROM messages WHERE id = ? AND direction = 'inbound'").get(messageId) as MessageRow | undefined;
  if (!message) throw new WhatsAppError(404, 'Mensagem recebida não encontrada.', 'MESSAGE_NOT_FOUND');
  if (!message.is_read) await graph(`${(await configured()).phoneNumberId}/messages`, {method: 'POST', body: JSON.stringify({messaging_product: 'whatsapp', status: 'read', message_id: messageId})}, fetcher);
  // O recibo enviado à Meta refere-se ao ID selecionado. O contador do ERP espelha
  // a leitura do histórico local até a data dessa mensagem, após confirmação remota.
  await db().prepare("UPDATE messages SET is_read = 1 WHERE phone = ? AND direction = 'inbound' AND created <= ?").run(message.phone, message.created);
  return {success: true, duplicate: Boolean(message.is_read), localHistoryReadThrough: iso(message.created)};
}
export async function readBytes(source: Request | Response, maximum: number) {
  if (Number(source.headers.get('content-length')) > maximum) throw new WhatsAppError(413, 'Conteúdo excede o limite permitido.', 'BODY_TOO_LARGE');
  const reader = source.body?.getReader(); if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) { const {done, value} = await reader.read(); if (done) break; size += value.byteLength; if (size > maximum) { await reader.cancel(); throw new WhatsAppError(413, 'Conteúdo excede o limite permitido.', 'BODY_TOO_LARGE'); } chunks.push(value); }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
export async function downloadMedia(messageId: string, fetcher: typeof fetch = fetch) {
  const message = await db().prepare('SELECT * FROM messages WHERE id = ?').get(messageId) as MessageRow | undefined;
  if (!message?.media_id) throw new WhatsAppError(404, 'Mídia não encontrada.', 'MEDIA_NOT_FOUND');
  const metadata = await graph(`${message.media_id}?phone_number_id=${(await configured()).phoneNumberId}`, {}, fetcher);
  let url: URL; try { url = new URL(String(metadata.url)); } catch { throw new WhatsAppError(502, 'URL de mídia inválida.', 'INVALID_MEDIA_URL'); }
  if (url.protocol !== 'https:' || url.hostname !== 'lookaside.fbsbx.com' || url.port || url.username || url.password) throw new WhatsAppError(502, 'Origem de mídia não permitida.', 'INVALID_MEDIA_URL');
  const maximum = mediaMaximumBytes();
  if (Number(metadata.file_size) > maximum) throw new WhatsAppError(413, `Mídia excede ${maximum / 1024 / 1024} MiB, limite deste ambiente.`, 'MEDIA_TOO_LARGE');
  const mime = string(metadata.mime_type, 100);
  if (!/^(image\/(jpeg|png|webp)|audio\/(aac|mp4|mpeg|ogg|amr)|video\/mp4|application\/pdf|text\/plain)$/.test(mime)) throw new WhatsAppError(415, 'Tipo de arquivo não suportado para download.', 'UNSUPPORTED_MEDIA');
  let response: Response;
  try { response = await fetcher(url.toString(), {headers: {Authorization: `Bearer ${(await configured()).accessToken}`}, signal: AbortSignal.timeout(15_000), cache: 'no-store', redirect: 'error'}); } catch { throw new WhatsAppError(502, 'Não foi possível baixar a mídia na Meta.', 'MEDIA_UNAVAILABLE'); }
  if (!response.ok) throw new WhatsAppError(502, 'A mídia não está mais disponível na Meta.', 'MEDIA_UNAVAILABLE');
  const bytes = await readBytes(response, maximum);
  if (metadata.sha256) {
    const value = String(metadata.sha256);
    const expected = /^[a-fA-F0-9]{64}$/.test(value) ? Buffer.from(value, 'hex') : /^[A-Za-z0-9+/]{43}=$/.test(value) ? Buffer.from(value, 'base64') : Buffer.alloc(0);
    const actual = createHash('sha256').update(bytes).digest();
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new WhatsAppError(502, 'A integridade da mídia não pôde ser confirmada.', 'MEDIA_INTEGRITY_ERROR');
  }
  return {bytes, mime, filename: (message.filename || `whatsapp-${message.media_id}`).replace(/[^a-zA-Z0-9_.-]/g, '_')};
}
