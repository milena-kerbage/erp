import { ApiError, type Actor } from '../../erp/access.ts';
import { CUPONS, type Cupom } from '../../../loja/lib/carrinho/totais.ts';
import { CUPOM_GENERICO_PRIMEIRA, PERCENTUAL_BOAS_VINDAS, PREFIXO_CUPOM } from '../../../loja/lib/contas/regras.ts';
import type { CupomGestao, EntradaCupom, RespostaCupons, RespostaUsosCupom, ResumoCupomPrimeiraCompra, SituacaoCupom } from './tipos.ts';
import {
  auditarGestao, booleano, booleanoCampo, conflito, exigirGravacaoGestao, gestaoDb, inteiroOuNulo, iso, isoOuNulo, type Linha, naoEncontrado, novoId, objeto, opcaoCampo,
  paginacao, permitidos, revisaoCampo, textoCampo, texto, travarGestao, inteiroCampo, buscaDaUrl, escaparLike,
} from './esquema.ts';

// Cupons de campanha (ENXOVAL10…), cadastrados no ERP. O cupom de boas-vindas de cada conta (BEMVINDA-XXXX,
// loja_cupons) e o BEMVINDO5 continuam como antes (src/lib/loja/contas.ts). Um cupom por pedido: o servidor
// confere validade, mínimo, limite total, limite por cliente e "só primeira compra" ao criar o pedido, na
// mesma transação que grava o uso (loja_cupom_usos).

const decimal = (centavos: number) => `${Math.floor(centavos / 100)}.${String(centavos % 100).padStart(2, '0')}`;

/** Cupom de campanha (linha do banco) no formato da sacola e do recálculo. */
export function cupomDaLinha(linha: Linha): Cupom {
  const percentual = texto(linha.tipo) === 'percentual';
  return {
    codigo: texto(linha.codigo),
    percentual: percentual ? Number(linha.valor) : 0,
    minimoCentavos: Number(linha.minimo_centavos),
    descricao: texto(linha.descricao) || (percentual ? `${Number(linha.valor)}% de desconto` : `R$ ${decimal(Number(linha.valor)).replace('.', ',')} de desconto`),
    ...(percentual ? {} : { valorCentavos: Number(linha.valor) }),
    ...(linha.inicio !== null && linha.inicio !== undefined ? { inicio: Number(linha.inicio) } : {}),
    ...(linha.fim !== null && linha.fim !== undefined ? { fim: Number(linha.fim) } : {}),
    ...(booleano(linha.primeira_compra) ? { primeiraCompra: true } : {}),
    ...(booleano(linha.exibir) ? { exibir: true } : {}),
  };
}

/** Cupons de campanha ativos e com saldo (os esgotados saem). null: nenhum cupom cadastrado (usa o fallback). */
export async function cuponsDeCampanha(): Promise<Cupom[] | null> {
  const database = gestaoDb();
  const total = Number((await database.prepare('SELECT COUNT(*) AS total FROM loja_cupons_campanha').get())?.total ?? 0);
  if (!total) return null;
  const linhas = await database.prepare('SELECT c.*, (SELECT COUNT(*) FROM loja_cupom_usos u WHERE u.cupom_id = c.id) AS usos FROM loja_cupons_campanha c WHERE c.ativo = 1 ORDER BY c.codigo').all();
  return linhas.filter((linha) => linha.limite_total === null || linha.limite_total === undefined || Number(linha.usos) < Number(linha.limite_total)).map(cupomDaLinha);
}

export type CampanhasDoPedido = { cupons: Cupom[]; porCodigo: Map<string, Linha> };

/**
 * Cupons de campanha para o recálculo do pedido (lidos FORA da transação do pedido). Banco sem cupons
 * cadastrados, ou sem a migração 010: os cupons em código (CUPONS), como antes da gestão existir.
 */
