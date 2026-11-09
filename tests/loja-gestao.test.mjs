// Gestão do e-commerce no ERP (migração 010): esquema e espelho SQLite, importação idempotente do catálogo
// de exemplo (e a loja idêntica lendo do banco), CRUD com validação e revisão, cupom de campanha no pedido,
// opção com acréscimo no recálculo do servidor, carrinho abandonado, lead no cadastro e permissões.
// SQLite temporário por padrão; com LOJA_GESTAO_TEST_POSTGRES=1, PostgreSQL em WASM (PGlite) com as migrações
// 001, 006, 009 e 010. Não conecta ao Supabase nem usa credenciais reais.
// Roda com o carregador scripts/lib/registrar-ts.mjs (npm run test:loja-gestao).
import test, { after, afterEach, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { closeDatabases } from '../src/lib/database.ts';
import { initializeERP } from '../src/lib/erp/core.ts';
import { cadastrarCliente, contasDb, criarPedido, detalheClienteLoja, excluirConta, listarClientesLoja } from '../src/lib/loja/contas.ts';
import { gestaoDb, gestaoSchema, gravacaoLojaPermitida } from '../src/lib/loja/gestao/esquema.ts';
import { importarCatalogoDeExemplo } from '../src/lib/loja/gestao/semente.ts';
import { lerCatalogoDoBanco } from '../src/lib/loja/gestao/catalogoBanco.ts';
import { atualizarCategoria, criarCategoria, imagensDaLoja, listarCategorias, ordenarCategorias, removerCategoria } from '../src/lib/loja/gestao/categorias.ts';
import { arquivarProduto, atualizarProduto, criarProduto, duplicarProduto, listarProdutosGestao, obterProduto, removerProduto } from '../src/lib/loja/gestao/produtos.ts';
import { atualizarGrupo, criarColecao, criarGrupo, listarGrupos, obterGrupo, removerGrupo, atualizarColecao } from '../src/lib/loja/gestao/opcoes.ts';
import { atualizarItemMenu, criarItemMenu, obterMenu, ordenarMenu, removerItemMenu } from '../src/lib/loja/gestao/menu.ts';
import { atualizarCupom, criarCupom, cuponsDeCampanha, listarCupons, usosDoCupom } from '../src/lib/loja/gestao/cupons.ts';
import { listarCarrinhosAbandonados, mensagemDoCarrinho, sincronizarCarrinho } from '../src/lib/loja/gestao/carrinhos.ts';
import { enviarImagem, arquivoDaImagem, reordenarImagens, removerImagem } from '../src/lib/loja/gestao/imagens.ts';
import { painelDaLoja } from '../src/lib/loja/gestao/painel.ts';
import { catalogoParaCarrinho } from '../src/loja/lib/carrinho/catalogo.ts';
import { arvoreDoCatalogo, catalogoEstatico } from '../src/loja/lib/catalogo/fonte.ts';
import { montarMenu } from '../src/loja/componentes/layout/cabecalho/menu.ts';
import { escolherCupom } from '../src/loja/lib/contas/regras.ts';

const postgres = process.env.LOJA_GESTAO_TEST_POSTGRES === '1';
const gestora = { id: 'admin-1', name: 'Gestora', email: 'gestora@example.test', permission: 'admin' };
const MIGRACOES = ['001_auth.sql', '006_erp.sql', '009_loja_clientes.sql', '010_loja_gestao.sql', '012_storage.sql', '014_image_compression.sql'];
let directory, engine, socket, sequencia = 0;

before(async () => {
  if (!postgres) return;
  const { PGlite } = await import('@electric-sql/pglite');
  const { PGLiteSocketServer } = await import('@electric-sql/pglite-socket');
  engine = await PGlite.create();
  const port = Number(process.env.LOJA_GESTAO_POSTGRES_TEST_PORT || 55451);
  socket = new PGLiteSocketServer({ db: engine, host: '127.0.0.1', port });
  await engine.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  await socket.start();
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
  process.env.DATABASE_SSL_MODE = 'disable';
});
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'loja-gestao-'));
  process.env.ERP_DB_PATH = join(directory, 'erp.sqlite');
  process.env.AUTH_DB_PATH = join(directory, 'auth.sqlite');
  delete process.env.VERCEL;
  if (!postgres) { delete process.env.DATABASE_URL; process.env.ALLOW_LOCAL_SQLITE = 'true'; }
  else {
    await engine.exec('DROP SCHEMA IF EXISTS erp_core CASCADE; DROP SCHEMA IF EXISTS erp_auth CASCADE;');
    for (const file of MIGRACOES) await engine.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  }
  await initializeERP();
});
afterEach(async () => { await closeDatabases(); await rm(directory, { recursive: true, force: true }); });
after(async () => { await closeDatabases(); if (socket) await socket.stop(); if (engine) await engine.close(); });

const rejeita = (operacao, codigo, status) => assert.rejects(operacao, (erro) => (erro?.code === codigo && (!status || erro.status === status)) || assert.fail(`esperava ${codigo}/${status}, veio ${erro?.code}/${erro?.status}: ${erro?.message}`));
const normal = (valor) => JSON.parse(JSON.stringify(valor));
const cadastro = (extra = {}) => ({ nome: 'Ana Souza', whatsapp: '(85) 99999-1234', email: `ana${++sequencia}@example.test`, senha: 'enxoval2026', termos: true, ...extra });
const mapaDaSacola = async () => new Map(catalogoParaCarrinho((await lerCatalogoDoBanco()).produtos).map((produto) => [produto.slug, produto]));
const produtoPorSlug = async (slug) => (await gestaoDb().prepare('SELECT * FROM loja_produtos WHERE slug = ?').get(slug));
const fotoPng = () => sharp({ create: { width: 2400, height: 1200, channels: 3, background: '#d9c7b8' } }).png().toBuffer();

