import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { Database, postgresParameters } from '../src/lib/database.ts';
import { databaseLimited } from '../src/lib/rate-limit.ts';

async function checkLimiter(database) {
  const decisions = await Promise.all(Array.from({length: 40}, () => databaseLimited(database, 'attempts', 'concurrent', 5, 60_000)));
  assert.equal(decisions.filter(limited => !limited).length, 5, 'concorrência não permite ultrapassar o limite');
  await database.prepare('UPDATE attempts SET until = ? WHERE key = ?').run(Date.now() - 1, 'concurrent');
  assert.equal(await databaseLimited(database, 'attempts', 'concurrent', 5, 60_000), false, 'reinicia a chave expirada mesmo sem limpeza global');
  assert.equal((await database.prepare('SELECT count FROM attempts WHERE key = ?').get('concurrent')).count, 1);
  assert.equal(await databaseLimited(database, 'attempts', 'another', 1, 60_000), false);
  assert.equal(await databaseLimited(database, 'attempts', 'another', 1, 60_000), true);
}

test('limite SQLite é atômico, expira, isola chaves e mantém uma instrução por chamada aquecida', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'erp-performance-'));
  const database = new Database('auth', join(directory, 'auth.sqlite'), 'CREATE TABLE attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, until INTEGER NOT NULL);', '');
  try {
    await checkLimiter(database);
    const original = database.prepare.bind(database), statements = [];
    database.prepare = sql => { statements.push(sql); return original(sql); };
    await databaseLimited(database, 'attempts', 'warm', 2, 60_000);
    assert.equal(statements.length, 1);
    assert.match(statements[0], /RETURNING count/);
  } finally { await database.close(); rmSync(directory, {recursive: true, force: true}); }
});

test('SQL do limite funciona no PostgreSQL e os índices são idempotentes', async () => {
  const engine = await PGlite.create();
  try {
    await engine.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
    const directory = new URL('../supabase/migrations/', import.meta.url);
    for (const file of readdirSync(directory).filter(file => /^\d+_.+\.sql$/.test(file)).sort()) await engine.exec(readFileSync(new URL(file, directory), 'utf8'));
    await engine.exec('SET search_path TO erp_auth;');
    const database = {prepare: sql => ({get: async (...parameters) => (await engine.query(postgresParameters(sql), parameters)).rows[0], run: async (...parameters) => engine.query(postgresParameters(sql), parameters)})};
    await checkLimiter(database);
    await engine.exec(readFileSync(new URL('011_performance.sql', directory), 'utf8'));
    const indexes = (await engine.query("SELECT indexname FROM pg_indexes WHERE indexname IN ('attempts_until', 'sessions_user_seen', 'messages_phone_cursor', 'messages_unread_phone', 'contacts_active_updated')")).rows;
    assert.equal(indexes.length, 5);
  } finally { await engine.close(); }
});

test('origem da CDN permite somente HTTPS sem credenciais ou caminhos', async () => {
  const {origemDaMidia} = await import('../src/loja/lib/midia.ts');
  assert.equal(origemDaMidia(''), '');
  assert.equal(origemDaMidia('https://midia.example.test/'), 'https://midia.example.test');
  for (const url of ['http://midia.example.test', 'https://user:secret@midia.example.test', 'https://midia.example.test/bucket', 'https://midia.example.test/?token=secret', 'https://midia.example.test/#hash']) assert.throws(() => origemDaMidia(url));
});
