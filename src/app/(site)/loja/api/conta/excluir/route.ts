import { excluirConta } from "@/lib/loja/contas";
import { comSessao, conferirOrigem, erroDaApi, exigirCliente, exigirGravacao, lerJson, limitar } from "@/loja/lib/contas/servidor";

// POST /api/conta/excluir {senha, confirmacao: "EXCLUIR"}: exclusão da conta a pedido da cliente (LGPD).
// Apaga a conta, as sessões e o cupom e anonimiza os pedidos. Pede a senha de novo.
export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    conferirOrigem(request);
    exigirGravacao();
    const cliente = await exigirCliente(request);
    await limitar(`excluir:${cliente.id}`, 5);
    const corpo = await lerJson(request);
    if (corpo.confirmacao !== "EXCLUIR") return comSessao({ erro: { codigo: "CONFIRMACAO", mensagem: "Confirme a exclusão." } }, undefined, 400);
    await excluirConta(cliente.id, corpo.senha);
    return comSessao({ ok: true }, null);
  } catch (erro) {
    return erroDaApi(erro);
  }
}
