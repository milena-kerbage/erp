import { ApiError, type Actor } from '../../erp/access.ts';
import type { NomeIcone, TomMidia } from '../../../loja/componentes/inicio/Midia.tsx';
import type { ItemMenuGestao, RespostaMenu, SecaoMenu } from './tipos.ts';
import {
  auditarGestao, booleano, booleanoCampo, conflito, exigirGravacaoGestao, gestaoDb, hrefCampo, ID, imagemCampo, inteiroCampo, type Linha, listaIds, naoEncontrado, novoId, objeto, opcaoCampo, permitidos,
  revisaoCampo, textoCampo, texto, travarGestao,
} from './esquema.ts';

// Menu do cabeçalho da loja (mega menu) como árvore editável. A loja converte de volta para ItemMenu
// (src/lib/loja/gestao/catalogoBanco.ts); com a tabela vazia, vale o menu estático (menu.ts).
// Hierarquia: item (1º nível, painel "colunas" ou "cards") → destaque | secundario | coluna | card | promo;
// coluna → link. No painel "cards", só cards. Um promo por item.

export const TONS_MENU = ['salvia', 'musgo', 'noite', 'salviaClara', 'linho', 'areia', 'rose', 'azul', 'cru', 'cinza', 'branco', 'verde', 'aconchego'] as const satisfies readonly TomMidia[];
export const ICONES_MENU = ['bebe', 'berco', 'borboleta', 'conversa', 'nuvem', 'pena', 'flor', 'tulipa', 'presente', 'bolsa', 'coracao', 'folha', 'medalha', 'lua', 'agulha', 'pacote', 'regua', 'brilho', 'caminhao', 'estrela', 'novelo'] as const satisfies readonly NomeIcone[];
const SECOES: readonly SecaoMenu[] = ['item', 'destaque', 'secundario', 'coluna', 'link', 'card', 'promo'];
const FILHAS: Record<SecaoMenu, readonly SecaoMenu[]> = { item: ['destaque', 'secundario', 'coluna', 'card', 'promo'], coluna: ['link'], destaque: [], secundario: [], link: [], card: [], promo: [] };

function itemGestao(linha: Linha): ItemMenuGestao {
  return {
    id: texto(linha.id), paiId: linha.pai_id ? texto(linha.pai_id) : null, secao: texto(linha.secao) as SecaoMenu, rotulo: texto(linha.rotulo), href: texto(linha.href), descricao: texto(linha.descricao),
    imagem: texto(linha.imagem), tom: texto(linha.tom), icone: texto(linha.icone), painel: texto(linha.painel) as ItemMenuGestao['painel'], externo: booleano(linha.externo), destaque: booleano(linha.destaque),
    soBotao: booleano(linha.so_botao), ordem: Number(linha.ordem), ativo: booleano(linha.ativo), revisao: Number(linha.revisao), filhos: [],
  };
}

export async function obterMenu(): Promise<RespostaMenu> {
  const itens = (await gestaoDb().prepare('SELECT * FROM loja_menu_itens ORDER BY ordem, id').all()).map(itemGestao);
  const porId = new Map(itens.map((item) => [item.id, item]));
  const menu: ItemMenuGestao[] = [];
  for (const item of itens) (item.paiId && porId.get(item.paiId) ? porId.get(item.paiId)!.filhos : menu).push(item);
  return { menu, tons: [...TONS_MENU], icones: [...ICONES_MENU] };
}

async function linhaItem(id: string) {
  if (typeof id !== 'string' || !ID.test(id)) throw naoEncontrado('Item do menu');
  const linha = await gestaoDb().prepare('SELECT * FROM loja_menu_itens WHERE id = ?').get(id);
  if (!linha) throw naoEncontrado('Item do menu');
  return linha;
}

const CAMPOS = ['paiId', 'secao', 'rotulo', 'href', 'descricao', 'imagem', 'tom', 'icone', 'painel', 'externo', 'destaque', 'soBotao', 'ordem', 'ativo'] as const;

