import {erpApi} from '@/lib/erp/server';
import {dashboardSummary} from '@/lib/erp/dashboard';
export const runtime='nodejs';
export async function GET(request:Request){return erpApi(request,{},()=>dashboardSummary(Date.now(),Number(new URL(request.url).searchParams.get('offset')??180)));}
