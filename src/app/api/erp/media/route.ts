import {erpApi,jsonBodyERP} from '@/lib/erp/server';
import {mediaList,createMediaUpload} from '@/lib/storage/media';
export const runtime='nodejs';
export async function GET(request:Request){return erpApi(request,{roles:['admin','manager']},()=>mediaList(Number(new URL(request.url).searchParams.get('offset')??0)));}
export async function POST(request:Request){return erpApi(request,{roles:['admin','manager'],mutation:true},async actor=>createMediaUpload(await jsonBodyERP(request),actor));}
