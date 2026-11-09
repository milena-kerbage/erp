// Contas de cliente da loja: cadastro, login, sessões, limite de tentativas, cupom de primeira compra
// (uso único, concorrência, sem acumular), pedido com recálculo de preço no servidor, redefinição por
// token, exclusão (LGPD) e isolamento das sessões da equipe do ERP.
// SQLite temporário por padrão; com CONTAS_TEST_POSTGRES=1, PostgreSQL em WASM (PGlite) com as migrações
// 001, 006, 009 e 010 aplicadas. Não conecta ao Supabase nem usa credenciais reais.
import test, { after, afterEach, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closeDatabases } from '../src/lib/database.ts';
import { createSession, createUser, limited, scryptHash, sessionUser, verifyPassword } from '../src/lib/auth/core.ts';
import {
  atualizarPedidoLoja, atualizarPerfil, cadastrarCliente, clienteDaSessao, contasDb, criarPedido, dadosDaConta, detalheClienteLoja, emitirRedefinicao, encerrarSessao,
  entrarCliente, ErroConta, excluirConta, listarClientesLoja, listarPedidosLoja, pedidoDaCliente, pedidosDaCliente, redefinirSenha, REDEFINICAO_DURACAO, SESSAO_DURACAO, trocarSenha,
} from '../src/lib/loja/contas.ts';
import { cupomEfetivo, erroSenha, escolherCupom, etapasConcluidas, validarCadastro, validarPerfil } from '../src/loja/lib/contas/regras.ts';

const postgres = process.env.CONTAS_TEST_POSTGRES === '1';
const gestora = {id: 'admin-1', name: 'Gestora', email: 'gestora@example.test', permission: 'admin'};
const produto = (slug, preco, extra = {}) => ({slug, sku: `SKU-${slug}`, nome: `Peça ${slug}`, marca: 'Milena Kerbage', unidade: 'peça', preco, pix: preco, retirada: true, prontaEntrega: false, precisaEscolher: false, complementos: [], semelhantes: [], ...extra});
const catalogo = new Map([
  ['kit-berco', produto('kit-berco', '1490.00')],
  ['manta', produto('manta', '269.90')],
  ['protetor', produto('protetor', '350.00', {precisaEscolher: true, variacaoTitulo: 'Tamanho do berço', opcoes: [{rotulo: 'Padrão', disponivel: true}, {rotulo: 'Mini cama', disponivel: true}]})],
]);
let directory, engine, socket, sequencia = 0;

before(async () => {
  if (!postgres) return;
  const {PGlite} = await import('@electric-sql/pglite');
  const {PGLiteSocketServer} = await import('@electric-sql/pglite-socket');
  engine = await PGlite.create();
  const port = Number(process.env.CONTAS_POSTGRES_TEST_PORT || 55449);
  socket = new PGLiteSocketServer({db: engine, host: '127.0.0.1', port});
  await engine.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  await socket.start();
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
  process.env.DATABASE_SSL_MODE = 'disable';
});
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'contas-'));
  process.env.ERP_DB_PATH = join(directory, 'erp.sqlite');
  process.env.AUTH_DB_PATH = join(directory, 'auth.sqlite');
  delete process.env.VERCEL;
  if (!postgres) { delete process.env.DATABASE_URL; process.env.ALLOW_LOCAL_SQLITE = 'true'; }
  else {
    await engine.exec('DROP SCHEMA IF EXISTS erp_core CASCADE; DROP SCHEMA IF EXISTS erp_auth CASCADE;');
    for (const file of ['001_auth.sql', '006_erp.sql', '009_loja_clientes.sql', '010_loja_gestao.sql']) await engine.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  }
});
afterEach(async () => { await closeDatabases(); await rm(directory, {recursive: true, force: true}); });
after(async () => { await closeDatabases(); if (socket) await socket.stop(); if (engine) await engine.close(); });

