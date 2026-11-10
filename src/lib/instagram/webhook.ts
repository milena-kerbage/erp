import { InstagramError, instagramConfig, retentionDays } from './config.ts';
import { digest, seal, secretMatches, subjectHash } from './crypto.ts';
import { currentConnection, instagramDb, instagramTransaction, pruneEvents } from './store.ts';

export function verifyChallenge(url: URL) {
  const { verifyToken } = instagramConfig(), q = url.searchParams;
  if (verifyToken.length < 32) throw new InstagramError(503, 'Configure INSTAGRAM_VERIFY_TOKEN com pelo menos 32 caracteres.', 'WEBHOOK_NOT_CONFIGURED');
  if (['hub.mode', 'hub.verify_token', 'hub.challenge'].some(k => q.getAll(k).length !== 1) || q.get('hub.mode') !== 'subscribe' ||
    !secretMatches(q.get('hub.verify_token') || '', verifyToken) || !/^\d{1,128}$/.test(q.get('hub.challenge') || '')) throw new InstagramError(403, 'Verificação do webhook recusada.', 'INVALID_CHALLENGE');
  return q.get('hub.challenge')!;
}
type ObjectValue = Record<string, unknown>;
function record(value: unknown): value is ObjectValue { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (record(value)) return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
function identities(value: unknown, result = new Set<string>(), depth = 0) {
  if (depth > 12) throw new InstagramError(400, 'Evento inválido.');
  if (Array.isArray(value)) for (const v of value) identities(v, result, depth + 1);
  else if (record(value)) for (const [key, v] of Object.entries(value)) {
    if (['sender', 'recipient', 'from', 'user'].includes(key) && record(v) && typeof v.id === 'string' && /^\d{1,32}$/.test(v.id)) result.add(v.id);
    identities(v, result, depth + 1);
  }
  return result;
}
/** Armazena a entrada durável; a primeira versão ainda não cria leads nem responde a DMs. */
export async function receiveWebhook(payload: unknown, now = Date.now()) {
  if (!record(payload) || payload.object !== 'instagram' || !Array.isArray(payload.entry) || payload.entry.length > 1000) throw new InstagramError(400, 'Evento do Instagram inválido.', 'INVALID_PAYLOAD');
  await pruneEvents(now);
  const db = instagramDb();
  return instagramTransaction(async () => {
    const connection = await currentConnection();
    let stored = 0, ignored = 0, updates = 0;
    for (const entry of payload.entry as unknown[]) {
      if (!record(entry) || typeof entry.id !== 'string' || !/^\d{1,32}$/.test(entry.id)) throw new InstagramError(400, 'Conta do evento inválida.');
      if (!connection || entry.id !== connection.account_id) { ignored++; continue; }
      const time = typeof entry.time === 'number' ? (entry.time < 1e12 ? entry.time * 1000 : entry.time) : now;
      if (time < Math.max(connection.connected_at - 300_000, now - retentionDays() * 86400_000) || time > now + 300_000) { ignored++; continue; }
      const changes = entry.changes === undefined ? [] : entry.changes;
      const messaging = entry.messaging === undefined ? [] : entry.messaging;
      if (!Array.isArray(changes) || !Array.isArray(messaging)) throw new InstagramError(400, 'Lista de eventos inválida.');
      updates += changes.length + messaging.length;
      if (updates > 1000) throw new InstagramError(400, 'Lista de eventos inválida.');
      const events = [...changes.map(v => ({ kind: record(v) && typeof v.field === 'string' ? v.field : 'change', value: v })),
        ...messaging.map(v => ({ kind: 'messaging', value: v }))];
      for (const event of events) {
        if (!record(event.value)) throw new InstagramError(400, 'Evento inválido.');
        const hashes = [...new Set([connection.subject_hash, connection.account_hash, ...[...identities(event.value)].map(subjectHash)])];
        let suppressed = false;
        for (const h of hashes) if (await db.prepare('SELECT subject_hash FROM instagram_suppression WHERE subject_hash = ?').get(h)) { suppressed = true; break; }
        if (suppressed) { ignored++; continue; }
        const encoded = canonical({ account: entry.id, kind: event.kind, value: event.value });
        const id = digest(`${instagramConfig().appId}:${encoded}`);
        const result = await db.prepare('INSERT INTO instagram_events (id,app_id,account_id,kind,payload_cipher,received_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING')
          .run(id, connection.app_id, entry.id, event.kind, seal(JSON.stringify(event.value), `event:${id}`), now);
        if (!result.changes) { ignored++; continue; }
        for (const h of hashes) await db.prepare('INSERT INTO instagram_event_subjects (event_id,subject_hash) VALUES (?,?)').run(id, h);
        stored++;
      }
    }
    return { stored, ignored };
  });
}