test('migração 010: as mesmas tabelas no PostgreSQL e no espelho SQLite, com RLS e idempotente', async () => {
  const sql = await readFile(new URL('../supabase/migrations/010_loja_gestao.sql', import.meta.url), 'utf8');
  const tabelas = (texto) => [...texto.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)].map((achado) => achado[1]).sort();
  assert.equal(tabelas(sql).length, 15);
  assert.deepEqual(tabelas(gestaoSchema), tabelas(sql), 'o espelho SQLite tem as mesmas tabelas');
  for (const tabela of tabelas(sql)) assert.match(sql, new RegExp(`ALTER TABLE ${tabela} ENABLE ROW LEVEL SECURITY`));
  assert.doesNotMatch(sql.replace(/--.*$/gm, ''), /\bDROP\b|\bGRANT\b/);
  if (postgres) {
    await engine.exec(sql); // reaplicar não falha
    const rls = await engine.query("SELECT count(*)::int AS total FROM pg_tables WHERE schemaname = 'erp_core' AND tablename LIKE 'loja_%' AND rowsecurity");
    assert.equal(rls.rows[0].total, 20, '5 tabelas da 008/009 + 15 da 010, todas com RLS');
  }
  // A migração registrada nos scripts de diagnóstico.
  assert.ok((await readdir(new URL('../supabase/migrations/', import.meta.url))).includes('010_loja_gestao.sql'));
  assert.match(await readFile(new URL('../scripts/check-database.mjs', import.meta.url), 'utf8'), /'loja_cliente_leads'/);
});

test('importação idempotente: o catálogo do banco é idêntico ao de exemplo (produtos, menu, árvore e cupons)', async () => {
  assert.equal(await lerCatalogoDoBanco(), null, 'banco vazio: a loja usa o catálogo estático');
  const primeira = await importarCatalogoDeExemplo('teste');
  const estatico = catalogoEstatico();
  assert.equal(primeira.produtos.criados, estatico.produtos.length);
  assert.equal(primeira.cupons.criados, 1, 'ENXOVAL10 (o BEMVINDO5 continua especial)');
  const segunda = await importarCatalogoDeExemplo('teste');
  for (const [nome, contagem] of Object.entries(segunda)) assert.equal(contagem.criados, 0, `${nome}: nada novo na 2ª vez`);
  const banco = await lerCatalogoDoBanco();
  assert.equal(banco.origem, 'banco');
  assert.deepEqual(normal(banco.produtos), normal(estatico.produtos), 'mesma estrutura Produto, campo a campo');
  assert.deepEqual(normal(banco.menu), normal(montarMenu()), 'mesmo menu do cabeçalho');
  assert.deepEqual(banco.maisVendidos, estatico.maisVendidos);
  const arvoreBanco = arvoreDoCatalogo(banco, montarMenu), arvoreEstatica = arvoreDoCatalogo(estatico, montarMenu);
  assert.deepEqual([...arvoreBanco.existentes], [...arvoreEstatica.existentes]);
  for (const chave of arvoreEstatica.existentes) {
    assert.deepEqual(arvoreBanco.buscarCategoria(chave), arvoreEstatica.buscarCategoria(chave));
    assert.deepEqual(arvoreBanco.categoriasRelacionadas([chave]), arvoreEstatica.categoriasRelacionadas([chave]));
  }
  assert.deepEqual(arvoreBanco.caminhosParaPreGerar(), arvoreEstatica.caminhosParaPreGerar());
  assert.deepEqual((await cuponsDeCampanha()).map((cupom) => cupom.codigo), ['ENXOVAL10']);
  // A equipe edita; reimportar não desfaz.
  const jardim = await produtoPorSlug('kit-berco-jardim-rose');
  await atualizarProduto(jardim.id, { revisao: 1, nome: 'Kit berço Jardim rosê (editado)' }, gestora);
  await importarCatalogoDeExemplo('teste');
  assert.equal((await produtoPorSlug('kit-berco-jardim-rose')).nome, 'Kit berço Jardim rosê (editado)');
});

test('categorias: validação, endereço reservado, troca de slug propaga às filhas, ordem e remoção protegida', async () => {
  const raiz = (await criarCategoria({ slug: 'presentes', nome: 'Presentes' }, gestora)).categoria;
  assert.equal(raiz.caminho, 'presentes');
  const filha = (await criarCategoria({ paiId: raiz.id, slug: 'kits', nome: 'Kits de presente' }, gestora)).categoria;
  assert.equal(filha.caminho, 'presentes/kits');
  await rejeita(criarCategoria({ slug: 'Presentes Lindos', nome: 'x' }, gestora), 'INVALID_SLUG', 400);
  await rejeita(criarCategoria({ slug: 'produto', nome: 'Produto' }, gestora), 'RESERVED_SLUG', 400);
  await rejeita(criarCategoria({ paiId: raiz.id, slug: 'kits', nome: 'Outra' }, gestora), 'DUPLICATE_SLUG', 409);
  await rejeita(criarCategoria({ slug: 'x', nome: 'X', preco: 1 }, gestora), 'UNKNOWN_FIELD', 400);
  await rejeita(atualizarCategoria(raiz.id, { revisao: 1, paiId: filha.id }, gestora), 'INVALID_PARENT', 400);
  const renomeada = (await atualizarCategoria(raiz.id, { revisao: 1, slug: 'mimos' }, gestora)).categoria;
  assert.equal(renomeada.caminho, 'mimos');
  assert.equal((await listarCategorias()).categorias.find((categoria) => categoria.id === filha.id).caminho, 'mimos/kits');
  await rejeita(atualizarCategoria(raiz.id, { revisao: 1, nome: 'Velha' }, gestora), 'REVISION_CONFLICT', 409);
  const outra = (await criarCategoria({ slug: 'lembrancas', nome: 'Lembranças' }, gestora)).categoria;
  const ordem = await ordenarCategorias({ paiId: null, ids: [outra.id, raiz.id] }, gestora);
  assert.deepEqual(ordem.arvore.map((no) => no.id), [outra.id, raiz.id]);
  await rejeita(ordenarCategorias({ paiId: null, ids: [outra.id] }, gestora), 'INVALID_ORDER', 400);
  const produto = (await criarProduto({ slug: 'caixa-mimo', sku: 'MK-9001', nome: 'Caixa mimo', precoCentavos: 9900, categoriaId: filha.id }, gestora)).produto;
  const atualFilha = (await listarCategorias()).categorias.find((categoria) => categoria.id === filha.id);
  await rejeita(removerCategoria(filha.id, atualFilha.revisao, gestora), 'CATEGORY_IN_USE', 409);
  await rejeita(removerCategoria(raiz.id, (await listarCategorias()).categorias.find((categoria) => categoria.id === raiz.id).revisao, gestora), 'CATEGORY_HAS_CHILDREN', 409);
  await removerProduto(produto.id, produto.revisao, gestora);
  assert.deepEqual(await removerCategoria(filha.id, atualFilha.revisao, gestora), { removida: true });
});

