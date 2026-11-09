import { ApiError, type Actor } from '../../erp/access.ts';
import { chaveItem, limparItem, MAX_QUANTIDADE, type ItemCarrinho } from '../../../loja/lib/carrinho/item.ts';
import { linhaDoPedido, resolverItem } from '../../../loja/lib/carrinho/linhas.ts';
import type { ProdutoCarrinho } from '../../../loja/lib/carrinho/catalogo.ts';
import { linkWhatsApp, reaisTexto } from '../../../loja/lib/checkout/pedido.ts';
import { mascararWhatsapp, primeiroNome } from '../../../loja/lib/contas/regras.ts';
import type { CarrinhoAbandonadoGestao, CarrinhoDaCliente, ItemCarrinhoGestao, RespostaCarrinhos, RespostaMensagemCarrinho } from './tipos.ts';
import { auditarGestao, buscaDaUrl, escaparLike, gestaoDb, iso, isoOuNulo, json, type Linha, paginacao, texto } from './esquema.ts';

// Carrinho sincronizado das clientes LOGADAS (a sacola continua no navegador; com conta, a loja manda uma
// cópia com debounce para PUT /api/carrinho/sincronizar). Base dos "carrinhos abandonados" do ERP:
// abandonado = tem itens, não virou pedido e está parado há X horas (padrão 24, configurável na consulta).
// Guarda os itens como a sacola (produto, opção, quantidade) mais o retrato do nome e do preço "a partir de"
// no momento, para o ERP mostrar e montar a mensagem sem depender do catálogo.
// LGPD: só cliente logada; avisado na Política de privacidade (seção #conta); some com a exclusão da conta.

export const HORAS_ABANDONO_PADRAO = 24;
export const MAX_LINHAS_CARRINHO = 50;
type LinhaGuardada = ItemCarrinhoGestao & { item: ItemCarrinho };

function linhasDoCarrinho(itensBrutos: unknown, catalogo: Map<string, ProdutoCarrinho>) {
  if (!Array.isArray(itensBrutos)) throw new ApiError(400, 'Itens inválidos.', 'INVALID_INPUT');
  if (itensBrutos.length > MAX_LINHAS_CARRINHO) throw new ApiError(400, `A sacola sincroniza até ${MAX_LINHAS_CARRINHO} itens diferentes.`, 'ITENS_DEMAIS');
  const porChave = new Map<string, ItemCarrinho>();
  for (const bruto of itensBrutos) {
    const item = limparItem(bruto);
    if (!item) continue; // item ilegível: a sacola do navegador também o descarta
    const igual = porChave.get(chaveItem(item));
    if (igual) igual.quantidade = Math.min(MAX_QUANTIDADE, igual.quantidade + item.quantidade);
    else porChave.set(chaveItem(item), { ...item });
  }
  return [...porChave.values()].map((item): LinhaGuardada => {
    const produto = resolverItem(item, catalogo);
    if (!produto) return { item, nome: item.slug, quantidade: item.quantidade, precoCentavos: 0, detalhes: [], disponivel: false };
    const linha = linhaDoPedido(item, produto);
    return { item, nome: linha.nome, quantidade: item.quantidade, precoCentavos: linha.precoCentavos, detalhes: linha.detalhes, href: produto.href ?? `/produto/${produto.slug}`, disponivel: true };
  });
}

/**
 * Grava a sacola da cliente. Sem mudança nos itens, não mexe em nada (o "parado há" conta da última mudança).
 * Depois de um pedido (convertido), itens novos abrem um carrinho novo.
 */
