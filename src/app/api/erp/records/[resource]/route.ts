import { erpApi,jsonBodyERP } from '@/lib/erp/server';
import { listRecords,createRecord,archiveFilterFromURL,pageFromURL } from '@/lib/erp/core';
export const runtime='nodejs';
type Context={params:Promise<{resource:string}>};
export async function GET(request:Request,context:Context){const {resource}=await context.params;return erpApi(request,{allowApiKey:true,...(resource==='financeiro'?{roles:['admin','manager'] as ('admin'|'manager')[]}: {})},async()=>{const url=new URL(request.url);return listRecords(resource,archiveFilterFromURL(url),pageFromURL(url));});}
export async function POST(request:Request,context:Context){const {resource}=await context.params;return erpApi(request,{mutation:true,allowApiKey:true,...(resource==='financeiro'?{roles:['admin','manager'] as ('admin'|'manager')[]}: {})},async actor=>createRecord(resource,await jsonBodyERP(request),actor));}
