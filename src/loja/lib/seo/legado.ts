// Endereços antigos da loja que mudaram de lugar e respondem 308 (permanente) para o novo, para
// links salvos, favoritos e resultados de busca não darem 404. Usado pelo proxy da loja
// (src/loja/proxy.ts), que só roda no host da loja: o ERP não passa por aqui.
// Puro (sem APIs do Next): roda no `node --test` (tests/loja/legado.test.mjs).
//
// - A área "Projetos" virou "Personalizado": /projetos/** → /personalizado/** (listagem, quartinhos,
//   seleções por tema e estilo, como-funciona, orcamento e monte-o-seu);
// - a antiga seleção de projetos (/projetos/selecao) virou a sacola: → /carrinho.
// A busca (?editar=, ?projeto=, UTMs…) é preservada por quem chama.

const AREA_ANTIGA = "projetos";
const AREA_NOVA = "personalizado";

/** Caminho novo para um caminho antigo, ou null quando o caminho não mudou. */
export function destinoLegado(caminho: string): string | null {
  const partes = caminho.split("/").filter(Boolean);
  if (partes[0]?.toLowerCase() !== AREA_ANTIGA) return null;
  const resto = partes.slice(1);
  if (resto.length === 1 && resto[0]?.toLowerCase() === "selecao") return "/carrinho";
  return `/${[AREA_NOVA, ...resto].join("/")}`;
}

// Entrada do montador: /personalizado/monte-o-seu abre a 1ª etapa (307, temporário: a etapa de entrada
// pode mudar). A busca (?projeto=, ?editar=) vai junto. A página da rota faz o mesmo como rede de
// segurança, mas lá o redirecionamento sai depois do layout (200 com refresh no streaming).
const ENTRADA_MONTADOR = "/personalizado/monte-o-seu";

export function destinoEntrada(caminho: string): string | null {
  return caminho.replace(/\/+$/, "") === ENTRADA_MONTADOR ? `${ENTRADA_MONTADOR}/tema` : null;
}