const SENHA = 'enxoval2026';
const cadastro = (extra = {}) => ({nome: 'Ana Souza', whatsapp: '(85) 99999-1234', email: `Ana${++sequencia}@Example.test`, senha: SENHA, termos: true, ...extra});
const rejeita = (operacao, codigo, status) => assert.rejects(operacao, erro => erro?.code === codigo && (!status || erro.status === status) || assert.fail(`esperava ${codigo}/${status}, veio ${erro?.code}/${erro?.status}: ${erro?.message}`));
const itens = [{slug: 'kit-berco', quantidade: 1, preco: '0.01'}, {slug: 'manta', quantidade: 2}];

test('regras puras: cadastro rápido, força básica da senha, perfil opcional e escolha do cupom', () => {
  const invalido = validarCadastro({nome: 'Ana', whatsapp: '123', email: 'x', senha: '1234567', termos: false});
  assert.equal(invalido.ok, false);
  assert.deepEqual(Object.keys(invalido.erros).sort(), ['email', 'nome', 'senha', 'termos', 'whatsapp']);
  assert.equal(validarCadastro(cadastro()).ok, true);
  assert.match(erroSenha('abcdefgh'), /letras e números/);
  assert.match(erroSenha('12345678'), /letras e números|comum/);
  assert.match(erroSenha('senha123'), /comum/);
  assert.match(erroSenha('anasouza1', {email: 'anasouza@x.com'}), /e-mail/);
  assert.equal(erroSenha(SENHA), null);
  assert.equal(validarPerfil({cpf: '529.982.247-25', cep: '60181-245', uf: 'ce', bebeData: '2026-12-20', bebeDataTipo: 'prevista', comoConheceu: 'instagram'}).ok, true);
  const perfilRuim = validarPerfil({cpf: '111.111.111-11', uf: 'XX', bebeData: '2026-02-30', comoConheceu: 'tv', email: 'troca@x.com'});
  assert.deepEqual(Object.keys(perfilRuim.erros).sort(), ['bebeData', 'comoConheceu', 'cpf', 'email', 'uf']);
  const conta = {logada: true, cupom: {codigo: 'BEMVINDA-7Q3F', percentual: 5, usado: false, usadoEm: null, pedido: null}};
  assert.equal(escolherCupom('bemvinda-7q3f', 1000, conta).boasVindas, true);
  assert.match(escolherCupom('BEMVINDO5', 1000, conta).aviso, /BEMVINDA-7Q3F/);
  assert.equal(escolherCupom('BEMVINDA-AAAA', 1000, conta).tipo, 'invalido');
  const enxoval = escolherCupom('ENXOVAL10', 200000, conta);
  assert.equal(enxoval.cupom.codigo, 'ENXOVAL10');
  assert.match(enxoval.aviso, /Um cupom por pedido/);
  assert.equal(escolherCupom('ENXOVAL10', 1000, conta).tipo, 'minimo');
  assert.equal(escolherCupom('BEMVINDO5', 1000, {...conta, cupom: {...conta.cupom, usado: true}}).tipo, 'invalido');
  assert.equal(cupomEfetivo(undefined, false, conta), 'BEMVINDA-7Q3F');
  assert.equal(cupomEfetivo(undefined, true, conta), undefined, 'a cliente removeu o automático');
  assert.equal(cupomEfetivo(undefined, false, {logada: false, cupom: null}), undefined);
});

