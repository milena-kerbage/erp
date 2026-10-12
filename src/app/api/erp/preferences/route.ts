import { erpApi,jsonBodyERP } from '@/lib/erp/server';
import { workspaceSnapshot,updatePreferences } from '@/lib/erp/core';
export const runtime='nodejs';
export async function GET(request:Request){return erpApi(request,{},async()=>{const data=await workspaceSnapshot();return {preferences:data.preferences,revision:data.revision};});}
export async function PATCH(request:Request){return erpApi(request,{mutation:true,roles:['admin']},async actor=>updatePreferences(await jsonBodyERP(request),actor));}
