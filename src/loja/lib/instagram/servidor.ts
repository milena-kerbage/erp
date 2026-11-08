import "server-only";
import { buscarFeed, type ResultadoFeed, VERSAO_PADRAO } from "./feed";

// Lado do servidor do feed do Instagram: lê o token (INSTAGRAM_ACCESS_TOKEN, só no servidor, NUNCA
// NEXT_PUBLIC_) e a versão da API, busca com cache de 1 h (tag "instagram") e registra as falhas no log
// do servidor sem derrubar a página. Passo a passo do token: docs/loja.md, seção "Instagram".

const avisados = new Set<string>();

export function configuracaoInstagram(): { token: string | undefined; versao: string } {
  return {
    token: process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || undefined,
    versao: process.env.INSTAGRAM_GRAPH_VERSION?.trim() || VERSAO_PADRAO,
  };
}

/** Posts do perfil ou { ok: false }. Sem token é o estado normal até a configuração: só avisa uma vez. */
export async function postsDoInstagram(): Promise<ResultadoFeed> {
  const resultado = await buscarFeed(configuracaoInstagram());
  if (!resultado.ok) {
    const chave = `${resultado.motivo}:${resultado.detalhe ?? ""}`;
    if (resultado.motivo === "sem-token") {
      if (!avisados.has(chave)) console.info("[instagram] INSTAGRAM_ACCESS_TOKEN vazio: a home mostra o convite para seguir (docs/loja.md).");
    } else {
      // Erro de verdade: registra sempre (com o motivo, sem o token), mas a seção cai no convite.
      console.error(`[instagram] Feed indisponível (${resultado.motivo}${resultado.detalhe ? `: ${resultado.detalhe}` : ""}). A home mostra o convite para seguir.`);
    }
    avisados.add(chave);
  }
  return resultado;
}
