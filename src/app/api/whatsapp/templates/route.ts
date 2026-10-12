import { listTemplates } from '@/lib/whatsapp/core';
import { api } from '@/lib/whatsapp/server';
export const runtime = 'nodejs';
export async function GET(request: Request) { return api(request, () => listTemplates(), false, 10); }
