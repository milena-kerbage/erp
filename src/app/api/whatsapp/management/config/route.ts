import { requireManager } from '@/lib/integrations/manager';
import { sanitizedSettings, saveSettings } from '@/lib/whatsapp/config';
import { limited } from '@/lib/whatsapp/core';
import { errorResponse, jsonBody, noStore } from '@/lib/whatsapp/server';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try { await requireManager(request, false); return Response.json(await sanitizedSettings(), {headers: noStore}); }
  catch (error) { return errorResponse(error); }
}
export async function PUT(request: Request) {
  try {
    const manager = await requireManager(request, true);
    if (await limited(`manager-config:${manager.id}`, 20)) return Response.json({error: 'Muitas alterações. Aguarde um minuto.'}, {status: 429, headers: noStore});
    return Response.json(await saveSettings(await jsonBody(request), manager.id), {headers: noStore});
  } catch (error) { return errorResponse(error); }
}
