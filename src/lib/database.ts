import { AsyncLocalStorage } from 'node:async_hooks';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { Pool, types, type PoolClient, type QueryResult } from 'pg';

export type DatabaseDomain = 'auth' | 'whatsapp' | 'meta' | 'erp';
type Row = Record<string, unknown>;
type Parameter = string | number | bigint | boolean | null | Uint8Array;
type RunResult = {changes: number | bigint; lastInsertRowid?: number | bigint};
type TransactionContext = {database: Database; client: PoolClient | DatabaseSync};
const context = new AsyncLocalStorage<TransactionContext>();
const databases = new Map<string, Database>();
const pools = new Map<string, Pool>();
const schemas: Record<DatabaseDomain, string> = {auth: 'erp_auth', whatsapp: 'erp_whatsapp', meta: 'erp_meta', erp: 'erp_core'};
// Estes esquemas usam BIGINT somente para contadores e timestamps em milissegundos.
types.setTypeParser(20, value => { const parsed = Number(value); if (!Number.isSafeInteger(parsed)) throw new Error('Valor numérico fora do limite seguro.'); return parsed; });

export class DatabaseConfigurationError extends Error {
  code = 'DATABASE_NOT_CONFIGURED';
  status = 503;
  constructor() { super('Configure DATABASE_URL do pooler PostgreSQL/Supabase para este ambiente.'); }
}
export class DatabaseOperationError extends Error {
  code = 'DATABASE_UNAVAILABLE';
  status = 503;
  constructor() { super('O banco de dados não pôde concluir a operação. Verifique a conexão e as migrações.'); }
}
async function safeQuery<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation(); }
  catch (error) { if (error instanceof DatabaseConfigurationError) throw error; throw new DatabaseOperationError(); }
}
export function storageConfiguration() {
  const configured = Boolean(process.env.DATABASE_URL);
  return {backend: configured ? 'postgres' : 'sqlite', configured: configured || process.env.VERCEL !== '1', persistent: configured || process.env.VERCEL !== '1'};
}

// Substitui parâmetros posicionais, preservando '?' em strings, identificadores e comentários.
export function postgresParameters(sql: string) {
  let result = '', index = 0, mode: 'normal' | 'single' | 'double' | 'line' | 'block' = 'normal', dollarTag = '';
  for (let position = 0; position < sql.length; position++) {
    const character = sql[position], next = sql[position + 1];
    if (dollarTag) {
      if (sql.startsWith(dollarTag, position)) { result += dollarTag; position += dollarTag.length - 1; dollarTag = ''; }
      else result += character;
      continue;
    }
    if (mode === 'single' || mode === 'double') {
      result += character;
      const quote = mode === 'single' ? "'" : '"';
      if (character === quote) { if (next === quote) { result += next; position++; } else mode = 'normal'; }
      continue;
    }
    if (mode === 'line') { result += character; if (character === '\n') mode = 'normal'; continue; }
    if (mode === 'block') { result += character; if (character === '*' && next === '/') { result += next; position++; mode = 'normal'; } continue; }
    if (character === "'") mode = 'single';
    else if (character === '"') mode = 'double';
    else if (character === '-' && next === '-') { mode = 'line'; result += '--'; position++; continue; }
    else if (character === '/' && next === '*') { mode = 'block'; result += '/*'; position++; continue; }
    else if (character === '$') {
      const match = /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(position));
      if (match) { dollarTag = match[0]; result += dollarTag; position += dollarTag.length - 1; continue; }
    }
    result += character === '?' ? `$${++index}` : character;
  }
  return result;
}

