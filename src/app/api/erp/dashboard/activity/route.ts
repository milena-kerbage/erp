import {erpApi} from '@/lib/erp/server';
import {dashboardActivity} from '@/lib/erp/dashboard';
export const runtime='nodejs';
export async function GET(request:Request){return erpApi(request,{},dashboardActivity);}
