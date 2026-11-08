import { randomInt, randomUUID } from 'node:crypto';
import { erpDB } from '../erp/core.ts';
import { ApiError, type Actor } from '../erp/access.ts';
import { digest, newToken, scryptHash, verifyPassword } from '../auth/core.ts';
import {
  camposFaltando, cupomDeBoasVindas, type CupomConta, erroSenha, escolherCupom, gerarCodigoCupom, inicialDoNome, LIMITES_CONTA, limparLinha,
  mascararWhatsapp, normalizarEmail, PERCENTUAL_BOAS_VINDAS, type Perfil, type PerfilOpcional, primeiroNome, STATUS_PEDIDO,
  type StatusPedido, validarCadastro, validarPerfil, VERSAO_TERMOS, emailValido,
} from '../../loja/lib/contas/regras.ts';
import { chaveItem, limparItem, MAX_QUANTIDADE, type ItemCarrinho } from '../../loja/lib/carrinho/item.ts';
import { linhaDoPedido, resolverItem } from '../../loja/lib/carrinho/linhas.ts';
import type { ProdutoCarrinho } from '../../loja/lib/carrinho/catalogo.ts';
import { calcularTotais, DESCONTO_PIX_PERCENTUAL, type Cupom } from '../../loja/lib/carrinho/totais.ts';
import { type LinhaPedido, montarMensagemPedido } from '../../loja/lib/checkout/pedido.ts';
import { gerarNumeroPedido } from '../../loja/lib/pedidos/historico.ts';

// Contas de CLIENTE da loja (www.), separadas das contas da EQUIPE do ERP (erp_auth.users):
// tabelas próprias em erp_core (migração 009), sessão própria (cookie só do host da loja), cupom de
// 5% na primeira compra ligado à conta e os pedidos feitos pelo site (que seguem pelo WhatsApp).
// Reaproveita as primitivas do ERP: hash scrypt e comparação em tempo constante (auth/core), tokens
// aleatórios de 256 bits guardados só como SHA-256 e a auditoria em erp_audit. O limitador de
// tentativas (auth/core.limited) e a conferência de origem ficam nas rotas.
// Mesmo adaptador do ERP: PostgreSQL/Supabase ou SQLite local explícito (ALLOW_LOCAL_SQLITE).

export const SESSAO_DURACAO = 30 * 24 * 60 * 60 * 1000; // validade absoluta: 30 dias
export const SESSAO_INATIVIDADE = 14 * 24 * 60 * 60 * 1000; // sem uso por 14 dias: encerra
const SESSAO_TOQUE = 60 * 60 * 1000; // grava o último uso no máximo 1 vez por hora
const SESSOES_POR_CLIENTE = 10;
export const REDEFINICAO_DURACAO = 2 * 60 * 60 * 1000; // link gerado pela equipe: 2 horas, uso único
export const MAX_LINHAS_PEDIDO = 50;

