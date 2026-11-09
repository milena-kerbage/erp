import { ApiError, type Actor } from '../../erp/access.ts';
import type { ColecaoGestao, GrupoOpcoesComUso, GrupoOpcoesGestao, OndeColecao, ReferenciaProduto, TipoGrupoOpcoes } from './tipos.ts';
import {
  auditarGestao, booleano, booleanoCampo, conflito, exigirGravacaoGestao, gestaoDb, ID, inteiroCampo, iso, type Linha, listaIds, naoEncontrado, novoId, objeto, opcaoCampo, permitidos,
  revisaoCampo, slugCampo, textoCampo, texto, travarGestao,
} from './esquema.ts';

// Grupos de opções (com as opções) e coleções da loja.
// Na página de produto: o grupo "escolha" ligado ao produto é o seletor obrigatório (tamanho do berço…) e
// o "personalizacao" é o "com/sem bordado"; o acréscimo da opção soma ao preço da sacola e do pedido.
// Trocar o rótulo de uma opção invalida esse item nas sacolas que já o tinham (a sacola pede para editar).

const TIPOS: readonly TipoGrupoOpcoes[] = ['escolha', 'personalizacao'];

function grupoGestao(linha: Linha, opcoes: Linha[]): GrupoOpcoesGestao {
  return {
    id: texto(linha.id), chave: texto(linha.chave), nome: texto(linha.nome), descricao: texto(linha.descricao), tipo: texto(linha.tipo) as TipoGrupoOpcoes,
    minimo: Number(linha.minimo), maximo: Number(linha.maximo), produtos: Number(linha.produtos ?? 0), revisao: Number(linha.revisao), criadoEm: iso(linha.criado), atualizadoEm: iso(linha.atualizado),
    opcoes: opcoes.map((opcao) => ({ id: texto(opcao.id), rotulo: texto(opcao.rotulo), acrescimoCentavos: Number(opcao.acrescimo_centavos), disponivel: booleano(opcao.disponivel), ordem: Number(opcao.ordem) })),
  };
}

const SELECT_GRUPO = 'SELECT g.*, (SELECT COUNT(*) FROM loja_produto_grupos pg WHERE pg.grupo_id = g.id) AS produtos FROM loja_grupos_opcoes g';

/** Produtos que usam cada grupo (para a tela mostrar onde o grupo aparece antes de editar ou remover). */
async function usoDosGrupos(grupoId?: string) {
  const linhas = await gestaoDb().prepare(`SELECT pg.grupo_id, p.id, p.slug, p.nome FROM loja_produto_grupos pg JOIN loja_produtos p ON p.id = pg.produto_id${grupoId ? ' WHERE pg.grupo_id = ?' : ''} ORDER BY p.nome, p.slug`).all(...(grupoId ? [grupoId] : []));
  const uso = new Map<string, ReferenciaProduto[]>();
  for (const linha of linhas) uso.set(texto(linha.grupo_id), [...(uso.get(texto(linha.grupo_id)) ?? []), { id: texto(linha.id), slug: texto(linha.slug), nome: texto(linha.nome) }]);
  return uso;
}

export async function listarGrupos(): Promise<{ grupos: GrupoOpcoesComUso[] }> {
  const database = gestaoDb();
  const grupos = await database.prepare(`${SELECT_GRUPO} ORDER BY g.nome, g.chave`).all();
  const opcoes = await database.prepare('SELECT * FROM loja_opcoes ORDER BY ordem, rotulo').all();
  const uso = await usoDosGrupos();
  return { grupos: grupos.map((grupo) => ({ ...grupoGestao(grupo, opcoes.filter((opcao) => texto(opcao.grupo_id) === texto(grupo.id))), usadoEm: uso.get(texto(grupo.id)) ?? [] })) };
}

