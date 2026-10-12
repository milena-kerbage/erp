import { erpApi } from '@/lib/erp/server';
import { storeAttachment } from '@/lib/erp/files';
import { readUpload } from '@/lib/erp/uploads';
import { erpDb } from '@/lib/erp/core';
export const runtime='nodejs';
export async function POST(request:Request,context:{params:Promise<{id:string}>}) { return erpApi(request,{mutation:true},async actor=>{erpDb(); const upload=await readUpload(request); return storeAttachment((await context.params).id,upload.file.name,upload.file.type,upload.bytes,upload.duration,actor);}); }
