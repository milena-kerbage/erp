import { createHash, randomInt } from 'node:crypto';
import { ApiError, type Actor } from '../erp/access.ts';
import { initializeERP } from '../erp/core.ts';
import { auditarGestao, exigirGravacaoGestao, gestaoDb, iso, type Linha, paginacao, texto, travarGestao } from './gestao/esquema.ts';
import {
  CONFIG_PADRAO, type ConfigVaral, gerarCodigoVaral, normalizarEmailVaral, type Peca, PECAS, type PremioVaral, type ResultadoVaral, sortearPremio,
  textoDasCondicoes, textoDoPremio, validarConfigVaral,
} from '../../loja/lib/varal/regras.ts';

// Varal de roupinhas (módulo Marketing): o minigame de cupom da loja. Sem tabela nova, para não depender de migração:
// - a configuração e cada jogada ficam em workspace_settings (chave-valor do ERP): "marketing:varal" e
//   "varal:jogada:<hash do e-mail>";
// - o prêmio é um cupom de campanha (loja_cupons_campanha) de uso único, com o id "varal-<hash do e-mail>". O id é a
//   chave primária: é ele que garante UMA jogada por e-mail, mesmo com dois cliques ao mesmo tempo.
// Os cupons do varal não entram na lista de cupons que a loja manda ao navegador nem na tela de Cupons do ERP
// (gestao/cupons.ts filtra pelo prefixo do id): cada cliente só vê o próprio código.

export const PREFIXO_ID_CUPOM_VARAL = 'varal-';
const CHAVE_CONFIG = 'marketing:varal';
const PREFIXO_JOGADA = 'varal:jogada:';
const DIA = 86_400_000;

type Jogada = { email: string; peca: Peca; premio: string; tipo: 'percentual' | 'valor'; valor: number; codigo: string; validoAte: number; minimoCentavos: number; validadeDias: number; consentimento: true; em: number };

const hashDoEmail = (email: string) => createHash('sha256').update(`varal:${email}`).digest('hex').slice(0, 40);
const aleatorio = () => randomInt(0, 1_000_000) / 1_000_000;

async function banco() { await initializeERP(); return gestaoDb(); }

/** A configuração do jogo (o cadastro do ERP por cima do ponto de partida). */
export async function lerConfigVaral(): Promise<ConfigVaral & { revisao: number }> {
  const linha = await (await banco()).prepare('SELECT data_json, revision FROM workspace_settings WHERE id = ?').get(CHAVE_CONFIG);
  if (!linha) return { ...CONFIG_PADRAO, revisao: 0 };
  try { return { ...validarConfigVaral(JSON.parse(String(linha.data_json))), revisao: Number(linha.revision) }; } catch { return { ...CONFIG_PADRAO, revisao: Number(linha.revision) }; }
}

/** O que a loja pode saber antes da jogada: se o jogo está no ar e as condições do cupom. Nunca os prêmios nem as chances. */
export async function varalPublico() {
  const config = await lerConfigVaral();
  return { ativo: config.ativo, condicoes: textoDasCondicoes(config.validadeDias, config.minimoCentavos) };
}

export async function salvarConfigVaral(entrada: unknown, ator: Actor) {
  exigirGravacaoGestao();
  let config: ConfigVaral;
  try { config = validarConfigVaral(entrada); } catch (erro) { throw new ApiError(400, erro instanceof Error ? erro.message : 'Configuração inválida.', 'INVALID_INPUT'); }
  const database = await banco();
  await database.transaction(async () => {
    await travarGestao('marketing-varal');
    const agora = Date.now(), dados = JSON.stringify(config);
    const atualizou = await database.prepare('UPDATE workspace_settings SET data_json = ?, revision = revision + 1, updated = ? WHERE id = ?').run(dados, agora, CHAVE_CONFIG);
    if (!Number(atualizou.changes)) await database.prepare('INSERT INTO workspace_settings (id,data_json,revision,updated) VALUES (?, ?, 1, ?)').run(CHAVE_CONFIG, dados, agora);
    await auditarGestao(ator.id, 'updated', 'marketing_varal', 'varal');
  });
  return { config: await lerConfigVaral() };
}

function resultado(jogada: Jogada, jaJogou: boolean): ResultadoVaral {
  return {
    premio: jogada.premio, tipo: jogada.tipo, valor: jogada.valor, codigo: jogada.codigo, validoAte: new Date(jogada.validoAte).toISOString(), minimoCentavos: jogada.minimoCentavos,
    condicoes: textoDasCondicoes(jogada.validadeDias, jogada.minimoCentavos), peca: jogada.peca, jaJogou,
  };
}

