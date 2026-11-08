import type { NextRequest } from "next/server";
import { arredondarCoordenada, dentroDoBrasil, normalizarCep } from "@/loja/lib/localizacao/cep";
import { buscarCep, buscarCepPorCoordenadas, ErroServicoLocalizacao } from "@/loja/lib/localizacao/servicos";

// GET /api/localizacao?cep=20220410        → { cep, cidade, uf, logradouro, bairro } (o checkout usa rua e bairro)
// GET /api/localizacao?lat=-22.9&lng=-43.2 → { cep, cidade, uf } pelo ponto (botão "Usar minha localização")
// Erros: { erro: { codigo } } com 400 (entrada), 404 (não achou) ou 502 (serviço externo fora).
export async function GET(request: NextRequest) {
  const parametros = request.nextUrl.searchParams;
  const temCep = parametros.has("cep");
  try {
    if (temCep) {
      const cep = normalizarCep(parametros.get("cep"));
      if (!cep) return erro(400, "cep_invalido");
      const local = await buscarCep(cep);
      // CEP não muda de cidade: o navegador e o CDN podem guardar a resposta.
      return local ? Response.json(local, { headers: { "Cache-Control": "public, max-age=86400" } }) : erro(404, "cep_nao_encontrado");
    }

    const lat = Number(parametros.get("lat"));
    const lng = Number(parametros.get("lng"));
    if (!parametros.has("lat") || !parametros.has("lng") || !dentroDoBrasil(lat, lng)) {
      return erro(400, "coordenadas_invalidas");
    }
    const local = await buscarCepPorCoordenadas(arredondarCoordenada(lat), arredondarCoordenada(lng));
    return local ? Response.json(local, { headers: { "Cache-Control": "private, no-store" } }) : erro(404, "cep_nao_encontrado");
  } catch (falha) {
    if (falha instanceof ErroServicoLocalizacao) {
      console.error("[localizacao]", falha.message);
      return erro(502, "servico_indisponivel");
    }
    throw falha;
  }
}

function erro(status: number, codigo: string) {
  return Response.json({ erro: { codigo } }, { status, headers: { "Cache-Control": "no-store" } });
}
