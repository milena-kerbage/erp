import { resolve } from 'node:path';
import { randomBytes, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { databaseFor } from '../database.ts';

export const SESSION_TTL = 8 * 60 * 60 * 1000;
export const IDLE_TTL = 30 * 60 * 1000;
export const RESET_TTL = 20 * 60 * 1000;
export type AuthUser = { id: string; email: string; name: string; password_hash: string };
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const validEmail = (email: string) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const validPassword = (password: string) => password.length >= 8 && password.length <= 128 && /[\p{L}]/u.test(password) && /[0-9]/.test(password) && /[^\p{L}\p{N}\s]/u.test(password);
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const newToken = () => randomBytes(32).toString('hex');

const sqliteSchema = `PRAGMA journal_mode = DELETE; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL, seen INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS resets (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL, password_version TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, until INTEGER NOT NULL);`;
export function db() {
  const file = resolve(/* turbopackIgnore: true */ process.env.AUTH_DB_PATH || '.data/auth.sqlite');
  return databaseFor('auth', file, sqliteSchema);
}

// PostgreSQL locks the user row; SQLite's immediate transaction already serializes writers.
const rowLock = () => db().backend === 'postgres' ? ' FOR UPDATE' : '';

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
export async function findUser(email: string) {
  return await db().prepare('SELECT * FROM users WHERE email = ?').get(normalizeEmail(email)) as AuthUser | undefined;
}
export async function createUser(email: string, name: string, hash: string, id = newToken()) {
  if (!validEmail(email) || !name.trim()) throw new Error('Dados inválidos.');
  await db().prepare('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)').run(id, normalizeEmail(email), name.trim(), hash);
}
export async function limited(key: string, max: number, window = 15 * 60 * 1000) {
  const now = Date.now();
  const database = db();
  return database.transaction(async () => {
    await database.prepare('DELETE FROM attempts WHERE until < ?').run(now);
    await database.prepare(`INSERT INTO attempts (key, count, until) VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET count = attempts.count + 1`).run(key, now + window);
    const row = await database.prepare('SELECT count FROM attempts WHERE key = ?').get(key) as { count: number };
    return row.count > max;
  });
}
export async function createSession(userId: string) {
  const token = newToken();
  const now = Date.now();
  await db().prepare('DELETE FROM sessions WHERE expires < ? OR seen < ?').run(now, now - IDLE_TTL);
  await db().prepare('INSERT INTO sessions VALUES (?, ?, ?, ?)').run(digest(token), userId, now + SESSION_TTL, now);
  return token;
}
export async function createVerifiedSession(user: AuthUser) {
  const database = db();
  return database.transaction(async () => {
    const current = await database.prepare(`SELECT password_hash FROM users WHERE id = ?${rowLock()}`).get(user.id) as {password_hash: string} | undefined;
    if (current?.password_hash !== user.password_hash) return null;
    return createSession(user.id);
  });
}

export async function changeUserPassword(user: AuthUser, password: string) {
  const nextHash = await hashPassword(password);
  const database = db();
  return database.transaction(async () => {
    const result = await database.prepare('UPDATE users SET password_hash = ? WHERE id = ? AND password_hash = ?').run(nextHash, user.id, user.password_hash);
    if (!result.changes) return null;
    await database.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    await database.prepare('DELETE FROM resets WHERE user_id = ?').run(user.id);
    return createSession(user.id);
  });
}

export async function sessionUser(token?: string, touch = true) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const now = Date.now();
  const user = await db().prepare(`SELECT users.id, users.email, users.name FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.hash = ? AND sessions.expires > ? AND sessions.seen > ?`).get(digest(token), now, now - IDLE_TTL) as Pick<AuthUser, 'id' | 'email' | 'name'> | undefined;
  if (!user) return null;
  // Background polling validates the existing timeout without extending activity.
  if (!touch) return { id: user.id, email: user.email, name: user.name };
  const refreshed = await db().prepare('UPDATE sessions SET seen = ? WHERE hash = ? AND expires > ? AND seen > ?').run(now, digest(token), now, now - IDLE_TTL);
  if (!refreshed.changes) return null;
  return { id: user.id, email: user.email, name: user.name };
}
export async function revokeSession(token?: string) {
  if (token) await db().prepare('DELETE FROM sessions WHERE hash = ?').run(digest(token));
}
export async function issueReset(user: AuthUser) {
  const token = newToken();
  const database = db();
  return database.transaction(async () => {
    const current = await database.prepare(`SELECT password_hash FROM users WHERE id = ?${rowLock()}`).get(user.id) as {password_hash: string} | undefined;
    if (!current) return null;
    await database.prepare('DELETE FROM resets WHERE user_id = ? OR expires < ?').run(user.id, Date.now());
    await database.prepare('INSERT INTO resets VALUES (?, ?, ?, ?)').run(digest(token), user.id, Date.now() + RESET_TTL, digest(current.password_hash));
    return token;
  });
}
export async function resetPassword(token: string, password: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return false;
  const row = await db().prepare('SELECT * FROM resets WHERE hash = ? AND expires > ?').get(digest(token), Date.now()) as { user_id: string; password_version: string } | undefined;
  if (!row) return false;
  const hash = await hashPassword(password);
  const database = db();
  return database.transaction(async () => {
    const current = await database.prepare(`SELECT password_hash FROM users WHERE id = ?${rowLock()}`).get(row.user_id) as {password_hash: string} | undefined;
    if (!current) return false;
    const live = await database.prepare(`SELECT resets.user_id, resets.password_version, users.password_hash FROM resets JOIN users ON users.id = resets.user_id
      WHERE resets.hash = ? AND resets.expires > ?`).get(digest(token), Date.now()) as { user_id: string; password_version: string; password_hash: string } | undefined;
    if (!live || live.user_id !== row.user_id || digest(live.password_hash) !== live.password_version) return false;
    await database.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, row.user_id);
    await database.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.user_id);
    await database.prepare('DELETE FROM resets WHERE user_id = ?').run(row.user_id);
    return true;
  });
}