test('produtos: cadastro validado, rascunho fora da loja, ativo na loja, duplicar, arquivar e remover protegido', async () => {
  await importarCatalogoDeExemplo('teste');
  const categoria = (await listarCategorias()).categorias.find((item) => item.caminho === 'enxoval/mantas');
  await rejeita(criarProduto({ slug: 'manta-nova', sku: 'MK-2001', nome: 'Manta nova', categoriaId: categoria.id }, gestora), 'INVALID_INPUT', 400);
  await rejeita(criarProduto({ slug: 'manta-nova', sku: 'mk 2001', nome: 'Manta', precoCentavos: 100, categoriaId: categoria.id }, gestora), 'INVALID_SKU', 400);
  await rejeita(criarProduto({ slug: 'manta-nova', sku: 'MK-2001', nome: 'Manta', precoCentavos: 10000, precoDeCentavos: 9000, categoriaId: categoria.id }, gestora), 'INVALID_NUMBER', 400);
  await rejeita(criarProduto({ slug: 'manta-de-trico-trancada', sku: 'MK-2001', nome: 'Manta', precoCentavos: 100, categoriaId: categoria.id }, gestora), 'DUPLICATE_SLUG', 409);
  await rejeita(criarProduto({ slug: 'manta-nova', sku: 'MK-2001', nome: 'Manta', precoCentavos: 100, categoriaId: categoria.id, prazoMinDias: 10 }, gestora), 'INVALID_INPUT', 400);
  const { produto } = await criarProduto({
    slug: 'manta-nova', sku: 'mk-2001', nome: 'Manta de tricô nova', precoCentavos: 31990, precoDeCentavos: 35990, categoriaId: categoria.id, disponibilidade: 'pronta_entrega',
    atributos: { cor: ['Cru'], tecido: ['Tricô'], entrega: ['ignorado'] }, descricao: ['Primeiro parágrafo.', 'Segundo.'], prazoMinDias: 1, prazoMaxDias: 3, seoTitulo: 'Manta nova de tricô',
  }, gestora, 'https://www.example.test');
  assert.equal(produto.sku, 'MK-2001');
  assert.equal(produto.status, 'rascunho');
  assert.deepEqual(produto.atributos, { cor: ['Cru'], tecido: ['Tricô'] }, 'entrega é derivada da disponibilidade');
  assert.equal(produto.urlLoja, 'https://www.example.test/produto/manta-nova');
  assert.equal((await lerCatalogoDoBanco()).produtos.some((item) => item.slug === 'manta-nova'), false, 'rascunho não aparece');
  const ativo = (await atualizarProduto(produto.id, { revisao: produto.revisao, status: 'ativo' }, gestora)).produto;
  const naLoja = (await lerCatalogoDoBanco()).produtos.find((item) => item.slug === 'manta-nova');
  assert.equal(naLoja.preco, '319.90');
  assert.equal(naLoja.precoDe, '359.90');
  assert.deepEqual(naLoja.atributos.entrega, ['Pronta entrega']);
  assert.deepEqual(naLoja.atributos.retirada, ['Sim']);
  assert.deepEqual(naLoja.prazo, { min: 1, max: 3 });
  assert.equal(naLoja.seo.titulo, 'Manta nova de tricô');
  assert.equal(naLoja.semelhantes.length, 8, 'sem semelhantes cadastrados: o automático da categoria');
  await rejeita(atualizarProduto(produto.id, { revisao: produto.revisao, nome: 'Velho' }, gestora), 'REVISION_CONFLICT', 409);
  const copia = (await duplicarProduto(produto.id, {}, gestora)).produto;
  assert.equal(copia.slug, 'manta-nova-copia');
  assert.equal(copia.status, 'rascunho');
  assert.equal(copia.sku, 'MK-2001-C1');
  const lista = await listarProdutosGestao(new URL(`http://erp.test/?status=rascunho&categoria=${categoria.id}`));
  assert.deepEqual(lista.produtos.map((item) => item.slug), ['manta-nova-copia']);
  assert.ok(lista.contagem.ativo >= 35);
  assert.equal((await listarProdutosGestao(new URL('http://erp.test/?busca=mk-2001'))).pagination.total, 2);
  await rejeita(removerProduto(ativo.id, ativo.revisao, gestora), 'PRODUCT_ACTIVE', 409);
  const arquivado = (await arquivarProduto(ativo.id, ativo.revisao, gestora)).produto;
  assert.equal(arquivado.status, 'arquivado');
  assert.equal((await lerCatalogoDoBanco()).produtos.some((item) => item.slug === 'manta-nova'), false);
  assert.deepEqual(await removerProduto(arquivado.id, arquivado.revisao, gestora), { removido: true });
  const auditoria = await gestaoDb().prepare("SELECT action FROM erp_audit WHERE resource = 'loja_produtos' AND actor = ?").all(gestora.id);
  assert.ok(['created', 'updated', 'archived', 'removed'].every((acao) => auditoria.some((linha) => linha.action === acao)));
});

