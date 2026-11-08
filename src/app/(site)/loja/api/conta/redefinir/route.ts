import { digest } from "@/lib/auth/core";
import { redefinirSenha } from "@/lib/loja/contas";
import { chaveIp, comAvatar, comSessao, conferirOrigem, erroDaApi, exigirGravacao, lerJson, limitar } from "@/loja/lib/contas/servidor";

// POST /api/conta/redefinir {token, nova}: nova senha com o link gerado pela equipe no ERP (enviado
// pela vendedora no WhatsApp). Uso único, 2 horas; encerra as outras sessões e já entra na conta.
export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    conferirOrigem(request);
    exigirGravacao();
    await limitar(`redefinir:${chaveIp(request)}`, 10);
    const corpo = await lerJson(request);
    await limitar(`redefinir:token:${digest(typeof corpo.token === "string" ? corpo.token : "")}`, 5);
    const { token, ...conta } = await redefinirSenha(corpo.token, corpo.nova);
    return comSessao({ ok: true, ...comAvatar(conta) }, token);
  } catch (erro) {
    return erroDaApi(erro);
  }
}
