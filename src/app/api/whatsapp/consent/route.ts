import { setConsent } from '@/lib/whatsapp/core';
import { api, jsonBody } from '@/lib/whatsapp/server';
export const runtime = 'nodejs';
export async function POST(request: Request) { return api(request, async user => ({conversation: await setConsent(await jsonBody(request), user.id)}), true, 30); }
