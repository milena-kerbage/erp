import { managementApi } from '@/lib/integrations/manager';
import { saveChecklist } from '@/lib/integrations/management';
import { jsonBody } from '@/lib/whatsapp/server';
export const runtime = 'nodejs';
export async function PUT(request: Request) { return managementApi(request, true, async user => saveChecklist(await jsonBody(request), user.id)); }
