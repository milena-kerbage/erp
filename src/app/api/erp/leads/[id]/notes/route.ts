import { erpApi,jsonBodyERP } from '@/lib/erp/server';
import { addNote } from '@/lib/erp/core';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
export async function POST(request:Request,context:Context){return erpApi(request,{mutation:true,allowApiKey:true},async actor=>addNote((await context.params).id,await jsonBodyERP(request),actor));}
