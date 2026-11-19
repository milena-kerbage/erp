import 'server-only';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireManager } from '../integrations/manager';
import { errorResponse, noStore } from '../whatsapp/server';
import { DeletionError } from '../meta/deletion';
import { InstagramError } from './config';
import { carregarAjustesInstagram } from './ajustes';

export const instagramHeaders = { ...noStore, 'Referrer-Policy': 'no-referrer' };
export function invalidateInstagramFeed() {
  revalidateTag('instagram', { expire: 0 });
  revalidatePath('/loja', 'page');
}
export function instagramError(error: unknown) {
  if (error instanceof InstagramError || error instanceof DeletionError) return Response.json({ error: error.message, code: error instanceof InstagramError ? error.code : 'INVALID_REQUEST', ...((error as { field?: string }).field ? { field: (error as { field?: string }).field } : {}) }, { status: error.status, headers: instagramHeaders });
  const response = errorResponse(error);
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
export async function instagramApi(request: Request, mutation: boolean, action: (user: Awaited<ReturnType<typeof requireManager>>) => Promise<unknown>) {
  try { const usuario = await requireManager(request, mutation); await carregarAjustesInstagram(); return Response.json(await action(usuario), { headers: instagramHeaders }); }
  catch (error) { return instagramError(error); }
}
