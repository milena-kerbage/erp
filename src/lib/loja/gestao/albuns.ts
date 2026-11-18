import { readFileSync } from 'node:fs';
import type { Actor } from '../../erp/access.ts';
import { criarCategoria } from './categorias.ts';
import { gestaoDb, texto } from './esquema.ts';
import { enviarImagem } from './imagens.ts';
import { atualizarProduto, criarProduto } from './produtos.ts';
import { NOTA_PERSONALIZACAO } from './segmentacoes.ts';

// Produtos tirados dos álbuns de fotos do ateliê (Google Fotos), catalogados foto a foto. Entram ATIVOS e
// SEM PREÇO (R$ 0,00 = "Sob consulta" na loja): o valor é combinado pelo WhatsApp até a equipe cadastrar.
// IDEMPOTENTE pelo slug: produto que já existe não é tocado.

const ATOR: Actor = { id: 'albuns-google-fotos', name: 'Importação dos álbuns', email: 'sistema@local', permission: 'admin' as Actor['permission'] };

export type ProdutoDoAlbum = {
  slug: string; sku: string; nome: string; categoria: string; extras?: string[]; resumo: string;
  atributos: Record<string, string[]>; relevancia: number; fotos: Array<{ arquivo: string; alt: string }>;
};

/** Categorias que os álbuns podem pedir além das já criadas pelas segmentações. */
const CATEGORIAS_EXTRAS: Record<string, { nome: string; descricao: string; ordem: number }> = {
  'kit-cama-adulto': { nome: 'Kit cama adulto', descricao: 'Almofadões, almofadas, rolos e edredom para a cama de casal, no mesmo tema. Qualquer item pode ser personalizado.', ordem: 2 },
};

export type ResumoAlbuns = { criados: number; existentes: number; fotos: number; categoriasCriadas: number };

export async function aplicarProdutosDosAlbuns(produtos: ProdutoDoAlbum[], pastaFotos: string): Promise<ResumoAlbuns> {
  // Valida tudo antes de gravar (fotos existem e cabem no limite; slugs e SKUs únicos na lista).
  const slugs = new Set<string>(), skus = new Set<string>();
  for (const produto of produtos) {
    if (slugs.has(produto.slug) || skus.has(produto.sku)) throw new Error(`Slug ou SKU repetido na lista: ${produto.slug}`);
    slugs.add(produto.slug); skus.add(produto.sku);
    if (!produto.fotos.length) throw new Error(`${produto.slug}: sem foto.`);
    for (const foto of produto.fotos) if (readFileSync(`${pastaFotos}/${foto.arquivo}`).length > 3 * 1024 * 1024) throw new Error(`${foto.arquivo}: acima de 3 MB.`);
  }
  const database = gestaoDb();
  const resumo: ResumoAlbuns = { criados: 0, existentes: 0, fotos: 0, categoriasCriadas: 0 };
  const mapa = async () => new Map((await database.prepare('SELECT id, caminho FROM loja_categorias').all()).map((linha) => [texto(linha.caminho), texto(linha.id)]));
  let categorias = await mapa();
  for (const caminho of new Set(produtos.flatMap((produto) => [produto.categoria, ...(produto.extras ?? [])]))) {
    if (categorias.has(caminho)) continue;
    const extra = CATEGORIAS_EXTRAS[caminho];
    if (!extra) throw new Error(`Categoria ${caminho} não existe.`);
    await criarCategoria({ paiId: null, slug: caminho, nome: extra.nome, descricao: extra.descricao, ordem: extra.ordem, ativa: true }, ATOR);
    resumo.categoriasCriadas++;
  }
  categorias = await mapa();
  const id = (caminho: string) => categorias.get(caminho) as string;

  for (const produto of produtos) {
    if (await database.prepare('SELECT id FROM loja_produtos WHERE slug = ? OR sku = ?').get(produto.slug, produto.sku)) { resumo.existentes++; continue; }
    const { produto: criado } = await criarProduto({
      slug: produto.slug, sku: produto.sku, nome: produto.nome, resumo: produto.resumo,
      descricao: [produto.resumo, 'Valor sob consulta: o ateliê passa o orçamento pelo WhatsApp conforme as peças, o tecido (percal 230 fios ou 400 fios egípcios) e o bordado.', NOTA_PERSONALIZACAO],
      precoCentavos: 0, unidade: 'kit', personalizacao: produto.atributos.personalizacao ? 'Bordado com o nome conforme o modelo' : '',
      atributos: produto.atributos, disponibilidade: 'sob_encomenda', status: 'rascunho', relevancia: produto.relevancia,
      categoriaId: id(produto.categoria), categoriasExtras: (produto.extras ?? []).map(id),
      seoTitulo: `${produto.nome} | Milena Kerbage`.slice(0, 70), seoDescricao: produto.resumo.slice(0, 170),
    }, ATOR);
    let revisao = criado.revisao;
    for (const foto of produto.fotos) {
      revisao = (await enviarImagem(criado.id, { conteudo: readFileSync(`${pastaFotos}/${foto.arquivo}`), revisao, alt: foto.alt }, ATOR)).revisao;
      resumo.fotos++;
    }
    await atualizarProduto(criado.id, { revisao, status: 'ativo' }, ATOR);
    resumo.criados++;
  }
  return resumo;
}