async function linhaGrupo(id: string) {
  if (typeof id !== 'string' || !ID.test(id)) throw naoEncontrado('Grupo de opções');
  const linha = await gestaoDb().prepare(`${SELECT_GRUPO} WHERE g.id = ?`).get(id);
  if (!linha) throw naoEncontrado('Grupo de opções');
  return linha;
}
export async function obterGrupo(id: string): Promise<{ grupo: GrupoOpcoesComUso }> {
  const linha = await linhaGrupo(id);
  const grupo = grupoGestao(linha, await gestaoDb().prepare('SELECT * FROM loja_opcoes WHERE grupo_id = ? ORDER BY ordem, rotulo').all(id));
  return { grupo: { ...grupo, usadoEm: (await usoDosGrupos(id)).get(id) ?? [] } };
}

type OpcaoEntrada = { id?: string; rotulo: string; acrescimo: number; disponivel: boolean };
function validarGrupo(entrada: Record<string, unknown>, atual?: Linha) {
  permitidos(entrada, ['chave', 'nome', 'descricao', 'tipo', 'minimo', 'maximo', 'opcoes']);
  const tem = (campo: string) => entrada[campo] !== undefined;
  const tipo = tem('tipo') ? opcaoCampo(entrada.tipo, 'Tipo', TIPOS) : (texto(atual?.tipo) as TipoGrupoOpcoes) || 'escolha';
  const minimo = tem('minimo') ? inteiroCampo(entrada.minimo, 'Mínimo de escolhas', 0, 20) : atual ? Number(atual.minimo) : tipo === 'escolha' ? 1 : 0;
  const maximo = tem('maximo') ? inteiroCampo(entrada.maximo, 'Máximo de escolhas', 1, 20) : atual ? Number(atual.maximo) : 1;
  if (minimo > maximo) throw new ApiError(400, 'O mínimo de escolhas não pode passar do máximo.', 'INVALID_INPUT');
  let opcoes: OpcaoEntrada[] | undefined;
  if (tem('opcoes')) {
    if (!Array.isArray(entrada.opcoes) || entrada.opcoes.length < 1 || entrada.opcoes.length > 50) throw new ApiError(400, 'Informe de 1 a 50 opções.', 'INVALID_INPUT');
    opcoes = entrada.opcoes.map((bruta) => {
      const opcao = objeto(bruta, 'Opção');
      permitidos(opcao, ['id', 'rotulo', 'acrescimoCentavos', 'disponivel']);
      return {
        ...(opcao.id === undefined ? {} : { id: listaIds([opcao.id], 'Opção')[0] }),
        rotulo: textoCampo(opcao.rotulo, 'Rótulo da opção', 80, true),
        acrescimo: opcao.acrescimoCentavos === undefined ? 0 : inteiroCampo(opcao.acrescimoCentavos, 'Acréscimo', 0, 10_000_000),
        disponivel: opcao.disponivel === undefined ? true : booleanoCampo(opcao.disponivel, 'Disponível'),
      };
    });
    if (new Set(opcoes.map((opcao) => opcao.rotulo.toLocaleLowerCase('pt-BR'))).size !== opcoes.length) throw new ApiError(400, 'Há opções com o mesmo rótulo.', 'DUPLICATE_OPTION');
    if (tipo === 'personalizacao' && opcoes.length !== 1) throw new ApiError(400, 'A personalização tem uma opção só (o "com bordado", com o acréscimo).', 'INVALID_INPUT');
  }
  if (tipo === 'personalizacao' && (minimo !== 0 || maximo !== 1)) throw new ApiError(400, 'A personalização é opcional: mínimo 0 e máximo 1.', 'INVALID_INPUT');
  return {
    chave: tem('chave') ? slugCampo(entrada.chave, 'Identificador', 80) : texto(atual?.chave),
    nome: tem('nome') ? textoCampo(entrada.nome, 'Nome', 80, true) : texto(atual?.nome),
    descricao: tem('descricao') ? textoCampo(entrada.descricao, 'Descrição', 300) : texto(atual?.descricao),
    tipo, minimo, maximo, opcoes,
  };
}

