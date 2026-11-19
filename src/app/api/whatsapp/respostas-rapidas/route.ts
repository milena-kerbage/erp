import { deleteQuickReply, quickReplies, saveQuickReply } from '@/lib/whatsapp/core';
import { api, jsonBody } from '@/lib/whatsapp/server';
export const runtime = 'nodejs';
export async function GET(request: Request) { return api(request, async () => ({ replies: await quickReplies() }), false, 120); }
export async function POST(request: Request) { return api(request, async () => ({ replies: await saveQuickReply(await jsonBody(request)) }), true, 60); }
export async function DELETE(request: Request) { return api(request, async () => ({ replies: await deleteQuickReply(new URL(request.url).searchParams.get('id')) }), true, 60); }
