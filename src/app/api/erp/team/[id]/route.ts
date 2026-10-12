import { erpApi, jsonBodyERP } from '@/lib/erp/server';
import { updateMember } from '@/lib/erp/access';
export const runtime = 'nodejs';
type Context = {params:Promise<{id:string}>};
export async function PATCH(request:Request,context:Context) { return erpApi(request,{mutation:true,roles:['admin']},async user=>({member:await updateMember((await context.params).id,await jsonBodyERP(request),user)})); }
export async function DELETE(request:Request,context:Context) { return erpApi(request,{mutation:true,roles:['admin']},async user=>({member:await updateMember((await context.params).id,{status:'disabled'},user)})); }
