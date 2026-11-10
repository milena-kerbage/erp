import { instagramConfig, instagramUrls, retentionDays } from '@/lib/instagram/config';
import { encryptionReady } from '@/lib/instagram/crypto';
import { currentConnection, instagramDb, pruneEvents } from '@/lib/instagram/store';
import { instagramApi } from '@/lib/instagram/server';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  return instagramApi(request, false, async () => {
    const config = instagramConfig();
    await pruneEvents();
    const c = await currentConnection();
    const count = await instagramDb().prepare('SELECT count(*) AS total, max(received_at) AS latest FROM instagram_events WHERE app_id = ?').get(config.appId);
    return {
      urls: instagramUrls(), scopes: config.scopes, retentionDays: retentionDays(),
      checks: [
        { name: 'INSTAGRAM_APP_ID', configured: /^\d{5,32}$/.test(config.appId) },
        { name: 'INSTAGRAM_APP_SECRET', configured: config.appSecret.length >= 16 },
        { name: 'INSTAGRAM_WEBHOOK_APP_SECRET', configured: config.webhookSecret.length >= 16 },
        { name: 'INSTAGRAM_VERIFY_TOKEN', configured: config.verifyToken.length >= 32 },
        { name: 'INSTAGRAM_GRAPH_VERSION', configured: /^v\d{2,3}\.0$/.test(config.version) },
        { name: 'INTEGRATION_ENCRYPTION_KEY', configured: encryptionReady() },
      ],
      connection: c ? { username: c.username, expiresAt: new Date(c.expires_at).toISOString(), expired: c.expires_at <= Date.now(), scopes: JSON.parse(c.scopes_json), subscribedFields: JSON.parse(c.fields_json) } : null,
      events: { total: Number(count?.total || 0), lastReceivedAt: count?.latest ? new Date(Number(count.latest)).toISOString() : null },
    };
  });
}