test('fotos do produto: recomprimidas em WebP 1600 px sem metadados, ordem, ETag e só de produto ativo na loja', async () => {
  await importarCatalogoDeExemplo('teste');
  const alvo = await produtoPorSlug('manta-de-trico-trancada');
  await rejeita(enviarImagem(alvo.id, { conteudo: Buffer.from('não é imagem'), revisao: alvo.revisao }, gestora), 'FOTO_TIPO', 415);
  let { imagens } = await enviarImagem(alvo.id, { conteudo: await fotoPng(), revisao: alvo.revisao, alt: 'Manta dobrada', cor: 'Cru' }, gestora);
  assert.equal(imagens[0].largura, 1600);
  assert.equal(imagens[0].tipo, 'principal');
  ({ imagens } = await enviarImagem(alvo.id, { conteudo: await fotoPng(), revisao: alvo.revisao + 1 }, gestora));
  assert.equal(imagens[1].tipo, 'detalhe');
  const arquivo = await arquivoDaImagem(imagens[0].id, 'grande', true);
  assert.equal((await sharp(arquivo.conteudo).metadata()).format, 'webp');
  assert.match(arquivo.etag, /^"[0-9a-f]{32}-grande"$/);
  ({ imagens } = await reordenarImagens(alvo.id, { revisao: alvo.revisao + 2, ids: [imagens[1].id, imagens[0].id] }, gestora));
  assert.equal(imagens[0].posicao, 0);
  const naLoja = (await lerCatalogoDoBanco()).produtos.find((item) => item.slug === 'manta-de-trico-trancada');
  assert.match(naLoja.imagens[0].src, /^\/api\/catalogo\/imagem\/[0-9a-f-]{36}\?v=[0-9a-f]{12}$/);
  ({ imagens } = await removerImagem(alvo.id, imagens[0].id, alvo.revisao + 3, gestora));
  assert.equal(imagens.length, 1);
  assert.equal(imagens[0].posicao, 0);
  await atualizarProduto(alvo.id, { revisao: alvo.revisao + 4, status: 'rascunho' }, gestora);
  await rejeita(arquivoDaImagem(imagens[0].id, 'mini', true), 'NOT_FOUND', 404);
  assert.ok((await arquivoDaImagem(imagens[0].id, 'mini', false)).conteudo.length > 0, 'a prévia do ERP vê o rascunho');
  const copia=(await duplicarProduto(alvo.id,{},gestora)).produto;
  assert.equal((await sharp((await arquivoDaImagem(copia.imagens[0].id,'grande',false,undefined,'avif')).conteudo).metadata()).compression,'av1');
  await removerProduto(copia.id,copia.revisao,gestora);
  assert.equal(Number((await gestaoDb().prepare('SELECT COUNT(*) AS total FROM image_variants WHERE owner_id=?').get(copia.imagens[0].id)).total),0);
});

test('opções: grupo com acréscimo reflete no preço da sacola e no recálculo do pedido; grupo em uso não sai', async () => {
  await importarCatalogoDeExemplo('teste');
  const grupos = (await listarGrupos()).grupos;
  const berco = grupos.find((grupo) => grupo.chave === 'tamanho-do-berco');
  const bordado = grupos.find((grupo) => grupo.chave === 'bordado-com-nome');
  assert.equal(berco.minimo, 1);
  assert.ok(berco.produtos > 5);
  await rejeita(atualizarGrupo(bordado.id, { revisao: bordado.revisao, opcoes: [{ rotulo: 'A' }, { rotulo: 'B' }] }, gestora), 'INVALID_INPUT', 400);
  await rejeita(removerGrupo(berco.id, berco.revisao, gestora), 'GROUP_IN_USE', 409);
  // O berço americano passa a custar R$ 120 a mais; o bordado do nome, R$ 35.
  await atualizarGrupo(berco.id, { revisao: berco.revisao, opcoes: berco.opcoes.map((opcao, indice) => ({ id: opcao.id, rotulo: opcao.rotulo, disponivel: opcao.disponivel, acrescimoCentavos: indice === 0 ? 12000 : 0 })) }, gestora);
  await atualizarGrupo(bordado.id, { revisao: bordado.revisao, opcoes: [{ id: bordado.opcoes[0].id, rotulo: 'Bordado com nome', acrescimoCentavos: 3500 }] }, gestora);
  const catalogo = await mapaDaSacola();
  const kit = catalogo.get('kit-berco-jardim-rose');
  assert.equal(kit.opcoes[0].acrescimoCentavos, 12000);
  assert.equal(kit.personalizacaoAcrescimoCentavos, 3500);
  const { cliente } = await cadastrarCliente(cadastro());
  const itens = [
    { slug: 'kit-berco-jardim-rose', quantidade: 1, variacao: 'Berço americano · 70 × 130 cm', personalizacao: 'com' },
    { slug: 'kit-berco-jardim-rose', quantidade: 2, variacao: 'Berço padrão · 60 × 130 cm', personalizacao: 'sem' },
  ];
  const { pedido } = await criarPedido(cliente.id, { itens }, { catalogo });
  assert.equal(pedido.subtotalCentavos, (149000 + 12000 + 3500) + 2 * 149000);
  assert.match(pedido.mensagem, /A partir de R\$ 1\.645,00/);
  // Grupo novo de escolha: não pode haver dois no mesmo produto (a página mostra um seletor).
  const outro = (await criarGrupo({ chave: 'cor-da-linha', nome: 'Cor da linha', tipo: 'escolha', opcoes: [{ rotulo: 'Rosa' }, { rotulo: 'Azul' }] }, gestora)).grupo;
  const jardim = await obterProduto((await produtoPorSlug('kit-berco-jardim-rose')).id);
  await rejeita(atualizarProduto(jardim.produto.id, { revisao: jardim.produto.revisao, grupos: [berco.id, outro.id] }, gestora), 'INVALID_GROUP', 400);
  assert.deepEqual(await removerGrupo(outro.id, outro.revisao, gestora), { removido: true });
});