/** A jogada guardada daquele e-mail (ou a reconstrução pelo cupom, se o registro da jogada faltar). */
async function jogadaDe(chave: string, email: string): Promise<Jogada | null> {
  const database = await banco();
  const linha = await database.prepare('SELECT data_json FROM workspace_settings WHERE id = ?').get(PREFIXO_JOGADA + chave);
  if (linha) { try { return JSON.parse(String(linha.data_json)) as Jogada; } catch { /* registro ilegível: reconstrói pelo cupom */ } }
  const cupom = await database.prepare('SELECT * FROM loja_cupons_campanha WHERE id = ?').get(PREFIXO_ID_CUPOM_VARAL + chave);
  if (!cupom) return null;
  const tipo = texto(cupom.tipo) === 'valor' ? 'valor' : 'percentual', valor = Number(cupom.valor), criado = Number(cupom.criado), fim = Number(cupom.fim ?? criado);
  return { email, peca: 'body', premio: textoDoPremio({ tipo, valor }), tipo, valor, codigo: texto(cupom.codigo), validoAte: fim, minimoCentavos: Number(cupom.minimo_centavos), validadeDias: Math.max(1, Math.round((fim - criado) / DIA)), consentimento: true, em: criado };
}

/**
 * A jogada: confere o e-mail, o aceite e a peça; se o e-mail já jogou, devolve o mesmo cupom; senão sorteia o prêmio
 * AQUI (a peça não muda as chances), cria o cupom de uso único e guarda a jogada.
 */
export async function jogarVaral(entrada: { email?: unknown; peca?: unknown; consentimento?: unknown }, agora = Date.now(), sorteio: () => number = aleatorio): Promise<ResultadoVaral> {
  const email = normalizarEmailVaral(entrada.email);
  if (!email) throw new ApiError(400, 'Informe um e-mail válido.', 'EMAIL_INVALIDO');
  if (entrada.consentimento !== true) throw new ApiError(400, 'Para jogar, aceite receber as novidades do ateliê.', 'SEM_CONSENTIMENTO');
  const peca = PECAS.find((item) => item === entrada.peca);
  if (!peca) throw new ApiError(400, 'Escolha uma roupinha do varal.', 'PECA_INVALIDA');
  const chave = hashDoEmail(email);

  const anterior = await jogadaDe(chave, email);
  if (anterior) return resultado(anterior, true);

  const config = await lerConfigVaral();
  if (!config.ativo) throw new ApiError(409, 'O varal está recolhido no momento. Volte em breve.', 'VARAL_FECHADO');
  exigirGravacaoGestao();
  const premio: PremioVaral = sortearPremio(config.premios, sorteio);
  const database = await banco();
  const validoAte = agora + config.validadeDias * DIA, idCupom = PREFIXO_ID_CUPOM_VARAL + chave;

  const jogada = await database.transaction(async () => {
    await travarGestao(`varal:${chave}`);
    // Outra aba ou outro clique chegou antes: vale o que já foi sorteado.
    if (await database.prepare('SELECT id FROM loja_cupons_campanha WHERE id = ?').get(idCupom)) return null;
    let codigo = '';
    for (let tentativa = 0; tentativa < 12; tentativa += 1) {
      const candidato = gerarCodigoVaral(premio.prefixo, tentativa ? aleatorio : sorteio);
      if (!(await database.prepare('SELECT id FROM loja_cupons_campanha WHERE codigo = ?').get(candidato))) { codigo = candidato; break; }
    }
    if (!codigo) throw new ApiError(503, 'Não foi possível gerar o cupom agora. Tente de novo.', 'CUPOM_INDISPONIVEL');
    const nova: Jogada = { email, peca, premio: textoDoPremio(premio), tipo: premio.tipo, valor: premio.valor, codigo, validoAte, minimoCentavos: config.minimoCentavos, validadeDias: config.validadeDias, consentimento: true, em: agora };
    await database.prepare(`INSERT INTO loja_cupons_campanha (id, codigo, descricao, tipo, valor, minimo_centavos, inicio, fim, limite_total, limite_por_cliente, primeira_compra, exibir, ativo, revisao, criado, atualizado)
      VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 1, 1, 0, 0, 1, 1, ?, ?)`).run(idCupom, codigo, `Varal de roupinhas: ${nova.premio}`, premio.tipo, premio.valor, config.minimoCentavos, validoAte, agora, agora);
    await database.prepare('INSERT INTO workspace_settings (id,data_json,revision,updated) VALUES (?, ?, 1, ?)').run(PREFIXO_JOGADA + chave, JSON.stringify(nova), agora);
    return nova;
  });
  if (jogada) return resultado(jogada, false);
  const guardada = await jogadaDe(chave, email);
  if (!guardada) throw new ApiError(503, 'Não foi possível concluir agora. Tente de novo em instantes.', 'INDISPONIVEL');
  return resultado(guardada, true);
}

