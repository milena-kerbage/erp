import { dadosDaConta } from "@/lib/loja/contas";
import { clienteDaRequisicao, comAvatar, cookieDicaSessao, erroDaApi, gravacaoPermitida, SEM_CACHE } from "@/loja/lib/contas/servidor";

// GET /api/conta/eu: a conta da sessão atual ({cliente, cupom}) ou {cliente: null}. Sem cache.
// `gravacao: false` avisa a loja quando as contas não gravam (desenvolvimento ligado ao banco remoto).
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const cliente = await clienteDaRequisicao(request);
    const gravacao = gravacaoPermitida();
    // A dica acompanha a sessão real: some quando a sessão expirou, volta para quem entrou antes dela existir.
    const headers = new Headers(SEM_CACHE);
    headers.append("Set-Cookie", cookieDicaSessao(Boolean(cliente)));
    if (!cliente) return Response.json({ cliente: null, cupom: null, gravacao }, { headers });
    return Response.json({ ...comAvatar(await dadosDaConta(cliente.id)), gravacao }, { headers });
  } catch (erro) {
    return erroDaApi(erro);
  }
}