test('cupom de campanha: valor fixo, mínimo, limite total e por cliente, só primeira compra, usos registrados', async () => {
  await importarCatalogoDeExemplo('teste');
  await rejeita(criarCupom({ codigo: 'BEMVINDO5', tipo: 'percentual', valor: 5 }, gestora), 'RESERVED_CODE', 400);
  await rejeita(criarCupom({ codigo: 'X1', tipo: 'percentual', valor: 5 }, gestora), 'INVALID_CODE', 400);
  await rejeita(criarCupom({ codigo: 'MUITO60', tipo: 'percentual', valor: 60 }, gestora), 'INVALID_NUMBER', 400);
  await rejeita(criarCupom({ codigo: 'DATAS', tipo: 'valor', valor: 100, inicio: '2026-12-10', fim: '2026-12-01' }, gestora), 'INVALID_DATE_RANGE', 400);
  const fixo = (await criarCupom({ codigo: 'mimo50', tipo: 'valor', valor: 5000, minimoCentavos: 20000, limiteTotal: 1, descricao: 'R$ 50 em compras acima de R$ 200', exibir: true }, gestora)).cupom;
  assert.equal(fixo.codigo, 'MIMO50');
  assert.equal(fixo.situacao, 'ativo');
  const primeira = (await criarCupom({ codigo: 'PRIMEIRA10', tipo: 'percentual', valor: 10, primeiraCompra: true }, gestora)).cupom;
  const catalogo = await mapaDaSacola();
  const ana = await cadastrarCliente(cadastro()), bia = await cadastrarCliente(cadastro());
  const itens = [{ slug: 'manta-de-trico-trancada', quantidade: 1 }];
  await rejeita(criarPedido(ana.cliente.id, { itens: [{ slug: 'fraldas-de-boca-bordadas-kit-com-3', quantidade: 1 }], cupom: 'mimo50' }, { catalogo }), 'CUPOM_INVALIDO', 400);
  const { pedido } = await criarPedido(ana.cliente.id, { itens, cupom: 'mimo50' }, { catalogo });
  assert.equal(pedido.descontoCentavos, 5000);
  assert.deepEqual(pedido.cupom, { codigo: 'MIMO50', percentual: 0 });
  assert.match(pedido.mensagem, /Cupom MIMO50 \(R\$ 50,00 OFF\): -R\$/);
  await rejeita(criarPedido(bia.cliente.id, { itens, cupom: 'MIMO50' }, { catalogo }), 'CUPOM_ESGOTADO', 409);
  assert.equal((await cuponsDeCampanha()).some((cupom) => cupom.codigo === 'MIMO50'), false, 'esgotado sai da sacola');
  const usos = await usosDoCupom(fixo.id, new URL('http://erp.test/'));
  assert.equal(usos.usos.length, 1);
  assert.equal(usos.usos[0].pedidoNumero, pedido.numero);
  assert.equal(usos.cupom.situacao, 'esgotado');
  // Só primeira compra: a Ana já pediu, a Bia não.
  await rejeita(criarPedido(ana.cliente.id, { itens, cupom: 'PRIMEIRA10' }, { catalogo }), 'CUPOM_ESGOTADO', 409);
  assert.equal((await criarPedido(bia.cliente.id, { itens, cupom: 'PRIMEIRA10' }, { catalogo })).pedido.descontoCentavos, 2690);
  // Desativar tira o cupom da conferência do servidor; o de boas-vindas continua igual.
  await atualizarCupom(primeira.id, { revisao: primeira.revisao, ativo: false }, gestora);
  const carla = await cadastrarCliente(cadastro());
  await rejeita(criarPedido(carla.cliente.id, { itens, cupom: 'PRIMEIRA10' }, { catalogo }), 'CUPOM_INVALIDO', 400);
  assert.equal((await criarPedido(carla.cliente.id, { itens, cupom: carla.cupom.codigo }, { catalogo })).pedido.descontoCentavos, Math.round(26900 * 0.05));
  assert.equal((await listarCupons(new URL('http://erp.test/?busca=primeira'))).cupons[0].situacao, 'inativo');
  // Prévia da sacola com os cupons do servidor: validade e valor fixo.
  const conta = { logada: true, cupom: null };
  assert.equal(escolherCupom('NATAL', 50000, conta, [{ codigo: 'NATAL', percentual: 0, valorCentavos: 3000, minimoCentavos: 0, descricao: '', inicio: Date.now() + 60_000 }]).tipo, 'invalido', 'ainda não começou');
  assert.equal(escolherCupom('ENXOVAL10', 200000, conta, await cuponsDeCampanha()).tipo, 'ok');
});

