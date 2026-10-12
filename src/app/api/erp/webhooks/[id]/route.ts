import { erpApi,jsonBodyERP } from '@/lib/erp/server';
import { updateWebhook,removeWebhook } from '@/lib/erp/webhooks';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
export async function PATCH(request:Request,context:Context) {return erpApi(request,{mutation:true,roles:['admin']},async()=>updateWebhook((await context.params).id,await jsonBodyERP(request)));}
export async function DELETE(request:Request,context:Context) {return erpApi(request,{mutation:true,roles:['admin']},async()=>removeWebhook((await context.params).id));}
