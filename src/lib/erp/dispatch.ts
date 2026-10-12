import 'server-only';
import { after } from 'next/server';
import { enqueueEvent, deliverWebhook } from './webhooks';
/** Durable queue first; HTTPS delivery after the application's response. */
export async function queueApplicationEvent(event:string,entityId:string) {
  try {
    const deliveries=await enqueueEvent(event,entityId);
    if(deliveries.length) after(async()=>{await Promise.allSettled(deliveries.map(id=>deliverWebhook(id)));});
    return true;
  } catch { console.error('Evento salvo no módulo, mas não foi possível registrar sua entrega de webhook.'); return false; }
}
