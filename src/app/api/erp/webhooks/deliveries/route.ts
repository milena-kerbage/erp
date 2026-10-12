import { erpApi,jsonBodyERP,ApiError } from '@/lib/erp/server';
import { pendingDeliveries,deliverWebhook } from '@/lib/erp/webhooks';
export const runtime='nodejs';
export const maxDuration=30;
export async function GET(request:Request) {return erpApi(request,{roles:['admin']},async()=>({deliveries:await pendingDeliveries()}));}
export async function POST(request:Request) {return erpApi(request,{mutation:true,roles:['admin']},async()=>{const body=await jsonBodyERP(request);if(body.confirmation!=='REENVIAR' || typeof body.id!=='string') throw new ApiError(400,'Confirme REENVIAR e informe o identificador da entrega.','CONFIRMATION_REQUIRED');return deliverWebhook(body.id);});}
