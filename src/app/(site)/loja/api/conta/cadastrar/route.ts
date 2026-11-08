import { cadastrarCliente } from "@/lib/loja/contas";
import { chaveIp, comAvatar, comSessao, conferirOrigem, erroDaApi, exigirGravacao, lerJson, limitar, tokenDaRequisicao } from "@/loja/lib/contas/servidor";
import { encerrarSessao } from "@/lib/loja/contas";

// POST /api/conta/cadastrar {nome, whatsapp, email, senha, termos: true}: cadastro rápido. Cria a conta,
// a sessão (cookie da loja) e o cupom de 5% OFF na primeira compra. 400 (campos), 409 (e-mail em uso),
// 429 (10 cadastros por hora por conexão), 403 (origem) e 503 (banco ou desenvolvimento sem gravação).
export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    conferirOrigem(request);
    exigirGravacao();
    await limitar("global:cadastrar", 300, 60 * 60 * 1000);
    await limitar(`cadastrar:${chaveIp(request)}`, 10, 60 * 60 * 1000);
    const corpo = await lerJson(request);
    const resultado = await cadastrarCliente(corpo);
    await encerrarSessao(tokenDaRequisicao(request));
    const { token, ...conta } = resultado;
    return comSessao({ ok: true, ...comAvatar(conta) }, token, 201);
  } catch (erro) {
    return erroDaApi(erro);
  }
}
