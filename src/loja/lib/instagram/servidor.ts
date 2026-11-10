import "server-only";
import { buscarFeed, type ResultadoFeed, VERSAO_PADRAO } from "./feed";
import { connectionToken, currentConnection } from "@/lib/instagram/store";

// Feed com token OAuth criptografado no banco; sem INSTAGRAM_APP_ID mantém o token manual legado.
// Credenciais ficam só no servidor. Busca com cache de 1 h (tag "instagram") sem derrubar a home.
// Configuração: docs/instagram-meta.md e docs/loja.md, seção "Instagram".

const avisados = new Set<string>();

export async function configuracaoInstagram(): Promise<{ token: string | undefined; versao: string }> {
  // Ao adotar OAuth, o banco passa a ser a fonte de acesso. Nunca restaura o token legado após revogação.
  if (process.env.INSTAGRAM_APP_ID?.trim()) {
    try {
      const connection = await currentConnection();
      return { token: connection ? await connectionToken(connection) : undefined, versao: process.env.INSTAGRAM_GRAPH_VERSION?.trim() || VERSAO_PADRAO };
    } catch {
      return { token: undefined, versao: process.env.INSTAGRAM_GRAPH_VERSION?.trim() || VERSAO_PADRAO };
    }
  }
  return {
    token: process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || undefined,
    versao: process.env.INSTAGRAM_GRAPH_VERSION?.trim() || VERSAO_PADRAO,
  };
}

/** Posts do perfil ou { ok: false }. Sem token é o estado normal até a configuração: só avisa uma vez. */
export async function postsDoInstagram(): Promise<ResultadoFeed> {
  const resultado = await buscarFeed(await configuracaoInstagram());
  if (!resultado.ok) {
    const chave = `${resultado.motivo}:${resultado.detalhe ?? ""}`;
    if (resultado.motivo === "sem-token") {
      if (!avisados.has(chave)) console.info("[instagram] Sem acesso válido ao perfil: a home mostra o convite para seguir (docs/instagram-meta.md e docs/loja.md).");
    } else {
      // Erro de verdade: registra sempre (com o motivo, sem o token), mas a seção cai no convite.
      console.error(`[instagram] Feed indisponível (${resultado.motivo}${resultado.detalhe ? `: ${resultado.detalhe}` : ""}). A home mostra o convite para seguir.`);
    }
    avisados.add(chave);
  }
  return resultado;
}
