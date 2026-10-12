import { erpApi, jsonBodyERP } from '@/lib/erp/server';
import { apiKeys, createApiKey } from '@/lib/erp/access';
export const runtime = 'nodejs';
export async function GET(request:Request) { return erpApi(request,{roles:['admin']},async()=>({apiKeys:await apiKeys()})); }
export async function POST(request:Request) { return erpApi(request,{mutation:true,roles:['admin']},async user=>createApiKey(await jsonBodyERP(request),user)); }
