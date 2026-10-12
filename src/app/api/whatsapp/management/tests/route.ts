import { managementApi } from '@/lib/integrations/manager';
import { runManagementTest } from '@/lib/integrations/management';
import { jsonBody } from '@/lib/whatsapp/server';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) { return managementApi(request, true, async user => runManagementTest((await jsonBody(request)).test, user.id, new URL(request.url).origin)); }
