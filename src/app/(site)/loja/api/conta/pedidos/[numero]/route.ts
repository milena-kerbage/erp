import { pedidoDaCliente } from "@/lib/loja/contas";
import { erroDaApi, exigirCliente, SEM_CACHE } from "@/loja/lib/contas/servidor";

// GET /api/conta/pedidos/<número>: um pedido da conta (404 se for de outra conta ou não existir).
export const runtime = "nodejs";

export async function GET(request: Request, contexto: { params: Promise<{ numero: string }> }) {
  try {
    const cliente = await exigirCliente(request);
    return Response.json({ pedido: await pedidoDaCliente(cliente.id, (await contexto.params).numero) }, { headers: SEM_CACHE });
  } catch (erro) {
    return erroDaApi(erro);
  }
}
