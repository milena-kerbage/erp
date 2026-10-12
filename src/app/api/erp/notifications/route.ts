import { erpApi,jsonBodyERP } from '@/lib/erp/server';
import { notifications,updateNotifications } from '@/lib/erp/notifications';
export const runtime='nodejs';
export async function GET(request:Request){return erpApi(request,{},notifications);}
export async function PATCH(request:Request){return erpApi(request,{mutation:true},async actor=>updateNotifications(await jsonBodyERP(request),actor));}
