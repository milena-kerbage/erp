import type { Actor } from '../../erp/access.ts';
import { LIMITES_IMAGEM } from './imagens.ts';
import { auditarGestao, exigirGravacaoGestao, gestaoDb, texto, travarGestao } from './esquema.ts';
import { atualizarProduto } from './produtos.ts';
import type { ProdutoUnido } from '../../../loja/lib/catalogo/unidos.ts';

// Une produtos repetidos (o mesmo conjunto cadastrado duas vezes): o repetido fica ARQUIVADO, as fotos
// que o mantido ainda não tinha mudam para ele e ele pode ganhar a categoria onde o repetido aparecia.
// Nada é apagado: reativar o repetido no ERP (Site › Produtos › Arquivados) desfaz o arquivamento.
// IDEMPOTENTE: par já aplicado (repetido arquivado) não é tocado. A lista fica em
// src/loja/lib/catalogo/unidos.ts, que também redireciona o endereço antigo na loja.

const ATOR: Actor = { id: 'pente-fino-duplicados', name: 'Pente fino de duplicados', email: 'sistema@local', permission: 'admin' as Actor['permission'] };

export type ParUnido = {
  arquivar: string; manter: string; situacao: 'unido' | 'ja_unido' | 'a_unir' | 'nao_encontrado';
  fotosMovidas: string[]; categoriaExtra: string; detalhe: string;
};
export type ResumoDuplicados = { unidos: number; jaUnidos: number; naoEncontrados: number; fotosMovidas: number; textosCorrigidos: number; pares: ParUnido[] };

type LinhaProduto = { id: string; slug: string; nome: string; status: string; revisao: number };

async function produtoPorSlug(slug: string): Promise<LinhaProduto | null> {
  const linha = await gestaoDb().prepare('SELECT id, slug, nome, status, revisao FROM loja_produtos WHERE slug = ?').get(slug);
  return linha ? { id: texto(linha.id), slug: texto(linha.slug), nome: texto(linha.nome), status: texto(linha.status), revisao: Number(linha.revisao) } : null;
}

const fotosDe = async (produtoId: string) =>
  (await gestaoDb().prepare('SELECT id, posicao, hash FROM loja_produto_imagens WHERE produto_id = ? ORDER BY posicao').all(produtoId))
    .map((linha) => ({ id: texto(linha.id), posicao: Number(linha.posicao), hash: texto(linha.hash) }));

/**
 * Foto que veio do repetido não fica com o nome dele no texto alternativo ("Ninho Benjamin - foto 3" dentro
 * do Ninho): passa a "<nome do mantido> - foto N". Devolve quantas trocou (ou trocaria, em `simular`).
 */
async function corrigirTextosDasFotos(mantido: LinhaProduto, nomeDoRepetido: string, simular: boolean) {
  const database = gestaoDb();
  const fotos = (await database.prepare('SELECT id, posicao, alt FROM loja_produto_imagens WHERE produto_id = ? ORDER BY posicao').all(mantido.id))
    .filter((foto) => texto(foto.alt).startsWith(`${nomeDoRepetido} - foto`));
  if (simular || !fotos.length) return fotos.length;
  for (const foto of fotos) await database.prepare('UPDATE loja_produto_imagens SET alt = ? WHERE id = ?').run(`${mantido.nome} - foto ${Number(foto.posicao) + 1}`.slice(0, 200), texto(foto.id));
  await database.prepare('UPDATE loja_produtos SET revisao = revisao + 1, atualizado = ? WHERE id = ?').run(Date.now(), mantido.id);
  return fotos.length;
}

/** Retrato do que a união vai mexer (produtos e fotos dos pares), para guardar antes de aplicar. */
export async function retratoDosPares(pares: readonly ProdutoUnido[]) {
  const database = gestaoDb(), saida: Record<string, unknown>[] = [];
  for (const slug of new Set(pares.flatMap((par) => [par.arquivar, par.manter]))) {
    const produto = await database.prepare('SELECT id, slug, sku, nome, status, categoria_id, relevancia, ordem, revisao FROM loja_produtos WHERE slug = ?').get(slug);
    if (!produto) continue;
    saida.push({
      ...produto,
      categoriasExtras: (await database.prepare('SELECT categoria_id FROM loja_produto_categorias WHERE produto_id = ?').all(texto(produto.id))).map((linha) => texto(linha.categoria_id)),
      fotos: await database.prepare('SELECT id, posicao, tipo, alt, hash FROM loja_produto_imagens WHERE produto_id = ? ORDER BY posicao').all(texto(produto.id)),
    });
  }
  return saida;
}

