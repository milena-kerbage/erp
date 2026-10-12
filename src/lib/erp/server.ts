import 'server-only';
import { getSession } from '../auth/server';
import { trustedOrigin, HttpError } from '../auth/http';
import { limited } from '../auth/core';
import { DatabaseConfigurationError, DatabaseOperationError } from '../database';
import { currentMember, authenticateApiKey, ApiError, type Actor, type Permission } from './access.ts';
import { readBytes } from '../whatsapp/core';
import { queueApplicationEvent } from './dispatch';
export { ApiError } from './access.ts';
export const erpNoStore = {'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
export function erpErrorResponse(error: unknown) {
  if (error instanceof ApiError || error instanceof HttpError || error instanceof DatabaseConfigurationError || error instanceof DatabaseOperationError) return Response.json({error:error.message,...('code' in error?{code:error.code}:{})},{status:error.status,headers:erpNoStore});
  if (error instanceof Error && 'status' in error && typeof error.status==='number' && error.status>=400 && error.status<500) return Response.json({error:error.message,...('code' in error?{code:error.code}:{})},{status:error.status,headers:erpNoStore});
  return Response.json({error:'A operação não pôde ser concluída. Confira os dados e a configuração do banco.',code:'ERP_UNAVAILABLE'},{status:500,headers:erpNoStore});
}
export async function requireErpActor(request: Request, options: {mutation?:boolean;roles?:Permission[];allowApiKey?:boolean} = {}): Promise<Actor> {
  const authorization=request.headers.get('authorization');
  let actor: Actor;
  if (authorization) {
    if (!options.allowApiKey || !authorization.startsWith('Bearer ')) throw new ApiError(401,'Este recurso exige uma sessão da equipe.','SESSION_REQUIRED');
    actor=await authenticateApiKey(authorization.slice(7),Boolean(options.mutation));
  } else {
    const session=await getSession(Boolean(options.mutation));
    if (!session) throw new ApiError(401,'Entre no sistema para continuar.','UNAUTHORIZED');
    const member=await currentMember(session);
    actor={id:member.id,name:member.name,email:member.email,permission:member.permission as Permission,authMode:'session'};
    if (options.mutation) trustedOrigin(request);
  }
  if (options.roles && !options.roles.includes(actor.permission)) throw new ApiError(403,'Seu perfil não permite esta operação.','FORBIDDEN');
  if (await limited(`erp:${actor.id}:${new URL(request.url).pathname}`,options.mutation?60:180,60000)) throw new ApiError(429,'Muitas solicitações. Aguarde um minuto.','RATE_LIMITED');
  return actor;
}
export async function erpApi(request: Request, options: {mutation?:boolean;roles?:Permission[];allowApiKey?:boolean}, action:(actor:Actor)=>Promise<unknown>) {
  try {
    const result=await action(await requireErpActor(request,options));
    const path=new URL(request.url).pathname;
    if (options.mutation && result && typeof result==='object' && /^\/api\/erp\/leads(?:\/[^/]+)?$/.test(path)) {
      const data=result as {lead?:{id:string};changed?:{stage:boolean;conversationResolved:boolean}};
      if (data.lead?.id) {
        if(request.method==='POST') await queueApplicationEvent('lead.created',data.lead.id);
        if(request.method==='PATCH' && data.changed?.stage) await queueApplicationEvent('lead.stage_changed',data.lead.id);
        if(request.method==='PATCH' && data.changed?.conversationResolved) await queueApplicationEvent('conversation.resolved',data.lead.id);
      }
    }
    return Response.json(result,{headers:erpNoStore});
  } catch(error) { return erpErrorResponse(error); }
}
export async function jsonBodyERP(request: Request, maximum=64*1024): Promise<Record<string, unknown>> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) throw new ApiError(415,'Use application/json.','INVALID_CONTENT_TYPE');
  let data: unknown;
  try { data=JSON.parse((await readBytes(request,maximum)).toString('utf8')); } catch(error) { if (error instanceof Error && 'status' in error) throw error; throw new ApiError(400,'JSON inválido.','INVALID_JSON'); }
  if (!data || typeof data!=='object' || Array.isArray(data)) throw new ApiError(400,'Informe um objeto JSON.','INVALID_JSON');
  return data as Record<string, unknown>;
}