export const contasSchema = `CREATE TABLE IF NOT EXISTS loja_clientes (id TEXT PRIMARY KEY, nome TEXT NOT NULL CHECK (length(nome) BETWEEN 3 AND 80), email TEXT NOT NULL UNIQUE CHECK (length(email) BETWEEN 6 AND 254), whatsapp TEXT NOT NULL CHECK (length(whatsapp) BETWEEN 10 AND 11), senha_hash TEXT NOT NULL CHECK (length(senha_hash) BETWEEN 1 AND 300), termos_versao TEXT NOT NULL CHECK (length(termos_versao) BETWEEN 1 AND 20), termos_aceitos_em INTEGER NOT NULL, cpf TEXT NOT NULL DEFAULT '' CHECK (cpf = '' OR length(cpf) = 11), cep TEXT NOT NULL DEFAULT '' CHECK (cep = '' OR length(cep) = 8), endereco TEXT NOT NULL DEFAULT '' CHECK (length(endereco) <= 160), cidade TEXT NOT NULL DEFAULT '' CHECK (length(cidade) <= 60), uf TEXT NOT NULL DEFAULT '' CHECK (uf = '' OR length(uf) = 2), bebe_nome TEXT NOT NULL DEFAULT '' CHECK (length(bebe_nome) <= 60), bebe_data TEXT NOT NULL DEFAULT '' CHECK (bebe_data = '' OR length(bebe_data) = 10), bebe_data_tipo TEXT NOT NULL DEFAULT '' CHECK (bebe_data_tipo IN ('', 'prevista', 'nascimento')), como_conheceu TEXT NOT NULL DEFAULT '' CHECK (length(como_conheceu) <= 20), preferencias TEXT NOT NULL DEFAULT '' CHECK (length(preferencias) <= 500), status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'bloqueada')), revisao INTEGER NOT NULL DEFAULT 1 CHECK (revisao > 0), criado INTEGER NOT NULL, atualizado INTEGER NOT NULL, ultimo_acesso INTEGER);
CREATE INDEX IF NOT EXISTS loja_clientes_criado ON loja_clientes(criado);
CREATE TABLE IF NOT EXISTS loja_sessoes (hash TEXT PRIMARY KEY CHECK (length(hash) = 64), cliente_id TEXT NOT NULL REFERENCES loja_clientes(id) ON DELETE CASCADE, criada INTEGER NOT NULL, expira INTEGER NOT NULL, visto INTEGER NOT NULL, revogada_em INTEGER);
CREATE INDEX IF NOT EXISTS loja_sessoes_cliente ON loja_sessoes(cliente_id, criada);
CREATE INDEX IF NOT EXISTS loja_sessoes_expira ON loja_sessoes(expira);
CREATE TABLE IF NOT EXISTS loja_redefinicoes (hash TEXT PRIMARY KEY CHECK (length(hash) = 64), cliente_id TEXT NOT NULL REFERENCES loja_clientes(id) ON DELETE CASCADE, criado_por TEXT NOT NULL CHECK (length(criado_por) BETWEEN 1 AND 120), criada INTEGER NOT NULL, expira INTEGER NOT NULL, usada_em INTEGER, versao_senha TEXT NOT NULL CHECK (length(versao_senha) = 64));
CREATE INDEX IF NOT EXISTS loja_redefinicoes_cliente ON loja_redefinicoes(cliente_id);
CREATE TABLE IF NOT EXISTS loja_cupons (id TEXT PRIMARY KEY, cliente_id TEXT NOT NULL REFERENCES loja_clientes(id) ON DELETE CASCADE, codigo TEXT NOT NULL UNIQUE CHECK (length(codigo) BETWEEN 6 AND 30), tipo TEXT NOT NULL CHECK (tipo = 'boas_vindas'), percentual INTEGER NOT NULL CHECK (percentual BETWEEN 1 AND 50), criado INTEGER NOT NULL, usado_em INTEGER, pedido_numero TEXT CHECK (pedido_numero IS NULL OR length(pedido_numero) <= 40), CHECK ((usado_em IS NULL AND pedido_numero IS NULL) OR (usado_em IS NOT NULL AND pedido_numero IS NOT NULL)), UNIQUE (cliente_id, tipo));
CREATE TABLE IF NOT EXISTS loja_pedidos (id TEXT PRIMARY KEY, numero TEXT NOT NULL UNIQUE CHECK (length(numero) BETWEEN 4 AND 40), cliente_id TEXT REFERENCES loja_clientes(id) ON DELETE SET NULL, nome TEXT NOT NULL DEFAULT '' CHECK (length(nome) <= 80), whatsapp TEXT NOT NULL DEFAULT '' CHECK (length(whatsapp) <= 11), email TEXT NOT NULL DEFAULT '' CHECK (length(email) <= 254), itens_json TEXT NOT NULL CHECK (length(itens_json) BETWEEN 2 AND 65536), quantidade INTEGER NOT NULL CHECK (quantidade BETWEEN 1 AND 49950), subtotal_centavos INTEGER NOT NULL CHECK (subtotal_centavos >= 0), desconto_centavos INTEGER NOT NULL DEFAULT 0 CHECK (desconto_centavos >= 0 AND desconto_centavos <= subtotal_centavos), total_centavos INTEGER NOT NULL CHECK (total_centavos >= 0), cupom_codigo TEXT NOT NULL DEFAULT '' CHECK (length(cupom_codigo) <= 30), cupom_percentual INTEGER NOT NULL DEFAULT 0 CHECK (cupom_percentual BETWEEN 0 AND 50), retirar INTEGER NOT NULL DEFAULT 0 CHECK (retirar IN (0, 1)), local TEXT NOT NULL DEFAULT '' CHECK (length(local) <= 80), observacoes TEXT NOT NULL DEFAULT '' CHECK (length(observacoes) <= 500), mensagem TEXT NOT NULL CHECK (length(mensagem) BETWEEN 1 AND 20000), status TEXT NOT NULL DEFAULT 'enviado_whatsapp' CHECK (status IN ('enviado_whatsapp', 'pagamento_confirmado', 'despachado', 'entregue', 'cancelado')), anonimizado INTEGER NOT NULL DEFAULT 0 CHECK (anonimizado IN (0, 1)), revisao INTEGER NOT NULL DEFAULT 1 CHECK (revisao > 0), criado INTEGER NOT NULL, atualizado INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS loja_pedidos_cliente ON loja_pedidos(cliente_id, criado);
CREATE INDEX IF NOT EXISTS loja_pedidos_criado ON loja_pedidos(criado);
CREATE INDEX IF NOT EXISTS loja_pedidos_status ON loja_pedidos(status, criado);`;

export function contasDb() { const database = erpDB(); database.registerSqliteSchema(contasSchema); return database; }

/** Erro com mensagens por campo (os formulários mostram cada uma ao lado do campo). */
export class ErroConta extends ApiError {
  erros: Record<string, string>;
  constructor(status: number, message: string, code: string, erros: Record<string, string> = {}) { super(status, message, code); this.erros = erros; }
}

type Linha = Record<string, unknown>;
const iso = (valor: unknown) => new Date(Number(valor)).toISOString();
const texto = (valor: unknown) => (valor === null || valor === undefined ? '' : String(valor));
const TOKEN = /^[a-f0-9]{64}$/;
const ID = /^[0-9a-f-]{36}$/;
const LOGIN_INVALIDO = 'E-mail ou senha incorretos.';

async function travar(chave: string) {
  const database = contasDb();
  if (database.backend === 'postgres') await database.prepare('SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(?, 0))').get(chave);
}
async function auditar(ator: string, acao: string, recurso: 'loja_clientes' | 'loja_pedidos', id: string) {
  await contasDb().prepare('INSERT INTO erp_audit VALUES (?, ?, ?, ?, ?, ?)').run(randomUUID(), ator, acao, recurso, id, Date.now());
}
const aleatorio = () => randomInt(0, 1_000_000) / 1_000_000;

// ---------------------------------------------------------------- Formas públicas

export type ContaCliente = {
  id: string; nome: string; primeiroNome: string; inicial: string; email: string; whatsapp: string; whatsappFormatado: string;
  criadaEm: string; perfil: PerfilOpcional; faltando: string[]; revisao: number; termosVersao: string; termosAceitosEm: string;
  avatar?: string; // data URI do avatar DiceBear, posto pelas rotas (src/lib/loja/avatar.ts)
};
export type RespostaConta = { cliente: ContaCliente; cupom: CupomConta | null };

