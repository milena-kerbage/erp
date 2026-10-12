import { erpApi,jsonBodyERP } from '@/lib/erp/server';
import { updateFunnel,deleteFunnel,getFunnel } from '@/lib/erp/core';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,context:Context){return erpApi(request,{},async()=>getFunnel((await context.params).id));}
export async function PATCH(request:Request,context:Context){return erpApi(request,{mutation:true,roles:['admin']},async actor=>updateFunnel((await context.params).id,await jsonBodyERP(request),actor));}
export async function DELETE(request:Request,context:Context){return erpApi(request,{mutation:true,roles:['admin']},async actor=>deleteFunnel((await context.params).id,Number(new URL(request.url).searchParams.get('revision')),actor));}