test('carrinho sincronizado: só itens válidos, sem regravar à toa, abandonado após X horas, mensagem wa.me e convertido no pedido', async () => {
  await importarCatalogoDeExemplo('teste');
  const catalogo = await mapaDaSacola();
  const { cliente } = await cadastrarCliente(cadastro({ nome: 'Helena Prado', whatsapp: '(85) 98888-1111' }));
  const agora = Date.now(), horas = 3_600_000;
  await rejeita(sincronizarCarrinho(cliente.id, { itens: 'x' }, catalogo, agora), 'INVALID_INPUT', 400);
  await rejeita(sincronizarCarrinho(cliente.id, { itens: [], preco: 1 }, catalogo, agora), 'UNKNOWN_FIELD', 400);
  const itens = [{ slug: 'manta-de-trico-trancada', quantidade: 2 }, { slug: 'nao-existe', quantidade: 1 }, { lixo: true }];
  assert.deepEqual(await sincronizarCarrinho(cliente.id, { itens }, catalogo, agora - 30 * horas), { sincronizado: true, alterado: true });
  assert.deepEqual(await sincronizarCarrinho(cliente.id, { itens }, catalogo, agora - 29 * horas), { sincronizado: true, alterado: false }, 'mesmos itens: não mexe no "parado há"');
  const linha = await gestaoDb().prepare('SELECT * FROM loja_carrinhos WHERE cliente_id = ?').get(cliente.id);
  assert.equal(Number(linha.total_centavos), 2 * 26900, 'só o que está disponível soma');
  const lista = await listarCarrinhosAbandonados(new URL('http://erp.test/?horas=24'), agora);
  assert.equal(lista.pagination.total, 1);
  assert.equal(lista.carrinhos[0].horasParado, 30);
  assert.equal(lista.carrinhos[0].itens.length, 2);
  assert.equal(lista.carrinhos[0].itens[1].disponivel, false);
  assert.equal((await listarCarrinhosAbandonados(new URL('http://erp.test/?horas=48'), agora)).pagination.total, 0);
  await rejeita(listarCarrinhosAbandonados(new URL('http://erp.test/?horas=0'), agora), 'INVALID_FILTER', 400);
  const lembrete = await mensagemDoCarrinho(cliente.id, gestora, 'https://www.example.test', agora);
  assert.match(lembrete.link, /^https:\/\/wa\.me\/5585988881111\?text=/);
  assert.match(lembrete.mensagem, /Oi, Helena!/);
  assert.match(lembrete.mensagem, /2× Manta de tricô trançada/);
  assert.equal((await listarCarrinhosAbandonados(new URL('http://erp.test/?lembrete=sem'), agora)).pagination.total, 0);
  // O pedido converte o carrinho (sai dos abandonados); itens novos depois começam outro carrinho.
  const { pedido } = await criarPedido(cliente.id, { itens: [{ slug: 'manta-de-trico-trancada', quantidade: 2 }] }, { catalogo, agora });
  const convertido = await gestaoDb().prepare('SELECT * FROM loja_carrinhos WHERE cliente_id = ?').get(cliente.id);
  assert.equal(convertido.pedido_numero, pedido.numero);
  assert.equal((await listarCarrinhosAbandonados(new URL('http://erp.test/?horas=1'), agora + 10 * horas)).pagination.total, 0);
  await sincronizarCarrinho(cliente.id, { itens: [] }, catalogo, agora + horas);
  await sincronizarCarrinho(cliente.id, { itens: [{ slug: 'almofada-nuvem', quantidade: 1 }] }, catalogo, agora + 2 * horas);
  const novo = await gestaoDb().prepare('SELECT * FROM loja_carrinhos WHERE cliente_id = ?').get(cliente.id);
  assert.equal(novo.convertido_em, null);
  assert.equal(novo.lembrete_em, null);
  // Painel: o pedido, a conta nova e a conversão.
  const painel = await painelDaLoja('7d', agora + 3 * horas);
  assert.equal(painel.pedidos, 1);
  assert.equal(painel.valorCentavos, pedido.totalCentavos);
  assert.equal(painel.porEtapa.enviado_whatsapp, 1);
  assert.equal(painel.novasContas, 1);
  assert.equal(painel.produtosMaisPedidos[0].slug, 'manta-de-trico-trancada');
  assert.equal(painel.categoriasMaisPedidas[0].caminho, 'enxoval/mantas');
  assert.equal(painel.serieDiaria.length, 7);
  assert.equal(painel.serieDiaria.reduce((soma, dia) => soma + dia.pedidos, 0), 1);
  // LGPD: excluir a conta apaga o carrinho.
  await excluirConta(cliente.id, 'enxoval2026');
  assert.equal(await gestaoDb().prepare('SELECT cliente_id FROM loja_carrinhos WHERE cliente_id = ?').get(cliente.id), undefined);
});

