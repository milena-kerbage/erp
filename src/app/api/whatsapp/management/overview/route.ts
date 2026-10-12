import { managementApi } from '@/lib/integrations/manager';
import { managementOverview } from '@/lib/integrations/management';
export const runtime = 'nodejs';
export async function GET(request: Request) { return managementApi(request, false, user => managementOverview(new URL(request.url).origin, user.development)); }
