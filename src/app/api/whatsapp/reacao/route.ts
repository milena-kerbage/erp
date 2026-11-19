import { sendReaction } from '@/lib/whatsapp/core';
import { api, jsonBody } from '@/lib/whatsapp/server';
export const runtime = 'nodejs';
export async function POST(request: Request) { return api(request, async () => { const corpo = await jsonBody(request); return sendReaction(corpo.phone, corpo.messageId, corpo.emoji); }, true, 60); }