/** `simular`: só confere e relata, sem gravar. */
export async function unirDuplicados(pares: readonly ProdutoUnido[], { simular = false } = {}): Promise<ResumoDuplicados> {
  if (!simular) exigirGravacaoGestao();
  const database = gestaoDb();
  const resumo: ResumoDuplicados = { unidos: 0, jaUnidos: 0, naoEncontrados: 0, fotosMovidas: 0, textosCorrigidos: 0, pares: [] };

  for (const par of pares) {
    const relato: ParUnido = { arquivar: par.arquivar, manter: par.manter, situacao: 'a_unir', fotosMovidas: [], categoriaExtra: '', detalhe: '' };
    resumo.pares.push(relato);
    const repetido = await produtoPorSlug(par.arquivar), mantido = await produtoPorSlug(par.manter);
    if (!repetido || !mantido) { relato.situacao = 'nao_encontrado'; relato.detalhe = `${!repetido ? par.arquivar : par.manter} não existe neste banco.`; resumo.naoEncontrados++; continue; }
    if (repetido.status === 'arquivado') {
      relato.situacao = 'ja_unido'; resumo.jaUnidos++;
      // Par unido antes desta correção: só acerta o texto das fotos que mudaram de produto.
      resumo.textosCorrigidos += simular ? await corrigirTextosDasFotos(mantido, repetido.nome, true) : await database.transaction(async () => { await travarGestao(); return corrigirTextosDasFotos(mantido, repetido.nome, false); });
      continue;
    }
    // O mantido tem de estar na loja: arquivar o repetido de um produto fora do ar tiraria os dois.
    if (mantido.status !== 'ativo') throw new Error(`${par.manter} não está ativo (${mantido.status}); a união de ${par.arquivar} foi recusada.`);

    const doRepetido = await fotosDe(repetido.id), doMantido = await fotosDe(mantido.id);
    const hashes = new Set(doMantido.map((foto) => foto.hash));
    const mover = (par.moverFotos ?? []).map((posicao) => doRepetido.find((foto) => foto.posicao === posicao)).filter((foto) => foto !== undefined).filter((foto) => !hashes.has(foto.hash));
    if (doMantido.length + mover.length > LIMITES_IMAGEM.porProduto) throw new Error(`${par.manter}: passaria de ${LIMITES_IMAGEM.porProduto} fotos.`);
    const categoria = par.categoriaExtra ? await database.prepare('SELECT id FROM loja_categorias WHERE caminho = ?').get(par.categoriaExtra) : null;
    if (par.categoriaExtra && !categoria) throw new Error(`Categoria ${par.categoriaExtra} não existe.`);
    relato.fotosMovidas = mover.map((foto) => foto.id);
    relato.categoriaExtra = par.categoriaExtra ?? '';
    relato.detalhe = `${repetido.nome} → ${mantido.nome}`;
    if (simular) continue;

    await database.transaction(async () => {
      await travarGestao();
      if (mover.length) {
        let posicao = doMantido.reduce((maior, foto) => Math.max(maior, foto.posicao), -1);
        for (const foto of mover) await database.prepare("UPDATE loja_produto_imagens SET produto_id = ?, posicao = ?, tipo = 'detalhe' WHERE id = ? AND produto_id = ?").run(mantido.id, ++posicao, foto.id, repetido.id);
        // Fecha os buracos na ordem do repetido (em ordem crescente: nunca repete posição no meio).
        const restantes = (await fotosDe(repetido.id)).map((foto) => foto.id);
        for (const [nova, id] of restantes.entries()) await database.prepare('UPDATE loja_produto_imagens SET posicao = ? WHERE id = ?').run(nova, id);
        for (const id of [mantido.id, repetido.id]) await database.prepare('UPDATE loja_produtos SET revisao = revisao + 1, atualizado = ? WHERE id = ?').run(Date.now(), id);
        resumo.textosCorrigidos += await corrigirTextosDasFotos(mantido, repetido.nome, false);
      }
      if (categoria) {
        const principal = await database.prepare('SELECT categoria_id FROM loja_produtos WHERE id = ?').get(mantido.id);
        if (texto(principal?.categoria_id) !== texto(categoria.id) && !(await database.prepare('SELECT 1 AS tem FROM loja_produto_categorias WHERE produto_id = ? AND categoria_id = ?').get(mantido.id, texto(categoria.id)))) {
          await database.prepare('INSERT INTO loja_produto_categorias (produto_id, categoria_id) VALUES (?, ?)').run(mantido.id, texto(categoria.id));
          await database.prepare('UPDATE loja_produtos SET revisao = revisao + 1, atualizado = ? WHERE id = ?').run(Date.now(), mantido.id);
        }
      }
      await auditarGestao(ATOR.id, 'updated', 'loja_produtos', mantido.id);
    });
    const atual = await produtoPorSlug(par.arquivar);
    await atualizarProduto(repetido.id, { revisao: atual?.revisao, status: 'arquivado' }, ATOR);
    relato.situacao = 'unido';
    resumo.unidos++;
    resumo.fotosMovidas += mover.length;
  }
  return resumo;
}
