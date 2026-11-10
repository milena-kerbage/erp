import {erpApi} from '@/lib/erp/server';
import {deleteMedia} from '@/lib/storage/media';
export const runtime='nodejs';
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){return erpApi(request,{roles:['admin','manager'],mutation:true},async actor=>deleteMedia((await params).id,actor));}
