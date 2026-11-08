import { encerrarSessao } from "@/lib/loja/contas";
import { comSessao, conferirOrigem, erroDaApi, tokenDaRequisicao } from "@/loja/lib/contas/servidor";

// POST /api/conta/sair: revoga a sessão no banco e apaga o cookie (copiar o cookie antigo não reabre).
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    conferirOrigem(request);
    await encerrarSessao(tokenDaRequisicao(request));
    return comSessao({ ok: true }, null);
  } catch (erro) {
    return erroDaApi(erro);
  }
}
