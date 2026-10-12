import { erpApi,jsonBodyERP } from '@/lib/erp/server';
import { reorderFunnels } from '@/lib/erp/core';
export const runtime='nodejs';
export async function POST(request:Request){return erpApi(request,{mutation:true,roles:['admin']},async actor=>reorderFunnels(await jsonBodyERP(request),actor));}
