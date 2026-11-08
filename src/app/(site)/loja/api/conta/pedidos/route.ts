import { dadosDaConta, pedidosDaCliente } from "@/lib/loja/contas";
import { erroDaApi, exigirCliente, SEM_CACHE } from "@/loja/lib/contas/servidor";

// GET /api/conta/pedidos: os pedidos da conta (do servidor), do mais novo ao mais antigo, e o cupom.
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const cliente = await exigirCliente(request);
    const [pedidos, conta] = await Promise.all([pedidosDaCliente(cliente.id), dadosDaConta(cliente.id)]);
    return Response.json({ pedidos, cupom: conta.cupom }, { headers: SEM_CACHE });
  } catch (erro) {
    return erroDaApi(erro);
  }
}
