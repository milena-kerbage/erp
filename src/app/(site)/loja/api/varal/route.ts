import { jogarVaral, varalPublico } from "@/lib/loja/varal";
import { chaveEmail, chaveIp, conferirOrigem, erroDaApi, lerJson, limitar, SEM_CACHE } from "@/loja/lib/contas/servidor";
import { normalizarTelefoneVaral } from "@/loja/lib/varal/regras";

// Varal de roupinhas (minigame de cupom).
// GET  → {ativo, condicoes}: se o jogo está no ar e as condições do cupom. Nunca os prêmios nem as chances.
// POST {telefone, peca, consentimento} → {resultado}: o sorteio acontece aqui, no servidor; quem já jogou com o
// mesmo telefone recebe o mesmo cupom de antes.
export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json(await varalPublico(), { headers: SEM_CACHE });
  } catch (erro) {
    return erroDaApi(erro);
  }
}

export async function POST(request: Request) {
  try {
    conferirOrigem(request);
    // Poucas jogadas por aparelho e por telefone: o jogo é de um clique, não precisa de mais.
    await limitar(`varal:${chaveIp(request)}`, 8, 60 * 60 * 1000);
    const corpo = await lerJson(request, 2048);
    const telefone = normalizarTelefoneVaral(corpo.telefone);
    if (telefone) await limitar(`varal:${chaveEmail(`tel:${telefone}`)}`, 12, 60 * 60 * 1000);
    const resultado = await jogarVaral({ telefone: corpo.telefone, peca: corpo.peca, consentimento: corpo.consentimento });
    return Response.json({ ok: true, resultado }, { status: resultado.jaJogou ? 200 : 201, headers: SEM_CACHE });
  } catch (erro) {
    return erroDaApi(erro);
  }
}