test('cadastro: valida, normaliza o e-mail, guarda só o hash, cria sessão e o cupom BEMVINDA-XXXX; e-mail repetido é 409', async () => {
  await assert.rejects(cadastrarCliente(cadastro({termos: false, senha: 'curta'})), erro => erro instanceof ErroConta && erro.status === 400 && Boolean(erro.erros.termos && erro.erros.senha));
  const conta = await cadastrarCliente(cadastro({email: '  Maria.Clara@Example.TEST '}));
  assert.equal(conta.cliente.email, 'maria.clara@example.test');
  assert.equal(conta.cliente.whatsapp, '85999991234');
  assert.equal(conta.cliente.inicial, 'A');
  assert.match(conta.cupom.codigo, /^BEMVINDA-[2-9A-HJ-NP-Z]{4}$/);
  assert.equal(conta.cupom.usado, false);
  assert.match(conta.token, /^[a-f0-9]{64}$/);
  const linha = await contasDb().prepare('SELECT senha_hash, termos_versao, termos_aceitos_em FROM loja_clientes WHERE id = ?').get(conta.cliente.id);
  assert.match(linha.senha_hash, /^scrypt\$/);
  assert.ok(!linha.senha_hash.includes(SENHA));
  assert.ok(linha.termos_versao && Number(linha.termos_aceitos_em) > 0, 'aceite com data e versão');
  const sessao = await contasDb().prepare('SELECT hash FROM loja_sessoes').get();
  assert.notEqual(sessao.hash, conta.token, 'só o SHA-256 do token vai para o banco');
  assert.equal((await clienteDaSessao(conta.token)).id, conta.cliente.id);
  await rejeita(cadastrarCliente(cadastro({email: 'MARIA.CLARA@example.test'})), 'EMAIL_EM_USO', 409);
});

test('login: mesma resposta para e-mail inexistente e senha errada; sessão expira, inativa e revogada', async () => {
  const {cliente} = await cadastrarCliente(cadastro({email: 'bia@example.test'}));
  await rejeita(entrarCliente('bia@example.test', 'outraSenha9'), 'LOGIN_INVALIDO', 401);
  await rejeita(entrarCliente('ninguem@example.test', SENHA), 'LOGIN_INVALIDO', 401);
  await rejeita(entrarCliente('bia@example.test', 'x'.repeat(500)), 'LOGIN_INVALIDO', 401);
  const agora = Date.now();
  const {token} = await entrarCliente(' BIA@example.test ', SENHA, agora);
  assert.equal((await clienteDaSessao(token, agora + 1000)).id, cliente.id);
  assert.equal(await clienteDaSessao(token, agora + SESSAO_DURACAO + 1), null, 'validade absoluta');
  assert.equal(await clienteDaSessao(token, agora + 15 * 24 * 60 * 60 * 1000), null, 'inatividade de 14 dias');
  assert.equal(await clienteDaSessao('a'.repeat(64)), null, 'token forjado');
  assert.equal(await clienteDaSessao("' OR 1=1 --"), null, 'formato inválido');
  await encerrarSessao(token);
  assert.equal(await clienteDaSessao(token), null, 'sessão revogada não volta');
});

test('limite de tentativas: o 6º login do mesmo e-mail em 15 minutos é bloqueado', async () => {
  const chave = 'loja-conta:entrar:email:teste';
  for (let tentativa = 1; tentativa <= 5; tentativa++) assert.equal(await limited(chave, 5), false, `tentativa ${tentativa}`);
  assert.equal(await limited(chave, 5), true);
  assert.equal(await limited('loja-conta:entrar:email:outra', 5), false, 'outro e-mail não é afetado');
});

