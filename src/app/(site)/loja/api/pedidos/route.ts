import { criarPedido } from "@/lib/loja/contas";
import { catalogoDaSacola } from "@/lib/loja/catalogo";
import { linkWhatsApp } from "@/loja/lib/checkout/pedido";
import { chaveIp, conferirOrigem, erroDaApi, exigirCliente, exigirGravacao, lerJson, limitar, SEM_CACHE } from "@/loja/lib/contas/servidor";
import { EMPRESA } from "@/loja/lib/empresa";

// POST /api/pedidos {itens, cupom?, local?, retirar?, observacoes?}: cria o pedido da cliente logada.
// Os itens chegam como na sacola (produto, opção e quantidade, sem preço); os valores "a partir de" são
// recalculados aqui pelo catálogo do servidor. O cupom é conferido aqui e o de primeira compra é
// consumido junto com o pedido. Devolve o número, a mensagem e o link do WhatsApp (wa.me).
export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    conferirOrigem(request);
    exigirGravacao();
    const cliente = await exigirCliente(request);
    await limitar(`pedido:${cliente.id}`, 10, 60 * 60 * 1000);
    await limitar(`pedido:${chaveIp(request)}`, 30, 60 * 60 * 1000);
    const corpo = await lerJson(request, 64 * 1024);
    // Preços, opções e acréscimos do catálogo do servidor (cadastro do ERP ou o de exemplo).
    const catalogo = new Map((await catalogoDaSacola()).map((produto) => [produto.slug, produto]));
    const { pedido } = await criarPedido(cliente.id, corpo, { catalogo });
    return Response.json({ ok: true, pedido, link: linkWhatsApp(EMPRESA.whatsapp.numero, pedido.mensagem) }, { status: 201, headers: SEM_CACHE });
  } catch (erro) {
    return erroDaApi(erro);
  }
}
