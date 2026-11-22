import { jogarVaral, varalPublico } from "@/lib/loja/varal";
import { chaveEmail, chaveIp, conferirOrigem, erroDaApi, lerJson, limitar, SEM_CACHE } from "@/loja/lib/contas/servidor";
import { normalizarEmailVaral } from "@/loja/lib/varal/regras";

// Varal de roupinhas (minigame de cupom).
// GET  → {ativo, condicoes}: se o jogo está no ar e as condições do cupom. Nunca os prêmios nem as chances.
// POST {email, peca, consentimento} → {resultado}: o sorteio acontece aqui, no servidor; quem já jogou com o
// mesmo e-mail recebe o mesmo cupom de antes.
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
    // Poucas jogadas por aparelho e por e-mail: o jogo é de um clique, não precisa de mais.
    await limitar(`varal:${chaveIp(request)}`, 8, 60 * 60 * 1000);
    const corpo = await lerJson(request, 2048);
    const email = normalizarEmailVaral(corpo.email);
    if (email) await limitar(`varal:${chaveEmail(email)}`, 12, 60 * 60 * 1000);
    const resultado = await jogarVaral({ email: corpo.email, peca: corpo.peca, consentimento: corpo.consentimento });
    return Response.json({ ok: true, resultado }, { status: resultado.jaJogou ? 200 : 201, headers: SEM_CACHE });
  } catch (erro) {
    return erroDaApi(erro);
  }
}
