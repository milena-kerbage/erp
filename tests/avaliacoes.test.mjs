// Avaliações da loja: gravação pública, limites e recompressão das fotos, moderação e listagem.
// SQLite temporário por padrão; com AVALIACOES_TEST_POSTGRES=1, PostgreSQL em WASM (PGlite) com as
// migrações 006 e 008 aplicadas. Não conecta ao Supabase nem usa credenciais reais.
import test, { after, afterEach, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { closeDatabases } from '../src/lib/database.ts';
import { avaliacoesDb, criarAvaliacao, ErroAvaliacao, excluirAvaliacao, fotoDaAvaliacao, listarAprovadas, listarParaModeracao, moderarAvaliacao, processarFoto, resumoDoProduto } from '../src/lib/loja/avaliacoes.ts';
import { filtrosDaUrl, LIMITES_AVALIACAO } from '../src/loja/lib/avaliacoes/regras.ts';

const postgres = process.env.AVALIACOES_TEST_POSTGRES === '1';
const gestora = {id: 'admin-1', name: 'Gestora', email: 'gestora@example.test', permission: 'admin'};
const catalogo = new Set(['kit-berco-classico', 'manta-tricot']);
const opcoes = {produtoExiste: slug => catalogo.has(slug)};
let directory, engine, socket, relogio = 1_800_000_000_000;

before(async () => {
  if (!postgres) return;
  const {PGlite} = await import('@electric-sql/pglite');
  const {PGLiteSocketServer} = await import('@electric-sql/pglite-socket');
  engine = await PGlite.create();
  const port = Number(process.env.AVALIACOES_POSTGRES_TEST_PORT || 55447);
  socket = new PGLiteSocketServer({db: engine, host: '127.0.0.1', port});
  await engine.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  await socket.start();
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
  process.env.DATABASE_SSL_MODE = 'disable';
});
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'avaliacoes-'));
  process.env.ERP_DB_PATH = join(directory, 'erp.sqlite');
  delete process.env.VERCEL;
  if (!postgres) { delete process.env.DATABASE_URL; process.env.ALLOW_LOCAL_SQLITE = 'true'; }
  else {
    await engine.exec('DROP SCHEMA IF EXISTS erp_core CASCADE;');
    for (const file of ['006_erp.sql', '008_loja_avaliacoes.sql']) await engine.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  }
});
afterEach(async () => { await closeDatabases(); await rm(directory, {recursive: true, force: true}); });
after(async () => { await closeDatabases(); if (socket) await socket.stop(); if (engine) await engine.close(); });

const campos = (extra = {}) => ({produto: 'kit-berco-classico', nota: '5', titulo: 'Lindo demais', texto: 'O kit chegou perfeito, acabamento impecável e cheiroso.', nome: 'Ana', cidade: 'Fortaleza/CE', paraQuem: 'menina', consentimento: 'true', site: '', iniciado: String(relogio - 60_000), ...extra});
const enviar = (extra = {}, fotos = [], ip = '203.0.113.7') => criarAvaliacao({campos: campos(extra), fotos, ip, agora: relogio += 1000}, opcoes);
const rejeita = (operacao, codigo, status) => assert.rejects(operacao, erro => erro instanceof ErroAvaliacao || erro?.code ? (erro.code === codigo && (!status || erro.status === status)) : false);
const foto = (largura = 2400, altura = 1800, formato = 'jpeg', exif = true) => {
  let imagem = sharp({create: {width: largura, height: altura, channels: 3, background: {r: 220, g: 200, b: 180}}});
  if (exif) imagem = imagem.withExif({IFD0: {Artist: 'Pessoa Real', Copyright: 'GPS -3.7319,-38.5267'}});
  return imagem[formato]({quality: 90}).toBuffer();
};
const aprovar = async id => {
  const lista = await listarParaModeracao(new URL('http://erp.test/?status=todas&limit=100'));
  const item = lista.avaliacoes.find(avaliacao => avaliacao.id === id);
  return (await moderarAvaliacao(id, {revisao: item.revisao, status: 'aprovada'}, gestora)).avaliacao;
};

