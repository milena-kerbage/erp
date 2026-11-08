import { atualizarPerfil } from "@/lib/loja/contas";
import { comAvatar, conferirOrigem, erroDaApi, exigirCliente, exigirGravacao, lerJson, limitar, SEM_CACHE } from "@/loja/lib/contas/servidor";

// PATCH /api/conta/perfil {revisao, nome?, whatsapp?, cpf?, cep?, endereco?, cidade?, uf?, bebeNome?,
// bebeData?, bebeDataTipo?, comoConheceu?, preferencias?}: dados opcionais (vazio apaga). 409 se a
// versão mudou em outro aparelho.
export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    conferirOrigem(request);
    exigirGravacao();
    const cliente = await exigirCliente(request);
    await limitar(`perfil:${cliente.id}`, 30);
    return Response.json(comAvatar(await atualizarPerfil(cliente.id, await lerJson(request))), { headers: SEM_CACHE });
  } catch (erro) {
    return erroDaApi(erro);
  }
}
