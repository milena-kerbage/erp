import { erpApi } from '@/lib/erp/server';
import { reports,reportPeriodFromURL } from '@/lib/erp/core';
export const runtime='nodejs';
export async function GET(request:Request){return erpApi(request,{roles:['admin','manager'],allowApiKey:true},async()=>reports(reportPeriodFromURL(new URL(request.url))));}
