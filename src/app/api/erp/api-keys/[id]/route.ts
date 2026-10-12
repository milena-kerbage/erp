import { erpApi } from '@/lib/erp/server';
import { revokeApiKey } from '@/lib/erp/access';
export const runtime = 'nodejs';
export async function DELETE(request:Request,context:{params:Promise<{id:string}>}) { return erpApi(request,{mutation:true,roles:['admin']},async actor=>revokeApiKey((await context.params).id,actor.id)); }
