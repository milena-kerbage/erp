import { erpApi,jsonBodyERP } from '@/lib/erp/server';
import { webhooks,createWebhook } from '@/lib/erp/webhooks';
export const runtime='nodejs';
export async function GET(request:Request) {return erpApi(request,{roles:['admin']},async()=>({webhooks:await webhooks()}));}
export async function POST(request:Request) {return erpApi(request,{mutation:true,roles:['admin']},async actor=>createWebhook(await jsonBodyERP(request),actor));}
