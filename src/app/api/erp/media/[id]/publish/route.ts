import {erpApi} from '@/lib/erp/server';
import {finalizeMedia} from '@/lib/storage/media';
export const runtime='nodejs';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return erpApi(request,{roles:['admin','manager'],mutation:true},async actor=>finalizeMedia((await params).id,actor));}
