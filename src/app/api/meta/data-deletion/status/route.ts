import { deletionStatus } from '@/lib/meta/deletion';

export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const status = await deletionStatus(new URL(request.url).searchParams.get('code') || '');
    return Response.json(status || { error: 'Protocolo não encontrado.' }, { status: status ? 200 : 404, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
  } catch {
    return Response.json({ error: 'Consulta temporariamente indisponível.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