function poolFor(connectionString: string) {
  const key = createHash('sha256').update(connectionString).digest('hex');
  const existing = pools.get(key); if (existing) return existing;
  let url: URL;
  try { url = new URL(connectionString); if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || !url.password) throw new Error(); }
  catch { throw new DatabaseConfigurationError(); }
  // pg connection-string sslmode pode sobrescrever ssl: retiramos esses parâmetros
  // para sempre verificar o certificado com a cadeia confiável do runtime.
  for (const parameter of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(parameter);
  const certificate = process.env.DATABASE_SSL_CA?.replace(/\\n/g, '\n');
  const disableTls = process.env.DATABASE_SSL_MODE === 'disable';
  if (disableTls && !(process.env.NODE_ENV === 'test' && process.env.VERCEL !== '1' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new DatabaseConfigurationError();
  const pool = new Pool({connectionString: url.toString(), ssl: disableTls ? false : {rejectUnauthorized: true, ...(certificate ? {ca: certificate} : {})}, max: 1, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 10_000, query_timeout: 15_000, allowExitOnIdle: true});
  pool.on('error', () => { /* O consumidor recebe erros seguros, sem imprimir URL/credenciais. */ });
  pools.set(key, pool); return pool;
}

export class Database {
  readonly domain: DatabaseDomain;
  readonly backend: 'postgres' | 'sqlite';
  private readonly sqlitePath: string;
  private readonly sqliteSchema: string;
  private readonly connectionString: string;
  private sqlite?: DatabaseSync;
  private readonly sqliteSchemas = new Set<string>();
  private readonly initializedSchemas = new Set<string>();
  private queue: Promise<void> = Promise.resolve();
  constructor(domain: DatabaseDomain, sqlitePath: string, sqliteSchema: string, connectionString: string) {
    this.domain = domain; this.sqlitePath = sqlitePath; this.sqliteSchema = sqliteSchema; this.sqliteSchemas.add(sqliteSchema); this.connectionString = connectionString; this.backend = connectionString ? 'postgres' : 'sqlite';
  }
  registerSqliteSchema(schema: string) { this.sqliteSchemas.add(schema); }
  private local() {
    if (process.env.VERCEL === '1') throw new DatabaseConfigurationError();
    if (!this.sqlite) {
      const file = resolve(/* turbopackIgnore: true */ this.sqlitePath);
      mkdirSync(dirname(file), {recursive: true, mode: 0o700});
      this.sqlite = new DatabaseSync(file); chmodSync(file, 0o600);
      this.sqlite.function('greatest', {varargs: true}, (...values) => Math.max(...values.map(value => Number(value))));
    }
    for (const schema of this.sqliteSchemas) if (!this.initializedSchemas.has(schema)) { this.sqlite.exec(schema); this.initializedSchemas.add(schema); }
    return this.sqlite;
  }
  private async locked<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.queue;
    let unlock!: () => void;
    this.queue = new Promise<void>(resolve => { unlock = resolve; });
    await previous;
    try { return await operation(); } finally { unlock(); }
  }
  private async perform(sql: string, parameters: Parameter[], result: 'get' | 'all' | 'run'): Promise<Row | Row[] | RunResult | undefined> {
    const inherited = context.getStore();
    const executeSqlite = (client: DatabaseSync) => {
      const statement = client.prepare(sql);
      const values = parameters.map(value => typeof value === 'boolean' ? Number(value) : value);
      if (result === 'get') return statement.get(...values) as Row | undefined;
      if (result === 'all') return statement.all(...values) as Row[];
      return statement.run(...values);
    };
    const executePostgres = async (client: PoolClient) => {
      const query: QueryResult = await client.query(postgresParameters(sql), parameters);
      if (result === 'get') return query.rows[0] as Row | undefined;
      if (result === 'all') return query.rows as Row[];
      return {changes: query.rowCount || 0};
    };
    if (inherited?.database === this) return this.backend === 'sqlite' ? executeSqlite(this.local()) : executePostgres(inherited.client as PoolClient);
    if (this.backend === 'sqlite') return this.locked(async () => executeSqlite(this.local()));
    const client = await safeQuery(() => poolFor(this.connectionString).connect());
    try {
      await client.query('BEGIN'); await client.query(`SET LOCAL search_path TO ${schemas[this.domain]}`);
      const value = await executePostgres(client); await client.query('COMMIT'); return value;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  prepare(sql: string) {
    return {
      get: (...parameters: Parameter[]) => safeQuery(() => this.perform(sql, parameters, 'get')) as Promise<Row | undefined>,
      all: (...parameters: Parameter[]) => safeQuery(() => this.perform(sql, parameters, 'all')) as Promise<Row[]>,
      run: (...parameters: Parameter[]) => safeQuery(() => this.perform(sql, parameters, 'run')) as Promise<RunResult>,
    };
  }
  async exec(sql: string) {
    const inherited = context.getStore();
    if (inherited?.database === this) {
      if (this.backend === 'sqlite') (inherited.client as DatabaseSync).exec(sql);
      else await (inherited.client as PoolClient).query(sql);
      return;
    }
    if (this.backend === 'sqlite') { await this.locked(async () => { this.local().exec(sql); }); return; }
    const client = await safeQuery(() => poolFor(this.connectionString).connect());
    try { await client.query('BEGIN'); await client.query(`SET LOCAL search_path TO ${schemas[this.domain]}`); await client.query(sql); await client.query('COMMIT'); }
    catch (error) { await client.query('ROLLBACK'); if (error instanceof DatabaseConfigurationError) throw error; throw new DatabaseOperationError(); }
    finally { client.release(); }
  }
  async transaction<T>(operation: () => Promise<T>): Promise<T> {
    if (context.getStore()?.database === this) return operation();
    if (context.getStore() && this.backend === 'postgres') throw new Error('Transações entre domínios devem ser coordenadas fora de uma transação aberta.');
    const execute = async (client: DatabaseSync | PoolClient) => context.run({database: this, client}, async () => {
      if (this.backend === 'sqlite') (client as DatabaseSync).exec('BEGIN IMMEDIATE');
      else await safeQuery(async () => { await (client as PoolClient).query('BEGIN'); await (client as PoolClient).query(`SET LOCAL search_path TO ${schemas[this.domain]}`); });
      try {
        const value = await operation();
        if (this.backend === 'sqlite') (client as DatabaseSync).exec('COMMIT'); else await safeQuery(() => (client as PoolClient).query('COMMIT'));
        return value;
      } catch (error) {
        if (this.backend === 'sqlite') { (client as DatabaseSync).exec('ROLLBACK'); this.initializedSchemas.clear(); } else await safeQuery(() => (client as PoolClient).query('ROLLBACK'));
        throw error;
      }
    });
    if (this.backend === 'sqlite') return this.locked(() => execute(this.local()));
    const client = await safeQuery(() => poolFor(this.connectionString).connect());
    try { return await execute(client); } finally { client.release(); }
  }
  async close() { if (this.sqlite) await this.locked(async () => { this.sqlite?.close(); this.sqlite = undefined; this.initializedSchemas.clear(); }); }
}

export function databaseFor(domain: DatabaseDomain, sqlitePath: string, sqliteSchema: string) {
  const connectionString = process.env.DATABASE_URL || '';
  if (!connectionString && process.env.VERCEL === '1') throw new DatabaseConfigurationError();
  const key = `${domain}:${connectionString ? createHash('sha256').update(connectionString).digest('hex') : resolve(/* turbopackIgnore: true */ sqlitePath)}`;
  let database = databases.get(key);
  if (!database) { database = new Database(domain, sqlitePath, sqliteSchema, connectionString); databases.set(key, database); }
  else database.registerSqliteSchema(sqliteSchema);
  return database;
}
export async function closeDatabases() {
  await Promise.all([...databases.values()].map(database => database.close()));
  await Promise.all([...pools.values()].map(pool => pool.end()));
  databases.clear(); pools.clear();
}
