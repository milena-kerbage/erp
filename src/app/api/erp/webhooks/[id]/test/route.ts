import { erpApi,jsonBodyERP,ApiError } from '@/lib/erp/server';
import { testWebhook } from '@/lib/erp/webhooks';
export const runtime='nodejs';
export const maxDuration=30;
export async function POST(request:Request,context:{params:Promise<{id:string}>}) {return erpApi(request,{mutation:true,roles:['admin']},async()=>{if((await jsonBodyERP(request)).confirmation!=='TESTAR') throw new ApiError(400,'Confirme TESTAR para enviar um evento real ao endpoint.','CONFIRMATION_REQUIRED');return testWebhook((await context.params).id);});}