test('valida campos, honeypot, tempo mínimo, produto do catálogo e consentimento', async () => {
  await assert.rejects(enviar({titulo: '', texto: 'curto', nota: '7', consentimento: ''}), erro => erro instanceof ErroAvaliacao && erro.status === 400 && Boolean(erro.erros.titulo && erro.erros.texto && erro.erros.nota && erro.erros.consentimento));
  await rejeita(enviar({texto: 'Comprei pelo site www.golpe.com e adorei o resultado final.'}), 'INVALID_INPUT', 400);
  await rejeita(enviar({iniciado: String(relogio + 500)}), 'ENVIO_RAPIDO', 400);
  await rejeita(enviar({produto: 'produto-que-nao-existe'}), 'PRODUTO_INEXISTENTE', 404);
  await rejeita(enviar({titulo: 'x'.repeat(LIMITES_AVALIACAO.titulo + 1)}), 'INVALID_INPUT', 400);
  assert.deepEqual(await enviar({site: 'https://spam.example'}), {situacao: 'ignorada'});
  assert.equal((await listarParaModeracao(new URL('http://erp.test/?status=todas'))).pagination.total, 0, 'nada gravado até aqui');
  const recebida = await enviar();
  assert.equal(recebida.situacao, 'recebida');
  const lista = await listarParaModeracao(new URL('http://erp.test/'));
  assert.equal(lista.contagem.pendente, 1);
  assert.equal(lista.avaliacoes[0].status, 'pendente');
  assert.equal(lista.avaliacoes[0].cidade, 'Fortaleza/CE');
});

test('fotos: rejeita mais de 3 MiB (413), tipo falso pelos bytes (415) e mais de 4', async () => {
  const enorme = Buffer.alloc(LIMITES_AVALIACAO.fotoBytes + 1, 1);
  enorme.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  await rejeita(processarFoto(enorme, 0), 'FOTO_GRANDE', 413);
  // "foto.jpg" que na verdade é texto/SVG: o tipo vem dos bytes, não da extensão.
  await rejeita(processarFoto(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), 1), 'FOTO_TIPO', 415);
  await rejeita(processarFoto(Buffer.from('GIF89a-falso-gif-como-jpeg'), 0), 'FOTO_TIPO', 415);
  // Cabeçalho JPEG verdadeiro com conteúdo corrompido: o sharp não lê e a API recusa.
  await rejeita(processarFoto(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 7)]), 0), 'FOTO_INVALIDA', 415);
  const pequena = await foto(40, 40, 'png', false);
  await rejeita(enviar({}, [pequena, pequena, pequena, pequena, pequena]), 'FOTOS_DEMAIS', 400);
  await rejeita(enviar({}, [pequena, enorme]), 'FOTO_GRANDE', 413);
  assert.equal((await listarParaModeracao(new URL('http://erp.test/?status=todas'))).pagination.total, 0);
});

test('recompressão: WebP de até 1600 px e miniatura de 400 px, sem EXIF/GPS/ICC', async () => {
  const original = await foto(3000, 2000, 'jpeg', true);
  assert.ok((await sharp(original).metadata()).exif, 'a foto de teste tem EXIF');
  const processada = await processarFoto(original, 0);
  const grande = await sharp(processada.grande).metadata(), mini = await sharp(processada.mini).metadata();
  assert.equal(grande.format, 'webp'); assert.equal(mini.format, 'webp');
  assert.equal(Math.max(grande.width, grande.height), 1600); assert.equal(grande.width, 1600); assert.equal(grande.height, 1067);
  assert.equal(Math.max(mini.width, mini.height), 400);
  for (const meta of [grande, mini]) { assert.equal(meta.exif, undefined); assert.equal(meta.icc, undefined); assert.equal(meta.xmp, undefined); }
  assert.ok(!processada.grande.includes(Buffer.from('Pessoa Real')));
  // Foto menor que o limite não é ampliada; PNG e WebP também são aceitos.
  const png = await processarFoto(await foto(800, 600, 'png', false), 0);
  assert.equal(png.largura, 800); assert.equal(png.altura, 600);
  const webp = await processarFoto(await foto(500, 900, 'webp', false), 0);
  assert.equal(webp.altura, 900);
});

