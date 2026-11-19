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
      app: { appId: config.appId, appSecretSalvo: config.appSecret.length >= 16, webhookSecretPronto: config.webhookSecret.length >= 16, versao: config.version },
      checks: [
        { name: 'App ID do Instagram', configured: /^\d{5,32}$/.test(config.appId) },
        { name: 'App Secret do Instagram', configured: config.appSecret.length >= 16 },
        { name: 'App Secret do app (assinatura dos webhooks)', configured: config.webhookSecret.length >= 16 },
        { name: 'Token de verificação do webhook', configured: config.verifyToken.length >= 32 },
        { name: 'Versão da Graph API', configured: /^v\d{2,3}\.0$/.test(config.version) },
        { name: 'Chave de criptografia do servidor', configured: encryptionReady() },
      ],
      connection: c ? { username: c.username, expiresAt: new Date(c.expires_at).toISOString(), expired: c.expires_at <= Date.now(), scopes: JSON.parse(c.scopes_json), subscribedFields: JSON.parse(c.fields_json) } : null,
      events: { total: Number(count?.total || 0), lastReceivedAt: count?.latest ? new Date(Number(count.latest)).toISOString() : null },
    };
  });
}