function perfilDe(linha: Linha): PerfilOpcional {
  return {
    cpf: texto(linha.cpf), cep: texto(linha.cep), endereco: texto(linha.endereco), cidade: texto(linha.cidade), uf: texto(linha.uf), bebeNome: texto(linha.bebe_nome),
    bebeData: texto(linha.bebe_data), bebeDataTipo: texto(linha.bebe_data_tipo) as PerfilOpcional['bebeDataTipo'], comoConheceu: texto(linha.como_conheceu) as PerfilOpcional['comoConheceu'], preferencias: texto(linha.preferencias),
  };
}
function contaDe(linha: Linha): ContaCliente {
  const nome = texto(linha.nome), perfil = perfilDe(linha);
  return {
    id: texto(linha.id), nome, primeiroNome: primeiroNome(nome), inicial: inicialDoNome(nome), email: texto(linha.email), whatsapp: texto(linha.whatsapp), whatsappFormatado: mascararWhatsapp(texto(linha.whatsapp)),
    criadaEm: iso(linha.criado), perfil, faltando: camposFaltando(perfil), revisao: Number(linha.revisao), termosVersao: texto(linha.termos_versao), termosAceitosEm: iso(linha.termos_aceitos_em),
  };
}
function cupomDe(linha: Linha | undefined): CupomConta | null {
  if (!linha) return null;
  return { codigo: texto(linha.codigo), percentual: Number(linha.percentual), usado: linha.usado_em !== null && linha.usado_em !== undefined, usadoEm: linha.usado_em ? iso(linha.usado_em) : null, pedido: linha.pedido_numero ? texto(linha.pedido_numero) : null };
}
async function linhaCliente(id: string) {
  if (typeof id !== 'string' || !ID.test(id)) return undefined;
  return await contasDb().prepare("SELECT * FROM loja_clientes WHERE id = ? AND status = 'ativa'").get(id);
}
async function linhaCupom(clienteId: string) {
  return await contasDb().prepare("SELECT * FROM loja_cupons WHERE cliente_id = ? AND tipo = 'boas_vindas'").get(clienteId);
}

export async function dadosDaConta(clienteId: string): Promise<RespostaConta> {
  const linha = await linhaCliente(clienteId);
  if (!linha) throw new ErroConta(401, 'Entre na sua conta para continuar.', 'SESSAO_ENCERRADA');
  return { cliente: contaDe(linha), cupom: cupomDe(await linhaCupom(clienteId)) };
}

// ---------------------------------------------------------------- Sessões

async function abrirSessao(clienteId: string, agora: number) {
  const token = newToken(), database = contasDb();
  await database.prepare('DELETE FROM loja_sessoes WHERE expira < ? OR visto < ? OR (revogada_em IS NOT NULL AND revogada_em < ?)').run(agora, agora - SESSAO_INATIVIDADE, agora - SESSAO_DURACAO);
  await database.prepare('INSERT INTO loja_sessoes (hash, cliente_id, criada, expira, visto) VALUES (?, ?, ?, ?, ?)').run(digest(token), clienteId, agora, agora + SESSAO_DURACAO, agora);
  // Mantém só as sessões mais recentes de cada cliente (aparelhos antigos saem).
  const antigas = await database.prepare('SELECT hash FROM loja_sessoes WHERE cliente_id = ? AND revogada_em IS NULL ORDER BY criada DESC LIMIT 100 OFFSET ?').all(clienteId, SESSOES_POR_CLIENTE);
  for (const antiga of antigas) await database.prepare('UPDATE loja_sessoes SET revogada_em = ? WHERE hash = ?').run(agora, texto(antiga.hash));
  await database.prepare('UPDATE loja_clientes SET ultimo_acesso = ? WHERE id = ?').run(agora, clienteId);
  return token;
}

export type ClienteDaSessao = { id: string; nome: string; email: string };

/** Cliente da sessão (token do cookie da loja) ou null. Nunca aceita o token de uma sessão da equipe (outra tabela). */
export async function clienteDaSessao(token: string | undefined, agora = Date.now()): Promise<ClienteDaSessao | null> {
  if (!token || !TOKEN.test(token)) return null;
  const database = contasDb();
  const linha = await database.prepare(`SELECT c.id, c.nome, c.email, s.visto FROM loja_sessoes s JOIN loja_clientes c ON c.id = s.cliente_id
    WHERE s.hash = ? AND s.revogada_em IS NULL AND s.expira > ? AND s.visto > ? AND c.status = 'ativa'`).get(digest(token), agora, agora - SESSAO_INATIVIDADE);
  if (!linha) return null;
  if (Number(linha.visto) < agora - SESSAO_TOQUE) await database.prepare('UPDATE loja_sessoes SET visto = ? WHERE hash = ?').run(agora, digest(token));
  return { id: texto(linha.id), nome: texto(linha.nome), email: texto(linha.email) };
}

export async function encerrarSessao(token: string | undefined, agora = Date.now()) {
  if (token && TOKEN.test(token)) await contasDb().prepare('UPDATE loja_sessoes SET revogada_em = ? WHERE hash = ? AND revogada_em IS NULL').run(agora, digest(token));
}

// ---------------------------------------------------------------- Cadastro, login e senha

/**
 * Cadastro rápido (nome, WhatsApp, e-mail, senha e aceite dos termos). Cria a conta, a sessão e o
 * cupom de 5% OFF na primeira compra (BEMVINDA-XXXX, uso único, ligado à conta).
 */
