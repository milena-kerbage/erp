import { limited } from "@/lib/auth/core";
import { criarAvaliacao, hashDoIp } from "@/lib/loja/avaliacoes";
import { filtrosDaUrl, LIMITES_AVALIACAO, MENSAGEM_ENVIADA, slugValido } from "@/loja/lib/avaliacoes/regras";
import { avaliacoesPublicas, erroDaApi, gravacaoPermitida, ipDaRequisicao, respostaDeErro, SEM_CACHE } from "@/loja/lib/avaliacoes/servidor";
import { indiceDaLoja } from "@/lib/loja/catalogo";

// Avaliações de produto (públicas, no host da loja: /api/avaliacoes → /loja/api/avaliacoes).
// GET  ?produto=slug&ordem=recentes|maior|menor|fotos&nota=5,4&fotos=1&para=menina&busca=&offset=&limite=
//      → só as APROVADAS + resumo do produto (média e contagem por nota).
// POST multipart: produto, nota, titulo, texto, nome, cidade?, paraQuem?, consentimento, iniciado (ms),
//      site (honeypot, vazio) e de 0 a 4 arquivos em "fotos". Tudo entra como "pendente".
// Erros: {erro:{codigo, mensagem, campos?}} com 400, 403, 404, 413 (foto > 3 MiB ou requisição > 13 MiB),
// 415 (tipo), 429 (limite) ou 503 (banco).

export const runtime = "nodejs";
export const maxDuration = 30;

// Produto do catálogo da loja (cadastro do ERP ou o de exemplo).
async function verificadorDeProduto() {
  const { buscarProduto } = await indiceDaLoja();
  return (slug: string) => Boolean(buscarProduto(slug));
}

export async function GET(request: Request) {
  const parametros = new URL(request.url).searchParams;
  const produto = parametros.get("produto") ?? "";
  const produtoExiste = await verificadorDeProduto();
  if (!slugValido(produto) || !produtoExiste(produto)) return respostaDeErro(404, "PRODUTO_INEXISTENTE", "Produto não encontrado.");
  try {
    const resposta = await avaliacoesPublicas(produto, filtrosDaUrl(parametros));
    // CDN guarda 1 min (a moderação aparece rápido); o navegador sempre revalida.
    return Response.json(resposta, { headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" } });
  } catch (erro) {
    return erroDaApi(erro);
  }
}

// Lê o corpo até o limite (Content-Length pode faltar ou mentir).
async function lerCorpo(request: Request, maximo: number): Promise<Buffer | null> {
  const leitor = request.body?.getReader();
  if (!leitor) return Buffer.alloc(0);
  const partes: Uint8Array[] = [];
  let tamanho = 0;
  try {
    while (true) {
      const { done, value } = await leitor.read();
      if (done) break;
      tamanho += value.byteLength;
      if (tamanho > maximo) {
        await leitor.cancel();
        return null;
      }
      partes.push(value);
    }
  } finally {
    leitor.releaseLock();
  }
  return Buffer.concat(partes);
}

export async function POST(request: Request) {
  // Só o formulário da própria loja (mesma origem).
  const origem = request.headers.get("origin");
  let mesmaOrigem = request.headers.get("sec-fetch-site") !== "cross-site";
  try {
    if (origem && new URL(origem).host !== request.headers.get("host")) mesmaOrigem = false;
  } catch {
    mesmaOrigem = false;
  }
  if (!mesmaOrigem) return respostaDeErro(403, "ORIGEM", "Envio não permitido.");

  const tipo = request.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data;/i.test(tipo)) return respostaDeErro(415, "FORMATO", "Envie o formulário com multipart/form-data.");
  const limite = LIMITES_AVALIACAO.requisicaoBytes;
  const mensagemLimite = "As fotos somam mais do que o permitido. Envie até 4 fotos de até 3 MB cada.";
  if (Number(request.headers.get("content-length")) > limite) return respostaDeErro(413, "REQUISICAO_GRANDE", mensagemLimite);

  const gravar = gravacaoPermitida();
  const ip = ipDaRequisicao(request);
  try {
    // Limite bruto antes de ler o corpo (o limite de 3 avaliações aceitas por hora fica na gravação).
    if (gravar && ((await limited("loja-avaliacoes:global", 120, 60 * 60 * 1000)) || (await limited(`loja-avaliacoes:ip:${hashDoIp(ip)}`, 12, 60 * 60 * 1000))))
      return respostaDeErro(429, "RATE_LIMITED", "Muitas tentativas. Tente de novo mais tarde.");

    const corpo = await lerCorpo(request, limite);
    if (!corpo) return respostaDeErro(413, "REQUISICAO_GRANDE", mensagemLimite);
    let formulario: FormData;
    try {
      formulario = await new Request("http://loja.local/avaliacoes", { method: "POST", headers: { "content-type": tipo }, body: new Uint8Array(corpo) }).formData();
    } catch {
      return respostaDeErro(400, "FORMULARIO", "Formulário inválido.");
    }

    const campos: Record<string, unknown> = {};
    for (const nome of ["produto", "nota", "titulo", "texto", "nome", "cidade", "paraQuem", "consentimento", "site", "iniciado"]) {
      const valor = formulario.get(nome);
      if (typeof valor === "string") campos[nome] = valor;
    }
    const arquivos = formulario.getAll("fotos").filter((item): item is File => item instanceof File && (item.size > 0 || item.name !== ""));
    if (arquivos.length > LIMITES_AVALIACAO.fotos) return respostaDeErro(400, "FOTOS_DEMAIS", `Envie no máximo ${LIMITES_AVALIACAO.fotos} fotos.`, { fotos: `Envie no máximo ${LIMITES_AVALIACAO.fotos} fotos.` });
    const grande = arquivos.findIndex((arquivo) => arquivo.size > LIMITES_AVALIACAO.fotoBytes);
    if (grande >= 0) return respostaDeErro(413, "FOTO_GRANDE", `A foto ${grande + 1} tem mais de 3 MB. Envie fotos de até 3 MB cada.`, { fotos: `A foto ${grande + 1} tem mais de 3 MB.` });
    const fotos = await Promise.all(arquivos.map(async (arquivo) => Buffer.from(await arquivo.arrayBuffer())));

    const resultado = await criarAvaliacao({ campos, fotos, ip }, { produtoExiste: await verificadorDeProduto(), gravar });
    if (resultado.situacao === "simulada")
      return Response.json(
        { ok: true, simulada: true, mensagem: MENSAGEM_ENVIADA, aviso: "Desenvolvimento ligado ao banco remoto: a avaliação foi validada, mas não foi gravada." },
        { headers: SEM_CACHE },
      );
    // Honeypot: o robô recebe a mesma resposta de sucesso, e nada é gravado.
    return Response.json({ ok: true, mensagem: MENSAGEM_ENVIADA }, { status: 201, headers: SEM_CACHE });
  } catch (erro) {
    return erroDaApi(erro);
  }
}
