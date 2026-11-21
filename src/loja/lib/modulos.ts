// Módulos da loja ligados e desligados. A pedido (21/11/2026), "Personalizado" (quartinhos, Monte o seu) e
// "Pronta entrega" ficam FORA DO AR por enquanto: nada foi apagado. As páginas, os componentes e os dados continuam
// no código; o que muda é que eles somem do menu, da página inicial, do rodapé, do sitemap e do llms.txt, e os
// endereços deles levam à página inicial (src/loja/proxy.ts). Para voltar: troque para `true` aqui.
// Puro (sem React nem Next): usado no proxy, em rotas e em componentes.
export const MODULOS = {
  personalizado: false,
  prontaEntrega: false,
} as const;

const caminhoDe = (href: string) => href.split(/[?#]/)[0];

/** O endereço é de um módulo desligado? Vale para a página do módulo e para os atalhos "pronta entrega" das listagens. */
export function rotaOculta(href: string | undefined | null): boolean {
  if (!href || !href.startsWith("/")) return false;
  const caminho = caminhoDe(href);
  if (!MODULOS.personalizado && (caminho === "/personalizado" || caminho.startsWith("/personalizado/"))) return true;
  if (!MODULOS.prontaEntrega && (caminho === "/pronta-entrega" || caminho.startsWith("/pronta-entrega/") || /[?&]entrega=pronta-entrega(&|$)/.test(href))) return true;
  return false;
}

/** Só os itens que não apontam para um módulo desligado. */
export const semOcultos = <T extends { href: string }>(itens: readonly T[]): T[] => itens.filter((item) => !rotaOculta(item.href));

/** Para onde vão os botões "ver a loja" (sacola vazia, favoritos, fim do pedido) enquanto Pronta entrega está fora. */
export const VITRINE_INICIAL = MODULOS.prontaEntrega ? "/pronta-entrega" : "/kit-berco";
