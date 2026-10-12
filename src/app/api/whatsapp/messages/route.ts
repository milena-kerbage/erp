import { messagesFor, sendMessage } from '@/lib/whatsapp/core';
import { api, jsonBody, boundedQuery } from '@/lib/whatsapp/server';
import { queueApplicationEvent } from '@/lib/erp/dispatch';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(request: Request) { return api(request, () => { const url = new URL(request.url); return messagesFor(url.searchParams.get('phone'), url.searchParams.get('before') || undefined, boundedQuery(url, 'limit', 100, 100)); }); }
export async function POST(request: Request) { return api(request, async () => {const result=await sendMessage(await jsonBody(request));if(!result.duplicate) await queueApplicationEvent('message.sent',result.message.id);return result;}, true, 30); }