test('pedido: preços recalculados pelo catálogo do servidor, opção obrigatória, item indisponível e mensagem completa', async () => {
  const {cliente, cupom} = await cadastrarCliente(cadastro({nome: 'Carla Dias'}));
  await rejeita(criarPedido(cliente.id, {itens: []}, {catalogo}), 'SACOLA_VAZIA', 400);
  await rejeita(criarPedido(cliente.id, {itens: [{slug: 'nao-existe', quantidade: 1}]}, {catalogo}), 'ITEM_INDISPONIVEL', 409);
  await rejeita(criarPedido(cliente.id, {itens: [{slug: 'protetor', quantidade: 1}]}, {catalogo}), 'ITEM_SEM_OPCAO', 400);
  await rejeita(criarPedido(cliente.id, {itens, preco: 1}, {catalogo}), 'UNKNOWN_FIELD', 400);
  await rejeita(criarPedido(cliente.id, {itens, observacoes: 'x'.repeat(501)}, {catalogo}), 'INVALID_INPUT', 400);
  const {pedido} = await criarPedido(cliente.id, {itens, local: 'Recife/PE', observacoes: 'Bordar "Helena"'}, {catalogo});
  assert.equal(pedido.subtotalCentavos, 149000 + 2 * 26990, 'o preço "0.01" enviado pelo navegador é ignorado');
  assert.equal(pedido.descontoCentavos, 0);
  assert.equal(pedido.status, 'enviado_whatsapp');
  assert.match(pedido.numero, /^MK-\d{6}-[2-9A-HJ-NP-Z]{4}$/);
  assert.match(pedido.mensagem, new RegExp(`pedido ${pedido.numero}`));
  assert.match(pedido.mensagem, /A partir de R\$ 1\.490,00/);
  assert.match(pedido.mensagem, /E-mail: ana\d+@example\.test|E-mail: .+@example\.test/);
  assert.match(pedido.mensagem, /WhatsApp: \(85\) 99999-1234/);
  assert.match(pedido.mensagem, /Bordar "Helena"/);
  assert.equal((await dadosDaConta(cliente.id)).cupom.usado, false, 'sem cupom pedido, o de primeira compra continua guardado');
  assert.equal((await pedidosDaCliente(cliente.id)).length, 1);
  assert.equal((await pedidoDaCliente(cliente.id, pedido.numero.toLowerCase())).numero, pedido.numero);
  const outra = await cadastrarCliente(cadastro());
  await rejeita(pedidoDaCliente(outra.cliente.id, pedido.numero), 'NOT_FOUND', 404);
  await rejeita(criarPedido(cliente.id, {itens, cupom: outra.cupom.codigo}, {catalogo}), 'CUPOM_INVALIDO', 400);
  assert.ok(cupom.codigo !== outra.cupom.codigo);
});

test('cupom de primeira compra: aplicado no servidor, uso único, mostrado na mensagem e não acumula', async () => {
  const {cliente, cupom} = await cadastrarCliente(cadastro());
  const {pedido} = await criarPedido(cliente.id, {itens, cupom: cupom.codigo}, {catalogo});
  const subtotal = 149000 + 2 * 26990;
  assert.equal(pedido.descontoCentavos, Math.round(subtotal * 0.05));
  assert.equal(pedido.totalCentavos, subtotal - pedido.descontoCentavos);
  assert.deepEqual(pedido.cupom, {codigo: cupom.codigo, percentual: 5});
  assert.match(pedido.mensagem, new RegExp(`Cupom de primeira compra ${cupom.codigo} \\(5% OFF\\): -R\\$`));
  const depois = await dadosDaConta(cliente.id);
  assert.equal(depois.cupom.usado, true);
  assert.equal(depois.cupom.pedido, pedido.numero);
  await rejeita(criarPedido(cliente.id, {itens, cupom: cupom.codigo}, {catalogo}), 'CUPOM_USADO', 409);
  await rejeita(criarPedido(cliente.id, {itens, cupom: 'BEMVINDO5'}, {catalogo}), 'CUPOM_USADO', 409);

  // Genérico no lugar do de primeira compra: só um vale, e o de primeira compra fica guardado.
  const segunda = await cadastrarCliente(cadastro());
  const grande = [{slug: 'kit-berco', quantidade: 1}];
  const {pedido: comEnxoval} = await criarPedido(segunda.cliente.id, {itens: grande, cupom: 'ENXOVAL10'}, {catalogo});
  assert.equal(comEnxoval.descontoCentavos, 14900, 'só os 10%, sem somar os 5%');
  assert.equal((await dadosDaConta(segunda.cliente.id)).cupom.usado, false);
  // BEMVINDO5 com conta vira o cupom de boas-vindas dela (e é consumido).
  const {pedido: comGenerico} = await criarPedido(segunda.cliente.id, {itens: grande, cupom: 'bemvindo5'}, {catalogo});
  assert.equal(comGenerico.cupom.codigo, segunda.cupom.codigo);
  assert.equal((await dadosDaConta(segunda.cliente.id)).cupom.usado, true);
  await rejeita(criarPedido(segunda.cliente.id, {itens: [{slug: 'manta', quantidade: 1}], cupom: 'ENXOVAL10'}, {catalogo}), 'CUPOM_INVALIDO', 400);
});

