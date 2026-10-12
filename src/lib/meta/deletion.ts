import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { databaseFor, type Database } from '../database.ts';
import { effectivePublicBaseUrl } from '../whatsapp/config.ts';

export class DeletionError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export type DeletionStatus = 'pending_review' | 'completed' | 'no_matching_data';
type DeletionRecord = { code: string; subject_hash: string; status: DeletionStatus; created_at: number; completed_at: number | null; note: string | null };
let database: Database | undefined;

export function deletionDb() {
  if (database) return database;
  database = databaseFor('meta', process.env.META_DELETION_DB_PATH || '.data/meta-deletion.sqlite', `PRAGMA journal_mode = DELETE; PRAGMA busy_timeout = 5000; PRAGMA secure_delete = ON;
    CREATE TABLE IF NOT EXISTS deletion_requests (
      code TEXT PRIMARY KEY, subject_hash TEXT NOT NULL, status TEXT NOT NULL,
      created_at INTEGER NOT NULL, completed_at INTEGER, note TEXT);
    CREATE INDEX IF NOT EXISTS deletion_subject ON deletion_requests(subject_hash);
    CREATE UNIQUE INDEX IF NOT EXISTS deletion_pending_subject ON deletion_requests(subject_hash) WHERE status = 'pending_review';`);
  return database;
}

function appSecret() {
  const secret = (process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET)?.trim();
  if (!secret || secret.length < 16) throw new DeletionError(503, 'Callback de exclusão ainda não configurado.');
  return secret;
}

export function deletionOrigin(override?: string) {
  const configured = override !== undefined ? override : process.env.PUBLIC_BASE_URL || process.env.WHATSAPP_PUBLIC_BASE_URL || process.env.AUTH_ORIGIN;
  if (!configured) throw new DeletionError(503, 'Origem pública ainda não configurada.');
  let url: URL;
  try { url = new URL(configured); } catch { throw new DeletionError(503, 'Origem pública inválida.'); }
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
      (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) {
    throw new DeletionError(503, 'Configure uma origem pública HTTPS válida.');
  }
  return url.origin;
}

// O identificador é app-scoped do Facebook; nunca o tratamos como telefone/wa_id.
export function verifyDeletionRequest(signed: string, overrideSecret?: string): string {
  const secret = overrideSecret === undefined ? appSecret() : overrideSecret;
  if (secret.length < 16) throw new DeletionError(503, 'Callback de exclusão ainda não configurado.');
  if (typeof signed !== 'string' || signed.length > 8192) throw new DeletionError(400, 'Solicitação inválida.');
  const parts = signed.split('.');
  if (parts.length !== 2 || !parts.every(part => /^[A-Za-z0-9_-]+={0,2}$/.test(part))) throw new DeletionError(400, 'Solicitação inválida.');
  const [encodedSignature, encodedPayload] = parts;
  const signature = Buffer.from(encodedSignature, 'base64url');
  const expected = createHmac('sha256', secret).update(encodedPayload).digest();
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) throw new DeletionError(403, 'Assinatura inválida.');
  let payload: { algorithm?: unknown; user_id?: unknown; issued_at?: unknown };
  try { payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')); }
  catch { throw new DeletionError(400, 'Solicitação inválida.'); }
  if (!payload || payload.algorithm !== 'HMAC-SHA256' || typeof payload.user_id !== 'string' || !/^[0-9]{1,128}$/.test(payload.user_id)) throw new DeletionError(400, 'Solicitação inválida.');
  if (payload.issued_at !== undefined && (typeof payload.issued_at !== 'number' || !Number.isSafeInteger(payload.issued_at) || payload.issued_at < 0 || payload.issued_at > Date.now() / 1000 + 300)) throw new DeletionError(400, 'Solicitação inválida.');
  return createHmac('sha256', secret).update(`meta-deletion-subject:${payload.user_id}`).digest('hex');
}

export async function registerDeletion(subjectHash: string) {
  const origin = deletionOrigin(await effectivePublicBaseUrl());
  const store = deletionDb();
  return store.transaction(async () => {
    // Repetições recebem o mesmo protocolo pendente, inclusive entre processos.
    const candidate = randomBytes(24).toString('hex');
    await store.prepare("INSERT INTO deletion_requests (code, subject_hash, status, created_at) VALUES (?, ?, 'pending_review', ?) ON CONFLICT (subject_hash) WHERE status = 'pending_review' DO NOTHING").run(candidate, subjectHash, Date.now());
    const record = await store.prepare("SELECT code FROM deletion_requests WHERE subject_hash = ? AND status = 'pending_review'").get(subjectHash) as { code: string } | undefined;
    if (!record) throw new DeletionError(503, 'Não foi possível registrar a solicitação.');
    return { url: `${origin}/exclusao-de-dados/status?code=${record.code}`, confirmation_code: record.code };
  });
}

export async function deletionStatus(code: string) {
  if (!/^[a-f0-9]{48}$/.test(code)) return null;
  const record = await deletionDb().prepare('SELECT * FROM deletion_requests WHERE code = ?').get(code) as DeletionRecord | undefined;
  if (!record) return null;
  return { confirmation_code: record.code, status: record.status, receivedAt: new Date(record.created_at).toISOString(), completedAt: record.completed_at ? new Date(record.completed_at).toISOString() : null,
    message: record.status === 'pending_review' ? 'Solicitação recebida. A equipe precisa verificar quais dados estão associados ao identificador do aplicativo Meta. O protocolo não confirma exclusão concluída.' : record.status === 'completed' ? 'A equipe registrou a conclusão da exclusão dos dados identificados sob controle do ateliê.' : 'A equipe concluiu a verificação e registrou ausência de dados associados ao identificador do aplicativo Meta.' };
}

export function listDeletionRequests() {
  return deletionDb().prepare('SELECT code, subject_hash, status, created_at, completed_at FROM deletion_requests ORDER BY created_at DESC LIMIT 200').all();
}

export async function completeDeletion(code: string, outcome: 'completed' | 'no_matching_data', note: string) {
  if (!/^[a-f0-9]{48}$/.test(code) || !['completed', 'no_matching_data'].includes(outcome) || note.trim().length < 10 || note.length > 1000) throw new DeletionError(400, 'Informe protocolo, resultado e evidência de revisão (10 a 1000 caracteres).');
  const result = await deletionDb().prepare("UPDATE deletion_requests SET status = ?, completed_at = ?, note = ? WHERE code = ? AND status = 'pending_review'").run(outcome, Date.now(), note.trim(), code);
  if (!result.changes) throw new DeletionError(409, 'Protocolo inexistente ou já concluído.');
  return deletionStatus(code);
}

export async function readDeletionBody(request: Request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/x-www-form-urlencoded')) throw new DeletionError(415, 'Use application/x-www-form-urlencoded.');
  const reader = request.body?.getReader();
  if (!reader) throw new DeletionError(400, 'Solicitação inválida.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16384) { await reader.cancel(); throw new DeletionError(413, 'Solicitação muito grande.'); }
    chunks.push(value);
  }
  const form = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
  if (form.getAll('signed_request').length !== 1) throw new DeletionError(400, 'Solicitação inválida.');
  return form.get('signed_request')!;
}
