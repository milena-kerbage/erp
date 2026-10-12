import { managementApi } from '@/lib/integrations/manager';
import { managementEvents } from '@/lib/integrations/management';
export const runtime = 'nodejs';
export async function GET(request: Request) { return managementApi(request, false, () => managementEvents()); }
