import { randomBytes } from 'node:crypto';
import { databaseFor } from '../database.ts';
import { InstagramError, instagramConfig, instagramOrigin, retentionDays } from './config.ts';
import { digest, seal, unseal, subjectHash } from './crypto.ts';

const schema = `PRAGMA secure_delete = ON;
CREATE TABLE IF NOT EXISTS instagram_connections (
 subject_hash TEXT PRIMARY KEY, account_hash TEXT NOT NULL, app_id TEXT NOT NULL, account_id TEXT NOT NULL,
 username TEXT NOT NULL, token_cipher TEXT NOT NULL, scopes_json TEXT NOT NULL, expires_at INTEGER NOT NULL,
 refreshed_at INTEGER NOT NULL, connected_at INTEGER NOT NULL, fields_json TEXT NOT NULL DEFAULT '[]');
CREATE UNIQUE INDEX IF NOT EXISTS instagram_one_account ON instagram_connections(app_id);
CREATE TABLE IF NOT EXISTS instagram_oauth_states (
 hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, session_hash TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS instagram_events (
 id TEXT PRIMARY KEY, app_id TEXT NOT NULL, account_id TEXT NOT NULL, kind TEXT NOT NULL,
 payload_cipher TEXT NOT NULL, received_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS instagram_event_time ON instagram_events(received_at);
CREATE TABLE IF NOT EXISTS instagram_event_subjects (
 event_id TEXT NOT NULL REFERENCES instagram_events(id) ON DELETE CASCADE, subject_hash TEXT NOT NULL,
 PRIMARY KEY(event_id, subject_hash));
CREATE INDEX IF NOT EXISTS instagram_event_subject ON instagram_event_subjects(subject_hash);
CREATE TABLE IF NOT EXISTS instagram_suppression (subject_hash TEXT PRIMARY KEY, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS instagram_deletion_requests (
 code TEXT PRIMARY KEY, subject_hash TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL,
 local_deleted_at INTEGER NOT NULL, reviewed_at INTEGER, review_note TEXT);
CREATE TABLE IF NOT EXISTS instagram_lifecycle (app_id TEXT PRIMARY KEY, changed_at INTEGER NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS instagram_pending_deletion ON instagram_deletion_requests(subject_hash) WHERE status = 'pending_review';`;

