import { api } from '@/lib/whatsapp/server';
import { errorResponse, jsonBody, noStore } from '@/lib/whatsapp/server';
import { leadDoTelefone, salvarNaFicha } from '@/lib/whatsapp/ficha';
import { requireErpActor } from '@/lib/erp/server';
export const runtime = 'nodejs';
export const maxDuration = 60;
// A ficha lateral da conversa: qual oportunidade do CRM tem este telefone; e "Salvar na ficha" (a mídia vira arquivo dela).
export async function GET(request: Request) { return api(request, async () => ({ lead: await leadDoTelefone(new URL(request.url).searchParams.get('phone')) }), false, 300); }
export async function POST(request: Request) {
  try {
    const actor = await requireErpActor(request, { mutation: true });
    const corpo = await jsonBody(request);
    return Response.json({ attachment: await salvarNaFicha(corpo.messageId, corpo.leadId, actor) }, { headers: noStore });
  } catch (error) {
    if (error instanceof Error && 'status' in error && typeof error.status === 'number' && error.status >= 400 && error.status < 500) return Response.json({ error: error.message }, { status: error.status, headers: noStore });
    return errorResponse(error);
  }
}