async function gravarOpcoes(grupoId: string, opcoes: OpcaoEntrada[]) {
  const database = gestaoDb();
  const existentes = new Set((await database.prepare('SELECT id FROM loja_opcoes WHERE grupo_id = ?').all(grupoId)).map((linha) => texto(linha.id)));
  for (const opcao of opcoes) if (opcao.id && !existentes.has(opcao.id)) throw new ApiError(400, 'Opção não pertence a este grupo.', 'INVALID_OPTION');
  const manter = new Set(opcoes.flatMap((opcao) => (opcao.id ? [opcao.id] : [])));
  for (const id of existentes) if (!manter.has(id)) await database.prepare('DELETE FROM loja_opcoes WHERE id = ?').run(id);
  // Rótulos temporários evitam colisão no UNIQUE (grupo, rótulo) quando dois trocam de nome.
  for (const opcao of opcoes) if (opcao.id) await database.prepare('UPDATE loja_opcoes SET rotulo = ? WHERE id = ?').run(`~${opcao.id}`.slice(0, 80), opcao.id);
  for (const [ordem, opcao] of opcoes.entries()) {
    if (opcao.id) await database.prepare('UPDATE loja_opcoes SET rotulo = ?, acrescimo_centavos = ?, disponivel = ?, ordem = ? WHERE id = ?').run(opcao.rotulo, opcao.acrescimo, opcao.disponivel ? 1 : 0, ordem, opcao.id);
    else await database.prepare('INSERT INTO loja_opcoes (id, grupo_id, rotulo, acrescimo_centavos, disponivel, ordem) VALUES (?, ?, ?, ?, ?, ?)').run(novoId(), grupoId, opcao.rotulo, opcao.acrescimo, opcao.disponivel ? 1 : 0, ordem);
  }
}

export async function criarGrupo(entradaBruta: unknown, ator: Actor) {
  exigirGravacaoGestao();
  const entrada = objeto(entradaBruta);
  if (entrada.chave === undefined || entrada.nome === undefined || entrada.opcoes === undefined) throw new ApiError(400, 'Informe identificador, nome e opções.', 'INVALID_INPUT');
  const dados = validarGrupo(entrada), id = novoId(), agora = Date.now(), database = gestaoDb();
  await database.transaction(async () => {
    await travarGestao();
    if (await database.prepare('SELECT id FROM loja_grupos_opcoes WHERE chave = ?').get(dados.chave)) throw new ApiError(409, 'Já existe um grupo com esse identificador.', 'DUPLICATE_KEY');
    await database.prepare('INSERT INTO loja_grupos_opcoes (id, chave, nome, descricao, tipo, minimo, maximo, revisao, criado, atualizado) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)').run(id, dados.chave, dados.nome, dados.descricao, dados.tipo, dados.minimo, dados.maximo, agora, agora);
    await gravarOpcoes(id, dados.opcoes ?? []);
    await auditarGestao(ator.id, 'created', 'loja_grupos_opcoes', id);
  });
  return obterGrupo(id);
}

export async function atualizarGrupo(id: string, entradaBruta: unknown, ator: Actor) {
  exigirGravacaoGestao();
  const entrada = objeto(entradaBruta), { revisao, ...campos } = entrada, esperada = revisaoCampo(revisao), database = gestaoDb();
  await database.transaction(async () => {
    await travarGestao();
    const atual = await linhaGrupo(id);
    if (Number(atual.revisao) !== esperada) throw conflito();
    const dados = validarGrupo(campos, atual);
    if (dados.tipo !== texto(atual.tipo) && Number(atual.produtos) > 0) throw new ApiError(409, 'O grupo já está em produtos: crie outro em vez de trocar o tipo.', 'GROUP_IN_USE');
    if (dados.tipo === 'personalizacao' && !dados.opcoes && Number((await database.prepare('SELECT COUNT(*) AS total FROM loja_opcoes WHERE grupo_id = ?').get(id))?.total) !== 1)
      throw new ApiError(400, 'A personalização tem uma opção só.', 'INVALID_INPUT');
    if (await database.prepare('SELECT id FROM loja_grupos_opcoes WHERE chave = ? AND id <> ?').get(dados.chave, id)) throw new ApiError(409, 'Já existe um grupo com esse identificador.', 'DUPLICATE_KEY');
    await database.prepare('UPDATE loja_grupos_opcoes SET chave = ?, nome = ?, descricao = ?, tipo = ?, minimo = ?, maximo = ?, revisao = revisao + 1, atualizado = ? WHERE id = ? AND revisao = ?').run(dados.chave, dados.nome, dados.descricao, dados.tipo, dados.minimo, dados.maximo, Date.now(), id, esperada);
    if (dados.opcoes) await gravarOpcoes(id, dados.opcoes);
    await auditarGestao(ator.id, 'updated', 'loja_grupos_opcoes', id);
  });
  return obterGrupo(id);
}

