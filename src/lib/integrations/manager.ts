import 'server-only';
import { getSession } from '../auth/server';
import { developmentAccess } from '../auth/environment';
import { trustedOrigin } from '../auth/http';
import { WhatsAppError, limited } from '../whatsapp/core';
import { managerDenial, loopbackOrigin } from './access.ts';
import { errorResponse, noStore } from '../whatsapp/server';
import { DeletionError } from '../meta/deletion';
import { currentMember } from '../erp/access';

export async function requireManager(request: Request, mutation = false) {
  const session = await getSession(mutation);
  const localDevelopment = developmentAccess() && loopbackOrigin(request.url);
  if (!session && !localDevelopment) throw new WhatsAppError(401, 'Entre no sistema para administrar a integração.', 'UNAUTHORIZED');
  if (session && !localDevelopment) {
    const denial = managerDenial((await currentMember(session)).permission, session.email);
    if (denial) throw new WhatsAppError(403, denial, 'MANAGER_REQUIRED');
  }
  if (mutation) trustedOrigin(request);
  const user = session || { id: 'development-manager', email: 'development@localhost' };
  if (await limited(`manager:${user.id}:${new URL(request.url).pathname}`, mutation ? 30 : 120)) throw new WhatsAppError(429, 'Muitas operações de gestão. Aguarde um minuto.', 'RATE_LIMITED');
  return { id: user.id, email: user.email, development: !session };
}
export async function managementApi(request: Request, mutation: boolean, action: (user: Awaited<ReturnType<typeof requireManager>>) => Promise<unknown>) {
  try { return Response.json(await action(await requireManager(request, mutation)), { headers: noStore }); }
  catch (error) { return error instanceof DeletionError ? Response.json({ error: error.message }, { status: error.status, headers: noStore }) : errorResponse(error); }
}
