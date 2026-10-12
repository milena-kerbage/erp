import { erpApi,jsonBodyERP } from '@/lib/erp/server';
import { updateLead,archiveLead,jsonObject,getLead,archiveFilterFromURL } from '@/lib/erp/core';
import { resolveOwner } from '@/lib/erp/access';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,context:Context){return erpApi(request,{allowApiKey:true},async()=>getLead((await context.params).id,archiveFilterFromURL(new URL(request.url))!==false));}
export async function PATCH(request:Request,context:Context){return erpApi(request,{mutation:true,allowApiKey:true},async actor=>{const input=await jsonBodyERP(request);if(input.details!==undefined){const details=jsonObject(input.details);if(details.owner!==undefined){const owner=jsonObject(details.owner);details.owner=await resolveOwner(String(owner.seed??''));}}return updateLead((await context.params).id,input,actor);});}
export async function DELETE(request:Request,context:Context){return erpApi(request,{mutation:true,allowApiKey:true},async actor=>archiveLead((await context.params).id,Number(new URL(request.url).searchParams.get('revision')),actor));}
