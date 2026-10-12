import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { requireErpActor,erpErrorResponse,erpNoStore,ApiError } from '@/lib/erp/server';
export const runtime='nodejs';
export async function GET(request:Request){try{await requireErpActor(request);const document=new URL(request.url).searchParams.get('document') || 'technical';if(!['technical','operation'].includes(document)) throw new ApiError(400,'Documento inválido.','INVALID_DOCUMENT');const contents=document==='technical'?await readFile(path.join(process.cwd(),'docs','erp-backend.md'),'utf8'):await readFile(path.join(process.cwd(),'docs','erp-operacao.md'),'utf8');return new Response(contents,{headers:{...erpNoStore,'Content-Type':'text/markdown; charset=utf-8','Content-Disposition':`attachment; filename="${document==='technical'?'erp-backend.md':'erp-operacao.md'}"`}});}catch(error){return erpErrorResponse(error);}}