export async function removerGrupo(id: string, revisaoBruta: unknown, ator: Actor) {
  exigirGravacaoGestao();
  const esperada = revisaoCampo(revisaoBruta), database = gestaoDb();
  await database.transaction(async () => {
    await travarGestao();
    const atual = await linhaGrupo(id);
    if (Number(atual.revisao) !== esperada) throw conflito();
    if (Number(atual.produtos) > 0) throw new ApiError(409, 'Tire o grupo dos produtos antes de remover.', 'GROUP_IN_USE');
    await database.prepare('DELETE FROM loja_grupos_opcoes WHERE id = ?').run(id);
    await auditarGestao(ator.id, 'removed', 'loja_grupos_opcoes', id);
  });
  return { removido: true };
}

// ---------------------------------------------------------------- Coleções

const ONDE: readonly OndeColecao[] = ['home', 'listagem', 'ambos'];

async function colecaoGestao(linha: Linha): Promise<ColecaoGestao> {
  const produtos = await gestaoDb().prepare('SELECT p.id, p.slug, p.nome FROM loja_colecao_produtos cp JOIN loja_produtos p ON p.id = cp.produto_id WHERE cp.colecao_id = ? ORDER BY cp.ordem').all(texto(linha.id));
  return {
    id: texto(linha.id), slug: texto(linha.slug), nome: texto(linha.nome), descricao: texto(linha.descricao), onde: texto(linha.onde) as OndeColecao, ordem: Number(linha.ordem), ativa: booleano(linha.ativa),
    produtos: produtos.map((produto) => ({ id: texto(produto.id), slug: texto(produto.slug), nome: texto(produto.nome) })), revisao: Number(linha.revisao), criadoEm: iso(linha.criado), atualizadoEm: iso(linha.atualizado),
  };
}

export async function listarColecoes() {
  const linhas = await gestaoDb().prepare('SELECT * FROM loja_colecoes ORDER BY ordem, nome').all();
  return { colecoes: await Promise.all(linhas.map(colecaoGestao)) };
}
async function linhaColecao(id: string) {
  if (typeof id !== 'string' || !ID.test(id)) throw naoEncontrado('Coleção');
  const linha = await gestaoDb().prepare('SELECT * FROM loja_colecoes WHERE id = ?').get(id);
  if (!linha) throw naoEncontrado('Coleção');
  return linha;
}
export async function obterColecao(id: string) { return { colecao: await colecaoGestao(await linhaColecao(id)) }; }

async function gravarProdutosDaColecao(colecaoId: string, ids: string[]) {
  const database = gestaoDb();
  for (const produto of ids) if (!await database.prepare('SELECT id FROM loja_produtos WHERE id = ?').get(produto)) throw new ApiError(400, 'Produto não encontrado.', 'INVALID_PRODUCT');
  await database.prepare('DELETE FROM loja_colecao_produtos WHERE colecao_id = ?').run(colecaoId);
  for (const [ordem, produto] of ids.entries()) await database.prepare('INSERT INTO loja_colecao_produtos (colecao_id, produto_id, ordem) VALUES (?, ?, ?)').run(colecaoId, produto, ordem);
}

