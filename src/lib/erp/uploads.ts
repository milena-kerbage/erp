import 'server-only';
import { readBytes } from '../whatsapp/core';
import { ApiError } from './access';
import { MAX_FILE_BYTES } from './files';
export async function readUpload(request:Request) {
  const type=request.headers.get('content-type') || '';
  if (!/^multipart\/form-data;/i.test(type)) throw new ApiError(415,'Envie multipart/form-data com o campo file.','INVALID_CONTENT_TYPE');
  const raw=await readBytes(request,MAX_FILE_BYTES+64*1024);
  let form:FormData;
  try { form=await new Request('http://localhost/upload',{method:'POST',headers:{'content-type':type},body:raw}).formData(); } catch { throw new ApiError(400,'Envio de arquivo inválido.','INVALID_UPLOAD'); }
  const file=form.get('file');
  if (!(file instanceof File)) throw new ApiError(400,'Selecione um arquivo no campo file.','INVALID_UPLOAD');
  return {file,bytes:Buffer.from(await file.arrayBuffer()),duration:form.get('duration')!==null?Number(form.get('duration')):undefined};
}
