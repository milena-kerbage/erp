import { instagramConfig } from '@/lib/instagram/config';
import { unseal } from '@/lib/instagram/crypto';
import { instagramDb, pruneEvents } from '@/lib/instagram/store';
import { instagramApi } from '@/lib/instagram/server';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  return instagramApi(request, false, async () => {
    await pruneEvents();
    const rows = await instagramDb().prepare('SELECT id,kind,payload_cipher,received_at FROM instagram_events WHERE app_id = ? ORDER BY received_at DESC, id DESC LIMIT 50').all(instagramConfig().appId);
    return { events: rows.map(r => ({ id: r.id, kind: r.kind, receivedAt: new Date(Number(r.received_at)).toISOString(), payload: JSON.parse(unseal(String(r.payload_cipher), `event:${r.id}`)) })) };
  });
}
