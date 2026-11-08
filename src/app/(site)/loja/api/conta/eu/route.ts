import { dadosDaConta } from "@/lib/loja/contas";
import { clienteDaRequisicao, comAvatar, erroDaApi, gravacaoPermitida, SEM_CACHE } from "@/loja/lib/contas/servidor";

// GET /api/conta/eu: a conta da sessão atual ({cliente, cupom}) ou {cliente: null}. Sem cache.
// `gravacao: false` avisa a loja quando as contas não gravam (desenvolvimento ligado ao banco remoto).
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const cliente = await clienteDaRequisicao(request);
    const gravacao = gravacaoPermitida();
    if (!cliente) return Response.json({ cliente: null, cupom: null, gravacao }, { headers: SEM_CACHE });
    return Response.json({ ...comAvatar(await dadosDaConta(cliente.id)), gravacao }, { headers: SEM_CACHE });
  } catch (erro) {
    return erroDaApi(erro);
  }
}