export async function campanhasParaPedido(): Promise<CampanhasDoPedido> {
  try {
    const linhas = await gestaoDb().prepare('SELECT * FROM loja_cupons_campanha').all();
    if (!linhas.length) return { cupons: CUPONS, porCodigo: new Map() };
    const ativos = linhas.filter((linha) => booleano(linha.ativo));
    return { cupons: ativos.map(cupomDaLinha), porCodigo: new Map(ativos.map((linha) => [texto(linha.codigo), linha])) };
  } catch {
    return { cupons: CUPONS, porCodigo: new Map() };
  }
}

/**
 * Dentro da transação do pedido: confere os limites do cupom de campanha (total, por cliente e primeira
 * compra) com a trava do código. Devolve a mensagem de recusa ou null.
 */
export async function conferirLimitesCupom(linha: Linha, clienteId: string): Promise<string | null> {
  const database = gestaoDb();
  await travarGestao(`loja-cupom:${texto(linha.codigo)}`);
  if (linha.limite_total !== null && linha.limite_total !== undefined) {
    const usos = Number((await database.prepare('SELECT COUNT(*) AS total FROM loja_cupom_usos WHERE cupom_id = ?').get(texto(linha.id)))?.total ?? 0);
    if (usos >= Number(linha.limite_total)) return `O cupom ${texto(linha.codigo)} esgotou.`;
  }
  if (linha.limite_por_cliente !== null && linha.limite_por_cliente !== undefined) {
    const usos = Number((await database.prepare('SELECT COUNT(*) AS total FROM loja_cupom_usos WHERE cupom_id = ? AND cliente_id = ?').get(texto(linha.id), clienteId))?.total ?? 0);
    if (usos >= Number(linha.limite_por_cliente)) return `Você já usou o cupom ${texto(linha.codigo)}.`;
  }
  if (booleano(linha.primeira_compra)) {
    const anteriores = Number((await database.prepare("SELECT COUNT(*) AS total FROM loja_pedidos WHERE cliente_id = ? AND status <> 'cancelado'").get(clienteId))?.total ?? 0);
    if (anteriores > 0) return `O ${texto(linha.codigo)} vale só na primeira compra.`;
  }
  return null;
}

export async function registrarUsoCupom(linha: Linha, clienteId: string, numero: string, descontoCentavos: number, agora: number) {
  await gestaoDb().prepare('INSERT INTO loja_cupom_usos (id, cupom_id, cliente_id, pedido_numero, desconto_centavos, criado) VALUES (?, ?, ?, ?, ?, ?)').run(novoId(), texto(linha.id), clienteId, numero, descontoCentavos, agora);
}

// ---------------------------------------------------------------- ERP

function situacao(linha: Linha, usos: number, agora = Date.now()): SituacaoCupom {
  if (!booleano(linha.ativo)) return 'inativo';
  if (linha.limite_total !== null && linha.limite_total !== undefined && usos >= Number(linha.limite_total)) return 'esgotado';
  if (linha.inicio !== null && linha.inicio !== undefined && agora < Number(linha.inicio)) return 'agendado';
  if (linha.fim !== null && linha.fim !== undefined && agora >= Number(linha.fim)) return 'expirado';
  return 'ativo';
}

function cupomGestao(linha: Linha): CupomGestao {
  const usos = Number(linha.usos ?? 0);
  return {
    id: texto(linha.id), codigo: texto(linha.codigo), descricao: texto(linha.descricao), tipo: texto(linha.tipo) as CupomGestao['tipo'], valor: Number(linha.valor),
    minimoCentavos: Number(linha.minimo_centavos), inicio: isoOuNulo(linha.inicio), fim: isoOuNulo(linha.fim),
    limiteTotal: linha.limite_total === null || linha.limite_total === undefined ? null : Number(linha.limite_total),
    limitePorCliente: linha.limite_por_cliente === null || linha.limite_por_cliente === undefined ? null : Number(linha.limite_por_cliente),
    primeiraCompra: booleano(linha.primeira_compra), exibir: booleano(linha.exibir), ativo: booleano(linha.ativo), situacao: situacao(linha, usos), usos,
    descontoTotalCentavos: Number(linha.desconto_total ?? 0), revisao: Number(linha.revisao), criadoEm: iso(linha.criado), atualizadoEm: iso(linha.atualizado),
  };
}

