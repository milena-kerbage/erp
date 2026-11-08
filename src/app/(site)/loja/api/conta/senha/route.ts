import { trocarSenha } from "@/lib/loja/contas";
import { chaveIp, comSessao, conferirOrigem, erroDaApi, exigirCliente, exigirGravacao, lerJson, limitar } from "@/loja/lib/contas/servidor";

// POST /api/conta/senha {atual, nova}: troca a senha, encerra as sessões dos outros aparelhos e renova a deste.
export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    conferirOrigem(request);
    exigirGravacao();
    const cliente = await exigirCliente(request);
    await limitar(`senha:${cliente.id}`, 5);
    await limitar(`senha:${chaveIp(request)}`, 20);
    const corpo = await lerJson(request);
    const token = await trocarSenha(cliente.id, corpo.atual, corpo.nova);
    return comSessao({ ok: true }, token);
  } catch (erro) {
    return erroDaApi(erro);
  }
}