test('concorrência: dois pedidos ao mesmo tempo com o mesmo cupom, só um leva o desconto', async () => {
  const {cliente, cupom} = await cadastrarCliente(cadastro());
  const resultados = await Promise.allSettled([1, 2, 3].map(() => criarPedido(cliente.id, {itens, cupom: cupom.codigo}, {catalogo})));
  const ok = resultados.filter(item => item.status === 'fulfilled');
  const recusados = resultados.filter(item => item.status === 'rejected');
  assert.equal(ok.length, 1);
  assert.ok(recusados.every(item => item.reason.code === 'CUPOM_USADO'));
  const pedidos = await pedidosDaCliente(cliente.id);
  assert.equal(pedidos.length, 1, 'o pedido recusado não fica gravado');
  assert.equal(pedidos.filter(item => item.descontoCentavos > 0).length, 1);
});

test('redefinição por link da equipe: uso único, 2 horas, revoga as sessões e invalida a senha antiga', async () => {
  const {cliente, token: sessaoAntiga} = await cadastrarCliente(cadastro({email: 'dora@example.test'}));
  const agora = Date.now();
  const emitido = await emitirRedefinicao(cliente.id, gestora, 'https://www.ateliemilenakerbage.com.br', agora);
  assert.equal(emitido.emailEnviado, false);
  const link = new URL(emitido.link);
  assert.equal(link.pathname, '/conta/redefinir');
  assert.equal(link.search, '', 'o token não vai na query');
  const token = link.hash.slice(1);
  assert.match(token, /^[a-f0-9]{64}$/);
  const guardado = await contasDb().prepare('SELECT hash, criado_por FROM loja_redefinicoes').get();
  assert.notEqual(guardado.hash, token);
  assert.equal(guardado.criado_por, gestora.id);
  await rejeita(redefinirSenha(token, 'fraca'), 'SENHA_FRACA', 400);
  await rejeita(redefinirSenha(token, 'NovaSenha2026', agora + REDEFINICAO_DURACAO + 1), 'LINK_INVALIDO', 400);
  const nova = await redefinirSenha(token, 'NovaSenha2026', agora + 1000);
  assert.equal(nova.cliente.id, cliente.id);
  assert.equal(await clienteDaSessao(sessaoAntiga), null, 'sessões antigas revogadas');
  assert.ok(await clienteDaSessao(nova.token), 'já entra com a nova senha');
  await rejeita(redefinirSenha(token, 'OutraSenha2026'), 'LINK_INVALIDO', 400);
  await rejeita(entrarCliente('dora@example.test', SENHA), 'LOGIN_INVALIDO', 401);
  assert.ok((await entrarCliente('dora@example.test', 'NovaSenha2026')).token);
  // Um link novo invalida o anterior; trocar a senha depois de emitido também invalida.
  const primeiro = new URL((await emitirRedefinicao(cliente.id, gestora, 'https://www.ateliemilenakerbage.com.br')).link).hash.slice(1);
  const segundo = new URL((await emitirRedefinicao(cliente.id, gestora, 'https://www.ateliemilenakerbage.com.br')).link).hash.slice(1);
  await rejeita(redefinirSenha(primeiro, 'Mais1Senha'), 'LINK_INVALIDO', 400);
  await trocarSenha(cliente.id, 'NovaSenha2026', 'Trocada2026');
  await rejeita(redefinirSenha(segundo, 'Mais1Senha'), 'LINK_INVALIDO', 400);
});

