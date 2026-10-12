import { managementApi } from '@/lib/integrations/manager';
import { prepareLocalEncryption } from '@/lib/integrations/bootstrap';
import { jsonBody } from '@/lib/whatsapp/server';
import { WhatsAppError } from '@/lib/whatsapp/core';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  return managementApi(request, true, async () => {
    const input = await jsonBody(request);
    if (input.action !== 'GENERATE_LOCAL_ENCRYPTION_KEY' || Object.keys(input).length !== 1) throw new WhatsAppError(400, 'Confirme a preparação da criptografia local.', 'CONFIRMATION_REQUIRED');
    return prepareLocalEncryption(new URL(request.url).origin);
  });
}