async function validarItem(entrada: Record<string, unknown>, atual?: Linha) {
  permitidos(entrada, CAMPOS);
  const tem = (campo: string) => entrada[campo] !== undefined;
  if (atual && (tem('secao') || tem('paiId'))) throw new ApiError(400, 'A seção e o item-pai não mudam: remova e crie de novo.', 'IMMUTABLE_FIELD');
  const secao = atual ? (texto(atual.secao) as SecaoMenu) : opcaoCampo(entrada.secao, 'Seção', SECOES);
  const paiId = atual ? (atual.pai_id ? texto(atual.pai_id) : null) : entrada.paiId === undefined || entrada.paiId === null ? null : listaIds([entrada.paiId], 'Item-pai')[0];
  if ((secao === 'item') !== (paiId === null)) throw new ApiError(400, secao === 'item' ? 'O item de 1º nível não tem pai.' : 'Informe o item-pai.', 'INVALID_PARENT');
  if (paiId && !atual) {
    const pai = await gestaoDb().prepare('SELECT secao, painel FROM loja_menu_itens WHERE id = ?').get(paiId);
    if (!pai) throw new ApiError(400, 'Item-pai não encontrado.', 'INVALID_PARENT');
    if (!FILHAS[texto(pai.secao) as SecaoMenu].includes(secao)) throw new ApiError(400, `"${secao}" não pode ficar dentro de "${texto(pai.secao)}".`, 'INVALID_PARENT');
    if (texto(pai.painel) === 'cards' && secao !== 'card') throw new ApiError(400, 'No painel de cards só entram cards.', 'INVALID_PARENT');
    if (secao === 'promo' && await gestaoDb().prepare("SELECT id FROM loja_menu_itens WHERE pai_id = ? AND secao = 'promo'").get(paiId)) throw new ApiError(409, 'Este item já tem um bloco editorial.', 'DUPLICATE_PROMO');
  }
  const midia = secao === 'card' || secao === 'promo';
  const tom = tem('tom') ? (midia ? opcaoCampo(entrada.tom, 'Tom', TONS_MENU) : '') : texto(atual?.tom) || (midia ? 'linho' : '');
  const icone = tem('icone') ? (midia ? opcaoCampo(entrada.icone, 'Ícone', ICONES_MENU) : '') : texto(atual?.icone) || (midia ? 'bebe' : '');
  const painel = secao === 'item' ? (tem('painel') ? opcaoCampo(entrada.painel, 'Painel', ['colunas', 'cards'] as const) : texto(atual?.painel) || 'colunas') : '';
  return {
    secao, paiId, tom, icone, painel,
    rotulo: tem('rotulo') ? textoCampo(entrada.rotulo, secao === 'promo' ? 'Título' : 'Rótulo', 80, true) : texto(atual?.rotulo),
    href: tem('href') ? hrefCampo(entrada.href, 'Link') : texto(atual?.href),
    descricao: tem('descricao') ? textoCampo(entrada.descricao, 'Descrição', 300) : texto(atual?.descricao),
    imagem: tem('imagem') ? imagemCampo(entrada.imagem, 'Imagem') : texto(atual?.imagem),
    externo: tem('externo') ? booleanoCampo(entrada.externo, 'Externo') : booleano(atual?.externo),
    destaque: tem('destaque') ? booleanoCampo(entrada.destaque, 'Destaque') : booleano(atual?.destaque),
    soBotao: tem('soBotao') ? booleanoCampo(entrada.soBotao, 'Só botão') : booleano(atual?.so_botao),
    ordem: tem('ordem') ? inteiroCampo(entrada.ordem, 'Ordem', 0, 10_000) : atual ? Number(atual.ordem) : null,
    ativo: tem('ativo') ? booleanoCampo(entrada.ativo, 'Ativo') : atual ? booleano(atual.ativo) : true,
  };
}

export async function criarItemMenu(entradaBruta: unknown, ator: Actor) {
  exigirGravacaoGestao();
  const entrada = objeto(entradaBruta);
  if (entrada.rotulo === undefined || entrada.href === undefined) throw new ApiError(400, 'Informe rótulo e link.', 'INVALID_INPUT');
  const id = novoId(), agora = Date.now(), database = gestaoDb();
  await database.transaction(async () => {
    await travarGestao();
    const dados = await validarItem(entrada);
    const ordem = dados.ordem ?? Number((await database.prepare(`SELECT COALESCE(MAX(ordem), -10) + 10 AS proxima FROM loja_menu_itens WHERE ${dados.paiId ? 'pai_id = ?' : 'pai_id IS NULL'}`).get(...(dados.paiId ? [dados.paiId] : [])))?.proxima ?? 0);
    await database.prepare('INSERT INTO loja_menu_itens (id, pai_id, secao, rotulo, href, descricao, imagem, tom, icone, painel, externo, destaque, so_botao, ordem, ativo, revisao, criado, atualizado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)')
      .run(id, dados.paiId, dados.secao, dados.rotulo, dados.href, dados.descricao, dados.imagem, dados.tom, dados.icone, dados.painel, dados.externo ? 1 : 0, dados.destaque ? 1 : 0, dados.soBotao ? 1 : 0, Math.min(ordem, 10_000), dados.ativo ? 1 : 0, agora, agora);
    await auditarGestao(ator.id, 'created', 'loja_menu_itens', id);
  });
  return { item: itemGestao(await linhaItem(id)) };
}

