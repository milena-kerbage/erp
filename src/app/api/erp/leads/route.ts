import { erpApi,jsonBodyERP } from '@/lib/erp/server';
import { leadsSnapshot,createLead,jsonObject,archiveFilterFromURL,pageFromURL } from '@/lib/erp/core';
import { resolveOwner } from '@/lib/erp/access';
export const runtime='nodejs';
export async function GET(request:Request){return erpApi(request,{allowApiKey:true},async()=>{const url=new URL(request.url);return leadsSnapshot(archiveFilterFromURL(url),pageFromURL(url));});}
export async function POST(request:Request){return erpApi(request,{mutation:true,allowApiKey:true},async actor=>{const input=await jsonBodyERP(request);if(input.details!==undefined){const details=jsonObject(input.details);if(details.owner!==undefined){const owner=jsonObject(details.owner);details.owner=await resolveOwner(String(owner.seed??''));}}return createLead(input,actor);});}
