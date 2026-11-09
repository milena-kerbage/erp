import { montarMenu } from '../../../loja/componentes/layout/cabecalho/menu.ts';
import { CUPONS } from '../../../loja/lib/carrinho/totais.ts';
import { ARVORE_ESTATICA } from '../../../loja/lib/catalogo/categorias.ts';
import { PRONTA_ENTREGA } from '../../../loja/lib/catalogo/constantes.ts';
import { listarProdutos, MAIS_VENDIDOS_SLUGS, type Produto } from '../../../loja/lib/catalogo/exemplos.ts';
import { slugificar } from '../../../loja/lib/catalogo/listagem.ts';
import { CUPOM_GENERICO_PRIMEIRA } from '../../../loja/lib/contas/regras.ts';
import { auditarGestao, gestaoDb, novoId, texto, travarGestao } from './esquema.ts';

// Importação IDEMPOTENTE do catálogo de exemplo (em código) para as tabelas da gestão (migração 010):
// categorias, grupos de opções, produtos (com categorias, complementos, opções e linha de cores), a coleção
// "Mais vendidos", o menu do cabeçalho e o cupom ENXOVAL10. Só INSERE o que falta (chaves naturais: caminho,
// slug, chave do grupo, código do cupom); nunca sobrescreve o que a equipe já editou no ERP. O menu só é
// importado com a tabela vazia. Usada por `npm run loja:importar-catalogo` e pelos testes.
// Roda com o carregador de scripts/lib/registrar-ts.mjs (os módulos da loja usam "@/").

export type ResumoImportacao = Record<'categorias' | 'grupos' | 'produtos' | 'colecoes' | 'menu' | 'cupons', { criados: number; existentes: number }>;

type GrupoSemente = { chave: string; nome: string; tipo: 'escolha' | 'personalizacao'; minimo: number; opcoes: Array<{ rotulo: string; disponivel: boolean }> };

/** Grupos de opções do catálogo de exemplo: cada variação diferente vira um grupo; o bordado, um só. */
export function gruposDoExemplo(produtos: Produto[]) {
  const porAssinatura = new Map<string, GrupoSemente>();
  const usadas = new Set<string>();
  const doProduto = new Map<string, string[]>();
  for (const produto of produtos) {
    const chaves: string[] = [];
    if (produto.variacao) {
      const assinatura = JSON.stringify(produto.variacao);
      let grupo = porAssinatura.get(assinatura);
      if (!grupo) {
        const base = slugificar(produto.variacao.titulo) || 'opcao';
        let chave = base;
        for (let n = 2; usadas.has(chave); n++) chave = `${base}-${n}`;
        usadas.add(chave);
        grupo = { chave, nome: produto.variacao.titulo, tipo: 'escolha', minimo: 1, opcoes: produto.variacao.opcoes.map(({ rotulo, disponivel }) => ({ rotulo, disponivel })) };
        porAssinatura.set(assinatura, grupo);
      }
      chaves.push(grupo.chave);
    }
    if (produto.personalizacao) chaves.push('bordado-com-nome');
    doProduto.set(produto.slug, chaves);
  }
  const grupos: GrupoSemente[] = [...porAssinatura.values(), { chave: 'bordado-com-nome', nome: 'Bordado com nome', tipo: 'personalizacao', minimo: 0, opcoes: [{ rotulo: 'Bordado com nome', disponivel: true }] }];
  return { grupos, doProduto };
}

const centavos = (valor: string) => { const [inteiro, fracao = ''] = valor.split('.'); return Number(inteiro) * 100 + Number(fracao.padEnd(2, '0')); };

