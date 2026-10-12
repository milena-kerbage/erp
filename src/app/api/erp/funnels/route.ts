import { erpApi,jsonBodyERP } from '@/lib/erp/server';
import { workspaceSnapshot,createFunnel } from '@/lib/erp/core';
export const runtime='nodejs';
export async function GET(request:Request){return erpApi(request,{},async()=>{const data=await workspaceSnapshot();return {funnels:data.funnels,revision:data.revision};});}
export async function POST(request:Request){return erpApi(request,{mutation:true,roles:['admin']},async actor=>createFunnel(await jsonBodyERP(request),actor));}