// ---------------------------------------------------------------- ERP (Marketing)

export type JogadaVaral = { id: string; email: string; peca: Peca; premio: string; codigo: string; jogouEm: string; validoAte: string; situacao: 'usado' | 'valendo' | 'expirado'; pedido: string | null; descontoCentavos: number };
export type ResumoVaral = { jogadas: number; usados: number; valendo: number; descontoCentavos: number; porPremio: { premio: string; quantidade: number; usados: number }[] };

const ONDE_VARAL = `c.id LIKE '${PREFIXO_ID_CUPOM_VARAL}%'`;

/** Config, números e as jogadas mais recentes para a tela do ERP. `?busca=` procura por e-mail ou código. */
export async function painelVaral(url: URL): Promise<{ config: ConfigVaral & { revisao: number }; resumo: ResumoVaral; jogadas: JogadaVaral[]; total: number }> {
  const database = await banco(), agora = Date.now();
  const { limite, offset } = paginacao(url, 50, 200);
  const termo = (url.searchParams.get('busca') ?? '').trim().toLowerCase().slice(0, 120);

  const cupons = await database.prepare(`SELECT c.id, c.codigo, c.tipo, c.valor, c.fim, c.criado, c.ativo, u.pedido_numero, u.desconto_centavos FROM loja_cupons_campanha c LEFT JOIN loja_cupom_usos u ON u.cupom_id = c.id WHERE ${ONDE_VARAL}`).all();
  const porCodigo = new Map(cupons.map((linha) => [texto(linha.codigo), linha]));
  const situacaoDe = (cupom: Linha | undefined, validoAte: number): JogadaVaral['situacao'] => (cupom?.pedido_numero ? 'usado' : validoAte > agora && Number(cupom?.ativo ?? 1) === 1 ? 'valendo' : 'expirado');

  const premios = new Map<string, { premio: string; quantidade: number; usados: number }>();
  let usados = 0, valendo = 0, descontoCentavos = 0;
  for (const cupom of cupons) {
    const tipo = texto(cupom.tipo) === 'valor' ? 'valor' : 'percentual', premio = textoDoPremio({ tipo, valor: Number(cupom.valor) });
    const linha = premios.get(premio) ?? { premio, quantidade: 0, usados: 0 };
    linha.quantidade += 1;
    const situacao = situacaoDe(cupom, Number(cupom.fim ?? 0));
    if (situacao === 'usado') { usados += 1; linha.usados += 1; descontoCentavos += Number(cupom.desconto_centavos ?? 0); }
    if (situacao === 'valendo') valendo += 1;
    premios.set(premio, linha);
  }

  const linhas = await database.prepare(`SELECT id, data_json FROM workspace_settings WHERE id LIKE '${PREFIXO_JOGADA}%' ORDER BY updated DESC, id LIMIT 2000`).all();
  const todas: JogadaVaral[] = [];
  for (const linha of linhas) {
    let jogada: Jogada;
    try { jogada = JSON.parse(String(linha.data_json)) as Jogada; } catch { continue; }
    if (termo && !jogada.email.includes(termo) && !jogada.codigo.toLowerCase().includes(termo)) continue;
    const cupom = porCodigo.get(jogada.codigo);
    todas.push({
      id: texto(linha.id).slice(PREFIXO_JOGADA.length), email: jogada.email, peca: jogada.peca, premio: jogada.premio, codigo: jogada.codigo, jogouEm: iso(jogada.em), validoAte: iso(jogada.validoAte),
      situacao: situacaoDe(cupom, jogada.validoAte), pedido: cupom?.pedido_numero ? texto(cupom.pedido_numero) : null, descontoCentavos: Number(cupom?.desconto_centavos ?? 0),
    });
  }
  return {
    config: await lerConfigVaral(),
    resumo: { jogadas: cupons.length, usados, valendo, descontoCentavos, porPremio: [...premios.values()].sort((a, b) => b.quantidade - a.quantidade) },
    jogadas: todas.slice(offset, offset + limite),
    total: todas.length,
  };
}