test('troca de senha e perfil: exige a senha atual, renova a sessão; perfil com revisão e só campos permitidos', async () => {
  const {cliente, token} = await cadastrarCliente(cadastro());
  await rejeita(trocarSenha(cliente.id, 'errada123', 'Outra2026x'), 'SENHA_ATUAL', 400);
  const novo = await trocarSenha(cliente.id, SENHA, 'Outra2026x');
  assert.equal(await clienteDaSessao(token), null);
  assert.ok(await clienteDaSessao(novo));
  const atualizado = await atualizarPerfil(cliente.id, {revisao: cliente.revisao, cpf: '529.982.247-25', cidade: 'Fortaleza', uf: 'ce', bebeNome: 'Helena', bebeData: '2026-12-20', bebeDataTipo: 'prevista'});
  assert.equal(atualizado.cliente.perfil.cpf, '52998224725');
  assert.equal(atualizado.cliente.perfil.uf, 'CE');
  assert.ok(!atualizado.cliente.faltando.includes('cpf'));
  await rejeita(atualizarPerfil(cliente.id, {revisao: cliente.revisao, cidade: 'Recife'}), 'REVISION_CONFLICT', 409);
  await rejeita(atualizarPerfil(cliente.id, {revisao: atualizado.cliente.revisao, email: 'outra@x.com'}), 'INVALID_INPUT', 400);
  const apagado = await atualizarPerfil(cliente.id, {revisao: atualizado.cliente.revisao, cpf: ''});
  assert.equal(apagado.cliente.perfil.cpf, '', 'vazio apaga o dado opcional');
});

test('isolamento: o token da cliente não autentica a equipe e o da equipe não autentica a loja', async () => {
  await createUser('equipe@example.test', 'Equipe', await scryptHash('Equipe#2026'), 'user-equipe');
  const tokenEquipe = await createSession('user-equipe');
  const {token: tokenCliente} = await cadastrarCliente(cadastro({email: 'equipe@example.test'}));
  assert.equal(await clienteDaSessao(tokenEquipe), null);
  assert.equal(await sessionUser(tokenCliente), null);
  assert.equal((await sessionUser(tokenEquipe)).id, 'user-equipe');
  // Mesmo e-mail nas duas: contas independentes (senha da equipe não entra na loja).
  await rejeita(entrarCliente('equipe@example.test', 'Equipe#2026'), 'LOGIN_INVALIDO', 401);
  assert.equal(await verifyPassword('Equipe#2026', (await contasDb().prepare('SELECT senha_hash FROM loja_clientes').get()).senha_hash), false);
});

