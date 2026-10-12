import { cookies } from 'next/headers';
import { COOKIE_NAME } from '@/lib/auth/cookies';
import { managementApi } from '@/lib/integrations/manager';
import { createOAuthState, oauthAvailable } from '@/lib/integrations/management';
import { oauthAuthorizationUrl } from '@/lib/integrations/oauth';
import { effectiveConfiguration } from '@/lib/whatsapp/config';
import { jsonBody } from '@/lib/whatsapp/server';
import { WhatsAppError } from '@/lib/whatsapp/core';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  return managementApi(request, true, async user => {
    if ((await jsonBody(request)).confirmation !== 'AUTORIZAR_META') throw new WhatsAppError(400, 'Confirme AUTORIZAR_META para continuar no serviço oficial.', 'CONFIRMATION_REQUIRED');
    const session = (await cookies()).get(COOKIE_NAME)?.value;
    const config = await effectiveConfiguration();
    if (!session || user.development) throw new WhatsAppError(401, 'O login opcional com a Meta exige uma sessão real de gestor no ERP.', 'REAL_SESSION_REQUIRED');
    if (!oauthAvailable(config)) throw new WhatsAppError(503, 'Habilite Facebook Login no app Meta, cadastre a URI de retorno e configure META_OAUTH_ENABLED=true na hospedagem.', 'OAUTH_NOT_CONFIGURED');
    const state = await createOAuthState(user.id, session);
    return { authorizationUrl: oauthAuthorizationUrl(config, state) };
  });
}