test('moderação: só aprovadas aparecem; recusa exige motivo; resposta do ateliê; exclusão apaga fotos', async () => {
  const fotos = [await foto(1200, 900, 'jpeg'), await foto(600, 600, 'png', false)];
  const {id} = await enviar({}, fotos);
  const filtros = filtrosDaUrl(new URLSearchParams());
  assert.equal((await listarAprovadas('kit-berco-classico', filtros)).total, 0, 'pendente não aparece');
  const [primeira] = (await listarParaModeracao(new URL('http://erp.test/'))).avaliacoes;
  assert.equal(primeira.fotos.length, 2);
  await assert.rejects(fotoDaAvaliacao(primeira.fotos[0].id, 'mini', true), erro => erro.status === 404, 'foto de pendente não é pública');
  assert.ok((await fotoDaAvaliacao(primeira.fotos[0].id, 'mini', false)).conteudo.length > 0, 'a moderação vê a foto');

  await assert.rejects(moderarAvaliacao(id, {revisao: 1, status: 'recusada'}, gestora), erro => erro.code === 'REASON_REQUIRED');
  await assert.rejects(moderarAvaliacao(id, {revisao: 1, status: 'publicada'}, gestora), erro => erro.code === 'INVALID_STATUS');
  await assert.rejects(moderarAvaliacao(id, {revisao: 1, admin: true}, gestora), erro => erro.code === 'UNKNOWN_FIELD');
  const aprovada = (await moderarAvaliacao(id, {revisao: 1, status: 'aprovada'}, gestora));
  assert.equal(aprovada.avaliacao.status, 'aprovada'); assert.equal(aprovada.avaliacao.moderadaPor, 'Gestora'); assert.equal(aprovada.publicadaMudou, true);
  await assert.rejects(moderarAvaliacao(id, {revisao: 1, resposta: 'Atrasada'}, gestora), erro => erro.code === 'REVISION_CONFLICT');

  const respondida = (await moderarAvaliacao(id, {revisao: 2, resposta: 'Obrigada, Ana! Foi um prazer bordar o enxoval.'}, gestora)).avaliacao;
  const publica = await listarAprovadas('kit-berco-classico', filtros);
  assert.equal(publica.total, 1);
  assert.equal(publica.avaliacoes[0].resposta.texto, 'Obrigada, Ana! Foi um prazer bordar o enxoval.');
  assert.equal(publica.avaliacoes[0].fotos.length, 2);
  assert.equal('status' in publica.avaliacoes[0] || 'motivoRecusa' in publica.avaliacoes[0] || 'ip_hash' in publica.avaliacoes[0], false, 'a loja não recebe dados internos');
  const binario = await fotoDaAvaliacao(publica.avaliacoes[0].fotos[0].id, 'grande', true);
  assert.equal((await sharp(binario.conteudo).metadata()).exif, undefined);

  const recusada = (await moderarAvaliacao(id, {revisao: respondida.revisao, status: 'recusada', motivo: 'Fotos de outro produto'}, gestora)).avaliacao;
  assert.equal(recusada.motivoRecusa, 'Fotos de outro produto');
  assert.equal((await listarAprovadas('kit-berco-classico', filtros)).total, 0, 'recusada some da loja');
  await assert.rejects(fotoDaAvaliacao(primeira.fotos[0].id, 'grande', true), erro => erro.status === 404);

  await assert.rejects(excluirAvaliacao(id, 1, gestora), erro => erro.code === 'REVISION_CONFLICT');
  assert.deepEqual(await excluirAvaliacao(id, recusada.revisao, gestora), {deleted: true, produto: 'kit-berco-classico', estavaPublicada: false});
  const restantes = await avaliacoesDb().prepare('SELECT COUNT(*) AS total FROM loja_avaliacao_fotos').get();
  assert.equal(Number(restantes.total), 0, 'fotos apagadas junto');
  const auditoria = (await avaliacoesDb().prepare("SELECT action FROM erp_audit WHERE resource = 'avaliacoes' ORDER BY created").all()).map(linha => linha.action);
  assert.deepEqual(auditoria, ['created', 'approved', 'replied', 'rejected', 'removed']);
});