function validarColecao(entrada: Record<string, unknown>, atual?: Linha) {
  permitidos(entrada, ['slug', 'nome', 'descricao', 'onde', 'ordem', 'ativa', 'produtos']);
  const tem = (campo: string) => entrada[campo] !== undefined;
  return {
    slug: tem('slug') ? slugCampo(entrada.slug, 'Slug', 80) : texto(atual?.slug),
    nome: tem('nome') ? textoCampo(entrada.nome, 'Nome', 80, true) : texto(atual?.nome),
    descricao: tem('descricao') ? textoCampo(entrada.descricao, 'Descrição', 500) : texto(atual?.descricao),
    onde: tem('onde') ? opcaoCampo(entrada.onde, 'Onde aparece', ONDE) : ((texto(atual?.onde) || 'home') as OndeColecao),
    ordem: tem('ordem') ? inteiroCampo(entrada.ordem, 'Ordem', 0, 100_000) : Number(atual?.ordem ?? 0),
    ativa: tem('ativa') ? booleanoCampo(entrada.ativa, 'Ativa') : atual ? booleano(atual.ativa) : true,
    ...(tem('produtos') ? { produtos: listaIds(entrada.produtos, 'Produtos', 200) } : {}),
  };
}

export async function criarColecao(entradaBruta: unknown, ator: Actor) {
  exigirGravacaoGestao();
  const entrada = objeto(entradaBruta);
  if (entrada.slug === undefined || entrada.nome === undefined) throw new ApiError(400, 'Informe slug e nome.', 'INVALID_INPUT');
  const dados = validarColecao(entrada), id = novoId(), agora = Date.now(), database = gestaoDb();
  await database.transaction(async () => {
    await travarGestao();
    if (await database.prepare('SELECT id FROM loja_colecoes WHERE slug = ?').get(dados.slug)) throw new ApiError(409, 'Já existe uma coleção com esse slug.', 'DUPLICATE_SLUG');
    await database.prepare('INSERT INTO loja_colecoes (id, slug, nome, descricao, onde, ordem, ativa, revisao, criado, atualizado) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)').run(id, dados.slug, dados.nome, dados.descricao, dados.onde, dados.ordem, dados.ativa ? 1 : 0, agora, agora);
    await gravarProdutosDaColecao(id, dados.produtos ?? []);
    await auditarGestao(ator.id, 'created', 'loja_colecoes', id);
  });
  return obterColecao(id);
}

/** PATCH {revisao, ...}; `produtos` (ids) substitui a lista na ordem dada (é assim que se reordena). */
export async function atualizarColecao(id: string, entradaBruta: unknown, ator: Actor) {
  exigirGravacaoGestao();
  const entrada = objeto(entradaBruta), { revisao, ...campos } = entrada, esperada = revisaoCampo(revisao), database = gestaoDb();
  await database.transaction(async () => {
    await travarGestao();
    const atual = await linhaColecao(id);
    if (Number(atual.revisao) !== esperada) throw conflito();
    const dados = validarColecao(campos, atual);
    if (await database.prepare('SELECT id FROM loja_colecoes WHERE slug = ? AND id <> ?').get(dados.slug, id)) throw new ApiError(409, 'Já existe uma coleção com esse slug.', 'DUPLICATE_SLUG');
    await database.prepare('UPDATE loja_colecoes SET slug = ?, nome = ?, descricao = ?, onde = ?, ordem = ?, ativa = ?, revisao = revisao + 1, atualizado = ? WHERE id = ? AND revisao = ?').run(dados.slug, dados.nome, dados.descricao, dados.onde, dados.ordem, dados.ativa ? 1 : 0, Date.now(), id, esperada);
    if (dados.produtos) await gravarProdutosDaColecao(id, dados.produtos);
    await auditarGestao(ator.id, 'updated', 'loja_colecoes', id);
  });
  return obterColecao(id);
}

export async function removerColecao(id: string, revisaoBruta: unknown, ator: Actor) {
  exigirGravacaoGestao();
  const esperada = revisaoCampo(revisaoBruta), database = gestaoDb();
  await database.transaction(async () => {
    await travarGestao();
    const atual = await linhaColecao(id);
    if (Number(atual.revisao) !== esperada) throw conflito();
    await database.prepare('DELETE FROM loja_colecoes WHERE id = ?').run(id);
    await auditarGestao(ator.id, 'removed', 'loja_colecoes', id);
  });
  return { removida: true };
}
