import { databaseFor, type Database } from '../database.ts';
import { databaseLimited } from '../rate-limit.ts';
import { effectiveConfiguration, environmentConfiguration, integrationSettingsSchema } from './config.ts';
export { effectiveConfiguration } from './config.ts';
import { createHash, createHmac, timingSafeEqual, randomUUID } from 'node:crypto';

export class WhatsAppError extends Error {
  status: number;
  code: string;
  field?: string; // campo da tela que causou o erro (a interface destaca e foca nele)
  details?: unknown; // dados seguros para a interface (ex.: números para escolher)
  constructor(status: number, message: string, code = 'WHATSAPP_ERROR', field?: string, details?: unknown) { super(message); this.status = status; this.code = code; this.field = field; this.details = details; }
}
export type JsonObject = Record<string, unknown>;
export type ConsentStatus = 'unknown' | 'granted' | 'revoked';
export type Reaction = { emoji: string; from: 'contact' | 'me'; at: number };
export type Message = { id: string; phone: string; direction: 'inbound' | 'outbound'; type: string; text: string; status: string; createdAt: string; isRead: boolean; error?: string; mediaId?: string; mimeType?: string; filename?: string; hasMedia?: boolean; size?: number; duration?: number; voice?: boolean; author?: string; reactions?: Reaction[]; replyTo?: { id: string; text: string; type: string; direction: 'inbound' | 'outbound' } };
type ContactRow = { phone: string; name: string; consent_status: ConsentStatus; consent_source: string; consent_updated: number | null; opted_out: number; last_inbound: number | null; updated: number; pinned_at?: number | null; archived?: number; marked_unread?: number; labels?: string };
type MessageRow = { id: string; phone: string; direction: 'inbound' | 'outbound'; type: string; text: string; status: string; created: number; status_rank: number; error: string | null; media_id: string | null; mime_type: string | null; filename: string | null; is_read: number; reply_to?: string | null; reactions?: string | null; media_key?: string | null; media_size?: number | null; duration?: number | null; voice?: number | null; author?: string | null; reply_text?: string | null; reply_type?: string | null; reply_direction?: 'inbound' | 'outbound' | null };
type SendRow = { request_key: string; payload_hash: string; message_id: string; state: string; created: number };
export type Template = { id?: string; name: string; language: string; status: string; category: string; parameter_format?: string; components: JsonObject[] };
export const DAY = 24 * 60 * 60 * 1000;
export const MEDIA_TYPES = ['image', 'video', 'audio', 'document'] as const;
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
    CREATE TABLE IF NOT EXISTS contacts (phone TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '', consent_status TEXT NOT NULL DEFAULT 'unknown', consent_source TEXT NOT NULL DEFAULT '', consent_updated INTEGER, opted_out INTEGER NOT NULL DEFAULT 0, last_inbound INTEGER, updated INTEGER NOT NULL, pinned_at INTEGER, archived INTEGER NOT NULL DEFAULT 0, marked_unread INTEGER NOT NULL DEFAULT 0, labels TEXT NOT NULL DEFAULT '[]');
    CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, phone TEXT NOT NULL REFERENCES contacts(phone) ON DELETE CASCADE, direction TEXT NOT NULL, type TEXT NOT NULL, text TEXT NOT NULL, status TEXT NOT NULL, status_rank INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL, error TEXT, media_id TEXT, mime_type TEXT, filename TEXT, is_read INTEGER NOT NULL DEFAULT 0, reply_to TEXT, reactions TEXT NOT NULL DEFAULT '[]', media_key TEXT, media_size INTEGER, duration INTEGER, voice INTEGER NOT NULL DEFAULT 0, author TEXT);
    CREATE TABLE IF NOT EXISTS stars (phone TEXT NOT NULL REFERENCES contacts(phone) ON DELETE CASCADE, user_id TEXT NOT NULL, created INTEGER NOT NULL, PRIMARY KEY (phone, user_id));
    CREATE TABLE IF NOT EXISTS quick_replies (id TEXT PRIMARY KEY, shortcut TEXT NOT NULL UNIQUE, body TEXT NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL);
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
  return databaseLimited(db(), 'rate_limits', digest(key), max, window);
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
  const midias = await database.prepare('SELECT media_key FROM messages WHERE phone = ? AND media_key IS NOT NULL').all(phone) as Array<{media_key: string | null}>;
  const resultado = await database.transaction(async () => {
    await lockContact(phone);
    await database.prepare('DELETE FROM pending_statuses WHERE message_id IN (SELECT id FROM messages WHERE phone = ?)').run(phone);
    const deleted = (await database.prepare('DELETE FROM contacts WHERE phone = ?').run(phone)).changes;
    await database.prepare('INSERT INTO suppression VALUES (?, ?) ON CONFLICT(phone_hash) DO UPDATE SET created = excluded.created').run(hash, Date.now());
    if (evidence) await database.prepare('INSERT INTO deletion_audit VALUES (?, ?, ?, ?)').run(randomUUID(), evidence.actor, digest(evidence.verification), Date.now());
    return { deleted: Number(deleted), suppressed: true };
  });
  await descartarMidias(midias);
  await bumpRevision();
  return resultado;
}
// Arquivos de mídia guardados no R2 saem junto com as mensagens (retenção e exclusão do contato).
async function descartarMidias(keys: Array<{media_key: string | null}>) {
  const lista = keys.map(item => item.media_key).filter((key): key is string => Boolean(key));
  if (!lista.length) return;
  try { const { discardBinaries } = await import('../storage/r2.ts'); await discardBinaries(lista); } catch { /* a limpeza do storage tenta de novo na próxima retenção */ }
}
export async function pruneRetention(now = Date.now()) {
  const days = (await effectiveConfiguration()).retentionDays, cutoff = now - days * DAY, database = db();
  const midias = await database.prepare('SELECT media_key FROM messages WHERE created < ? AND media_key IS NOT NULL').all(cutoff) as Array<{media_key: string | null}>;
  const resultado = await database.transaction(async () => {
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
  await descartarMidias(midias);
  return resultado;
}
const maintenanceChecks = new WeakMap<Database, {until: number; task: Promise<void>}>();
async function maintenance() {
  const database = db(), now = Date.now(), previous = maintenanceChecks.get(database);
  if (previous && previous.until > now) return previous.task;
  const task = (async () => {
    const row = await database.prepare("SELECT value FROM metadata WHERE key = 'lastRetentionAt'").get() as {value: string} | undefined;
    if (!row || !Number.isFinite(Date.parse(row.value)) || now - Date.parse(row.value) > 60 * 60 * 1000) await pruneRetention();
  })().catch(error => { maintenanceChecks.delete(database); throw error; });
  maintenanceChecks.set(database, {until: now + 60_000, task});
  return task;
}
function reactionsOf(value: string | null | undefined): Reaction[] {
  try { return array(JSON.parse(value || '[]')).map(object).filter(item => typeof item.emoji === 'string' && (item.from === 'contact' || item.from === 'me')).map(item => ({emoji: String(item.emoji).slice(0, 16), from: item.from as Reaction['from'], at: Number(item.at) || 0})); } catch { return []; }
}
function messageFromRow(row: MessageRow): Message {
  const reactions = reactionsOf(row.reactions);
  return { id: row.id, phone: row.phone, direction: row.direction, type: row.type, text: row.text, status: row.status, createdAt: iso(row.created)!, isRead: Boolean(row.is_read),
    ...(row.error ? { error: row.error } : {}), ...(row.media_id ? {mediaId: row.media_id} : {}), ...(row.mime_type ? {mimeType: row.mime_type} : {}), ...(row.filename ? {filename: row.filename} : {}),
    ...(row.media_id || row.media_key ? {hasMedia: true} : {}), ...(row.media_size ? {size: Number(row.media_size)} : {}), ...(row.duration ? {duration: Number(row.duration)} : {}), ...(row.voice ? {voice: true} : {}),
    ...(row.author ? {author: row.author} : {}), ...(reactions.length ? {reactions} : {}),
    ...(row.reply_to ? {replyTo: {id: row.reply_to, text: row.reply_text ?? '', type: row.reply_type ?? 'unknown', direction: row.reply_direction ?? 'inbound'}} : {}) };
}
// Mensagem com a citada ao lado (resposta), numa só leitura.
// Campos de mídia de um item do webhook (imagem, vídeo, áudio, documento, figurinha).
function mediaFields(media: JsonObject) {
  const id = string(media.id, 40);
  return {mediaId: /^[0-9]{5,40}$/.test(id) ? id : null, mime: string(media.mime_type, 100) || null, filename: string(media.filename, 200) || null, voice: media.voice === true ? 1 : 0};
}
const messageSelect = `SELECT m.*, r.text AS reply_text, r.type AS reply_type, r.direction AS reply_direction FROM messages m LEFT JOIN messages r ON r.id = m.reply_to`;
type ConversationRow = ContactRow & {last_text: string | null; last_created: number | null; last_type: string | null; last_direction: string | null; last_status: string | null; unread_count: number; starred: number};
// Resumo da lista: última mensagem (texto, tipo, sentido e status para os ticks), não lidas e favorito de quem consulta.
// Cada subconsulta usa o índice (phone, created DESC, id DESC).
const lastOf = (column: string) => `(SELECT ${column} FROM messages WHERE messages.phone = contacts.phone ORDER BY created DESC, id DESC LIMIT 1)`;
const summarySql = `SELECT contacts.*, ${lastOf('text')} AS last_text, ${lastOf('created')} AS last_created, ${lastOf('type')} AS last_type, ${lastOf('direction')} AS last_direction, ${lastOf('status')} AS last_status, (SELECT COUNT(*) FROM messages WHERE messages.phone = contacts.phone AND direction = 'inbound' AND is_read = 0) AS unread_count, (SELECT COUNT(*) FROM stars WHERE stars.phone = contacts.phone AND stars.user_id = ?) AS starred FROM contacts`;
function labelsOf(value: string | null | undefined) { try { return array(JSON.parse(value || '[]')).filter((item): item is string => typeof item === 'string').slice(0, 20); } catch { return []; } }
function conversationFromRow(row: ConversationRow) {
  const unread = Number(row.unread_count) || 0;
  return {phone: row.phone, name: row.name || row.phone, lastMessage: row.last_text || '', lastMessageAt: iso(row.last_created ?? row.updated), lastType: row.last_type || '', lastDirection: (row.last_direction || '') as '' | 'inbound' | 'outbound', lastStatus: row.last_status || '',
    unreadCount: unread || (row.marked_unread ? 1 : 0), markedUnread: Boolean(row.marked_unread), pinned: Boolean(row.pinned_at), archived: Boolean(row.archived), starred: Number(row.starred) > 0, labels: labelsOf(row.labels),
    serviceWindowExpiresAt: iso(row.last_inbound === null ? null : row.last_inbound + DAY), consent: {status: row.consent_status, source: row.consent_source, updatedAt: iso(row.consent_updated)}, optedOut: Boolean(row.opted_out)};
}
export async function conversation(phone: string, userId = '') {
  const row = await db().prepare(`${summarySql} WHERE phone = ?`).get(userId, phone) as ConversationRow | undefined;
  return row ? conversationFromRow(row) : null;
}
export type FiltroConversas = { userId?: string; aba?: string; busca?: string; etiqueta?: string; limit?: number; offset?: number };
const semAcento = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/** Lista no padrão da Le Ange: fixadas no topo, depois pela última mensagem; abas, etiqueta e busca no histórico. */
export async function conversations(limitOrFilter: number | FiltroConversas = 100, offsetArg = 0) {
  await maintenance();
  const filtro: FiltroConversas = typeof limitOrFilter === 'number' ? {limit: limitOrFilter, offset: offsetArg} : limitOrFilter;
  const limit = Math.min(Math.max(filtro.limit ?? 100, 1), 200), offset = Math.max(filtro.offset ?? 0, 0), userId = filtro.userId ?? '', aba = filtro.aba ?? 'todas';
  // Parâmetros na ordem em que aparecem na consulta: trecho da busca (SELECT), favorito do usuário (resumo), filtros, página.
  const condicoes = ['opted_out = 0', 'last_created IS NOT NULL'], filtros: Array<string | number> = [];
  if (aba === 'arquivadas') condicoes.push('archived = 1'); else condicoes.push('archived = 0');
  if (aba === 'nao_lidas') condicoes.push('(unread_count > 0 OR marked_unread = 1)');
  if (aba === 'favoritas') condicoes.push('starred > 0');
  if (aba === 'fixadas') condicoes.push('pinned_at IS NOT NULL');
  if (filtro.etiqueta) { condicoes.push('labels LIKE ?'); filtros.push(`%${JSON.stringify(filtro.etiqueta.slice(0, 40))}%`); }
  const busca = semAcento((filtro.busca ?? '').trim()).slice(0, 80);
  let trecho = '';
  const inicio: Array<string | number> = [];
  if (busca.length >= 2) {
    const digitos = busca.replace(/\D/g, ''), termo = `%${busca.replace(/[%_\\]/g, '')}%`;
    // Nome, telefone ou qualquer mensagem do histórico (sem acento no Postgres; no SQLite, minúsculas).
    const normalizar = (coluna: string) => db().backend === 'postgres' ? `translate(lower(${coluna}), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')` : `sem_acento(${coluna})`;
    condicoes.push(`(${normalizar('name')} LIKE ?${digitos.length >= 3 ? ' OR phone LIKE ?' : ''} OR EXISTS (SELECT 1 FROM messages b WHERE b.phone = conversas.phone AND ${normalizar('b.text')} LIKE ?))`);
    filtros.push(termo, ...(digitos.length >= 3 ? [`%${digitos}%`] : []), termo);
    trecho = `, (SELECT text FROM messages b WHERE b.phone = conversas.phone AND ${normalizar('b.text')} LIKE ? ORDER BY created DESC LIMIT 1) AS match_text`;
    inicio.push(termo);
  }
  const ordem = aba === 'todas' ? 'CASE WHEN pinned_at IS NULL THEN 0 ELSE 1 END DESC, pinned_at DESC, ' : '';
  const sql = `SELECT *${trecho} FROM (${summarySql}) AS conversas WHERE ${condicoes.join(' AND ')} ORDER BY ${ordem}last_created DESC, phone DESC LIMIT ? OFFSET ?`;
  const rows = await db().prepare(sql).all(...inicio, userId, ...filtros, limit + 1, offset) as Array<ConversationRow & {match_text?: string | null}>;
  const mais = rows.length > limit; rows.length = Math.min(rows.length, limit);
  const lista = rows.map(row => ({...conversationFromRow(row), ...(row.match_text ? {match: row.match_text.slice(0, 300)} : {})}));
  return typeof limitOrFilter === 'number' ? lista : {conversations: lista, nextOffset: mais ? offset + limit : null};
}
export async function unreadConversationCount() {
  await maintenance();
  const row = await db().prepare(`SELECT COUNT(*) AS count FROM contacts WHERE opted_out = 0 AND archived = 0 AND (marked_unread = 1 OR EXISTS (SELECT 1 FROM messages WHERE messages.phone = contacts.phone AND direction = 'inbound' AND is_read = 0))`).get() as {count: number};
  return row.count;
}
export async function messagesFor(phoneInput: unknown, before?: string, limit = 100, userId = '') {
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
  const rows = await db().prepare(`${messageSelect} WHERE m.phone = ? AND (m.created < ? OR (m.created = ? AND m.id < ?)) ORDER BY m.created DESC, m.id DESC LIMIT ?`).all(phone, cutoff, cutoff, beforeId, limit + 1) as MessageRow[];
  const more = rows.length > limit; rows.length = Math.min(rows.length, limit);
  rows.reverse();
  return { messages: rows.map(messageFromRow), conversation: await conversation(phone, userId), nextBefore: more ? Buffer.from(JSON.stringify({created: rows[0].created, id: rows[0].id})).toString('base64url') : null };
}

/* -------------------------------------------------------------- revisão (atualização leve das telas) */
// Toda escrita que muda a lista ou uma conversa avança a revisão; as telas consultam só esse número (barato) e buscam
// a lista e a conversa aberta apenas quando ele muda.
export async function bumpRevision() {
  await db().prepare('INSERT INTO metadata VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run('revision', `${Date.now()}.${Math.random().toString(36).slice(2, 8)}`);
}
export async function currentRevision() {
  return (await db().prepare("SELECT value FROM metadata WHERE key = 'revision'").get() as {value: string} | undefined)?.value || '0';
}

/* -------------------------------------------------------------- organização da conversa */
export type AcaoConversa = { fixar?: boolean; arquivar?: boolean; naoLida?: boolean; favoritar?: boolean; etiquetas?: unknown };
export async function updateConversation(phoneInput: unknown, acao: AcaoConversa, userId: string) {
  const phone = phoneNumber(phoneInput), database = db(), now = Date.now();
  if (!(await database.prepare('SELECT 1 FROM contacts WHERE phone = ?').get(phone))) throw new WhatsAppError(404, 'Conversa não encontrada.', 'NOT_FOUND');
  await database.transaction(async () => {
    if (acao.fixar !== undefined) await database.prepare('UPDATE contacts SET pinned_at = ? WHERE phone = ?').run(acao.fixar ? now : null, phone);
    if (acao.arquivar !== undefined) await database.prepare('UPDATE contacts SET archived = ?, pinned_at = CASE WHEN ? = 1 THEN NULL ELSE pinned_at END WHERE phone = ?').run(acao.arquivar ? 1 : 0, acao.arquivar ? 1 : 0, phone);
    if (acao.naoLida !== undefined) await database.prepare('UPDATE contacts SET marked_unread = ? WHERE phone = ?').run(acao.naoLida ? 1 : 0, phone);
    if (acao.favoritar !== undefined) {
      if (acao.favoritar) await database.prepare('INSERT INTO stars VALUES (?, ?, ?) ON CONFLICT(phone, user_id) DO NOTHING').run(phone, userId, now);
      else await database.prepare('DELETE FROM stars WHERE phone = ? AND user_id = ?').run(phone, userId);
    }
    if (acao.etiquetas !== undefined) {
      const etiquetas = [...new Set(array(acao.etiquetas).filter((item): item is string => typeof item === 'string').map(item => item.trim().slice(0, 40)).filter(Boolean))].slice(0, 12);
      await database.prepare('UPDATE contacts SET labels = ? WHERE phone = ?').run(JSON.stringify(etiquetas), phone);
    }
  });
  await bumpRevision();
  return conversation(phone, userId);
}
/** Etiquetas já usadas (para sugerir e filtrar). */
export async function allLabels() {
  const rows = await db().prepare("SELECT labels FROM contacts WHERE labels <> '[]'").all() as Array<{labels: string}>;
  return [...new Set(rows.flatMap(row => labelsOf(row.labels)))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
/** Abrir a conversa marca tudo como lido (e tira o "não lida" manual); o recibo azul vai para a última recebida. */
export async function markConversationRead(phoneInput: unknown, fetcher: typeof fetch = fetch) {
  const phone = phoneNumber(phoneInput), database = db();
  const last = await database.prepare("SELECT id, is_read FROM messages WHERE phone = ? AND direction = 'inbound' ORDER BY created DESC, id DESC LIMIT 1").get(phone) as {id: string; is_read: number} | undefined;
  const pendentes = (await database.prepare("SELECT COUNT(*) AS n FROM messages WHERE phone = ? AND direction = 'inbound' AND is_read = 0").get(phone) as {n: number}).n;
  if (last && !last.is_read) { try { await graph(`${(await configured()).phoneNumberId}/messages`, {method: 'POST', body: JSON.stringify({messaging_product: 'whatsapp', status: 'read', message_id: last.id})}, fetcher); } catch { /* recibo é cortesia: a leitura local vale mesmo assim */ } }
  await database.prepare("UPDATE messages SET is_read = 1 WHERE phone = ? AND direction = 'inbound' AND is_read = 0").run(phone);
  const desmarcou = (await database.prepare('UPDATE contacts SET marked_unread = 0 WHERE phone = ? AND marked_unread = 1').run(phone)).changes;
  if (pendentes || desmarcou) await bumpRevision();
  return {success: true, read: Number(pendentes)};
}

/* -------------------------------------------------------------- respostas rápidas */
export async function quickReplies() {
  return (await db().prepare('SELECT id, shortcut, body FROM quick_replies ORDER BY shortcut').all() as Array<{id: string; shortcut: string; body: string}>);
}
export async function saveQuickReply(input: JsonObject) {
  const shortcut = string(input.shortcut, 40).trim().replace(/^\//, '').toLowerCase().replace(/\s+/g, '-'), body = string(input.body, 4096).trim();
  if (!/^[a-z0-9à-ú_-]{1,40}$/i.test(shortcut)) throw new WhatsAppError(400, 'Use um atalho curto, sem espaços (ex.: preco).', 'INVALID_SHORTCUT', 'shortcut');
  if (!body) throw new WhatsAppError(400, 'Escreva o texto da resposta.', 'INVALID_BODY', 'body');
  const id = typeof input.id === 'string' && input.id ? string(input.id, 60) : randomUUID(), now = Date.now();
  try { await db().prepare('INSERT INTO quick_replies VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET shortcut = excluded.shortcut, body = excluded.body, updated = excluded.updated').run(id, shortcut, body, now, now); }
  catch { throw new WhatsAppError(409, 'Já existe uma resposta com esse atalho.', 'DUPLICATE_SHORTCUT', 'shortcut'); }
  return quickReplies();
}
export async function deleteQuickReply(id: unknown) {
  await db().prepare('DELETE FROM quick_replies WHERE id = ?').run(string(id, 60));
  return quickReplies();
}
export async function historySyncProgress() { const row = await db().prepare("SELECT value FROM metadata WHERE key = 'historySync'").get() as {value: string} | undefined; try { const value = object(JSON.parse(row?.value || '{}')); return {progress: Number(value.progress) || 0, refused: Boolean(value.refused), lastAt: string(value.lastAt, 40) || null}; } catch { return {progress: 0, refused: false, lastAt: null}; } }
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
        if (change.field === 'smb_app_state_sync' && object(value.metadata).phone_number_id === config.phoneNumberId) {
          // Coexistência: contatos da agenda do app WhatsApp Business (pedido único após conectar). Só nome; nunca consentimento.
          for (const item of array(value.state_sync)) {
            const event = object(item), contact = object(event.contact);
            if (event.type !== 'contact' || event.action !== 'add') { ignored++; continue; }
            let phone: string; try { phone = phoneNumber(contact.phone_number); } catch { ignored++; continue; }
            await lockContact(phone);
            if (await suppressed(phone, config.suppressionSecret)) { ignored++; continue; }
            // Só o nome: não mexe na data do contato (a importação não pode jogar a agenda para o topo da lista).
            await ensureContact(phone, string(contact.full_name, 200) || string(contact.first_name, 200), 0);
            processed++;
          }
          continue;
        }
        if (change.field === 'history' && object(value.metadata).phone_number_id === config.phoneNumberId) {
          // Coexistência: histórico de conversas do celular, em lotes. Entra lido e não abre a janela de 24 h.
          for (const loteValue of array(value.history)) {
            const lote = object(loteValue), progress = Number(object(lote.metadata).progress);
            const refused = array(lote.errors).some(error => Number(object(error).code) === 2593109);
            const previous = await database.prepare("SELECT value FROM metadata WHERE key = 'historySync'").get() as {value: string} | undefined;
            let state: JsonObject = {}; try { state = object(JSON.parse(previous?.value || '{}')); } catch { /* recomeça */ }
            const next = {...state, progress: Math.max(Number(state.progress) || 0, Number.isFinite(progress) && progress >= 0 && progress <= 100 ? progress : 0), refused: Boolean(state.refused) || refused, lastAt: new Date(now).toISOString()};
            await database.prepare('INSERT INTO metadata VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run('historySync', JSON.stringify(next));
            for (const threadValue of array(lote.threads)) {
              const thread = object(threadValue);
              let phone: string; try { phone = phoneNumber(thread.id); } catch { ignored++; continue; }
              await lockContact(phone);
              if (await suppressed(phone, config.suppressionSecret)) { ignored++; continue; }
              for (const item of array(thread.messages)) {
                const message = object(item), id = string(message.id, 300), type = string(message.type, 30) || 'unknown';
                const timestamp = Number(message.timestamp) * 1000;
                if (!id || !Number.isFinite(timestamp) || timestamp < now - config.retentionDays * DAY || timestamp > now + 300_000) { ignored++; continue; }
                if (!(await database.prepare('INSERT INTO webhook_events VALUES (?, ?) ON CONFLICT(event_key) DO NOTHING').run(digest(`history:${id}`), now)).changes) { ignored++; continue; }
                const inbound = string(message.from, 30).replace(/\D/g, '') === phone;
                const media = object(message[type]);
                const text = type === 'text' ? string(object(message.text).body, 4096) : string(media.caption, 4096) || `[${type}]`;
                const created = Math.min(timestamp, now);
                await ensureContact(phone, undefined, created);
                const midia = mediaFields(media);
                await database.prepare(`INSERT INTO messages (id, phone, direction, type, text, status, status_rank, created, is_read, media_id, mime_type, filename, voice, reply_to) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`).run(id, phone, inbound ? 'inbound' : 'outbound', type, text, inbound ? 'received' : 'sent', inbound ? 0 : 3, created, midia.mediaId, midia.mime, midia.filename, midia.voice, string(object(message.context).id, 300) || null);
                processed++;
              }
            }
          }
          continue;
        }
        if (change.field === 'smb_message_echoes' && object(value.metadata).phone_number_id === config.phoneNumberId) {
          // Coexistência: mensagens que a equipe enviou pelo app WhatsApp Business do celular entram como enviadas.
          for (const item of array(value.message_echoes)) {
            const echo = object(item), id = string(echo.id, 300), type = string(echo.type, 30) || 'unknown';
            let phone: string; try { phone = phoneNumber(echo.to); } catch { ignored++; continue; }
            const timestamp = Number(echo.timestamp) * 1000;
            if (!id || !Number.isFinite(timestamp) || timestamp < now - config.retentionDays * DAY || timestamp > now + 300_000) { ignored++; continue; }
            await lockContact(phone);
            if (await suppressed(phone, config.suppressionSecret)) { ignored++; continue; }
            if (!(await database.prepare('INSERT INTO webhook_events VALUES (?, ?) ON CONFLICT(event_key) DO NOTHING').run(digest(`echo:${id}`), now)).changes) { ignored++; continue; }
            const media = object(echo[type]);
            const text = type === 'text' ? string(object(echo.text).body, 4096) : string(media.caption, 4096) || `[${type}]`;
            const created = Math.min(timestamp, now);
            await ensureContact(phone, undefined, created);
            const midia = mediaFields(media);
            await database.prepare(`INSERT INTO messages (id, phone, direction, type, text, status, status_rank, created, is_read, media_id, mime_type, filename, voice, reply_to) VALUES (?, ?, 'outbound', ?, ?, 'sent', 3, ?, 1, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`).run(id, phone, type, text, created, midia.mediaId, midia.mime, midia.filename, midia.voice, string(object(echo.context).id, 300) || null);
            processed++;
          }
          continue;
        }
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
          if (type === 'reaction') {
            // Reação do contato numa mensagem: atualiza a mensagem (emoji vazio = removeu); não vira mensagem nova.
            const reacao = object(incoming.reaction), alvo = string(reacao.message_id, 300), emoji = string(reacao.emoji, 16);
            const linha = await database.prepare('SELECT reactions FROM messages WHERE id = ? AND phone = ?').get(alvo, phone) as {reactions: string | null} | undefined;
            if (linha) {
              const outras = reactionsOf(linha.reactions).filter(item => item.from !== 'contact');
              await database.prepare('UPDATE messages SET reactions = ? WHERE id = ?').run(JSON.stringify(emoji ? [...outras, {emoji, from: 'contact', at: timestamp}] : outras), alvo);
              processed++;
            } else ignored++;
            continue;
          }
          const media = object(incoming[type]);
          const interactive = object(incoming.interactive);
          const text = type === 'text' ? string(object(incoming.text).body, 4096) : type === 'button' ? string(object(incoming.button).text, 4096) : type === 'interactive' ? string(object(interactive.button_reply).title || object(interactive.list_reply).title, 4096) : string(media.caption, 4096) || `[${type}]`;
          const created = Math.min(timestamp, now);
          await ensureContact(phone, names.get(phone), created);
          const midia = mediaFields(media);
          await database.prepare(`INSERT INTO messages (id, phone, direction, type, text, status, created, media_id, mime_type, filename, voice, reply_to) VALUES (?, ?, 'inbound', ?, ?, 'received', ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`).run(id, phone, type, text, created, midia.mediaId, midia.mime, midia.filename, midia.voice, string(object(incoming.context).id, 300) || null);
          // Mensagem nova desarquiva a conversa (como no WhatsApp).
          await database.prepare('UPDATE contacts SET archived = 0 WHERE phone = ? AND archived = 1').run(phone);
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
          await applyStatus(id, state, now, Number.isFinite(errorCode) ? metaErrorMessage(errorCode) : null); processed++;
        }
      }
    }
    await database.prepare('INSERT INTO metadata VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run('lastWebhookAt', new Date(now).toISOString());
    if (processed) await bumpRevision();
    return {processed, ignored};
  });
}

/** Erros mais comuns da Cloud API em linguagem de atendimento (o código fica entre parênteses para o suporte). */
export function metaErrorMessage(code: number) {
  const mensagens: Record<number, string> = {
    190: 'O acesso do WhatsApp à Meta expirou ou foi revogado. Reconecte em Configurações > WhatsApp.',
    10: 'O aplicativo perdeu a permissão nesta conta do WhatsApp. Reconecte em Configurações > WhatsApp.',
    200: 'O aplicativo perdeu a permissão nesta conta do WhatsApp. Reconecte em Configurações > WhatsApp.',
    131026: 'Este número não tem WhatsApp ou não pode receber mensagens.',
    131047: 'Passaram 24 horas desde a última mensagem da pessoa: envie um modelo aprovado.',
    131051: 'O WhatsApp não aceita este tipo de mensagem.',
    131052: 'A Meta não conseguiu baixar a mídia. Envie de novo.',
    131053: 'A Meta recusou o arquivo (formato ou tamanho). Envie em JPG, MP4, OGG ou PDF.',
    131056: 'Muitas mensagens para esta pessoa em pouco tempo. Aguarde um pouco e tente de novo.',
    130429: 'Limite de envios da conta atingido no momento. Tente de novo em alguns minutos.',
    131048: 'A Meta limitou os envios por qualidade da conta. Confira o WhatsApp Manager.',
    131031: 'A conta do WhatsApp Business está bloqueada pela Meta. Confira o WhatsApp Manager.',
    131000: 'A Meta teve uma falha ao enviar. Tente de novo.',
    132000: 'O número de variáveis não confere com o modelo aprovado.',
    132001: 'Este modelo não existe ou não está aprovado neste idioma.',
    132005: 'O texto do modelo ficou longo demais com as variáveis.',
    132015: 'O modelo está pausado pela Meta por baixa qualidade.',
    133010: 'O número ainda não está registrado na Cloud API. Reconecte em Configurações > WhatsApp.',
    100: 'A Meta recusou um dado da mensagem. Confira o conteúdo e tente de novo.',
  };
  if (Number.isFinite(code) && mensagens[code]) return `${mensagens[code]} (código ${code})`;
  return Number.isFinite(code) ? `A Meta recusou a operação (código ${code}). Confira permissões, conta e configuração no painel da Meta.` : 'A Meta recusou a operação. Confira a configuração no painel da Meta.';
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
    throw new WhatsAppError(response.status === 429 ? 429 : 502, metaErrorMessage(code), 'META_REJECTED');
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
  // Como no ERP da Le Ange: só pedido de parada bloqueia. Texto livre vale na janela de 24 h aberta pela pessoa; fora dela,
  // modelo aprovado pela Meta. A autorização registrada continua disponível como evidência, mas não trava a resposta.
  if (type !== 'template' && (!row?.last_inbound || Date.now() >= row.last_inbound + DAY)) throw new WhatsAppError(409, 'A janela de atendimento de 24 horas está fechada. Use um template aprovado.', 'WINDOW_CLOSED');
}
export async function sendMessage(input: JsonObject, fetcher: typeof fetch = fetch) {
  const config = await configured(), phone = phoneNumber(input.phone), type = input.type;
  const requestKey = typeof input.clientRequestId === 'string' ? input.clientRequestId : '';
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(requestKey)) throw new WhatsAppError(400, 'Informe uma chave única clientRequestId com 8 a 100 caracteres.', 'INVALID_REQUEST_ID');
  if (typeof type !== 'string' || !['text', 'template', ...MEDIA_TYPES].includes(type)) throw new WhatsAppError(400, 'Envie texto, mídia ou template aprovado.', 'INVALID_MESSAGE_TYPE');
  const payload: JsonObject = { messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, type, biz_opaque_callback_data: requestKey };
  const replyTo = typeof input.replyTo === 'string' && /^[A-Za-z0-9._=:+/-]{8,300}$/.test(input.replyTo) && !input.replyTo.startsWith('local.') ? input.replyTo : null;
  if (replyTo) payload.context = {message_id: replyTo};
  const media = object(input.media);
  let display = '';
  if ((MEDIA_TYPES as readonly string[]).includes(type)) {
    // Mídia já enviada à Meta (midia.ts): aqui só a mensagem que a usa.
    const assetId = string(media.id, 40), caption = string(input.caption, 1025).trim();
    if (!/^[0-9]{5,40}$/.test(assetId)) throw new WhatsAppError(400, 'Mídia inválida.', 'INVALID_MEDIA');
    if (caption.length > 1024) throw new WhatsAppError(400, 'A legenda deve ter até 1024 caracteres.', 'INVALID_CAPTION');
    payload[type] = {id: assetId, ...(caption && type !== 'audio' ? {caption} : {}), ...(type === 'document' ? {filename: string(media.filename, 200) || 'arquivo'} : {}), ...(type === 'audio' && media.voice === true ? {voice: true} : {})};
    display = caption || ({image: '[image]', video: '[video]', audio: '[audio]', document: string(media.filename, 200) || '[document]'} as Record<string, string>)[type];
  } else if (type === 'text') {
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
    // Recusa definitiva da Meta: "Tentar de novo" reaproveita a chave (o registro que falhou dá lugar à nova tentativa).
    // Resultado incerto (unknown/sending) continua bloqueado para nunca mandar duas vezes.
    if (existing.state !== 'failed') throw new WhatsAppError(409, 'Este envio já foi iniciado. Verifique o histórico e aguarde a confirmação antes de criar outro envio.', 'SEND_ALREADY_STARTED');
    await database.transaction(async () => {
      await database.prepare("DELETE FROM messages WHERE id = ? AND status = 'failed'").run(existing.message_id);
      await database.prepare("DELETE FROM send_requests WHERE request_key = ? AND state = 'failed'").run(requestKey);
    });
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
    await ensureContact(phone, undefined, now); // modelo para número que ainda não escreveu: cria o contato antes do envio
    const reserved = await database.prepare('INSERT INTO send_requests VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(request_key) DO NOTHING').run(requestKey, hash, localId, phone, 'sending', now);
    if (!reserved.changes) throw new WhatsAppError(409, 'Este envio já foi iniciado.', 'SEND_ALREADY_STARTED');
    await database.prepare("INSERT INTO messages (id, phone, direction, type, text, status, created, media_id, mime_type, filename, media_key, media_size, duration, voice, reply_to, author) VALUES (?, ?, 'outbound', ?, ?, 'sending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(localId, phone, type, display, now,
      string(media.id, 40) || null, string(media.mime, 100) || null, string(media.filename, 200) || null, string(media.key, 400) || null, Number(media.size) || null, Number(media.duration) ? Math.round(Number(media.duration)) : null, media.voice === true ? 1 : 0, replyTo, string(input.author, 120) || null);
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
    const row = await database.prepare(`${messageSelect} WHERE m.id = ?`).get(id) as MessageRow | undefined;
    if (!row) throw new WhatsAppError(409, 'O contato foi excluído durante o envio. Confirme o estado na Meta.', 'CONTACT_DELETED');
    await bumpRevision();
    return {message: messageFromRow(row), duplicate: false};
  } catch (error) {
    const knownFailure = error instanceof WhatsAppError && error.code === 'META_REJECTED';
    await database.prepare('UPDATE messages SET status = ?, error = ? WHERE id = ? AND status_rank = 0').run(knownFailure ? 'failed' : 'unknown', knownFailure ? (error as WhatsAppError).message.slice(0, 300) : 'Sem confirmação da Meta: confira no celular antes de reenviar.', localId);
    await database.prepare("UPDATE send_requests SET state = ? WHERE request_key = ? AND state = 'sending'").run(knownFailure ? 'failed' : 'unknown', requestKey);
    await bumpRevision();
    throw error;
  }
}
/** Reação da equipe numa mensagem (emoji vazio remove), enviada pela Cloud API. */
export async function sendReaction(phoneInput: unknown, messageId: unknown, emojiInput: unknown, fetcher: typeof fetch = fetch) {
  const config = await configured(), phone = phoneNumber(phoneInput), emoji = string(emojiInput, 16);
  if (typeof messageId !== 'string' || messageId.startsWith('local.') || messageId.length > 300) throw new WhatsAppError(400, 'Mensagem inválida.', 'INVALID_MESSAGE_ID');
  const row = await db().prepare('SELECT reactions FROM messages WHERE id = ? AND phone = ?').get(messageId, phone) as {reactions: string | null} | undefined;
  if (!row) throw new WhatsAppError(404, 'Mensagem não encontrada.', 'MESSAGE_NOT_FOUND');
  await permissionToSend(phone, 'reaction');
  await graph(`${config.phoneNumberId}/messages`, {method: 'POST', body: JSON.stringify({messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, type: 'reaction', reaction: {message_id: messageId, emoji}})}, fetcher);
  const outras = reactionsOf(row.reactions).filter(item => item.from !== 'me');
  const reactions = emoji ? [...outras, {emoji, from: 'me' as const, at: Date.now()}] : outras;
  await db().prepare('UPDATE messages SET reactions = ? WHERE id = ?').run(JSON.stringify(reactions), messageId);
  await bumpRevision();
  return {reactions};
}
/** Descarta uma mensagem que a Meta recusou (só enviada e com falha): some da conversa e libera "tentar de novo". */
export async function discardFailedMessage(phoneInput: unknown, id: unknown) {
  const phone = phoneNumber(phoneInput);
  if (typeof id !== 'string' || id.length > 300) throw new WhatsAppError(400, 'Mensagem inválida.', 'INVALID_MESSAGE_ID');
  const database = db();
  const removidas = await database.transaction(async () => {
    const apagadas = (await database.prepare("DELETE FROM messages WHERE id = ? AND phone = ? AND direction = 'outbound' AND status = 'failed'").run(id, phone)).changes;
    if (apagadas) await database.prepare('DELETE FROM send_requests WHERE message_id = ?').run(id);
    return Number(apagadas);
  });
  if (!removidas) throw new WhatsAppError(409, 'Só dá para descartar mensagem que não foi enviada.', 'NOT_FAILED');
  await bumpRevision();
  return {discarded: true};
}
export async function messageById(id: string) {
  const row = await db().prepare(`${messageSelect} WHERE m.id = ?`).get(id) as MessageRow | undefined;
  return row ? {row, message: messageFromRow(row)} : null;
}
export async function setMessageMediaKey(id: string, key: string) { await db().prepare('UPDATE messages SET media_key = ? WHERE id = ?').run(key, id); }
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
export const MIME_PERMITIDOS = /^(image\/(jpeg|png|webp|gif)|audio\/(aac|mp4|mpeg|ogg|amr|opus|wav|webm)|video\/(mp4|3gpp|quicktime|webm)|application\/(pdf|msword|vnd\.openxmlformats-officedocument\.[a-z.]+|vnd\.ms-excel|vnd\.ms-powerpoint|zip|vnd\.oasis\.opendocument\.[a-z]+)|text\/(plain|csv))$/;
export async function downloadMedia(messageId: string, fetcher: typeof fetch = fetch, maximumBytes = mediaMaximumBytes()) {
  const message = await db().prepare('SELECT * FROM messages WHERE id = ?').get(messageId) as MessageRow | undefined;
  if (!message?.media_id) throw new WhatsAppError(404, 'Mídia não encontrada.', 'MEDIA_NOT_FOUND');
  const metadata = await graph(`${message.media_id}?phone_number_id=${(await configured()).phoneNumberId}`, {}, fetcher);
  let url: URL; try { url = new URL(String(metadata.url)); } catch { throw new WhatsAppError(502, 'URL de mídia inválida.', 'INVALID_MEDIA_URL'); }
  if (url.protocol !== 'https:' || url.hostname !== 'lookaside.fbsbx.com' || url.port || url.username || url.password) throw new WhatsAppError(502, 'Origem de mídia não permitida.', 'INVALID_MEDIA_URL');
  const maximum = maximumBytes;
  if (Number(metadata.file_size) > maximum) throw new WhatsAppError(413, `Mídia excede ${maximum / 1024 / 1024} MiB, limite deste ambiente.`, 'MEDIA_TOO_LARGE');
  // "audio/ogg; codecs=opus" → "audio/ogg": a lista confere só o tipo.
  const mime = string(metadata.mime_type, 100).split(';')[0].trim().toLowerCase();
  if (!MIME_PERMITIDOS.test(mime)) throw new WhatsAppError(415, 'Tipo de arquivo não suportado para download.', 'UNSUPPORTED_MEDIA');
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