export async function sincronizarCarrinho(clienteId: string, entrada: Record<string, unknown>, catalogo: Map<string, ProdutoCarrinho>, agora = Date.now()) {
  if (Object.keys(entrada).some((chave) => chave !== 'itens')) throw new ApiError(400, 'Campo não permitido.', 'UNKNOWN_FIELD');
  const linhas = linhasDoCarrinho(entrada.itens, catalogo);
  const itensJson = JSON.stringify(linhas);
  if (itensJson.length > 65536) throw new ApiError(413, 'A sacola ficou grande demais para sincronizar.', 'CARRINHO_GRANDE');
  const quantidade = linhas.reduce((soma, linha) => soma + linha.quantidade, 0);
  const total = linhas.reduce((soma, linha) => soma + (linha.disponivel ? linha.precoCentavos * linha.quantidade : 0), 0);
  const database = gestaoDb();
  return database.transaction(async () => {
    const atual = await database.prepare('SELECT * FROM loja_carrinhos WHERE cliente_id = ?').get(clienteId);
    const mesmosItens = atual && JSON.stringify(json<LinhaGuardada[]>(atual.itens_json, []).map((linha) => linha.item)) === JSON.stringify(linhas.map((linha) => linha.item));
    if (mesmosItens) return { sincronizado: true, alterado: false };
    if (!atual) {
      if (!linhas.length) return { sincronizado: true, alterado: false };
      await database.prepare('INSERT INTO loja_carrinhos (cliente_id, itens_json, quantidade, total_centavos, criado, atualizado) VALUES (?, ?, ?, ?, ?, ?)').run(clienteId, itensJson, quantidade, total, agora, agora);
    } else if (atual.convertido_em !== null && atual.convertido_em !== undefined) {
      // Já virou pedido: esvaziar só registra; itens novos começam outro carrinho.
      if (linhas.length) await database.prepare('UPDATE loja_carrinhos SET itens_json = ?, quantidade = ?, total_centavos = ?, criado = ?, atualizado = ?, convertido_em = NULL, pedido_numero = NULL, lembrete_em = NULL WHERE cliente_id = ?').run(itensJson, quantidade, total, agora, agora, clienteId);
      else await database.prepare('UPDATE loja_carrinhos SET itens_json = ?, quantidade = 0, total_centavos = 0 WHERE cliente_id = ?').run('[]', clienteId);
    } else {
      await database.prepare(`UPDATE loja_carrinhos SET itens_json = ?, quantidade = ?, total_centavos = ?, atualizado = ?${!Number(atual.quantidade) ? ', criado = ?' : ''} WHERE cliente_id = ?`)
        .run(...[itensJson, quantidade, total, agora, ...(!Number(atual.quantidade) ? [agora] : []), clienteId]);
    }
    return { sincronizado: true, alterado: true };
  });
}

/** Chamado ao criar o pedido: o carrinho vira "convertido" (sai dos abandonados). */
export async function marcarCarrinhoConvertido(clienteId: string, numero: string, agora = Date.now()) {
  await gestaoDb().prepare('UPDATE loja_carrinhos SET convertido_em = ?, pedido_numero = ? WHERE cliente_id = ? AND convertido_em IS NULL').run(agora, numero, clienteId);
}

// ---------------------------------------------------------------- ERP

export function horasDaUrl(url: URL) {
  const bruto = url.searchParams.get('horas');
  const horas = bruto === null ? HORAS_ABANDONO_PADRAO : Number(bruto);
  if (!Number.isSafeInteger(horas) || horas < 1 || horas > 720) throw new ApiError(400, 'Horas: informe de 1 a 720.', 'INVALID_FILTER');
  return horas;
}

function carrinhoGestao(linha: Linha, agora: number): CarrinhoAbandonadoGestao {
  const itens = json<LinhaGuardada[]>(linha.itens_json, []).map(({ item: _item, ...resto }) => resto);
  return {
    clienteId: texto(linha.cliente_id), nome: texto(linha.nome), email: texto(linha.email), whatsapp: texto(linha.whatsapp), whatsappFormatado: mascararWhatsapp(texto(linha.whatsapp)),
    itens, quantidade: Number(linha.quantidade), totalCentavos: Number(linha.total_centavos), criadoEm: iso(linha.criado), atualizadoEm: iso(linha.atualizado),
    horasParado: Math.floor((agora - Number(linha.atualizado)) / 3_600_000), lembreteEm: isoOuNulo(linha.lembrete_em),
  };
}

