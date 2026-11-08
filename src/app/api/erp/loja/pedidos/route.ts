import { erpApi } from '@/lib/erp/server';
import { listarPedidosLoja } from '@/lib/loja/contas';
export const runtime='nodejs';
// Pedidos feitos no site da loja (seguem pelo WhatsApp): ?status=todos|enviado_whatsapp|pagamento_confirmado|despachado|entregue|cancelado&busca&limit&offset.
export async function GET(request:Request){return erpApi(request,{roles:['admin','manager']},async()=>listarPedidosLoja(new URL(request.url)));}