const SELECT_CUPOM = 'SELECT c.*, (SELECT COUNT(*) FROM loja_cupom_usos u WHERE u.cupom_id = c.id) AS usos, (SELECT COALESCE(SUM(u.desconto_centavos), 0) FROM loja_cupom_usos u WHERE u.cupom_id = c.id) AS desconto_total FROM loja_cupons_campanha c';

export async function listarCupons(url: URL): Promise<RespostaCupons> {
  const termo = buscaDaUrl(url);
  const linhas = await gestaoDb().prepare(`${SELECT_CUPOM}${termo ? " WHERE LOWER(c.codigo) LIKE ? ESCAPE '\\' OR LOWER(c.descricao) LIKE ? ESCAPE '\\'" : ''} ORDER BY c.ativo DESC, c.criado DESC`).all(...(termo ? [`%${escaparLike(termo)}%`, `%${escaparLike(termo)}%`] : []));
  return { cupons: linhas.map(cupomGestao), primeiraCompra: await resumoPrimeiraCompra() };
}

/** O cupom automático de primeira compra (um por conta + o BEMVINDO5): só leitura no ERP, com os números de uso. */
async function resumoPrimeiraCompra(): Promise<ResumoCupomPrimeiraCompra> {
  const resumo: ResumoCupomPrimeiraCompra = { percentual: PERCENTUAL_BOAS_VINDAS, prefixo: PREFIXO_CUPOM, generico: CUPOM_GENERICO_PRIMEIRA, emitidos: 0, usados: 0, descontoCentavos: 0 };
  try {
    const database = gestaoDb();
    const cupons = await database.prepare('SELECT COUNT(*) AS emitidos, COUNT(usado_em) AS usados FROM loja_cupons').get();
    const pedidos = await database.prepare("SELECT COALESCE(SUM(desconto_centavos), 0) AS desconto FROM loja_pedidos WHERE status <> 'cancelado' AND (cupom_codigo = ? OR cupom_codigo LIKE ?)").get(CUPOM_GENERICO_PRIMEIRA, `${PREFIXO_CUPOM}%`);
    resumo.emitidos = Number(cupons?.emitidos ?? 0); resumo.usados = Number(cupons?.usados ?? 0); resumo.descontoCentavos = Number(pedidos?.desconto ?? 0);
  } catch { /* sem a migração 009: só a regra, sem números */ }
  return resumo;
}

async function linhaCupom(id: string) {
  const linha = await gestaoDb().prepare(`${SELECT_CUPOM} WHERE c.id = ?`).get(id);
  if (!linha) throw naoEncontrado('Cupom');
  return linha;
}
export async function obterCupom(id: string) { return { cupom: cupomGestao(await linhaCupom(id)) }; }

function dataCampo(valor: unknown, rotulo: string): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor !== 'string' || !/^\d{4}-\d\d-\d\d(T\d\d:\d\d(:\d\d(\.\d{1,3})?)?(Z|[+-]\d\d:\d\d))?$/.test(valor) || !Number.isFinite(Date.parse(valor)))
    throw new ApiError(400, `${rotulo}: informe a data (AAAA-MM-DD) ou data e hora com fuso.`, 'INVALID_DATE');
  // Só a data: início às 00h e fim às 24h no horário de Brasília.
  return Date.parse(valor.length === 10 ? `${valor}T00:00:00-03:00` : valor);
}

const CAMPOS_CUPOM = ['codigo', 'descricao', 'tipo', 'valor', 'minimoCentavos', 'inicio', 'fim', 'limiteTotal', 'limitePorCliente', 'primeiraCompra', 'exibir', 'ativo'] as const;

