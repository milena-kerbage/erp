import { encerrarSessao, entrarCliente } from "@/lib/loja/contas";
import { chaveEmail, chaveIp, comAvatar, comSessao, conferirOrigem, erroDaApi, exigirGravacao, lerJson, limitar, tokenDaRequisicao } from "@/loja/lib/contas/servidor";

// POST /api/conta/entrar {email, senha}. Mesma resposta para e-mail inexistente e senha errada (401).
// Limites: 5 tentativas por e-mail e 30 por conexão a cada 15 minutos, 300 no total.
export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    conferirOrigem(request);
    exigirGravacao();
    await limitar("global:entrar", 300);
    await limitar(`entrar:${chaveIp(request)}`, 30);
    const corpo = await lerJson(request);
    await limitar(`entrar:${chaveEmail(typeof corpo.email === "string" ? corpo.email : "")}`, 5);
    const { token, ...conta } = await entrarCliente(corpo.email, corpo.senha);
    await encerrarSessao(tokenDaRequisicao(request));
    return comSessao({ ok: true, ...comAvatar(conta) }, token);
  } catch (erro) {
    return erroDaApi(erro);
  }
}