test('lead do CRM: criado no cadastro (origem "Loja online"), ligado por e-mail/WhatsApp e com nota a cada pedido', async () => {
  await importarCatalogoDeExemplo('teste');
  const { cliente } = await cadastrarCliente(cadastro({ nome: 'Joana Lima', email: 'joana@example.test', whatsapp: '(85) 97777-0000' }));
  const ligacao = await gestaoDb().prepare('SELECT lead_id FROM loja_cliente_leads WHERE cliente_id = ?').get(cliente.id);
  assert.ok(ligacao, 'conta ligada a um lead');
  const lead = await contasDb().prepare('SELECT * FROM leads WHERE id = ?').get(ligacao.lead_id);
  assert.equal(JSON.parse(lead.details_json).source, 'Loja online');
  assert.equal(JSON.parse(lead.data_json).phone, '5585977770000');
  assert.equal(lead.funnel_id, 'vendas');
  // Já havia um lead com o mesmo e-mail: a conta nova liga a ele, sem duplicar.
  const { createLead } = await import('../src/lib/erp/core.ts');
  const existente = (await createLead({ lead: { name: 'Marta (Instagram)', phone: '5585966660000', tags: [] }, details: { email: 'marta@example.test', source: 'Instagram' } }, gestora)).lead;
  const marta = await cadastrarCliente(cadastro({ nome: 'Marta Souza', email: 'MARTA@example.test', whatsapp: '(85) 95555-0000' }));
  assert.equal((await gestaoDb().prepare('SELECT lead_id FROM loja_cliente_leads WHERE cliente_id = ?').get(marta.cliente.id)).lead_id, existente.id);
  const { pedido } = await criarPedido(cliente.id, { itens: [{ slug: 'almofada-nuvem', quantidade: 2 }] }, { catalogo: await mapaDaSacola() });
  const notas = await contasDb().prepare('SELECT text, actor FROM lead_notes WHERE lead_id = ?').all(ligacao.lead_id);
  assert.equal(notas.length, 1);
  assert.equal(notas[0].actor, 'loja');
  assert.match(notas[0].text, new RegExp(`Pedido ${pedido.numero} feito na loja online`));
  assert.match(notas[0].text, /2× Almofada nuvem/);
  // As telas de clientes do ERP recebem o lead vinculado.
  const lista = await listarClientesLoja(new URL('http://erp.test/?busca=joana'));
  assert.equal(lista.clientes[0].lead.leadId, ligacao.lead_id);
  assert.equal(lista.clientes[0].lead.etapa, 'Novo lead');
  assert.equal((await detalheClienteLoja(cliente.id)).lead.href, `/leads/${ligacao.lead_id}`);
});

test('coleções e menu: hierarquia validada, tom/ícone da lista, ordem e a loja lê o menu editado', async () => {
  await importarCatalogoDeExemplo('teste');
  const manta = await produtoPorSlug('manta-de-trico-trancada'), almofada = await produtoPorSlug('almofada-nuvem');
  const colecao = (await criarColecao({ slug: 'pronta-entrega', nome: 'Pronta entrega', produtos: [manta.id, almofada.id] }, gestora)).colecao;
  assert.deepEqual(colecao.produtos.map((produto) => produto.slug), ['manta-de-trico-trancada', 'almofada-nuvem']);
  const reordenada = (await atualizarColecao(colecao.id, { revisao: 1, produtos: [almofada.id, manta.id] }, gestora)).colecao;
  assert.deepEqual(reordenada.produtos.map((produto) => produto.slug), ['almofada-nuvem', 'manta-de-trico-trancada']);
  assert.deepEqual((await lerCatalogoDoBanco()).colecoes.find((item) => item.slug === 'pronta-entrega').produtos, ['almofada-nuvem', 'manta-de-trico-trancada']);
  await rejeita(criarColecao({ slug: 'pronta-entrega', nome: 'Outra' }, gestora), 'DUPLICATE_SLUG', 409);

  const { menu } = await obterMenu();
  assert.equal(menu.length, 7);
  const kitBerco = menu[0], paraQuem = menu.find((item) => item.id === 'para-quem');
  await rejeita(criarItemMenu({ secao: 'link', paiId: kitBerco.id, rotulo: 'Solto', href: '/x' }, gestora), 'INVALID_PARENT', 400);
  await rejeita(criarItemMenu({ secao: 'coluna', paiId: paraQuem.id, rotulo: 'Coluna', href: '/x' }, gestora), 'INVALID_PARENT', 400);
  await rejeita(criarItemMenu({ secao: 'card', paiId: kitBerco.id, rotulo: 'Card', href: '/x', tom: 'roxo' }, gestora), 'INVALID_INPUT', 400);
  await rejeita(criarItemMenu({ secao: 'item', rotulo: 'Fora', href: 'javascript:alert(1)' }, gestora), 'INVALID_URL', 400);
  const novo = (await criarItemMenu({ secao: 'item', rotulo: 'Presentes', href: '/presentes', painel: 'cards', destaque: true }, gestora)).item;
  await criarItemMenu({ secao: 'card', paiId: novo.id, rotulo: 'Caixas', href: '/presentes', tom: 'rose', icone: 'presente' }, gestora);
  await ordenarMenu({ paiId: null, ids: [novo.id] }, gestora);
  const lido = (await lerCatalogoDoBanco()).menu;
  assert.equal(lido[0].rotulo, 'Presentes');
  assert.deepEqual(lido[0].painel, { tipo: 'cards', cards: [{ rotulo: 'Caixas', href: '/presentes', tom: 'rose', icone: 'presente' }] });
  await atualizarItemMenu(novo.id, { revisao: 2, ativo: false }, gestora);
  assert.equal((await lerCatalogoDoBanco()).menu.some((item) => item.rotulo === 'Presentes'), false, 'inativo some da loja');
  await removerItemMenu(novo.id, 3, gestora);
  assert.equal((await obterMenu()).menu.length, 7);
});