test('ERP: lista com busca, detalhe com pedidos e cupom, situação do pedido com revisão', async () => {
  const {cliente, cupom} = await cadastrarCliente(cadastro({nome: 'Fernanda Lima', email: 'fernanda@example.test', whatsapp: '(85) 98888-7777'}));
  await cadastrarCliente(cadastro({nome: 'Outra Pessoa'}));
  const {pedido} = await criarPedido(cliente.id, {itens, cupom: cupom.codigo}, {catalogo});
  const porNome = await listarClientesLoja(new URL('http://erp.test/?busca=fernanda'));
  assert.equal(porNome.pagination.total, 1);
  assert.equal(porNome.clientes[0].pedidos, 1);
  assert.equal(porNome.clientes[0].cupom.usado, true);
  assert.equal((await listarClientesLoja(new URL('http://erp.test/?busca=98888'))).pagination.total, 1);
  assert.equal((await listarClientesLoja(new URL("http://erp.test/?busca=%25' OR 1=1"))).pagination.total, 0);
  await assert.rejects(listarClientesLoja(new URL('http://erp.test/?limit=1000')), erro => erro.code === 'INVALID_PAGINATION');
  const detalhe = await detalheClienteLoja(cliente.id);
  assert.equal(detalhe.pedidos[0].numero, pedido.numero);
  assert.equal(detalhe.cupom.codigo, cupom.codigo);
  assert.equal(detalhe.cliente.email, 'fernanda@example.test');
  const lista = await listarPedidosLoja(new URL('http://erp.test/?status=enviado_whatsapp'));
  assert.equal(lista.pagination.total, 1);
  assert.equal(lista.contagem.enviado_whatsapp, 1);
  const atualizado = await atualizarPedidoLoja(pedido.numero, {revisao: 1, status: 'pagamento_confirmado'}, gestora);
  assert.equal(atualizado.pedido.statusRotulo, 'Pagamento confirmado');
  await assert.rejects(atualizarPedidoLoja(pedido.numero, {revisao: 1, status: 'despachado'}, gestora), erro => erro.code === 'REVISION_CONFLICT');
  assert.equal((await atualizarPedidoLoja(pedido.numero, {revisao: 2, status: 'despachado'}, gestora)).pedido.statusRotulo, 'Despachado para a transportadora');
  assert.equal(etapasConcluidas('despachado'), 2);
  assert.equal(etapasConcluidas('enviado_whatsapp'), 0);
  assert.equal(etapasConcluidas('cancelado'), null);
  await assert.rejects(atualizarPedidoLoja(pedido.numero, {revisao: 2, status: 'confirmado'}, gestora), erro => erro.code === 'INVALID_STATUS', 'situação antiga não vale mais');
  const auditoria = await contasDb().prepare("SELECT actor, action, resource FROM erp_audit WHERE resource LIKE 'loja_%' ORDER BY created").all();
  assert.ok(auditoria.some(linha => linha.resource === 'loja_pedidos' && linha.action === 'updated' && linha.actor === gestora.id));
  assert.ok(auditoria.some(linha => linha.resource === 'loja_clientes' && linha.action === 'created' && linha.actor === 'loja'));
});

test('exclusão da conta (LGPD): confere a senha, apaga a conta e o cupom e anonimiza os pedidos', async () => {
  const {cliente, token, cupom} = await cadastrarCliente(cadastro({email: 'lgpd@example.test'}));
  const {pedido} = await criarPedido(cliente.id, {itens, cupom: cupom.codigo, local: 'Natal/RN', observacoes: 'Nome do bebê: Theo'}, {catalogo});
  await rejeita(excluirConta(cliente.id, 'errada123'), 'SENHA_ATUAL', 400);
  assert.deepEqual(await excluirConta(cliente.id, SENHA), {excluida: true});
  assert.equal(await clienteDaSessao(token), null);
  await rejeita(entrarCliente('lgpd@example.test', SENHA), 'LOGIN_INVALIDO', 401);
  const {pedidos} = await listarPedidosLoja(new URL(`http://erp.test/?busca=${pedido.numero}`));
  assert.equal(pedidos.length, 1);
  const anonimo = pedidos[0];
  assert.equal(anonimo.anonimizado, true);
  assert.equal(anonimo.clienteId, null);
  assert.equal(anonimo.nome + anonimo.email + anonimo.whatsapp + anonimo.local + anonimo.observacoes, '');
  assert.doesNotMatch(anonimo.mensagem, /Theo|lgpd@/);
  assert.equal(anonimo.totalCentavos, pedido.totalCentavos, 'peças e valores ficam para o controle do ateliê');
  assert.equal(Number((await contasDb().prepare('SELECT COUNT(*) AS total FROM loja_cupons').get()).total), 0);
  // Pode criar outra conta com o mesmo e-mail depois.
  assert.ok((await cadastrarCliente(cadastro({email: 'lgpd@example.test'}))).token);
});