export async function importarCatalogoDeExemplo(ator = 'importacao', agora = Date.now()): Promise<ResumoImportacao> {
  const resumo: ResumoImportacao = { categorias: { criados: 0, existentes: 0 }, grupos: { criados: 0, existentes: 0 }, produtos: { criados: 0, existentes: 0 }, colecoes: { criados: 0, existentes: 0 }, menu: { criados: 0, existentes: 0 }, cupons: { criados: 0, existentes: 0 } };
  const produtos = listarProdutos();
  const database = gestaoDb();
  await database.transaction(async () => {
    await travarGestao();
    const contar = (chave: keyof ResumoImportacao, criado: boolean) => { resumo[chave][criado ? 'criados' : 'existentes']++; };

    // Categorias: mães antes das filhas; o slug é o que sobra do caminho depois da mãe.
    const idDaCategoria = new Map<string, string>();
    for (const linha of await database.prepare('SELECT id, caminho FROM loja_categorias').all()) idDaCategoria.set(texto(linha.caminho), texto(linha.id));
    for (const [indice, categoria] of ARVORE_ESTATICA.lista.entries()) {
      if (idDaCategoria.has(categoria.chave)) { contar('categorias', false); continue; }
      const partes = categoria.chave.split('/');
      let mae: string | null = null;
      for (let i = partes.length - 1; i > 0 && !mae; i--) { const candidata = partes.slice(0, i).join('/'); if (idDaCategoria.has(candidata)) mae = candidata; }
      const slug = mae ? categoria.chave.slice(mae.length + 1) : categoria.chave;
      if (slug.includes('/')) continue; // caminho sem a categoria intermediária: fica fora (não acontece no exemplo)
      const id = novoId();
      await database.prepare('INSERT INTO loja_categorias (id, pai_id, slug, caminho, nome, ordem, ativa, revisao, criado, atualizado) VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?)')
        .run(id, mae ? idDaCategoria.get(mae) ?? null : null, slug, categoria.chave, categoria.rotulo, indice * 10, agora, agora);
      idDaCategoria.set(categoria.chave, id);
      contar('categorias', true);
    }

    // Grupos de opções.
    const { grupos, doProduto } = gruposDoExemplo(produtos);
    const idDoGrupo = new Map<string, string>();
    for (const linha of await database.prepare('SELECT id, chave FROM loja_grupos_opcoes').all()) idDoGrupo.set(texto(linha.chave), texto(linha.id));
    for (const grupo of grupos) {
      if (idDoGrupo.has(grupo.chave)) { contar('grupos', false); continue; }
      const id = novoId();
      await database.prepare('INSERT INTO loja_grupos_opcoes (id, chave, nome, tipo, minimo, maximo, revisao, criado, atualizado) VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)').run(id, grupo.chave, grupo.nome, grupo.tipo, grupo.minimo, agora, agora);
      for (const [ordem, opcao] of grupo.opcoes.entries())
        await database.prepare('INSERT INTO loja_opcoes (id, grupo_id, rotulo, acrescimo_centavos, disponivel, ordem) VALUES (?, ?, ?, 0, ?, ?)').run(novoId(), id, opcao.rotulo, opcao.disponivel ? 1 : 0, ordem);
      idDoGrupo.set(grupo.chave, id);
      contar('grupos', true);
    }

    // Produtos (só os que faltam; os relacionamentos só entram nos recém-criados).
    const idDoProduto = new Map<string, string>();
    for (const linha of await database.prepare('SELECT id, slug FROM loja_produtos').all()) idDoProduto.set(texto(linha.slug), texto(linha.id));
    const novos: Produto[] = [];
    for (const [indice, produto] of produtos.entries()) {
      if (idDoProduto.has(produto.slug)) { contar('produtos', false); continue; }
      const categoriaId = idDaCategoria.get(produto.caminho.slice(1));
      if (!categoriaId) continue;
      const { retirada: _retirada, ...atributos } = produto.atributos;
      const linhaCores = produto.irmaos?.titulo === 'Cor' ? produto.irmaos.itens[0]?.slug ?? '' : '';
      const cor = produto.irmaos?.titulo === 'Cor' ? produto.irmaos.itens.find((irmao) => irmao.slug === produto.slug)?.rotulo ?? '' : '';
      const id = novoId();
      await database.prepare(`INSERT INTO loja_produtos (id, slug, sku, nome, marca, resumo, descricao_json, preco_centavos, unidade, selo, pecas_json, personalizacao, ficha_json, atributos_json, disponibilidade, status, destaque, categoria_id, linha_cores, cor, ordem, revisao, criado, atualizado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo', 0, ?, ?, ?, ?, 1, ?, ?)`).run(
        id, produto.slug, produto.sku, produto.nome, produto.marca, produto.resumo, JSON.stringify(produto.descricao), centavos(produto.preco), produto.unidade, produto.selo ?? '',
        JSON.stringify(produto.pecas ?? []), produto.personalizacao ?? '', JSON.stringify(produto.ficha), JSON.stringify(atributos),
        produto.atributos.entrega?.includes(PRONTA_ENTREGA) ? 'pronta_entrega' : 'sob_encomenda', categoriaId, linhaCores, cor, indice * 10, agora, agora,
      );
      for (const [ordem, chave] of (doProduto.get(produto.slug) ?? []).entries()) {
        const grupoId = idDoGrupo.get(chave);
        if (grupoId) await database.prepare('INSERT INTO loja_produto_grupos (produto_id, grupo_id, ordem) VALUES (?, ?, ?)').run(id, grupoId, ordem);
      }
      idDoProduto.set(produto.slug, id);
      novos.push(produto);
      contar('produtos', true);
    }
    for (const produto of novos) {
      for (const [ordem, slug] of produto.complementos.entries()) {
        const relacionado = idDoProduto.get(slug);
        if (relacionado && relacionado !== idDoProduto.get(produto.slug))
          await database.prepare("INSERT INTO loja_produto_relacionados (produto_id, relacionado_id, tipo, ordem) VALUES (?, ?, 'complemento', ?) ON CONFLICT DO NOTHING").run(idDoProduto.get(produto.slug) as string, relacionado, ordem);
      }
    }

    // Coleção "Mais vendidos" (home e carrinho vazio).
    if (await database.prepare("SELECT id FROM loja_colecoes WHERE slug = 'mais-vendidos'").get()) contar('colecoes', false);
    else {
      const id = novoId();
      await database.prepare("INSERT INTO loja_colecoes (id, slug, nome, descricao, onde, ordem, ativa, revisao, criado, atualizado) VALUES (?, 'mais-vendidos', 'Mais vendidos', 'Os 8 mais vendidos da home e do carrinho vazio.', 'ambos', 0, 1, 1, ?, ?)").run(id, agora, agora);
      for (const [ordem, slug] of MAIS_VENDIDOS_SLUGS.entries()) {
        const produtoId = idDoProduto.get(slug);
        if (produtoId) await database.prepare('INSERT INTO loja_colecao_produtos (colecao_id, produto_id, ordem) VALUES (?, ?, ?)').run(id, produtoId, ordem);
      }
      contar('colecoes', true);
    }

    // Menu do cabeçalho: só com a tabela vazia (o menu é um todo; editar item a item é no ERP).
    if (Number((await database.prepare('SELECT COUNT(*) AS total FROM loja_menu_itens').get())?.total ?? 0) > 0) contar('menu', false);
    else {
      const inserir = async (campos: { id?: string; paiId: string | null; secao: string; rotulo: string; href: string; ordem: number; descricao?: string; imagem?: string; tom?: string; icone?: string; painel?: string; externo?: boolean; destaque?: boolean; soBotao?: boolean }) => {
        const id = campos.id ?? novoId();
        await database.prepare('INSERT INTO loja_menu_itens (id, pai_id, secao, rotulo, href, descricao, imagem, tom, icone, painel, externo, destaque, so_botao, ordem, ativo, revisao, criado, atualizado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)')
          .run(id, campos.paiId, campos.secao, campos.rotulo, campos.href, campos.descricao ?? '', campos.imagem ?? '', campos.tom ?? '', campos.icone ?? '', campos.painel ?? '', campos.externo ? 1 : 0, campos.destaque ? 1 : 0, campos.soBotao ? 1 : 0, campos.ordem, agora, agora);
        resumo.menu.criados++;
        return id;
      };
      for (const [ordemItem, item] of montarMenu().entries()) {
        const itemId = await inserir({ id: item.id, paiId: null, secao: 'item', rotulo: item.rotulo, href: item.href, ordem: ordemItem * 10, painel: item.painel.tipo, destaque: item.destaque, soBotao: item.soBotao });
        const painel = item.painel;
        if (painel.tipo === 'colunas') {
          for (const [ordem, link] of painel.destaques.entries()) await inserir({ paiId: itemId, secao: 'destaque', rotulo: link.rotulo, href: link.href, externo: link.externo, ordem });
          for (const [ordem, link] of painel.secundarios.entries()) await inserir({ paiId: itemId, secao: 'secundario', rotulo: link.rotulo, href: link.href, externo: link.externo, ordem });
          for (const [ordem, coluna] of painel.colunas.entries()) {
            const colunaId = await inserir({ paiId: itemId, secao: 'coluna', rotulo: coluna.titulo, href: coluna.href, ordem });
            for (const [ordemLink, link] of coluna.links.entries()) await inserir({ paiId: colunaId, secao: 'link', rotulo: link.rotulo, href: link.href, externo: link.externo, ordem: ordemLink });
          }
          if (painel.promo) await inserir({ paiId: itemId, secao: 'promo', rotulo: painel.promo.titulo, descricao: painel.promo.descricao, href: painel.promo.href, tom: painel.promo.tom, icone: painel.promo.icone, imagem: painel.promo.src ?? '', ordem: 0 });
        }
        for (const [ordem, card] of painel.cards.entries()) await inserir({ paiId: itemId, secao: 'card', rotulo: card.rotulo, href: card.href, tom: card.tom, icone: card.icone, imagem: card.src ?? '', ordem });
      }
    }

    // Cupons de campanha do código (o BEMVINDO5 continua especial: é o de primeira compra de cada conta).
    for (const cupom of CUPONS.filter((item) => item.codigo !== CUPOM_GENERICO_PRIMEIRA)) {
      if (await database.prepare('SELECT id FROM loja_cupons_campanha WHERE codigo = ?').get(cupom.codigo)) { contar('cupons', false); continue; }
      await database.prepare("INSERT INTO loja_cupons_campanha (id, codigo, descricao, tipo, valor, minimo_centavos, exibir, ativo, revisao, criado, atualizado) VALUES (?, ?, ?, 'percentual', ?, ?, ?, 1, 1, ?, ?)")
        .run(novoId(), cupom.codigo, cupom.descricao, cupom.percentual, cupom.minimoCentavos, cupom.exibir ? 1 : 0, agora, agora);
      contar('cupons', true);
    }
    await auditarGestao(ator, 'imported', 'loja_produtos', 'catalogo-de-exemplo');
  });
  return resumo;
}
