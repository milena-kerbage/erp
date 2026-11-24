// Produtos que eram o MESMO conjunto cadastrado duas vezes (pente fino de 24/11/2026, conferido foto a
// foto). O repetido fica ARQUIVADO no cadastro (nada é apagado) e o endereço antigo leva ao que ficou.
// Critério: mesmas peças físicas, mesmo bordado. Mesmo tema em outro produto (kit berço × kit cama kids
// do mesmo quarto) ou o mesmo modelo feito para outro bebê NÃO é repetido.
//
// `moverFotos`: posições (a partir de 0) das fotos do repetido que o produto mantido ainda não tinha.
// `categoriaExtra`: caminho da categoria onde o repetido aparecia e o mantido passa a aparecer também.
// Aplicação no banco: npm run loja:duplicados (src/lib/loja/gestao/duplicados.ts), idempotente.

export type ProdutoUnido = { arquivar: string; manter: string; moverFotos?: readonly number[]; categoriaExtra?: string };

export const PRODUTOS_UNIDOS: readonly ProdutoUnido[] = [
  // Dois cadastros do mesmo álbum de fotos
  { arquivar: 'kit-cama-kids-rose-e-verde-renascenca', manter: 'kit-cama-kids-maria-julia' },
  { arquivar: 'kit-berco-flores-do-campo', manter: 'kit-berco-jardim-rose-flores-do-campo' },
  { arquivar: 'kit-berco-a-guirlanda-coracao', manter: 'kit-berco-a-guirlanda-com-laco' },
  // Produto do álbum (sem preço) repetindo um produto que já tem preço
  { arquivar: 'kit-berco-pesponto-rose', manter: 'kit-berco-classico' },
  { arquivar: 'ninho-benjamin', manter: 'ninho', moverFotos: [2, 3] },
  { arquivar: 'kit-moises-isaque', manter: 'kit-berco-maternidade', moverFotos: [3], categoriaExtra: 'kit-maternidade' },
  { arquivar: 'jogo-de-lencol-sarah', manter: 'lencol-berco-3-pecas', moverFotos: [3] },
  { arquivar: 'trocador-xadrez-rose-liso', manter: 'trocador', moverFotos: [1] },
];

const DESTINOS = new Map(PRODUTOS_UNIDOS.map((par) => [par.arquivar, par.manter]));

/** Slug do produto que ficou no lugar de um repetido arquivado (segue a cadeia, se houver). */
export function destinoDoUnido(slug: string): string | undefined {
  let destino = DESTINOS.get(slug);
  for (let passo = 0; destino && DESTINOS.has(destino) && passo < 5; passo++) destino = DESTINOS.get(destino);
  return destino;
}