function validarCupom(entrada: Record<string, unknown>, atual?: Linha) {
  permitidos(entrada, CAMPOS_CUPOM);
  const tem = (campo: string) => entrada[campo] !== undefined;
  const codigo = tem('codigo') ? textoCampo(entrada.codigo, 'Código', 30, true).toUpperCase() : texto(atual?.codigo);
  if (!/^[A-Z0-9][A-Z0-9_-]{2,29}$/.test(codigo)) throw new ApiError(400, 'Código: use de 3 a 30 letras, números, hífen ou sublinhado (ex.: ENXOVAL10).', 'INVALID_CODE');
  if (codigo === CUPOM_GENERICO_PRIMEIRA || codigo.startsWith(PREFIXO_CUPOM)) throw new ApiError(400, `Código reservado ao cupom de primeira compra (${CUPOM_GENERICO_PRIMEIRA} e ${PREFIXO_CUPOM}…).`, 'RESERVED_CODE');
  const tipo = tem('tipo') ? opcaoCampo(entrada.tipo, 'Tipo', ['percentual', 'valor'] as const) : (texto(atual?.tipo) as 'percentual' | 'valor');
  if (!tipo) throw new ApiError(400, 'Tipo: escolha percentual ou valor.', 'INVALID_INPUT');
  const valor = tem('valor') ? inteiroCampo(entrada.valor, 'Valor', 1, 100_000_000) : Number(atual?.valor);
  if (!Number.isSafeInteger(valor)) throw new ApiError(400, 'Valor é obrigatório.', 'INVALID_INPUT');
  if (tipo === 'percentual' && (valor < 1 || valor > 50)) throw new ApiError(400, 'Valor: o percentual vai de 1 a 50.', 'INVALID_NUMBER');
  const inicio = tem('inicio') ? dataCampo(entrada.inicio, 'Início') : (atual?.inicio ?? null) as number | null;
  const fim = tem('fim') ? (() => { const data = dataCampo(entrada.fim, 'Fim'); return data !== null && typeof entrada.fim === 'string' && entrada.fim.length === 10 ? data + 24 * 60 * 60 * 1000 : data; })() : (atual?.fim ?? null) as number | null;
  if (inicio !== null && fim !== null && Number(inicio) >= Number(fim)) throw new ApiError(400, 'O fim da validade deve ser depois do início.', 'INVALID_DATE_RANGE');
  return {
    codigo, tipo, valor,
    descricao: tem('descricao') ? textoCampo(entrada.descricao, 'Descrição', 200) : texto(atual?.descricao),
    minimo: tem('minimoCentavos') ? inteiroCampo(entrada.minimoCentavos, 'Valor mínimo', 0, 100_000_000) : Number(atual?.minimo_centavos ?? 0),
    inicio: inicio === null ? null : Number(inicio), fim: fim === null ? null : Number(fim),
    limiteTotal: tem('limiteTotal') ? inteiroOuNulo(entrada.limiteTotal, 'Limite total', 1, 1_000_000) : (atual?.limite_total ?? null) as number | null,
    limitePorCliente: tem('limitePorCliente') ? inteiroOuNulo(entrada.limitePorCliente, 'Limite por cliente', 1, 1000) : (atual?.limite_por_cliente ?? null) as number | null,
    primeiraCompra: tem('primeiraCompra') ? booleanoCampo(entrada.primeiraCompra, 'Só primeira compra') : booleano(atual?.primeira_compra),
    exibir: tem('exibir') ? booleanoCampo(entrada.exibir, 'Exibir na sacola') : booleano(atual?.exibir),
    ativo: tem('ativo') ? booleanoCampo(entrada.ativo, 'Ativo') : atual ? booleano(atual.ativo) : true,
  };
}

