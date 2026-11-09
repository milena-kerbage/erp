import type { Database } from './database.ts';

const nextCleanup = new WeakMap<Database, Map<string, number>>();

/** Contador persistente: o UPSERT serializa incrementos inclusive entre instâncias. */
export async function databaseLimited(database: Database, table: 'attempts' | 'rate_limits', key: string, maximum: number, window: number) {
  const now = Date.now();
  let cleanup = nextCleanup.get(database);
  if (!cleanup) { cleanup = new Map(); nextCleanup.set(database, cleanup); }
  // A expiração da chave é resolvida pelo próprio UPSERT. A limpeza global é só retenção,
  // no máximo uma vez por minuto por instância/tabela, sem varrer a tabela em cada GET.
  if ((cleanup.get(table) ?? 0) <= now) {
    cleanup.set(table, now + 60_000);
    try { await database.prepare(`DELETE FROM ${table} WHERE until < ?`).run(now); }
    catch (error) { cleanup.delete(table); throw error; }
  }
  const row = await database.prepare(`INSERT INTO ${table} (key, count, until) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET
      count = CASE WHEN ${table}.until < ? THEN 1 ELSE ${table}.count + 1 END,
      until = CASE WHEN ${table}.until < ? THEN excluded.until ELSE ${table}.until END
    RETURNING count`).get(key, now + window, now, now) as {count: number};
  return row.count > maximum;
}
