import {requestedImageFormat} from '@/lib/storage/images';
import { requireErpActor,erpApi,erpErrorResponse,erpNoStore } from '@/lib/erp/server';
import { storePhoto,getPhoto,deletePhoto } from '@/lib/erp/files';
import { readUpload } from '@/lib/erp/uploads';
export const runtime='nodejs';
export async function GET(request:Request) { try { const actor=await requireErpActor(request); const row=await getPhoto(new URL(request.url).searchParams.get('userId') || actor.id,requestedImageFormat(request)); return new Response(Buffer.from(row.content),{headers:{Vary:"Accept",...erpNoStore,'Content-Type':row.mime_type,'Content-Disposition':'inline; filename="foto"'}}); } catch(error) { return erpErrorResponse(error); } }
export async function POST(request:Request) { return erpApi(request,{mutation:true},async actor=>storePhoto((await readUpload(request)).bytes,actor)); }
export async function DELETE(request:Request) { return erpApi(request,{mutation:true},deletePhoto); }