/** ?horas=24&busca=&minimoCentavos=&lembrete=todos|sem|com&limit&offset */
export async function listarCarrinhosAbandonados(url: URL, agora = Date.now()): Promise<RespostaCarrinhos> {
  const horas = horasDaUrl(url), { limite, offset } = paginacao(url, 50, 200), termo = buscaDaUrl(url);
  const minimo = Number(url.searchParams.get('minimoCentavos') ?? 0);
  if (!Number.isSafeInteger(minimo) || minimo < 0) throw new ApiError(400, 'Valor mínimo inválido.', 'INVALID_FILTER');
  const lembrete = url.searchParams.get('lembrete') ?? 'todos';
  if (!['todos', 'sem', 'com'].includes(lembrete)) throw new ApiError(400, 'Filtro de lembrete inválido.', 'INVALID_FILTER');
  const condicoes = ['k.convertido_em IS NULL', 'k.quantidade > 0', 'k.atualizado < ?', 'k.total_centavos >= ?'], parametros: (string | number)[] = [agora - horas * 3_600_000, minimo];
  if (lembrete === 'sem') condicoes.push('k.lembrete_em IS NULL');
  if (lembrete === 'com') condicoes.push('k.lembrete_em IS NOT NULL');
  if (termo) { condicoes.push("(LOWER(c.nome) LIKE ? ESCAPE '\\' OR c.email LIKE ? ESCAPE '\\' OR c.whatsapp LIKE ? ESCAPE '\\')"); parametros.push(...Array(3).fill(`%${escaparLike(termo)}%`)); }
  const onde = `FROM loja_carrinhos k JOIN loja_clientes c ON c.id = k.cliente_id WHERE ${condicoes.join(' AND ')}`, database = gestaoDb();
  const resumo = await database.prepare(`SELECT COUNT(*) AS total, COALESCE(SUM(k.total_centavos), 0) AS valor ${onde}`).get(...parametros);
  const linhas = await database.prepare(`SELECT k.*, c.nome, c.email, c.whatsapp ${onde} ORDER BY k.atualizado DESC, k.cliente_id LIMIT ? OFFSET ?`).all(...parametros, limite, offset);
  const total = Number(resumo?.total ?? 0);
  return { carrinhos: linhas.map((linha) => carrinhoGestao(linha, agora)), horas, totalCentavos: Number(resumo?.valor ?? 0), pagination: { limit: limite, offset, total, hasMore: offset + linhas.length < total } };
}

/** Sacola aberta da cliente (com itens e sem virar pedido), parada ou não; null sem carrinho ou sem a migração 010. */
export async function carrinhoDaCliente(clienteId: string, agora = Date.now()): Promise<CarrinhoDaCliente> {
  try {
    const linha = await gestaoDb().prepare('SELECT k.*, c.nome, c.email, c.whatsapp FROM loja_carrinhos k JOIN loja_clientes c ON c.id = k.cliente_id WHERE k.cliente_id = ? AND k.convertido_em IS NULL AND k.quantidade > 0').get(clienteId);
    return linha ? carrinhoGestao(linha, agora) : null;
  } catch { return null; }
}

/** Mensagem de lembrete e o link wa.me para a equipe abrir e enviar (nada é enviado daqui). */
export async function mensagemDoCarrinho(clienteId: string, ator: Actor, origemLoja: string, agora = Date.now()): Promise<RespostaMensagemCarrinho> {
  if (typeof clienteId !== 'string' || !/^[0-9a-f-]{36}$/.test(clienteId)) throw new ApiError(404, 'Carrinho não encontrado.', 'NOT_FOUND');
  const database = gestaoDb();
  const linha = await database.prepare('SELECT k.*, c.nome, c.email, c.whatsapp FROM loja_carrinhos k JOIN loja_clientes c ON c.id = k.cliente_id WHERE k.cliente_id = ? AND k.convertido_em IS NULL AND k.quantidade > 0').get(clienteId);
  if (!linha) throw new ApiError(404, 'Carrinho não encontrado ou já virou pedido.', 'NOT_FOUND');
  const carrinho = carrinhoGestao(linha, agora);
  const itens = carrinho.itens.filter((item) => item.disponivel);
  const mensagem = [
    `Oi, ${primeiroNome(carrinho.nome)}! Tudo bem? Aqui é do Ateliê Milena Kerbage.`,
    '',
    `Vimos que ${itens.length === 1 ? 'ficou uma peça' : 'ficaram algumas peças'} na sua sacola do site:`,
    ...itens.map((item) => `• ${item.quantidade}× ${item.nome}${item.detalhes.length ? ` (${item.detalhes.join(', ')})` : ''}: a partir de ${reaisTexto(item.precoCentavos * item.quantidade)}`),
    '',
    `Quer ajuda para fechar o pedido, escolher tamanho ou combinar o bordado? É só responder por aqui. A sacola continua salva em ${new URL('/carrinho', origemLoja).toString()}`,
  ].join('\n');
  await database.prepare('UPDATE loja_carrinhos SET lembrete_em = ? WHERE cliente_id = ?').run(agora, clienteId);
  await auditarGestao(ator.id, 'reminder_prepared', 'loja_carrinhos', clienteId);
  return { mensagem, link: linkWhatsApp(`55${carrinho.whatsapp}`, mensagem), lembreteEm: iso(agora) };
}