test('permissões e gravação: escrita só admin/gestão, dados de clientes fora do perfil membro, sem gravar no banco remoto em desenvolvimento', async () => {
  const { GESTAO, LEITURA_CATALOGO } = { GESTAO: ['admin', 'manager'], LEITURA_CATALOGO: ['admin', 'manager', 'member'] };
  const rotas = await readFile(new URL('../src/lib/loja/gestao/rotas.ts', import.meta.url), 'utf8');
  assert.match(rotas, /export const GESTAO: Permission\[\] = \['admin', 'manager'\]/);
  assert.match(rotas, /mutation: true, roles: GESTAO/);
  const base = new URL('../src/app/api/erp/loja/', import.meta.url);
  const arquivos = (await readdir(base, { recursive: true })).filter((arquivo) => arquivo.endsWith('route.ts') && !/^(clientes|pedidos)/.test(arquivo));
  assert.ok(arquivos.length >= 20);
  for (const arquivo of arquivos) {
    const codigo = await readFile(new URL(arquivo, base), 'utf8');
    for (const [, metodo, corpo] of codigo.matchAll(/export async function (GET|POST|PATCH|PUT|DELETE)\(([\s\S]*?)\n(?=export|$)/g)) {
      if (metodo === 'GET') {
        assert.ok(/lerGestao|requireErpActor/.test(corpo), `${arquivo} GET sem autenticação da equipe`);
        if (/^(cupons|carrinhos|painel)/.test(arquivo)) assert.match(corpo, /GESTAO/, `${arquivo} GET expõe dados de clientes a membros`);
      } else assert.ok(/escreverGestao|mutation:true,roles:\['admin','manager'\]/.test(corpo), `${arquivo} ${metodo} sem papel de escrita`);
    }
  }
  assert.ok(!GESTAO.includes('member') && LEITURA_CATALOGO.includes('member'));
  // Desenvolvimento com DATABASE_URL remoto: a gestão e o carrinho não gravam (como as contas).
  const ambiente = { NODE_ENV: process.env.NODE_ENV, DATABASE_URL: process.env.DATABASE_URL, LOJA: process.env.LOJA_GRAVAR_EM_DESENVOLVIMENTO };
  try {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgresql://usuario:senha@db.example.test:6543/postgres';
    delete process.env.LOJA_GRAVAR_EM_DESENVOLVIMENTO;
    assert.equal(gravacaoLojaPermitida(), false);
    await rejeita(criarCategoria({ slug: 'bloqueada', nome: 'Bloqueada' }, gestora), 'GRAVACAO_DESLIGADA', 503);
    process.env.LOJA_GRAVAR_EM_DESENVOLVIMENTO = 'true';
    assert.equal(gravacaoLojaPermitida(), true);
  } finally {
    for (const [chave, valor] of [['NODE_ENV', ambiente.NODE_ENV], ['DATABASE_URL', ambiente.DATABASE_URL], ['LOJA_GRAVAR_EM_DESENVOLVIMENTO', ambiente.LOJA]]) {
      if (valor === undefined) delete process.env[chave]; else process.env[chave] = valor;
    }
  }
});

test('telas do catálogo: filtro por coleção e ordenação, fotos devolvem a revisão, grupos com onde são usados e imagens da loja', async () => {
  await importarCatalogoDeExemplo('teste');
  const manta = await produtoPorSlug('manta-de-trico-trancada'), almofada = await produtoPorSlug('almofada-nuvem');
  const colecao = (await criarColecao({ slug: 'presentes', nome: 'Presentes', produtos: [manta.id, almofada.id] }, gestora)).colecao;
  const daColecao = await listarProdutosGestao(new URL(`http://erp.test/?colecao=${colecao.id}&ordenar=nome`));
  assert.deepEqual(daColecao.produtos.map((produto) => produto.slug), ['almofada-nuvem', 'manta-de-trico-trancada']);
  const precos = (await listarProdutosGestao(new URL('http://erp.test/?ordenar=-preco&limit=200'))).produtos.map((produto) => produto.precoCentavos);
  assert.deepEqual(precos, [...precos].sort((a, b) => b - a));
  await assert.rejects(listarProdutosGestao(new URL('http://erp.test/?ordenar=preco;drop')), (erro) => erro.code === 'INVALID_FILTER');
  await assert.rejects(listarProdutosGestao(new URL('http://erp.test/?colecao=a%20b')), (erro) => erro.code === 'INVALID_FILTER');

  // Mexer nas fotos sobe a revisão do produto: a resposta traz a nova para o editor seguir sem recarregar.
  const enviada = await enviarImagem(manta.id, { conteudo: await fotoPng(), revisao: manta.revisao }, gestora);
  assert.equal(enviada.revisao, manta.revisao + 1);
  const reordenada = await reordenarImagens(manta.id, { revisao: enviada.revisao, ids: enviada.imagens.map((imagem) => imagem.id) }, gestora);
  assert.equal(reordenada.revisao, manta.revisao + 2);
  assert.equal((await removerImagem(manta.id, enviada.imagens[0].id, reordenada.revisao, gestora)).revisao, manta.revisao + 3);

  const berco = (await listarGrupos()).grupos.find((grupo) => grupo.chave === 'tamanho-do-berco');
  assert.equal(berco.usadoEm.length, berco.produtos);
  assert.ok(berco.usadoEm.every((produto) => produto.id && produto.slug && produto.nome));
  assert.deepEqual((await obterGrupo(berco.id)).grupo.usadoEm, berco.usadoEm);

  const raiz = join(directory, 'public');
  await mkdir(join(raiz, 'vitrine', 'menu', 'kit-berco'), { recursive: true });
  await writeFile(join(raiz, 'vitrine', 'menu', 'kit-berco', 'kits.webp'), 'x');
  await writeFile(join(raiz, 'vitrine', 'menu', 'logo.svg'), 'x');
  const categoria = (await listarCategorias()).categorias[0];
  await atualizarCategoria(categoria.id, { revisao: categoria.revisao, imagem: '/vitrine/categorias/enxoval.jpg' }, gestora);
  assert.deepEqual((await imagensDaLoja(raiz)).imagens, [
    { caminho: '/vitrine/categorias/enxoval.jpg', emUso: true },
    { caminho: '/vitrine/menu/kit-berco/kits.webp', emUso: false },
  ], 'só raster da /vitrine e os já usados (svg fica de fora)');
  assert.deepEqual((await imagensDaLoja(join(directory, 'sem-pasta'))).imagens, [{ caminho: '/vitrine/categorias/enxoval.jpg', emUso: true }]);
});
