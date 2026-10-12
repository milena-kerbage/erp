import { erpApi,jsonBodyERP } from '@/lib/erp/server';
import { updateRecord,archiveRecord,getRecord,archiveFilterFromURL } from '@/lib/erp/core';
export const runtime='nodejs';
type Context={params:Promise<{resource:string;id:string}>};
export async function GET(request:Request,context:Context){const {resource,id}=await context.params;return erpApi(request,{allowApiKey:true,...(resource==='financeiro'?{roles:['admin','manager'] as ('admin'|'manager')[]}: {})},async()=>getRecord(resource,id,archiveFilterFromURL(new URL(request.url))!==false));}
export async function PATCH(request:Request,context:Context){const {resource,id}=await context.params;return erpApi(request,{mutation:true,allowApiKey:true,...(resource==='financeiro'?{roles:['admin','manager'] as ('admin'|'manager')[]}: {})},async actor=>updateRecord(resource,id,await jsonBodyERP(request),actor));}
export async function DELETE(request:Request,context:Context){const {resource,id}=await context.params;return erpApi(request,{mutation:true,allowApiKey:true,...(resource==='financeiro'?{roles:['admin','manager'] as ('admin'|'manager')[]}: {})},async actor=>archiveRecord(resource,id,Number(new URL(request.url).searchParams.get('revision')),actor));}
