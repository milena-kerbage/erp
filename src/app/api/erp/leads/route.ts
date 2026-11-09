import {crmPage,crmQuery,leadOptions} from '@/lib/erp/crm';
import { erpApi,jsonBodyERP } from '@/lib/erp/server';
import { leadsSnapshot,createLead,jsonObject,archiveFilterFromURL,pageFromURL } from '@/lib/erp/core';
import { resolveOwner } from '@/lib/erp/access';
export const runtime='nodejs';
export async function GET(request:Request){return erpApi(request,{allowApiKey:true},async()=>{const url=new URL(request.url);return url.searchParams.get('options')==='1'?leadOptions():url.searchParams.get('summary')==='1' ? crmPage(crmQuery(url),Number(url.searchParams.get('limit')||50),Number(url.searchParams.get('offset')||0),{cursor:url.searchParams.get('cursor')??undefined,totals:url.searchParams.get('totals')!=='0'}) : leadsSnapshot(archiveFilterFromURL(url),pageFromURL(url));});}
export async function POST(request:Request){return erpApi(request,{mutation:true,allowApiKey:true},async actor=>{const input=await jsonBodyERP(request);if(input.details!==undefined){const details=jsonObject(input.details);if(details.owner!==undefined){const owner=jsonObject(details.owner);details.owner=await resolveOwner(String(owner.seed??''));}}return createLead(input,actor);});}
