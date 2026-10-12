import { managementApi } from '@/lib/integrations/manager';
import { recordManagementTest, debugToken } from '@/lib/integrations/management';
import { effectiveConfiguration } from '@/lib/whatsapp/config';
import { graph, diagnostics, WhatsAppError } from '@/lib/whatsapp/core';
import { jsonBody } from '@/lib/whatsapp/server';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  return managementApi(request, true, async user => {
    if ((await jsonBody(request)).confirmation !== 'INSCREVER') throw new WhatsAppError(400, 'Confirme INSCREVER para associar o aplicativo à WABA configurada.', 'CONFIRMATION_REQUIRED');
    const config = await effectiveConfiguration();
    const token = await debugToken();
    if (!token.valid || !token.appMatches || token.missingScopes.length) throw new WhatsAppError(409, 'Confirme um token válido do App ID configurado e suas permissões antes de inscrever o aplicativo.', 'TOKEN_NOT_AUTHORIZED');
    await graph(`${config.businessAccountId}/subscribed_apps`, { method: 'POST', body: '{}' });
    const diagnostic = await diagnostics();
    return { ...(await recordManagementTest('subscribe', true, 'Inscrição solicitada à Meta e lista de aplicativos consultada.', ['Confirme o App ID esperado na lista. A configuração dos campos do webhook no painel Meta continua necessária.'], user.id)), subscriptions: diagnostic.subscriptions };
  });
}