export const instagramDb = () => databaseFor('meta', process.env.META_DELETION_DB_PATH || '.data/meta-deletion.sqlite', schema);
export function instagramTransaction<T>(operation: () => Promise<T>) {
  const db = instagramDb();
  return db.transaction(async () => {
    // Mesmo lock em todas as instâncias: exclusão não pode concorrer com persistência de evento/token.
    if (db.backend === 'postgres') await db.prepare('SELECT pg_advisory_xact_lock(742910841)').get();
    return operation();
  });
}
export type Connection = { subject_hash: string; account_hash: string; app_id: string; account_id: string; username: string; token_cipher: string; scopes_json: string; expires_at: number; refreshed_at: number; connected_at: number; fields_json: string };
export async function currentConnection() {
  return await instagramDb().prepare('SELECT * FROM instagram_connections WHERE app_id = ?').get(instagramConfig().appId) as Connection | undefined;
}
export async function createState(userId: string, session: string, now = Date.now()) {
  const value = randomBytes(32).toString('hex'), db = instagramDb();
  await instagramTransaction(async () => {
    await db.prepare('DELETE FROM instagram_oauth_states WHERE expires_at <= ?').run(now);
    await db.prepare('INSERT INTO instagram_oauth_states (hash,user_id,session_hash,expires_at) VALUES (?,?,?,?)').run(digest(value), userId, digest(session), now + 600_000);
  });
  return value;
}
export async function consumeState(value: string, userId: string, session: string, now = Date.now()) {
  if (!/^[a-f0-9]{64}$/.test(value)) return null;
  return instagramTransaction(async () => {
    const db = instagramDb();
    const state = await db.prepare('SELECT expires_at FROM instagram_oauth_states WHERE hash = ? AND user_id = ? AND session_hash = ? AND expires_at > ?').get(digest(value), userId, digest(session), now);
    if (!state) return null;
    await db.prepare('DELETE FROM instagram_oauth_states WHERE hash = ?').run(digest(value));
    return Number(state.expires_at) - 600_000;
  });
}
export async function saveConnection(input: { subjectId: string; accountId: string; username: string; token: string; scopes: string[]; expiresIn: number; authorizedAt?: number }, now = Date.now()) {
  const db = instagramDb(), appId = instagramConfig().appId, subject = subjectHash(input.subjectId), account = subjectHash(input.accountId);
  const tokenCipher = seal(input.token, `token:${subject}`);
  await instagramTransaction(async () => {
    const revoked = await db.prepare('SELECT changed_at FROM instagram_lifecycle WHERE app_id = ?').get(appId);
    if (revoked && Number(revoked.changed_at) >= (input.authorizedAt ?? now)) throw new InstagramError(409, 'A conexão foi revogada durante a autorização. Inicie um novo login.', 'STALE_AUTHORIZATION');
    // O Ateliê conecta uma conta por aplicativo; não troca silenciosamente para outro perfil.
    const previous = await currentConnection();
    if (previous && previous.account_id !== input.accountId) throw new InstagramError(409, 'Desconecte a conta atual antes de conectar outro perfil.', 'ACCOUNT_ALREADY_CONNECTED');
    await db.prepare('DELETE FROM instagram_connections WHERE app_id = ?').run(appId);
    await db.prepare('INSERT INTO instagram_connections (subject_hash,account_hash,app_id,account_id,username,token_cipher,scopes_json,expires_at,refreshed_at,connected_at,fields_json) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .run(subject, account, appId, input.accountId, input.username, tokenCipher, JSON.stringify(input.scopes), now + input.expiresIn * 1000, now, now, '[]');
    await db.prepare('DELETE FROM instagram_suppression WHERE subject_hash IN (?,?)').run(subject, account);
  });
}
export async function connectionToken(connection: Connection) {
  if (connection.expires_at <= Date.now()) throw new InstagramError(409, 'O token do Instagram expirou. Conecte a conta novamente.', 'TOKEN_EXPIRED');
  return unseal(connection.token_cipher, `token:${connection.subject_hash}`);
}
export async function pruneEvents(now = Date.now()) {
  const db = instagramDb(), cutoff = now - retentionDays() * 86400_000;
  await instagramTransaction(async () => {
    await db.prepare('DELETE FROM instagram_event_subjects WHERE event_id IN (SELECT id FROM instagram_events WHERE received_at < ?)').run(cutoff);
    await db.prepare('DELETE FROM instagram_events WHERE received_at < ?').run(cutoff);
    await db.prepare('DELETE FROM instagram_oauth_states WHERE expires_at <= ?').run(now);
  });
}
/** Transação única: apaga acesso/dados locais e impede recriação por entregas atrasadas. */
export async function removeSubject(id: string, deletion: boolean, now = Date.now()) {
  const db = instagramDb(), hash = subjectHash(id), origin = deletion ? instagramOrigin() : '';
  return instagramTransaction(async () => {
    await db.prepare('INSERT INTO instagram_lifecycle (app_id,changed_at) VALUES (?,?) ON CONFLICT(app_id) DO UPDATE SET changed_at = excluded.changed_at').run(instagramConfig().appId, now);
    const connections = await db.prepare('SELECT subject_hash, account_hash, account_id FROM instagram_connections WHERE subject_hash = ? OR account_hash = ?').all(hash, hash);
    const hashes = new Set([hash]);
    for (const c of connections) { hashes.add(String(c.subject_hash)); hashes.add(String(c.account_hash)); }
    for (const h of hashes) {
      await db.prepare('INSERT INTO instagram_suppression (subject_hash,created_at) VALUES (?,?) ON CONFLICT(subject_hash) DO NOTHING').run(h, now);
      const events = await db.prepare('SELECT event_id FROM instagram_event_subjects WHERE subject_hash = ?').all(h);
      for (const event of events) {
        await db.prepare('DELETE FROM instagram_event_subjects WHERE event_id = ?').run(String(event.event_id));
        await db.prepare('DELETE FROM instagram_events WHERE id = ?').run(String(event.event_id));
      }
    }
    await db.prepare('DELETE FROM instagram_connections WHERE subject_hash = ? OR account_hash = ?').run(hash, hash);
    // Invalida autorizações em andamento para impedir reconexão por callback antigo.
    await db.prepare('DELETE FROM instagram_oauth_states').run();
    if (!deletion) return { disconnected: true };
    const candidate = randomBytes(24).toString('hex');
    await db.prepare("INSERT INTO instagram_deletion_requests (code,subject_hash,status,created_at,local_deleted_at) VALUES (?,?,'pending_review',?,?) ON CONFLICT(subject_hash) WHERE status = 'pending_review' DO NOTHING").run(candidate, hash, now, now);
    const record = await db.prepare("SELECT code FROM instagram_deletion_requests WHERE subject_hash = ? AND status = 'pending_review'").get(hash);
    if (!record) throw new InstagramError(503, 'Não foi possível registrar o protocolo.');
    return { url: `${origin}/exclusao-de-dados/instagram/status?code=${record.code}`, confirmation_code: String(record.code) };
  });
}
export async function deletionStatus(code: string) {
  if (!/^[a-f0-9]{48}$/.test(code)) return null;
  const record = await instagramDb().prepare('SELECT code,status,created_at,local_deleted_at,reviewed_at FROM instagram_deletion_requests WHERE code = ?').get(code);
  return record ? { confirmation_code: String(record.code), status: String(record.status), receivedAt: new Date(Number(record.created_at)).toISOString(), localDeletedAt: new Date(Number(record.local_deleted_at)).toISOString(), reviewedAt: record.reviewed_at ? new Date(Number(record.reviewed_at)).toISOString() : null } : null;
}
export async function completeDeletion(code: string, status: string, note: string) {
  if (!/^[a-f0-9]{48}$/.test(code) || !['completed', 'no_matching_data'].includes(status) || note.trim().length < 10 || note.length > 1000) throw new InstagramError(400, 'Informe protocolo, resultado e evidência de revisão com 10 a 1000 caracteres.');
  const result = await instagramDb().prepare("UPDATE instagram_deletion_requests SET status = ?,reviewed_at = ?,review_note = ? WHERE code = ? AND status = 'pending_review'").run(status, Date.now(), seal(note.trim(), `review:${code}`), code);
  if (!result.changes) throw new InstagramError(409, 'Protocolo inexistente ou já concluído.');
  return deletionStatus(code);
}
