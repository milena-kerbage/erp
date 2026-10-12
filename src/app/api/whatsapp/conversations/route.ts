import { conversations } from '@/lib/whatsapp/core';
import { api, boundedQuery } from '@/lib/whatsapp/server';
export const runtime = 'nodejs';
export async function GET(request: Request) { return api(request, async () => { const url = new URL(request.url); return {conversations: await conversations(boundedQuery(url, 'limit', 100, 100), boundedQuery(url, 'offset', 0, 100_000))}; }); }
