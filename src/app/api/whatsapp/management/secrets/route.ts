import { requireManager } from '@/lib/integrations/manager';
import { generateSecret } from '@/lib/whatsapp/config';
import { limited } from '@/lib/whatsapp/core';
import { errorResponse, jsonBody, noStore } from '@/lib/whatsapp/server';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const manager = await requireManager(request, true);
    if (await limited(`manager-secrets:${manager.id}`, 5)) return Response.json({error: 'Muitas gerações de tokens. Aguarde um minuto.'}, {status: 429, headers: noStore});
    return Response.json(await generateSecret((await jsonBody(request)).kind, manager.id), {headers: noStore});
  } catch (error) { return errorResponse(error); }
}