export async function criarCupom(entradaBruta: unknown, ator: Actor) {
  exigirGravacaoGestao();
  const dados = validarCupom(objeto(entradaBruta));
  const database = gestaoDb(), id = novoId(), agora = Date.now();
  await database.transaction(async () => {
    await travarGestao();
    if (await database.prepare('SELECT id FROM loja_cupons_campanha WHERE codigo = ?').get(dados.codigo)) throw new ApiError(409, 'Já existe um cupom com esse código.', 'DUPLICATE_CODE');
    await database.prepare(`INSERT INTO loja_cupons_campanha (id, codigo, descricao, tipo, valor, minimo_centavos, inicio, fim, limite_total, limite_por_cliente, primeira_compra, exibir, ativo, revisao, criado, atualizado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`).run(id, dados.codigo, dados.descricao, dados.tipo, dados.valor, dados.minimo, dados.inicio, dados.fim, dados.limiteTotal, dados.limitePorCliente, dados.primeiraCompra ? 1 : 0, dados.exibir ? 1 : 0, dados.ativo ? 1 : 0, agora, agora);
    await auditarGestao(ator.id, 'created', 'loja_cupons_campanha', id);
  });
  return obterCupom(id);
}

/** Editar, ativar ou desativar ({revisao, ativo: false}). */
export async function atualizarCupom(id: string, entradaBruta: unknown, ator: Actor) {
  exigirGravacaoGestao();
  const entrada = objeto(entradaBruta), { revisao, ...campos } = entrada, esperada = revisaoCampo(revisao);
  const database = gestaoDb();
  await database.transaction(async () => {
    await travarGestao();
    const atual = await linhaCupom(id);
    if (Number(atual.revisao) !== esperada) throw conflito();
    const dados = validarCupom(campos, atual);
    if (dados.codigo !== texto(atual.codigo)) {
      if (Number(atual.usos) > 0) throw new ApiError(409, 'O cupom já foi usado: crie outro em vez de trocar o código.', 'CODE_IN_USE');
      if (await database.prepare('SELECT id FROM loja_cupons_campanha WHERE codigo = ? AND id <> ?').get(dados.codigo, id)) throw new ApiError(409, 'Já existe um cupom com esse código.', 'DUPLICATE_CODE');
    }
    await database.prepare(`UPDATE loja_cupons_campanha SET codigo = ?, descricao = ?, tipo = ?, valor = ?, minimo_centavos = ?, inicio = ?, fim = ?, limite_total = ?, limite_por_cliente = ?, primeira_compra = ?, exibir = ?, ativo = ?, revisao = revisao + 1, atualizado = ? WHERE id = ? AND revisao = ?`)
      .run(dados.codigo, dados.descricao, dados.tipo, dados.valor, dados.minimo, dados.inicio, dados.fim, dados.limiteTotal, dados.limitePorCliente, dados.primeiraCompra ? 1 : 0, dados.exibir ? 1 : 0, dados.ativo ? 1 : 0, Date.now(), id, esperada);
    await auditarGestao(ator.id, 'updated', 'loja_cupons_campanha', id);
  });
  return obterCupom(id);
}

export async function usosDoCupom(id: string, url: URL): Promise<RespostaUsosCupom> {
  const { cupom } = await obterCupom(id);
  const { limite, offset } = paginacao(url, 50, 200);
  const database = gestaoDb();
  const total = Number((await database.prepare('SELECT COUNT(*) AS total FROM loja_cupom_usos WHERE cupom_id = ?').get(id))?.total ?? 0);
  const linhas = await database.prepare('SELECT u.*, c.nome FROM loja_cupom_usos u LEFT JOIN loja_clientes c ON c.id = u.cliente_id WHERE u.cupom_id = ? ORDER BY u.criado DESC, u.id LIMIT ? OFFSET ?').all(id, limite, offset);
  return {
    cupom,
    usos: linhas.map((linha) => ({ id: texto(linha.id), pedidoNumero: texto(linha.pedido_numero), clienteId: linha.cliente_id ? texto(linha.cliente_id) : null, clienteNome: texto(linha.nome), descontoCentavos: Number(linha.desconto_centavos), criadoEm: iso(linha.criado) })),
    pagination: { limit: limite, offset, total, hasMore: offset + linhas.length < total },
  };
}
