import { erpApi } from '@/lib/erp/server';
import { workspaceSnapshot } from '@/lib/erp/core';
import { listTeam } from '@/lib/erp/access';
export const runtime='nodejs';
export async function GET(request: Request) { return erpApi(request,{},async actor=>({...await workspaceSnapshot(),...await listTeam(actor)})); }
