import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomBytes, createHash, scrypt, timingSafeEqual } from 'node:crypto';

export const SESSION_TTL = 8 * 60 * 60 * 1000;
export const IDLE_TTL = 30 * 60 * 1000;
export const RESET_TTL = 20 * 60 * 1000;
export type AuthUser = { id: string; email: string; name: string; password_hash: string };
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const validEmail = (email: string) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const validPassword = (password: string) => password.length >= 8 && password.length <= 128 && /[\p{L}]/u.test(password) && /[0-9]/.test(password) && /[^\p{L}\p{N}\s]/u.test(password);
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const newToken = () => randomBytes(32).toString('hex');

let database: DatabaseSync | undefined;
export function db() {
  if (database) return database;
  const file = resolve(/* turbopackIgnore: true */ process.env.AUTH_DB_PATH || '.data/auth.sqlite');
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  database = new DatabaseSync(file);
  chmodSync(file, 0o600);
  database.exec(`PRAGMA journal_mode = DELETE; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL, seen INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS resets (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL, password_version TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, until INTEGER NOT NULL);`);
  return database;
}

// Limita o uso simultâneo de memória por scrypt. Credenciais nunca entram em logs.
let jobs = 0;
const waiting: Array<() => void> = [];
async function derive(password: string, salt: string): Promise<Buffer> {
  if (jobs >= 2) await new Promise<void>(resolve => waiting.push(resolve));
  else jobs++;
  try {
    return await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }, (error, value) => error ? reject(error) : resolve(value));
    });
  } finally {
    const next = waiting.shift();
    if (next) next();
    else jobs--;
  }
}
export async function hashPassword(password: string) {
  if (!validPassword(password)) throw new Error('Use de 8 a 128 caracteres, com letras, números e símbolos.');
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${(await derive(password, salt)).toString('hex')}`;
}
export async function verifyPassword(password: string, hash?: string) {
  // Mesmo custo para e-mails existentes e inexistentes.
  const [algorithm, salt, key] = (hash || `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`).split('$');
  if (algorithm !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(key || '')) return false;
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, Buffer.from(key, 'hex')) && Boolean(hash);
}
export function findUser(email: string) {
  return db().prepare('SELECT * FROM users WHERE email = ?').get(normalizeEmail(email)) as AuthUser | undefined;
}
export function createUser(email: string, name: string, hash: string, id = newToken()) {
  if (!validEmail(email) || !name.trim()) throw new Error('Dados inválidos.');
  db().prepare('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)').run(id, normalizeEmail(email), name.trim(), hash);
}
export function limited(key: string, max: number, window = 15 * 60 * 1000) {
  const now = Date.now();
  const database = db();
  database.exec('BEGIN IMMEDIATE');
  try {
    database.prepare('DELETE FROM attempts WHERE until < ?').run(now);
    database.prepare(`INSERT INTO attempts (key, count, until) VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET count = count + 1`).run(key, now + window);
    const row = database.prepare('SELECT count FROM attempts WHERE key = ?').get(key) as { count: number };
    database.exec('COMMIT');
    return row.count > max;
  } catch (error) { database.exec('ROLLBACK'); throw error; }
}
export function createSession(userId: string) {
  const token = newToken();
  const now = Date.now();
  db().prepare('DELETE FROM sessions WHERE expires < ? OR seen < ?').run(now, now - IDLE_TTL);
  db().prepare('INSERT INTO sessions VALUES (?, ?, ?, ?)').run(digest(token), userId, now + SESSION_TTL, now);
  return token;
}
export function createVerifiedSession(user: AuthUser) {
  const database = db();
  database.exec('BEGIN IMMEDIATE');
  try {
    const current = database.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id) as {password_hash: string} | undefined;
    if (current?.password_hash !== user.password_hash) { database.exec('ROLLBACK'); return null; }
    const token = createSession(user.id);
    database.exec('COMMIT');
    return token;
  } catch (error) { database.exec('ROLLBACK'); throw error; }
}

export async function changeUserPassword(user: AuthUser, password: string) {
  const nextHash = await hashPassword(password);
  const database = db();
  database.exec('BEGIN IMMEDIATE');
  try {
    const result = database.prepare('UPDATE users SET password_hash = ? WHERE id = ? AND password_hash = ?').run(nextHash, user.id, user.password_hash);
    if (!result.changes) { database.exec('ROLLBACK'); return null; }
    database.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    database.prepare('DELETE FROM resets WHERE user_id = ?').run(user.id);
    const token = createSession(user.id);
    database.exec('COMMIT');
    return token;
  } catch (error) { database.exec('ROLLBACK'); throw error; }
}

export function sessionUser(token?: string) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const now = Date.now();
  const user = db().prepare(`SELECT users.id, users.email, users.name FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.hash = ? AND sessions.expires > ? AND sessions.seen > ?`).get(digest(token), now, now - IDLE_TTL) as Pick<AuthUser, 'id' | 'email' | 'name'> | undefined;
  if (!user) return null;
  db().prepare('UPDATE sessions SET seen = ? WHERE hash = ?').run(now, digest(token));
  return { id: user.id, email: user.email, name: user.name };
}
export function revokeSession(token?: string) {
  if (token) db().prepare('DELETE FROM sessions WHERE hash = ?').run(digest(token));
}
export function issueReset(user: AuthUser) {
  const token = newToken();
  db().prepare('DELETE FROM resets WHERE user_id = ? OR expires < ?').run(user.id, Date.now());
  db().prepare('INSERT INTO resets VALUES (?, ?, ?, ?)').run(digest(token), user.id, Date.now() + RESET_TTL, digest(user.password_hash));
  return token;
}
export async function resetPassword(token: string, password: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return false;
  const row = db().prepare('SELECT * FROM resets WHERE hash = ? AND expires > ?').get(digest(token), Date.now()) as { user_id: string; password_version: string } | undefined;
  if (!row) return false;
  const hash = await hashPassword(password);
  const database = db();
  database.exec('BEGIN IMMEDIATE');
  try {
    const live = database.prepare(`SELECT resets.user_id, resets.password_version, users.password_hash FROM resets JOIN users ON users.id = resets.user_id
      WHERE resets.hash = ? AND resets.expires > ?`).get(digest(token), Date.now()) as { user_id: string; password_version: string; password_hash: string } | undefined;
    if (!live || digest(live.password_hash) !== live.password_version) { database.exec('ROLLBACK'); return false; }
    database.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, row.user_id);
    database.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.user_id);
    database.prepare('DELETE FROM resets WHERE user_id = ?').run(row.user_id);
    database.exec('COMMIT');
    return true;
  } catch (error) { database.exec('ROLLBACK'); throw error; }
}