export async function atualizarItemMenu(id: string, entradaBruta: unknown, ator: Actor) {
  exigirGravacaoGestao();
  const entrada = objeto(entradaBruta), { revisao, ...campos } = entrada, esperada = revisaoCampo(revisao), database = gestaoDb();
  await database.transaction(async () => {
    await travarGestao();
    const atual = await linhaItem(id);
    if (Number(atual.revisao) !== esperada) throw conflito();
    const dados = await validarItem(campos, atual);
    if (dados.painel === 'cards' && texto(atual.painel) !== 'cards' && await database.prepare("SELECT id FROM loja_menu_itens WHERE pai_id = ? AND secao <> 'card' LIMIT 1").get(id))
      throw new ApiError(409, 'Tire as colunas e links antes de trocar o painel para cards.', 'INVALID_PANEL');
    await database.prepare('UPDATE loja_menu_itens SET rotulo = ?, href = ?, descricao = ?, imagem = ?, tom = ?, icone = ?, painel = ?, externo = ?, destaque = ?, so_botao = ?, ordem = ?, ativo = ?, revisao = revisao + 1, atualizado = ? WHERE id = ? AND revisao = ?')
      .run(dados.rotulo, dados.href, dados.descricao, dados.imagem, dados.tom, dados.icone, dados.painel, dados.externo ? 1 : 0, dados.destaque ? 1 : 0, dados.soBotao ? 1 : 0, dados.ordem ?? Number(atual.ordem), dados.ativo ? 1 : 0, Date.now(), id, esperada);
    await auditarGestao(ator.id, 'updated', 'loja_menu_itens', id);
  });
  return { item: itemGestao(await linhaItem(id)) };
}

/** Remove o item e tudo dentro dele. */
export async function removerItemMenu(id: string, revisaoBruta: unknown, ator: Actor) {
  exigirGravacaoGestao();
  const esperada = revisaoCampo(revisaoBruta), database = gestaoDb();
  await database.transaction(async () => {
    await travarGestao();
    const atual = await linhaItem(id);
    if (Number(atual.revisao) !== esperada) throw conflito();
    // Netos primeiro (links das colunas), depois filhos e o item (o SQLite local pode estar sem cascata).
    const filhos = (await database.prepare('SELECT id FROM loja_menu_itens WHERE pai_id = ?').all(id)).map((linha) => texto(linha.id));
    for (const filho of filhos) await database.prepare('DELETE FROM loja_menu_itens WHERE pai_id = ?').run(filho);
    await database.prepare('DELETE FROM loja_menu_itens WHERE pai_id = ?').run(id);
    await database.prepare('DELETE FROM loja_menu_itens WHERE id = ?').run(id);
    await auditarGestao(ator.id, 'removed', 'loja_menu_itens', id);
  });
  return { removido: true };
}

/** PUT {paiId, ids}: os itens de um nível (ou de uma seção do mesmo pai) na nova ordem. */
export async function ordenarMenu(entradaBruta: unknown, ator: Actor) {
  exigirGravacaoGestao();
  const entrada = objeto(entradaBruta);
  permitidos(entrada, ['paiId', 'ids']);
  const paiId = entrada.paiId === undefined || entrada.paiId === null ? null : listaIds([entrada.paiId], 'Item-pai')[0];
  const ids = listaIds(entrada.ids, 'Itens', 200), database = gestaoDb();
  await database.transaction(async () => {
    await travarGestao();
    const irmaos = (await database.prepare(`SELECT id FROM loja_menu_itens WHERE ${paiId ? 'pai_id = ?' : 'pai_id IS NULL'}`).all(...(paiId ? [paiId] : []))).map((linha) => texto(linha.id));
    if (ids.some((id) => !irmaos.includes(id))) throw new ApiError(400, 'Todos os itens precisam ser do mesmo nível.', 'INVALID_ORDER');
    for (const [posicao, id] of ids.entries()) await database.prepare('UPDATE loja_menu_itens SET ordem = ?, revisao = revisao + 1, atualizado = ? WHERE id = ?').run(posicao * 10, Date.now(), id);
    await auditarGestao(ator.id, 'reordered', 'loja_menu_itens', paiId ?? 'raiz');
  });
  return obterMenu();
}
