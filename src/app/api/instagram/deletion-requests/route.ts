import { jsonBody } from '@/lib/whatsapp/server';
import { completeDeletion, instagramDb } from '@/lib/instagram/store';
import { instagramApi } from '@/lib/instagram/server';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  return instagramApi(request, false, async () => ({ requests: await instagramDb().prepare('SELECT code,status,created_at,local_deleted_at,reviewed_at FROM instagram_deletion_requests ORDER BY created_at DESC LIMIT 100').all() }));
}
export async function PATCH(request: Request) {
  return instagramApi(request, true, async () => {
    const body = await jsonBody(request);
    return completeDeletion(String(body.code || ''), String(body.status || ''), String(body.note || ''));
  });
}
