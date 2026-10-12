import { managementApi } from '@/lib/integrations/manager';
import { debugToken, recordManagementTest } from '@/lib/integrations/management';
import { jsonBody } from '@/lib/whatsapp/server';
import { WhatsAppError } from '@/lib/whatsapp/core';
import { extendUserToken } from '@/lib/integrations/oauth';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  return managementApi(request, true, async user => {
    const body = await jsonBody(request);
    if (body.action === 'extend') {
      if (body.confirmation !== 'RENOVAR') throw new WhatsAppError(400, 'Confirme RENOVAR para solicitar a troca de duração do token de usuário à Meta.', 'CONFIRMATION_REQUIRED');
      return extendUserToken(user.id);
    }
    if (body.action !== 'inspect') throw new WhatsAppError(400, 'Selecione a inspeção ou troca de duração do token de usuário.', 'INVALID_TOKEN_ACTION');
    const token = await debugToken();
    await recordManagementTest('token', token.valid && token.appMatches && token.missingScopes.length === 0, 'Inspeção do token de acesso realizada com a Meta.', ['Metadados retornados sem o valor do token.'], user.id);
    return { token, checkedAt: new Date().toISOString() };
  });
}
