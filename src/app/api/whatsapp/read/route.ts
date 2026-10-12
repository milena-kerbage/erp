import { markRead } from '@/lib/whatsapp/core';
import { api, jsonBody } from '@/lib/whatsapp/server';
export const runtime = 'nodejs';
export async function POST(request: Request) { return api(request, async () => markRead((await jsonBody(request)).messageId), true, 60); }
