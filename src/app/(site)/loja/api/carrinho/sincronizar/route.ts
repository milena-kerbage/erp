import { catalogoDaSacola } from "@/lib/loja/catalogo";
import { sincronizarCarrinho } from "@/lib/loja/gestao/carrinhos";
import { conferirOrigem, erroDaApi, exigirCliente, exigirGravacao, lerJson, limitar, SEM_CACHE } from "@/loja/lib/contas/servidor";

// PUT /api/carrinho/sincronizar {itens}: cópia da sacola da cliente LOGADA (os itens como na sacola:
// produto, opção e quantidade; o preço "a partir de" é do catálogo do servidor). Sem mudança nos itens,
// nada é gravado. Base dos carrinhos abandonados do ERP. Sem sessão: 401 (a sacola local segue igual).
export const runtime = "nodejs";

export async function PUT(request: Request) {
  try {
    conferirOrigem(request);
    exigirGravacao();
    const cliente = await exigirCliente(request);
    await limitar(`carrinho:${cliente.id}`, 300, 60 * 60 * 1000);
    const corpo = await lerJson(request, 64 * 1024);
    const catalogo = new Map((await catalogoDaSacola()).map((produto) => [produto.slug, produto]));
    return Response.json(await sincronizarCarrinho(cliente.id, corpo, catalogo), { headers: SEM_CACHE });
  } catch (erro) {
    return erroDaApi(erro);
  }
}
