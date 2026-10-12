import { deleteContact, WhatsAppError } from '@/lib/whatsapp/core';
import { api, jsonBody } from '@/lib/whatsapp/server';
export const runtime = 'nodejs';
export async function DELETE(request: Request) {
  return api(request, async user => {
    const body = await jsonBody(request);
    if (body.confirmation !== 'EXCLUIR' || typeof body.identityVerification !== 'string' || body.identityVerification.trim().length < 10 || body.identityVerification.length > 500) throw new WhatsAppError(400, 'Confirme EXCLUIR e registre como a identidade e a legitimidade da solicitação foram verificadas.', 'VERIFICATION_REQUIRED');
    return deleteContact(body.phone, {actor: user.id, verification: body.identityVerification.trim()});
  }, true, 10);
}
