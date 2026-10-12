import { erpApi,requireErpActor,erpErrorResponse,erpNoStore } from '@/lib/erp/server';
import { getAttachment,deleteAttachment } from '@/lib/erp/files';
import { erpDb } from '@/lib/erp/core';
export const runtime='nodejs';
type Context={params:Promise<{id:string;attachmentId:string}>};
export async function GET(request:Request,context:Context) { try { await requireErpActor(request); erpDb(); const params=await context.params,row=await getAttachment(params.id,params.attachmentId); return new Response(Buffer.from(row.content),{headers:{...erpNoStore,'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(row.name)}`}}); } catch(error) {return erpErrorResponse(error);} }
export async function DELETE(request:Request,context:Context) {return erpApi(request,{mutation:true},async actor=>{erpDb(); const params=await context.params;return deleteAttachment(params.id,params.attachmentId,actor);});}
