import { managementApi } from '@/lib/integrations/manager';
import { completeDeletion, listDeletionRequests } from '@/lib/meta/deletion';
import { jsonBody } from '@/lib/whatsapp/server';
import { WhatsAppError } from '@/lib/whatsapp/core';
import { recordManagementTest } from '@/lib/integrations/management';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  return managementApi(request, false, async () => ({ requests: (await listDeletionRequests()).map(row => ({ code: row.code, status: row.status, requestedAt: new Date(Number(row.created_at)).toISOString(), completedAt: row.completed_at ? new Date(Number(row.completed_at)).toISOString() : null })) }));
}
export async function POST(request: Request) {
  return managementApi(request, true, async user => {
    const body = await jsonBody(request);
    if (typeof body.code !== 'string' || !['completed', 'no_matching_data'].includes(String(body.outcome)) || typeof body.note !== 'string') throw new WhatsAppError(400, 'Informe protocolo, resultado e evidência da revisão.', 'INVALID_DELETION_REVIEW');
    const result = await completeDeletion(body.code, body.outcome as 'completed' | 'no_matching_data', body.note);
    await recordManagementTest('deletion-review', true, 'Revisão de solicitação de exclusão registrada pelo gestor.', [], user.id);
    return result;
  });
}
