import { DeletionError, deletionOrigin, readDeletionBody, registerDeletion, verifyDeletionRequest } from '@/lib/meta/deletion';
import { effectiveAppSecret, effectivePublicBaseUrl } from '@/lib/whatsapp/config';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    deletionOrigin(await effectivePublicBaseUrl());
    const subject = verifyDeletionRequest(await readDeletionBody(request), await effectiveAppSecret());
    return Response.json(await registerDeletion(subject), { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
  } catch (error) {
    return Response.json({ error: error instanceof DeletionError ? error.message : 'Não foi possível registrar a solicitação. Tente novamente.' },
      { status: error instanceof DeletionError ? error.status : 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
