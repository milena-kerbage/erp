import { deletionStatus } from '@/lib/instagram/store';
import { instagramError, instagramHeaders } from '@/lib/instagram/server';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const result = await deletionStatus(new URL(request.url).searchParams.get('code') || '');
    return Response.json(result || { error: 'Protocolo não encontrado.' }, { status: result ? 200 : 404, headers: instagramHeaders });
  } catch (error) { return instagramError(error); }
}