export async function cadastrarCliente(campos: Record<string, unknown>, agora = Date.now()): Promise<RespostaConta & { token: string }> {
  const validacao = validarCadastro(campos);
  if (!validacao.ok) throw new ErroConta(400, 'Confira os campos destacados.', 'INVALID_INPUT', validacao.erros);
  const dados = validacao.dados;
  const hash = await scryptHash(dados.senha);
  const database = contasDb(), id = randomUUID();
  const token = await database.transaction(async () => {
    await travar(`loja-clientes:${dados.email}`);
    if (await database.prepare('SELECT id FROM loja_clientes WHERE email = ?').get(dados.email))
      throw new ErroConta(409, 'Este e-mail já tem conta. Entre com a sua senha.', 'EMAIL_EM_USO', { email: 'Este e-mail já tem conta. Entre com a sua senha.' });
    await database.prepare('INSERT INTO loja_clientes (id, nome, email, whatsapp, senha_hash, termos_versao, termos_aceitos_em, criado, atualizado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, dados.nome, dados.email, dados.whatsapp, hash, VERSAO_TERMOS, agora, agora, agora);
    for (let tentativa = 0; ; tentativa++) {
      const codigo = gerarCodigoCupom(aleatorio);
      if (await database.prepare('SELECT id FROM loja_cupons WHERE codigo = ?').get(codigo)) { if (tentativa < 8) continue; throw new ErroConta(503, 'Não foi possível criar a conta agora. Tente de novo.', 'CUPOM_INDISPONIVEL'); }
      await database.prepare("INSERT INTO loja_cupons (id, cliente_id, codigo, tipo, percentual, criado) VALUES (?, ?, ?, 'boas_vindas', ?, ?)").run(randomUUID(), id, codigo, PERCENTUAL_BOAS_VINDAS, agora);
      break;
    }
    await auditar('loja', 'created', 'loja_clientes', id);
    return abrirSessao(id, agora);
  });
  return { ...(await dadosDaConta(id)), token };
}

/** Login por e-mail e senha. Mesmo custo de hash e mesma mensagem para e-mail inexistente e senha errada. */
export async function entrarCliente(emailBruto: unknown, senha: unknown, agora = Date.now()): Promise<RespostaConta & { token: string }> {
  const email = normalizarEmail(emailBruto);
  const valida = typeof senha === 'string' && senha.length >= 1 && senha.length <= LIMITES_CONTA.senhaMax && emailValido(email);
  const linha = valida ? await contasDb().prepare("SELECT id, senha_hash FROM loja_clientes WHERE email = ? AND status = 'ativa'").get(email) : undefined;
  const confere = await verifyPassword(valida ? senha : 'senha-invalida-0', linha ? texto(linha.senha_hash) : undefined);
  if (!valida || !linha || !confere) throw new ErroConta(401, LOGIN_INVALIDO, 'LOGIN_INVALIDO');
  const database = contasDb(), id = texto(linha.id);
  const token = await database.transaction(async () => {
    const atual = await database.prepare("SELECT senha_hash FROM loja_clientes WHERE id = ? AND status = 'ativa'").get(id);
    if (!atual || texto(atual.senha_hash) !== texto(linha.senha_hash)) throw new ErroConta(401, LOGIN_INVALIDO, 'LOGIN_INVALIDO');
    return abrirSessao(id, agora);
  });
  return { ...(await dadosDaConta(id)), token };
}

/** Troca de senha logada: exige a atual, revoga todas as sessões e devolve uma nova para este aparelho. */
export async function trocarSenha(clienteId: string, atual: unknown, nova: unknown, agora = Date.now()) {
  const linha = await linhaCliente(clienteId);
  if (!linha) throw new ErroConta(401, 'Entre na sua conta para continuar.', 'SESSAO_ENCERRADA');
  const confere = typeof atual === 'string' && atual.length <= LIMITES_CONTA.senhaMax && await verifyPassword(atual, texto(linha.senha_hash));
  if (!confere) throw new ErroConta(400, 'A senha atual não confere.', 'SENHA_ATUAL', { atual: 'A senha atual não confere.' });
  const fraca = erroSenha(nova, { email: texto(linha.email), nome: texto(linha.nome) });
  if (fraca) throw new ErroConta(400, fraca, 'SENHA_FRACA', { nova: fraca });
  const hash = await scryptHash(String(nova)), database = contasDb();
  return database.transaction(async () => {
    const resultado = await database.prepare('UPDATE loja_clientes SET senha_hash = ?, atualizado = ? WHERE id = ? AND senha_hash = ?').run(hash, agora, clienteId, texto(linha.senha_hash));
    if (!Number(resultado.changes)) throw new ErroConta(409, 'A senha foi alterada em outro aparelho. Entre de novo.', 'SENHA_ALTERADA');
    await database.prepare('UPDATE loja_sessoes SET revogada_em = ? WHERE cliente_id = ? AND revogada_em IS NULL').run(agora, clienteId);
    await database.prepare('DELETE FROM loja_redefinicoes WHERE cliente_id = ?').run(clienteId);
    return abrirSessao(clienteId, agora);
  });
}

/**
 * Link de redefinição de senha gerado pela EQUIPE no ERP (não há envio de e-mail: a vendedora manda o
 * link pelo WhatsApp). Token de 256 bits guardado só como SHA-256, válido por 2 horas e uma vez só;
 * gerar outro invalida o anterior. O token vai no fragmento (#), que não chega a servidores nem logs.
 */
export async function emitirRedefinicao(clienteId: string, ator: Actor, origemLoja: string, agora = Date.now()) {
  const linha = await linhaCliente(clienteId);
  if (!linha) throw new ApiError(404, 'Cliente não encontrada.', 'NOT_FOUND');
  const token = newToken(), database = contasDb();
  await database.transaction(async () => {
    await database.prepare('DELETE FROM loja_redefinicoes WHERE cliente_id = ? OR expira < ?').run(clienteId, agora);
    await database.prepare('INSERT INTO loja_redefinicoes (hash, cliente_id, criado_por, criada, expira, versao_senha) VALUES (?, ?, ?, ?, ?, ?)')
      .run(digest(token), clienteId, ator.id.slice(0, 120), agora, agora + REDEFINICAO_DURACAO, digest(texto(linha.senha_hash)));
    await auditar(ator.id, 'reset_link_created', 'loja_clientes', clienteId);
  });
  const link = new URL('/conta/redefinir', origemLoja);
  link.hash = token;
  return { link: link.toString(), expiraEm: iso(agora + REDEFINICAO_DURACAO), entrega: 'manual' as const, emailEnviado: false };
}

/** Nova senha com o token do link. Uso único; revoga todas as sessões e abre uma nova (a cliente já entra). */
export async function redefinirSenha(token: unknown, nova: unknown, agora = Date.now()): Promise<RespostaConta & { token: string }> {
  const invalido = () => new ErroConta(400, 'Link inválido ou expirado. Peça um novo link ao ateliê pelo WhatsApp.', 'LINK_INVALIDO');
  if (typeof token !== 'string' || !TOKEN.test(token)) throw invalido();
  const database = contasDb();
  const previa = await database.prepare('SELECT r.cliente_id, c.email, c.nome FROM loja_redefinicoes r JOIN loja_clientes c ON c.id = r.cliente_id WHERE r.hash = ? AND r.expira > ? AND r.usada_em IS NULL').get(digest(token), agora);
  if (!previa) throw invalido();
  const fraca = erroSenha(nova, { email: texto(previa.email), nome: texto(previa.nome) });
  if (fraca) throw new ErroConta(400, fraca, 'SENHA_FRACA', { nova: fraca });
  const hash = await scryptHash(String(nova));
  const clienteId = texto(previa.cliente_id);
  const sessao = await database.transaction(async () => {
    await travar(`loja-redefinicao:${clienteId}`);
    const viva = await database.prepare(`SELECT r.versao_senha, c.senha_hash FROM loja_redefinicoes r JOIN loja_clientes c ON c.id = r.cliente_id
      WHERE r.hash = ? AND r.expira > ? AND r.usada_em IS NULL AND c.status = 'ativa'`).get(digest(token), agora);
    if (!viva || digest(texto(viva.senha_hash)) !== texto(viva.versao_senha)) throw invalido();
    const marcada = await database.prepare('UPDATE loja_redefinicoes SET usada_em = ? WHERE hash = ? AND usada_em IS NULL').run(agora, digest(token));
    if (!Number(marcada.changes)) throw invalido();
    await database.prepare('UPDATE loja_clientes SET senha_hash = ?, atualizado = ? WHERE id = ?').run(hash, agora, clienteId);
    await database.prepare('UPDATE loja_sessoes SET revogada_em = ? WHERE cliente_id = ? AND revogada_em IS NULL').run(agora, clienteId);
    await database.prepare('DELETE FROM loja_redefinicoes WHERE cliente_id = ? AND hash <> ?').run(clienteId, digest(token));
    return abrirSessao(clienteId, agora);
  });
  return { ...(await dadosDaConta(clienteId)), token: sessao };
}

/** Atualiza dados (nome, WhatsApp e os opcionais). Revisão otimista: versão antiga responde 409. */
export async function atualizarPerfil(clienteId: string, entrada: Record<string, unknown>, agora = Date.now()): Promise<RespostaConta> {
  const { revisao, ...campos } = entrada;
  if (!Number.isSafeInteger(revisao) || Number(revisao) < 1) throw new ErroConta(400, 'Atualize a página e tente de novo.', 'REVISION_REQUIRED');
  const validacao = validarPerfil(campos);
  if (!validacao.ok) throw new ErroConta(400, 'Confira os campos destacados.', 'INVALID_INPUT', validacao.erros);
  const colunas: Record<keyof Perfil, string> = { nome: 'nome', whatsapp: 'whatsapp', cpf: 'cpf', cep: 'cep', endereco: 'endereco', cidade: 'cidade', uf: 'uf', bebeNome: 'bebe_nome', bebeData: 'bebe_data', bebeDataTipo: 'bebe_data_tipo', comoConheceu: 'como_conheceu', preferencias: 'preferencias' };
  const pares = Object.entries(validacao.dados) as [keyof Perfil, string][];
  if (!pares.length) return dadosDaConta(clienteId);
  const resultado = await contasDb().prepare(`UPDATE loja_clientes SET ${pares.map(([chave]) => `${colunas[chave]} = ?`).join(', ')}, revisao = revisao + 1, atualizado = ? WHERE id = ? AND revisao = ? AND status = 'ativa'`)
    .run(...pares.map(([, valor]) => valor), agora, clienteId, Number(revisao));
  if (!Number(resultado.changes)) {
    if (!await linhaCliente(clienteId)) throw new ErroConta(401, 'Entre na sua conta para continuar.', 'SESSAO_ENCERRADA');
    throw new ErroConta(409, 'Seus dados mudaram em outro aparelho. Atualize a página e confira.', 'REVISION_CONFLICT');
  }
  return dadosDaConta(clienteId);
}

/**
 * Exclusão da conta a pedido da cliente (LGPD): confere a senha, apaga a conta, as sessões, os links
 * e o cupom, e ANONIMIZA os pedidos (sem nome, contato, cidade, observações nem a mensagem; ficam só
 * as peças e os valores, para o controle do ateliê).
 */
export async function excluirConta(clienteId: string, senha: unknown, agora = Date.now()) {
  const linha = await linhaCliente(clienteId);
  if (!linha) throw new ErroConta(401, 'Entre na sua conta para continuar.', 'SESSAO_ENCERRADA');
  const confere = typeof senha === 'string' && senha.length <= LIMITES_CONTA.senhaMax && await verifyPassword(senha, texto(linha.senha_hash));
  if (!confere) throw new ErroConta(400, 'A senha não confere.', 'SENHA_ATUAL', { senha: 'A senha não confere.' });
  const database = contasDb();
  await database.transaction(async () => {
    await database.prepare("UPDATE loja_pedidos SET cliente_id = NULL, nome = '', whatsapp = '', email = '', local = '', observacoes = '', mensagem = ?, anonimizado = 1, atualizado = ? WHERE cliente_id = ?")
      .run('[Mensagem removida: a cliente excluiu a conta.]', agora, clienteId);
    await database.prepare('DELETE FROM loja_clientes WHERE id = ?').run(clienteId);
    await auditar('loja', 'removed', 'loja_clientes', clienteId);
  });
  return { excluida: true };
}

// ---------------------------------------------------------------- Pedidos

export type ItemPedidoLoja = LinhaPedido & { slug?: string; href?: string };
export type PedidoLoja = {
  numero: string; criadoEm: string; status: StatusPedido; statusRotulo: string; itens: ItemPedidoLoja[]; quantidade: number;
  subtotalCentavos: number; descontoCentavos: number; totalCentavos: number; cupom: { codigo: string; percentual: number } | null;
  retirar: boolean; local: string; observacoes: string; mensagem: string;
};

function pedidoDe(linha: Linha): PedidoLoja {
  const status = texto(linha.status) as StatusPedido;
  return {
    numero: texto(linha.numero), criadoEm: iso(linha.criado), status, statusRotulo: STATUS_PEDIDO[status] ?? status, itens: JSON.parse(texto(linha.itens_json)) as ItemPedidoLoja[], quantidade: Number(linha.quantidade),
    subtotalCentavos: Number(linha.subtotal_centavos), descontoCentavos: Number(linha.desconto_centavos), totalCentavos: Number(linha.total_centavos),
    cupom: linha.cupom_codigo ? { codigo: texto(linha.cupom_codigo), percentual: Number(linha.cupom_percentual) } : null,
    retirar: Number(linha.retirar) === 1, local: texto(linha.local), observacoes: texto(linha.observacoes), mensagem: texto(linha.mensagem),
  };
}

export type EntradaPedido = { itens?: unknown; cupom?: unknown; local?: unknown; retirar?: unknown; observacoes?: unknown };
export type OpcoesPedido = { catalogo: Map<string, ProdutoCarrinho>; agora?: number };

/**
 * Cria o pedido no servidor a partir dos itens da sacola. Os PREÇOS vêm sempre do catálogo do servidor
 * (o navegador manda só produto, opção e quantidade). O cupom é conferido aqui e, se for o de primeira
 * compra, consumido na MESMA transação do pedido (dois pedidos simultâneos não usam o mesmo cupom).
 * Devolve o número e a mensagem do WhatsApp, que a loja abre com wa.me.
 */
export async function criarPedido(clienteId: string, entrada: EntradaPedido, opcoes: OpcoesPedido): Promise<{ pedido: PedidoLoja }> {
  const agora = opcoes.agora ?? Date.now();
  if (!entrada || typeof entrada !== 'object' || Object.keys(entrada).some((chave) => !['itens', 'cupom', 'local', 'retirar', 'observacoes'].includes(chave)))
    throw new ErroConta(400, 'Pedido inválido.', 'UNKNOWN_FIELD');
  if (!Array.isArray(entrada.itens) || entrada.itens.length === 0) throw new ErroConta(400, 'Sua sacola está vazia.', 'SACOLA_VAZIA');
  if (entrada.itens.length > MAX_LINHAS_PEDIDO) throw new ErroConta(400, `Um pedido tem até ${MAX_LINHAS_PEDIDO} itens diferentes.`, 'ITENS_DEMAIS');
  for (const [chave, maximo] of [['local', LIMITES_CONTA.local], ['observacoes', LIMITES_CONTA.observacoes]] as const) {
    const valor = entrada[chave];
    if (valor !== undefined && (typeof valor !== 'string' || valor.trim().length > maximo)) throw new ErroConta(400, 'Confira os campos destacados.', 'INVALID_INPUT', { [chave]: `Use até ${maximo} caracteres.` });
  }
  if (entrada.retirar !== undefined && typeof entrada.retirar !== 'boolean') throw new ErroConta(400, 'Pedido inválido.', 'INVALID_INPUT');
  if (entrada.cupom !== undefined && entrada.cupom !== null && typeof entrada.cupom !== 'string') throw new ErroConta(400, 'Cupom inválido.', 'CUPOM_INVALIDO');
  const local = limparLinha(entrada.local).slice(0, LIMITES_CONTA.local);
  const observacoes = typeof entrada.observacoes === 'string' ? entrada.observacoes.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim() : '';
  const retirar = entrada.retirar === true;

  // Itens: só a forma conhecida; a mesma escolha repetida vira uma linha (quantidades somadas).
  const porChave = new Map<string, ItemCarrinho>();
  for (const bruto of entrada.itens) {
    const item = limparItem(bruto);
    if (!item) throw new ErroConta(400, 'Um item da sacola é inválido. Atualize a sacola e tente de novo.', 'ITEM_INVALIDO');
    const chave = chaveItem(item), igual = porChave.get(chave);
    if (igual) igual.quantidade = Math.min(MAX_QUANTIDADE, igual.quantidade + item.quantidade);
    else porChave.set(chave, { ...item });
  }
  const linhas: ItemPedidoLoja[] = [];
  const indisponiveis: string[] = [];
  for (const item of porChave.values()) {
    const produto = resolverItem(item, opcoes.catalogo);
    if (!produto) { indisponiveis.push(item.slug); continue; }
    if (produto.precisaEscolher && produto.opcoes?.length && !item.variacao) throw new ErroConta(400, `Escolha o tamanho de ${produto.nome} na sacola.`, 'ITEM_SEM_OPCAO');
    if (item.variacao && produto.opcoes?.length && !produto.opcoes.some((opcao) => opcao.rotulo === item.variacao)) throw new ErroConta(400, `A opção escolhida para ${produto.nome} não existe mais. Edite na sacola.`, 'ITEM_INVALIDO');
    linhas.push({ ...linhaDoPedido(item, produto), slug: produto.slug, href: produto.href ?? `/produto/${produto.slug}` });
  }
  if (indisponiveis.length) throw new ErroConta(409, 'Algum item da sacola não está mais disponível. Atualize a sacola e tente de novo.', 'ITEM_INDISPONIVEL');
  const subtotal = linhas.reduce((soma, linha) => soma + linha.precoCentavos * linha.quantidade, 0);

  const database = contasDb();
  return database.transaction(async () => {
    await travar(`loja-pedido-cliente:${clienteId}`);
    const linhaConta = await linhaCliente(clienteId);
    if (!linhaConta) throw new ErroConta(401, 'Entre na sua conta para continuar.', 'SESSAO_ENCERRADA');
    const conta = contaDe(linhaConta);
    const cupomLinha = await database.prepare(`SELECT * FROM loja_cupons WHERE cliente_id = ? AND tipo = 'boas_vindas'${database.backend === 'postgres' ? ' FOR UPDATE' : ''}`).get(clienteId);
    const cupomConta = cupomDe(cupomLinha);

    let cupom: Cupom | undefined, boasVindas = false;
    if (typeof entrada.cupom === 'string' && entrada.cupom.trim()) {
      const escolha = escolherCupom(entrada.cupom, subtotal, { logada: true, cupom: cupomConta });
      if (escolha.tipo !== 'ok') {
        const usado = escolha.tipo === 'invalido' && cupomConta?.usado && (entrada.cupom.trim().toUpperCase() === cupomConta.codigo || entrada.cupom.trim().toUpperCase() === 'BEMVINDO5');
        throw new ErroConta(usado ? 409 : 400, escolha.mensagem, usado ? 'CUPOM_USADO' : 'CUPOM_INVALIDO', { cupom: escolha.mensagem });
      }
      cupom = escolha.cupom; boasVindas = escolha.boasVindas;
    }
    const totais = calcularTotais(linhas.map((linha) => ({ preco: decimalDe(linha.precoCentavos), quantidade: linha.quantidade })), cupom);

    let numero = '';
    for (let tentativa = 0; tentativa < 8 && !numero; tentativa++) {
      const candidato = gerarNumeroPedido(new Date(agora), aleatorio);
      if (!await database.prepare('SELECT id FROM loja_pedidos WHERE numero = ?').get(candidato)) numero = candidato;
    }
    if (!numero) throw new ErroConta(503, 'Não foi possível registrar o pedido agora. Tente de novo.', 'NUMERO_INDISPONIVEL');

    const mensagem = montarMensagemPedido({
      numero,
      linhas,
      cliente: { nome: conta.nome, whatsapp: conta.whatsappFormatado, email: conta.email, local, retirar, observacoes },
      cupom: cupom && totais.descontoCupom > 0
        ? { codigo: cupom.codigo, descontoCentavos: totais.descontoCupom, rotulo: boasVindas ? `Cupom de primeira compra ${cupom.codigo} (${cupom.percentual}% OFF)` : `Cupom ${cupom.codigo} (${cupom.percentual}% OFF)` }
        : undefined,
      descontoPixPercentual: DESCONTO_PIX_PERCENTUAL,
    });
    const itensJson = JSON.stringify(linhas);
    if (itensJson.length > 65536 || mensagem.length > 20000) throw new ErroConta(413, 'O pedido ficou grande demais. Divida em dois pedidos.', 'PEDIDO_GRANDE');

    await database.prepare(`INSERT INTO loja_pedidos (id, numero, cliente_id, nome, whatsapp, email, itens_json, quantidade, subtotal_centavos, desconto_centavos, total_centavos, cupom_codigo, cupom_percentual, retirar, local, observacoes, mensagem, criado, atualizado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      randomUUID(), numero, clienteId, conta.nome, conta.whatsapp, conta.email, itensJson, totais.itens, totais.subtotal, totais.descontoCupom, totais.subtotal - totais.descontoCupom,
      cupom && totais.descontoCupom > 0 ? cupom.codigo : '', cupom && totais.descontoCupom > 0 ? cupom.percentual : 0, retirar ? 1 : 0, local, observacoes, mensagem, agora, agora,
    );
    if (boasVindas && cupomConta) {
      const consumo = await database.prepare("UPDATE loja_cupons SET usado_em = ?, pedido_numero = ? WHERE cliente_id = ? AND tipo = 'boas_vindas' AND usado_em IS NULL").run(agora, numero, clienteId);
      if (!Number(consumo.changes)) throw new ErroConta(409, 'Você já usou o cupom de primeira compra.', 'CUPOM_USADO', { cupom: 'Você já usou o cupom de primeira compra.' });
    }
    await auditar('loja', 'created', 'loja_pedidos', numero);
    return { pedido: pedidoDe(await database.prepare('SELECT * FROM loja_pedidos WHERE numero = ?').get(numero) as Linha) };
  });
}

const decimalDe = (valor: number) => `${Math.floor(valor / 100)}.${String(valor % 100).padStart(2, '0')}`;

export async function pedidosDaCliente(clienteId: string, limite = 50): Promise<PedidoLoja[]> {
  const linhas = await contasDb().prepare('SELECT * FROM loja_pedidos WHERE cliente_id = ? ORDER BY criado DESC, numero DESC LIMIT ?').all(clienteId, Math.min(100, Math.max(1, limite)));
  return linhas.map(pedidoDe);
}

export async function pedidoDaCliente(clienteId: string, numero: string): Promise<PedidoLoja> {
  const alvo = typeof numero === 'string' ? numero.trim().toUpperCase() : '';
  const linha = /^[A-Z0-9-]{4,40}$/.test(alvo) ? await contasDb().prepare('SELECT * FROM loja_pedidos WHERE cliente_id = ? AND numero = ?').get(clienteId, alvo) : undefined;
  if (!linha) throw new ErroConta(404, 'Pedido não encontrado nesta conta.', 'NOT_FOUND');
  return pedidoDe(linha);
}

// ---------------------------------------------------------------- ERP (equipe: admin e gestão)

function paginacao(url: URL, padrao = 20) {
  const limite = Number(url.searchParams.get('limit') ?? padrao), offset = Number(url.searchParams.get('offset') ?? 0);
  if (!Number.isSafeInteger(limite) || limite < 1 || limite > 100 || !Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000)
    throw new ApiError(400, 'Limit deve ser entre 1 e 100; offset entre 0 e 1000000.', 'INVALID_PAGINATION');
  return { limite, offset };
}
const escaparLike = (valor: string) => valor.replace(/[\\%_]/g, (caractere) => `\\${caractere}`);
function busca(url: URL) {
  const termo = limparLinha(url.searchParams.get('busca') ?? '').toLowerCase();
  if (termo.length > 100) throw new ApiError(400, 'Busca muito longa.', 'INVALID_FILTER');
  return termo;
}

export type ClienteErp = {
  id: string; nome: string; email: string; whatsapp: string; whatsappFormatado: string; criadaEm: string; ultimoAcesso: string | null;
  pedidos: number; cupom: CupomConta | null; avatar?: string;
};

export async function listarClientesLoja(url: URL) {
  const { limite, offset } = paginacao(url);
  const termo = busca(url), digitosBusca = termo.replace(/\D/g, '');
  const condicoes: string[] = [], parametros: (string | number)[] = [];
  if (termo) {
    const partes = ["LOWER(c.nome) LIKE ? ESCAPE '\\'", "c.email LIKE ? ESCAPE '\\'"];
    parametros.push(`%${escaparLike(termo)}%`, `%${escaparLike(termo)}%`);
    if (digitosBusca.length >= 4) { partes.push('c.whatsapp LIKE ?'); parametros.push(`%${digitosBusca}%`); }
    condicoes.push(`(${partes.join(' OR ')})`);
  }
  const onde = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '', database = contasDb();
  const total = Number((await database.prepare(`SELECT COUNT(*) AS total FROM loja_clientes c ${onde}`).get(...parametros) as { total: number }).total);
  const linhas = await database.prepare(`SELECT c.*, (SELECT COUNT(*) FROM loja_pedidos p WHERE p.cliente_id = c.id) AS total_pedidos, k.codigo, k.percentual, k.usado_em, k.pedido_numero
    FROM loja_clientes c LEFT JOIN loja_cupons k ON k.cliente_id = c.id AND k.tipo = 'boas_vindas' ${onde} ORDER BY c.criado DESC, c.id LIMIT ? OFFSET ?`).all(...parametros, limite, offset);
  const clientes: ClienteErp[] = linhas.map((linha) => ({
    id: texto(linha.id), nome: texto(linha.nome), email: texto(linha.email), whatsapp: texto(linha.whatsapp), whatsappFormatado: mascararWhatsapp(texto(linha.whatsapp)),
    criadaEm: iso(linha.criado), ultimoAcesso: linha.ultimo_acesso ? iso(linha.ultimo_acesso) : null, pedidos: Number(linha.total_pedidos), cupom: linha.codigo ? cupomDe(linha) : null,
  }));
  return { clientes, pagination: { limit: limite, offset, total, hasMore: offset + clientes.length < total } };
}

export async function detalheClienteLoja(id: string) {
  if (typeof id !== 'string' || !ID.test(id)) throw new ApiError(404, 'Cliente não encontrada.', 'NOT_FOUND');
  const linha = await contasDb().prepare('SELECT * FROM loja_clientes WHERE id = ?').get(id);
  if (!linha) throw new ApiError(404, 'Cliente não encontrada.', 'NOT_FOUND');
  const conta = contaDe(linha);
  const redefinicao = await contasDb().prepare('SELECT criada, expira, usada_em FROM loja_redefinicoes WHERE cliente_id = ? ORDER BY criada DESC LIMIT 1').get(id);
  return {
    cliente: { ...conta, status: texto(linha.status), ultimoAcesso: linha.ultimo_acesso ? iso(linha.ultimo_acesso) : null },
    cupom: cupomDe(await linhaCupom(id)),
    pedidos: await pedidosDaCliente(id, 100),
    redefinicao: redefinicao ? { criadaEm: iso(redefinicao.criada), expiraEm: iso(redefinicao.expira), usadaEm: redefinicao.usada_em ? iso(redefinicao.usada_em) : null } : null,
  };
}

export type PedidoErp = PedidoLoja & { clienteId: string | null; nome: string; email: string; whatsapp: string; whatsappFormatado: string; anonimizado: boolean; revisao: number };

export async function listarPedidosLoja(url: URL) {
  const { limite, offset } = paginacao(url);
  const status = url.searchParams.get('status') || 'todos';
  if (status !== 'todos' && !(status in STATUS_PEDIDO)) throw new ApiError(400, 'Filtro de situação inválido.', 'INVALID_FILTER');
  const termo = busca(url);
  const condicoes: string[] = [], parametros: (string | number)[] = [];
  if (status !== 'todos') { condicoes.push('status = ?'); parametros.push(status); }
  if (termo) { condicoes.push("(LOWER(numero) LIKE ? ESCAPE '\\' OR LOWER(nome) LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\')"); parametros.push(...Array(3).fill(`%${escaparLike(termo)}%`)); }
  const onde = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '', database = contasDb();
  const total = Number((await database.prepare(`SELECT COUNT(*) AS total FROM loja_pedidos ${onde}`).get(...parametros) as { total: number }).total);
  const linhas = await database.prepare(`SELECT * FROM loja_pedidos ${onde} ORDER BY criado DESC, numero DESC LIMIT ? OFFSET ?`).all(...parametros, limite, offset);
  const contagem: Record<string, number> = Object.fromEntries(Object.keys(STATUS_PEDIDO).map((chave) => [chave, 0]));
  for (const linha of await database.prepare('SELECT status, COUNT(*) AS total FROM loja_pedidos GROUP BY status').all()) contagem[texto(linha.status)] = Number(linha.total);
  return { pedidos: linhas.map(pedidoErp), contagem, pagination: { limit: limite, offset, total, hasMore: offset + linhas.length < total } };
}

function pedidoErp(linha: Linha): PedidoErp {
  return { ...pedidoDe(linha), clienteId: linha.cliente_id ? texto(linha.cliente_id) : null, nome: texto(linha.nome), email: texto(linha.email), whatsapp: texto(linha.whatsapp), whatsappFormatado: mascararWhatsapp(texto(linha.whatsapp)), anonimizado: Number(linha.anonimizado) === 1, revisao: Number(linha.revisao) };
}

/** A equipe acompanha o pedido: em atendimento, confirmado ou cancelado (a cliente vê a situação em Minha conta). */
export async function atualizarPedidoLoja(numero: string, entrada: Record<string, unknown>, ator: Actor) {
  if (Object.keys(entrada).some((chave) => !['revisao', 'status'].includes(chave))) throw new ApiError(400, 'Um ou mais campos não são permitidos nesta operação.', 'UNKNOWN_FIELD');
  const revisao = entrada.revisao, status = entrada.status;
  if (!Number.isSafeInteger(revisao) || Number(revisao) < 1) throw new ApiError(400, 'Informe a versão atual do pedido.', 'REVISION_REQUIRED');
  if (typeof status !== 'string' || !(status in STATUS_PEDIDO)) throw new ApiError(400, 'Situação inválida.', 'INVALID_STATUS');
  const alvo = typeof numero === 'string' ? numero.toUpperCase() : '';
  if (!/^[A-Z0-9-]{4,40}$/.test(alvo)) throw new ApiError(404, 'Pedido não encontrado.', 'NOT_FOUND');
  const database = contasDb();
  return database.transaction(async () => {
    const linha = await database.prepare('SELECT * FROM loja_pedidos WHERE numero = ?').get(alvo);
    if (!linha) throw new ApiError(404, 'Pedido não encontrado.', 'NOT_FOUND');
    if (Number(linha.revisao) !== revisao) throw new ApiError(409, 'Este pedido foi alterado por outra pessoa. Atualize a lista e tente novamente.', 'REVISION_CONFLICT');
    await database.prepare('UPDATE loja_pedidos SET status = ?, revisao = revisao + 1, atualizado = ? WHERE numero = ? AND revisao = ?').run(status, Date.now(), alvo, Number(revisao));
    await auditar(ator.id, 'updated', 'loja_pedidos', alvo);
    return { pedido: pedidoErp(await database.prepare('SELECT * FROM loja_pedidos WHERE numero = ?').get(alvo) as Linha) };
  });
}

