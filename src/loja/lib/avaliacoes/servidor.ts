import "server-only";
import { unstable_cache } from "next/cache";
import { DatabaseConfigurationError, DatabaseOperationError, storageConfiguration } from "@/lib/database";
import { ApiError } from "@/lib/erp/access";
import { ErroAvaliacao, listarAprovadas, tagAvaliacoes } from "@/lib/loja/avaliacoes";
import { filtrosDaUrl, type RespostaAvaliacoes } from "./regras";

// Servidor da loja para as avaliações: carga inicial da PDP com cache por produto (revalidada pela
// moderação do ERP via revalidateTag), respostas de erro da API pública e a trava de gravação em
// desenvolvimento.

let avisou = false;

/**
 * Primeira página das aprovadas + resumo, para renderizar no servidor. Cache de 10 min por produto,
 * invalidado na hora quando o ERP aprova, recusa, responde ou exclui. Banco indisponível (ou migração
 * 008 ainda não aplicada): null, e o componente busca pela API no navegador.
 */
export async function avaliacoesIniciais(slug: string): Promise<RespostaAvaliacoes | null> {
  try {
    return await unstable_cache(() => listarAprovadas(slug, filtrosDaUrl(new URLSearchParams())), ["loja-avaliacoes", slug], {
      tags: [tagAvaliacoes(slug)],
      revalidate: 600,
    })();
  } catch (erro) {
    if (!avisou) {
      avisou = true;
      console.warn(`[avaliacoes] Avaliações indisponíveis no servidor (${erro instanceof Error ? erro.message : "erro"}). Confira o banco e a migração 008.`);
    }
    return null;
  }
}

/**
 * Em desenvolvimento ligado ao banco remoto (DATABASE_URL, que pode ser o de produção), a API de envio
 * valida e processa tudo, mas NÃO grava nada (nem o contador de limite): responde como "simulada".
 * Para gravar de propósito nesse cenário: AVALIACOES_GRAVAR_EM_DESENVOLVIMENTO=true.
 */
export function gravacaoPermitida(): boolean {
  if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test") return true;
  if (storageConfiguration().backend !== "postgres") return true;
  return process.env.AVALIACOES_GRAVAR_EM_DESENVOLVIMENTO === "true";
}

/** IP do visitante (na Vercel, x-vercel-forwarded-for/x-forwarded-for são escritos pela borda). */
export function ipDaRequisicao(request: Request): string {
  const primeiro = (valor: string | null) => valor?.split(",")[0]?.trim() || "";
  return primeiro(request.headers.get("x-vercel-forwarded-for")) || primeiro(request.headers.get("x-real-ip")) || primeiro(request.headers.get("x-forwarded-for")) || "desconhecido";
}

export const SEM_CACHE = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } as const;

export function respostaDeErro(status: number, codigo: string, mensagem: string, campos?: Record<string, string>) {
  return Response.json({ erro: { codigo, mensagem, ...(campos && Object.keys(campos).length ? { campos } : {}) } }, { status, headers: SEM_CACHE });
}

/** Converte os erros do servidor em {erro:{codigo,mensagem,campos?}} sem detalhes internos. */
export function erroDaApi(erro: unknown): Response {
  if (erro instanceof ErroAvaliacao) return respostaDeErro(erro.status, erro.code, erro.message, erro.erros as Record<string, string>);
  if (erro instanceof ApiError) return respostaDeErro(erro.status, erro.code, erro.message);
  if (erro instanceof DatabaseConfigurationError || erro instanceof DatabaseOperationError)
    return respostaDeErro(503, "INDISPONIVEL", "As avaliações estão indisponíveis agora. Tente de novo em instantes.");
  if (erro instanceof Error && "status" in erro && erro.status === 413) return respostaDeErro(413, "REQUISICAO_GRANDE", "As fotos somam mais do que o permitido.");
  console.error("[avaliacoes]", erro instanceof Error ? erro.message : erro);
  return respostaDeErro(500, "ERRO", "Não foi possível concluir agora. Tente de novo em instantes.");
}