test('listagem pública: resumo, filtros por nota/fotos/para quem, busca sem acento, ordenação e paginação', async () => {
  const pequena = await foto(300, 300, 'png', false);
  const notas = [5, 4, 5, 2, 3, 5, 1];
  const ids = [];
  for (const [indice, nota] of notas.entries()) {
    const extra = {nota: String(nota), titulo: `Avaliação ${indice}`, paraQuem: indice % 2 ? 'menino' : 'surpresa', texto: indice === 3 ? 'O bordado do bebê ficou delicado, mas atrasou um pouco.' : 'Peça muito bem feita, tecido macio e cor linda.'};
    ids.push((await enviar(extra, indice === 0 || indice === 4 ? [pequena] : [], `198.51.100.${indice}`)).id);
  }
  for (const id of ids.slice(0, 6)) await aprovar(id); // a última fica pendente
  await enviar({produto: 'manta-tricot'}, [], '192.0.2.1').then(({id}) => aprovar(id)); // outro produto

  const base = filtrosDaUrl(new URLSearchParams());
  const tudo = await listarAprovadas('kit-berco-classico', base);
  assert.equal(tudo.resumo.total, 6);
  assert.deepEqual(tudo.resumo.porNota, {'1': 0, '2': 1, '3': 1, '4': 1, '5': 3});
  assert.equal(tudo.resumo.media, 4); // (5+4+5+2+3+5)/6
  assert.equal(tudo.resumo.comFotos, 2);
  assert.deepEqual(tudo.resumo.paraQuem, {menina: 0, menino: 3, surpresa: 3});
  assert.equal(tudo.avaliacoes.length, LIMITES_AVALIACAO.porPagina); assert.equal(tudo.pagina.temMais, false);
  assert.equal(tudo.avaliacoes[0].titulo, 'Avaliação 5', 'mais recente primeiro');

  const pagina1 = await listarAprovadas('kit-berco-classico', filtrosDaUrl(new URLSearchParams('limite=4')));
  const pagina2 = await listarAprovadas('kit-berco-classico', filtrosDaUrl(new URLSearchParams('limite=4&offset=4')));
  assert.equal(pagina1.pagina.temMais, true); assert.equal(pagina2.avaliacoes.length, 2); assert.equal(pagina2.pagina.temMais, false);
  assert.equal(new Set([...pagina1.avaliacoes, ...pagina2.avaliacoes].map(item => item.id)).size, 6);

  const maior = await listarAprovadas('kit-berco-classico', filtrosDaUrl(new URLSearchParams('ordem=maior')));
  assert.deepEqual(maior.avaliacoes.map(item => item.nota), [5, 5, 5, 4, 3, 2]);
  const menor = await listarAprovadas('kit-berco-classico', filtrosDaUrl(new URLSearchParams('ordem=menor')));
  assert.equal(menor.avaliacoes[0].nota, 2);
  const comFotosPrimeiro = await listarAprovadas('kit-berco-classico', filtrosDaUrl(new URLSearchParams('ordem=fotos')));
  assert.ok(comFotosPrimeiro.avaliacoes[0].fotos.length && comFotosPrimeiro.avaliacoes[1].fotos.length && !comFotosPrimeiro.avaliacoes[2].fotos.length);

  assert.equal((await listarAprovadas('kit-berco-classico', filtrosDaUrl(new URLSearchParams('nota=5,4')))).total, 4);
  assert.equal((await listarAprovadas('kit-berco-classico', filtrosDaUrl(new URLSearchParams('fotos=1')))).total, 2);
  assert.equal((await listarAprovadas('kit-berco-classico', filtrosDaUrl(new URLSearchParams('para=menino')))).total, 3);
  const busca = await listarAprovadas('kit-berco-classico', filtrosDaUrl(new URLSearchParams('busca=BEBE')));
  assert.equal(busca.total, 1); assert.equal(busca.avaliacoes[0].titulo, 'Avaliação 3');
  assert.equal((await listarAprovadas('kit-berco-classico', filtrosDaUrl(new URLSearchParams('busca=100%_')))).total, 0, 'curingas do LIKE são escapados');
  assert.equal((await resumoDoProduto('manta-tricot')).total, 1);
  assert.equal((await resumoDoProduto('produto-sem-avaliacao')).total, 0);
});

test('limite por IP: 3 avaliações aceitas por hora; o IP fica só como hash', async () => {
  for (let vez = 0; vez < 3; vez++) assert.equal((await enviar({}, [], '203.0.113.50')).situacao, 'recebida');
  await rejeita(enviar({}, [], '203.0.113.50'), 'RATE_LIMITED', 429);
  assert.equal((await enviar({}, [], '203.0.113.51')).situacao, 'recebida', 'outro IP continua podendo');
  relogio += LIMITES_AVALIACAO.janelaIpMs + 1;
  assert.equal((await enviar({}, [], '203.0.113.50')).situacao, 'recebida', 'depois de uma hora libera');
  const guardados = (await avaliacoesDb().prepare('SELECT ip_hash FROM loja_avaliacoes').all()).map(linha => linha.ip_hash);
  assert.ok(guardados.every(valor => /^[0-9a-f]{64}$/.test(valor) && !valor.includes('203.0.113')));
});

test('simulação (desenvolvimento ligado ao banco remoto) valida e processa, mas não grava nada', async () => {
  const resultado = await criarAvaliacao({campos: campos(), fotos: [await foto(200, 200, 'png', false)], ip: '203.0.113.9', agora: relogio += 1000}, {...opcoes, gravar: false});
  assert.deepEqual(resultado, {situacao: 'simulada'});
  await assert.rejects(criarAvaliacao({campos: campos({texto: 'curto'}), fotos: [], ip: '203.0.113.9', agora: relogio += 1000}, {...opcoes, gravar: false}), erro => erro instanceof ErroAvaliacao && erro.status === 400);
  assert.equal((await listarParaModeracao(new URL('http://erp.test/?status=todas'))).pagination.total, 0);
});
