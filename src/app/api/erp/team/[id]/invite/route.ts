import { erpApi } from '@/lib/erp/server';
import { reissueInvitation } from '@/lib/erp/access';
export const runtime='nodejs';
export async function POST(request:Request,context:{params:Promise<{id:string}>}) {return erpApi(request,{mutation:true,roles:['admin']},async actor=>reissueInvitation((await context.params).id,actor,process.env.AUTH_ORIGIN || new URL(request.url).origin));}
