import {readBinary,discardBinaries,discardOnFailure} from '../storage/r2.ts';
import { createHmac, randomUUID } from 'node:crypto';
import {compressImage,ImageCompressionError,type CompressedImage} from '../storage/images.ts';
import {prepareImageVariants,saveImageVariants,imageVariant,deleteImageVariants,variantsDb,variantKeys} from '../storage/variants.ts';
import { erpDB } from '../erp/core.ts';
import { ApiError, type Actor } from '../erp/access.ts';
import { imageMime, MAX_FILE_BYTES } from '../erp/files.ts';
import {
  LIMITES_AVALIACAO, PARA_QUEM, RESUMO_VAZIO, STATUS_AVALIACAO, limparTexto, normalizarBusca, slugValido, validarAvaliacao,
  type AvaliacaoPublica, type ErrosAvaliacao, type FiltrosAvaliacao, type FotoAvaliacao, type ParaQuem, type RespostaAvaliacoes, type ResumoAvaliacoes, type StatusAvaliacao,
} from '../../loja/lib/avaliacoes/regras.ts';

// Avaliações de produto da loja: gravação pública (sempre "pendente"), listagem só das aprovadas,
// fotos recomprimidas (WebP, sem metadados) guardadas em BYTEA/BLOB como os anexos do ERP, e a
// moderação feita pelo ERP com revisão otimista e auditoria em erp_audit. Mesmo adaptador do ERP:
// PostgreSQL/Supabase (erp_core, migração 008) ou SQLite local explícito (ALLOW_LOCAL_SQLITE).

export const avaliacoesSchema = `CREATE TABLE IF NOT EXISTS loja_avaliacoes (id TEXT PRIMARY KEY, produto TEXT NOT NULL CHECK (length(produto) BETWEEN 1 AND 160), nota INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5), titulo TEXT NOT NULL CHECK (length(titulo) BETWEEN 1 AND 80), texto TEXT NOT NULL CHECK (length(texto) BETWEEN 20 AND 2000), nome TEXT NOT NULL CHECK (length(nome) BETWEEN 1 AND 40), cidade TEXT NOT NULL DEFAULT '' CHECK (length(cidade) <= 60), para_quem TEXT NOT NULL DEFAULT '' CHECK (para_quem IN ('', 'menina', 'menino', 'surpresa')), status TEXT NOT NULL CHECK (status IN ('pendente', 'aprovada', 'recusada')), motivo_recusa TEXT NOT NULL DEFAULT '' CHECK (length(motivo_recusa) <= 500), resposta TEXT NOT NULL DEFAULT '' CHECK (length(resposta) <= 1000), resposta_em INTEGER, texto_busca TEXT NOT NULL, fotos INTEGER NOT NULL DEFAULT 0 CHECK (fotos BETWEEN 0 AND 4), ip_hash TEXT NOT NULL DEFAULT '', consentimento_em INTEGER NOT NULL, revisao INTEGER NOT NULL CHECK (revisao > 0), criada INTEGER NOT NULL, atualizada INTEGER NOT NULL, moderada_em INTEGER, moderada_por TEXT NOT NULL DEFAULT '');
CREATE INDEX IF NOT EXISTS loja_avaliacoes_produto_status ON loja_avaliacoes(produto, status, criada);
CREATE INDEX IF NOT EXISTS loja_avaliacoes_status_criada ON loja_avaliacoes(status, criada);
CREATE INDEX IF NOT EXISTS loja_avaliacoes_ip ON loja_avaliacoes(ip_hash, criada);
CREATE TABLE IF NOT EXISTS loja_avaliacao_fotos (id TEXT PRIMARY KEY, avaliacao_id TEXT NOT NULL REFERENCES loja_avaliacoes(id) ON DELETE CASCADE, posicao INTEGER NOT NULL CHECK (posicao BETWEEN 0 AND 3), largura INTEGER NOT NULL CHECK (largura > 0 AND largura <= 1600), altura INTEGER NOT NULL CHECK (altura > 0 AND altura <= 1600), tipo TEXT NOT NULL CHECK (tipo = 'image/webp'), tamanho INTEGER NOT NULL CHECK (tamanho > 0 AND tamanho <= 3145728), grande BLOB NOT NULL, mini BLOB NOT NULL, criada INTEGER NOT NULL, grande_key TEXT, mini_key TEXT, UNIQUE (avaliacao_id, posicao));
CREATE INDEX IF NOT EXISTS loja_avaliacao_fotos_avaliacao ON loja_avaliacao_fotos(avaliacao_id, posicao);`;

export function avaliacoesDb() { const database = erpDB(); database.registerSqliteSchema(avaliacoesSchema); return database; }

/** Erro com mensagens por campo (o formulário mostra cada uma ao lado do campo). */
export class ErroAvaliacao extends ApiError {
  erros: ErrosAvaliacao;
  constructor(status: number, message: string, code: string, erros: ErrosAvaliacao = {}) { super(status, message, code); this.erros = erros; }
}

/** Tag de cache das avaliações de um produto (PDP e JSON-LD): revalidada a cada moderação. */
export const tagAvaliacoes = (produto: string) => `avaliacoes:${produto}`;

type Linha = Record<string, unknown>;
type FotoProcessada = { grande: Buffer; mini: Buffer; largura: number; altura: number; compressed:CompressedImage };
const iso = (valor: unknown) => new Date(Number(valor)).toISOString();
const bytes = (valor: unknown) => Buffer.isBuffer(valor) ? valor : Buffer.from(valor as Uint8Array);

async function travar() {
  const database = avaliacoesDb();
  if (database.backend === 'postgres') await database.prepare('SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(?, 0))').get('loja-avaliacoes');
}
async function auditar(actor: string, acao: string, id: string) {
  await avaliacoesDb().prepare('INSERT INTO erp_audit VALUES (?, ?, ?, ?, ?, ?)').run(randomUUID(), actor, acao, 'avaliacoes', id, Date.now());
}

// IP só para o limite por hora: guardado como HMAC (nunca o IP) e apagado depois de 24 h ou na moderação.
export function hashDoIp(ip: string) {
  const chave = process.env.INTEGRATION_ENCRYPTION_KEY || process.env.AVALIACOES_IP_SEGREDO || 'loja-avaliacoes';
  return createHmac('sha256', chave).update(`loja-avaliacoes:${ip}`).digest('hex');
}

/**
 * Confere e recomprime uma foto: até 3 MiB, JPEG/PNG/WebP pelos bytes mágicos (não pela extensão),
 * WebP com lado máximo de 1600 px (q 80) e miniatura de 400 px, sem nenhum metadado (EXIF/GPS/ICC).
 */
export async function processarFoto(conteudo: Buffer, posicao = 0): Promise<FotoProcessada> {
  const numero = posicao + 1;
  if (!conteudo.length) throw new ErroAvaliacao(400, `A foto ${numero} está vazia.`, 'FOTO_VAZIA', {fotos: `A foto ${numero} está vazia.`});
  if (conteudo.length > MAX_FILE_BYTES) throw new ErroAvaliacao(413, `A foto ${numero} tem mais de 3 MB. Envie fotos de até 3 MB cada.`, 'FOTO_GRANDE', {fotos: `A foto ${numero} tem mais de 3 MB.`});
  try { imageMime(conteudo); } catch { throw new ErroAvaliacao(415, `A foto ${numero} não é JPEG, PNG ou WebP.`, 'FOTO_TIPO', {fotos: `A foto ${numero} não é JPEG, PNG ou WebP.`}); }
  try {
    const compressed=await compressImage(conteudo,'review');
    return {grande:compressed.webp.large,mini:compressed.webp.small,largura:compressed.width,altura:compressed.height,compressed};
  } catch (error) {
    if(error instanceof ImageCompressionError&&error.status===429)throw new ErroAvaliacao(429,error.message,error.code);
    throw new ErroAvaliacao(415, `Não foi possível ler a foto ${numero}. Envie outra imagem.`, 'FOTO_INVALIDA', {fotos: `Não foi possível ler a foto ${numero}.`});
  }
}

export type EntradaAvaliacao = { campos: Record<string, unknown>; fotos: Buffer[]; ip: string; agora?: number };
export type OpcoesAvaliacao = { produtoExiste: (slug: string) => boolean; gravar?: boolean };

/**
 * Recebe uma avaliação da loja. Honeypot preenchido: responde como sucesso e descarta. Preenchimento
 * rápido demais, campos inválidos, produto fora do catálogo, fotos demais ou inválidas: erro. Com
 * `gravar: false` (desenvolvimento ligado ao banco remoto) valida e processa tudo, mas não grava.
 */
export async function criarAvaliacao(entrada: EntradaAvaliacao, opcoes: OpcoesAvaliacao): Promise<{situacao: 'recebida' | 'ignorada' | 'simulada'; id?: string}> {
  const agora = entrada.agora ?? Date.now();
  if (typeof entrada.campos.site === 'string' && entrada.campos.site.trim()) return {situacao: 'ignorada'};
  const iniciado = Number(entrada.campos.iniciado);
  if (!Number.isFinite(iniciado) || agora - iniciado < LIMITES_AVALIACAO.tempoMinimoMs) throw new ErroAvaliacao(400, 'O envio foi rápido demais. Confira a avaliação e envie de novo.', 'ENVIO_RAPIDO');
  const validacao = validarAvaliacao(entrada.campos);
  if (!validacao.ok) throw new ErroAvaliacao(400, 'Confira os campos destacados.', 'INVALID_INPUT', validacao.erros);
  const dados = validacao.dados;
  if (!opcoes.produtoExiste(dados.produto)) throw new ErroAvaliacao(404, 'Produto não encontrado no catálogo.', 'PRODUTO_INEXISTENTE', {produto: 'Produto não encontrado.'});
  if (entrada.fotos.length > LIMITES_AVALIACAO.fotos) throw new ErroAvaliacao(400, `Envie no máximo ${LIMITES_AVALIACAO.fotos} fotos.`, 'FOTOS_DEMAIS', {fotos: `Envie no máximo ${LIMITES_AVALIACAO.fotos} fotos.`});
  const fotos: FotoProcessada[] = [];
  for (const [posicao, foto] of entrada.fotos.entries()) fotos.push(await processarFoto(foto, posicao));
  if (opcoes.gravar === false) return {situacao: 'simulada'};

  const database = avaliacoesDb(), id = randomUUID(), ip = hashDoIp(entrada.ip || 'desconhecido');
  variantsDb(database);
  const photoIds=fotos.map(()=>randomUUID());
  const objects=await Promise.all(fotos.map((foto,index)=>prepareImageVariants('review',photoIds[index],foto.compressed)));
  // Limite por IP ou falha do banco: as fotos já enviadas ao storage são apagadas, não ficam órfãs.
  await discardOnFailure(objects.flatMap(variantKeys), () => database.transaction(async () => {
    await travar();
    await database.prepare("UPDATE loja_avaliacoes SET ip_hash = '' WHERE ip_hash <> '' AND criada < ?").run(agora - 24 * 60 * 60 * 1000);
    const recentes = await database.prepare('SELECT COUNT(*) AS total FROM loja_avaliacoes WHERE ip_hash = ? AND criada > ?').get(ip, agora - LIMITES_AVALIACAO.janelaIpMs) as {total: number};
    if (Number(recentes.total) >= LIMITES_AVALIACAO.porIp) throw new ErroAvaliacao(429, 'Você já enviou avaliações nesta última hora. Tente de novo mais tarde.', 'RATE_LIMITED');
    await database.prepare('INSERT INTO loja_avaliacoes (id, produto, nota, titulo, texto, nome, cidade, para_quem, status, texto_busca, fotos, ip_hash, consentimento_em, revisao, criada, atualizada) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)')
      .run(id, dados.produto, dados.nota, dados.titulo, dados.texto, dados.nome, dados.cidade, dados.paraQuem, 'pendente', normalizarBusca(`${dados.titulo} ${dados.texto}`), fotos.length, ip, agora, agora, agora);
    for (const [posicao, foto] of fotos.entries()) {
      await database.prepare('INSERT INTO loja_avaliacao_fotos (id, avaliacao_id, posicao, largura, altura, tipo, tamanho, grande, mini, criada, grande_key, mini_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(photoIds[posicao], id, posicao, foto.largura, foto.altura, 'image/webp', foto.grande.length, objects[posicao].find(v=>v.format==='webp'&&v.variant==='large')!.key?Buffer.alloc(0):foto.grande, objects[posicao].find(v=>v.format==='webp'&&v.variant==='small')!.key?Buffer.alloc(0):foto.mini, agora,objects[posicao].find(v=>v.format==='webp'&&v.variant==='large')!.key,objects[posicao].find(v=>v.format==='webp'&&v.variant==='small')!.key);
      await saveImageVariants(database,objects[posicao]);
    }
    await auditar('loja', 'created', id);
  }));
  return {situacao: 'recebida', id};
}

async function fotosDe(ids: string[]): Promise<Map<string, FotoAvaliacao[]>> {
  const mapa = new Map<string, FotoAvaliacao[]>();
  if (!ids.length) return mapa;
  const linhas = await avaliacoesDb().prepare(`SELECT id, avaliacao_id, largura, altura FROM loja_avaliacao_fotos WHERE avaliacao_id IN (${ids.map(() => '?').join(', ')}) ORDER BY avaliacao_id, posicao`).all(...ids);
  for (const linha of linhas) {
    const lista = mapa.get(String(linha.avaliacao_id)) ?? [];
    lista.push({id: String(linha.id), largura: Number(linha.largura), altura: Number(linha.altura)});
    mapa.set(String(linha.avaliacao_id), lista);
  }
  return mapa;
}

function publica(linha: Linha, fotos: FotoAvaliacao[]): AvaliacaoPublica {
  return {
    id: String(linha.id), nota: Number(linha.nota), titulo: String(linha.titulo), texto: String(linha.texto), nome: String(linha.nome), cidade: String(linha.cidade),
    paraQuem: String(linha.para_quem) as ParaQuem | '', criadaEm: iso(linha.criada), fotos,
    resposta: linha.resposta ? {texto: String(linha.resposta), em: iso(linha.resposta_em ?? linha.atualizada)} : null,
  };
}

/** Média e contagem por nota, com fotos e "para quem", só das aprovadas do produto. */
export async function resumoDoProduto(produto: string): Promise<ResumoAvaliacoes> {
  if (!slugValido(produto)) return structuredClone(RESUMO_VAZIO);
  const database = avaliacoesDb();
  const grupos = await database.prepare("SELECT nota, para_quem, COUNT(*) AS total, SUM(CASE WHEN fotos > 0 THEN 1 ELSE 0 END) AS com_fotos FROM loja_avaliacoes WHERE produto = ? AND status = 'aprovada' GROUP BY nota, para_quem").all(produto);
  const resumo = structuredClone(RESUMO_VAZIO);
  let soma = 0;
  for (const linha of grupos) {
    const nota = Number(linha.nota), total = Number(linha.total);
    resumo.porNota[String(nota) as keyof ResumoAvaliacoes['porNota']] += total;
    resumo.total += total; soma += nota * total; resumo.comFotos += Number(linha.com_fotos ?? 0);
    if (String(linha.para_quem) in PARA_QUEM) resumo.paraQuem[String(linha.para_quem) as ParaQuem] += total;
  }
  resumo.media = resumo.total ? Math.round((soma / resumo.total) * 10) / 10 : 0;
  return resumo;
}

const ORDEM_SQL: Record<FiltrosAvaliacao['ordem'], string> = {
  recentes: 'criada DESC, id',
  maior: 'nota DESC, criada DESC, id',
  menor: 'nota ASC, criada DESC, id',
  fotos: 'CASE WHEN fotos > 0 THEN 1 ELSE 0 END DESC, criada DESC, id',
};
const escaparLike = (valor: string) => valor.replace(/[\\%_]/g, (caractere) => `\\${caractere}`);

/** Só aprovadas, com filtros, ordenação e paginação; o resumo é sempre do produto inteiro. */
export async function listarAprovadas(produto: string, filtros: FiltrosAvaliacao): Promise<RespostaAvaliacoes> {
  const pagina = {offset: filtros.offset, limite: filtros.limite, temMais: false};
  if (!slugValido(produto)) return {avaliacoes: [], total: 0, pagina, resumo: structuredClone(RESUMO_VAZIO)};
  const condicoes = ["produto = ?", "status = 'aprovada'"];
  const parametros: (string | number)[] = [produto];
  if (filtros.notas.length) { condicoes.push(`nota IN (${filtros.notas.map(() => '?').join(', ')})`); parametros.push(...filtros.notas); }
  if (filtros.comFotos) condicoes.push('fotos > 0');
  if (filtros.paraQuem.length) { condicoes.push(`para_quem IN (${filtros.paraQuem.map(() => '?').join(', ')})`); parametros.push(...filtros.paraQuem); }
  const busca = normalizarBusca(filtros.busca);
  if (busca) { condicoes.push("texto_busca LIKE ? ESCAPE '\\'"); parametros.push(`%${escaparLike(busca)}%`); }
  const onde = condicoes.join(' AND '), database = avaliacoesDb();
  const total = Number((await database.prepare(`SELECT COUNT(*) AS total FROM loja_avaliacoes WHERE ${onde}`).get(...parametros) as {total: number}).total);
  const linhas = await database.prepare(`SELECT id, nota, titulo, texto, nome, cidade, para_quem, criada, resposta, resposta_em, atualizada FROM loja_avaliacoes WHERE ${onde} ORDER BY ${ORDEM_SQL[filtros.ordem]} LIMIT ? OFFSET ?`).all(...parametros, filtros.limite, filtros.offset);
  const fotos = await fotosDe(linhas.map((linha) => String(linha.id)));
  pagina.temMais = filtros.offset + linhas.length < total;
  return {avaliacoes: linhas.map((linha) => publica(linha, fotos.get(String(linha.id)) ?? [])), total, pagina, resumo: await resumoDoProduto(produto)};
}

/** Binário da foto. Na loja, só de avaliação aprovada; no ERP (moderação), de qualquer situação. */
export async function fotoDaAvaliacao(id: string, tamanho: 'mini' | 'grande', somenteAprovadas: boolean,formato:'webp'|'avif'='webp') {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new ApiError(404, 'Foto não encontrada.', 'NOT_FOUND');
  const coluna = tamanho === 'mini' ? 'mini' : 'grande';
  const linha = await avaliacoesDb().prepare(`SELECT f.${coluna} AS conteudo, f.${coluna}_key AS object_key, f.tipo FROM loja_avaliacao_fotos f JOIN loja_avaliacoes a ON a.id = f.avaliacao_id WHERE f.id = ?${somenteAprovadas ? " AND a.status = 'aprovada'" : ''}`).get(id);
  if (!linha) throw new ApiError(404, 'Foto não encontrada.', 'NOT_FOUND');
  if(formato==='avif'){const variant=await imageVariant(avaliacoesDb(),'review',id,tamanho==='mini'?'small':'large','avif');if(variant)return{conteudo:variant.content,tipo:variant.type};}
  if(linha.object_key)linha.conteudo=await readBinary(String(linha.object_key));
  return {conteudo: bytes(linha.conteudo), tipo: String(linha.tipo)};
}

// ---------------------------------------------------------------- Moderação (ERP)

export type AvaliacaoModeracao = AvaliacaoPublica & {
  produto: string; status: StatusAvaliacao; motivoRecusa: string; revisao: number; atualizadaEm: string; moderadaEm: string | null; moderadaPor: string;
};

function moderacao(linha: Linha, fotos: FotoAvaliacao[]): AvaliacaoModeracao {
  return {
    ...publica(linha, fotos), produto: String(linha.produto), status: String(linha.status) as StatusAvaliacao, motivoRecusa: String(linha.motivo_recusa),
    revisao: Number(linha.revisao), atualizadaEm: iso(linha.atualizada), moderadaEm: linha.moderada_em ? iso(linha.moderada_em) : null, moderadaPor: String(linha.moderada_por),
  };
}

async function linhaDaAvaliacao(id: string) {
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id)) throw new ApiError(404, 'Avaliação não encontrada.', 'NOT_FOUND');
  const linha = await avaliacoesDb().prepare('SELECT * FROM loja_avaliacoes WHERE id = ?').get(id);
  if (!linha) throw new ApiError(404, 'Avaliação não encontrada.', 'NOT_FOUND');
  return linha;
}

export async function listarParaModeracao(url: URL) {
  const status = url.searchParams.get('status') || 'pendente';
  if (status !== 'todas' && !(status in STATUS_AVALIACAO)) throw new ApiError(400, 'Filtro de situação inválido.', 'INVALID_FILTER');
  const produto = url.searchParams.get('produto') || '';
  if (produto && !slugValido(produto)) throw new ApiError(400, 'Produto inválido.', 'INVALID_FILTER');
  const limite = Number(url.searchParams.get('limit') ?? 20), offset = Number(url.searchParams.get('offset') ?? 0);
  if (!Number.isSafeInteger(limite) || limite < 1 || limite > 100 || !Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000) throw new ApiError(400, 'Limit deve ser entre 1 e 100; offset entre 0 e 1000000.', 'INVALID_PAGINATION');
  const condicoes: string[] = [], parametros: string[] = [];
  if (status !== 'todas') { condicoes.push('status = ?'); parametros.push(status); }
  if (produto) { condicoes.push('produto = ?'); parametros.push(produto); }
  const onde = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '', database = avaliacoesDb();
  const total = Number((await database.prepare(`SELECT COUNT(*) AS total FROM loja_avaliacoes ${onde}`).get(...parametros) as {total: number}).total);
  const linhas = await database.prepare(`SELECT * FROM loja_avaliacoes ${onde} ORDER BY criada DESC, id LIMIT ? OFFSET ?`).all(...parametros, limite, offset);
  const fotos = await fotosDe(linhas.map((linha) => String(linha.id)));
  const contagem = {pendente: 0, aprovada: 0, recusada: 0};
  for (const linha of await database.prepare(`SELECT status, COUNT(*) AS total FROM loja_avaliacoes ${produto ? 'WHERE produto = ?' : ''} GROUP BY status`).all(...(produto ? [produto] : []))) contagem[String(linha.status) as StatusAvaliacao] = Number(linha.total);
  const produtos = (await database.prepare('SELECT produto, COUNT(*) AS total FROM loja_avaliacoes GROUP BY produto ORDER BY produto').all()).map((linha) => ({slug: String(linha.produto), total: Number(linha.total)}));
  return {avaliacoes: linhas.map((linha) => moderacao(linha, fotos.get(String(linha.id)) ?? [])), contagem, produtos, pagination: {limit: limite, offset, total, hasMore: offset + linhas.length < total}};
}

/**
 * Aprovar, recusar (motivo interno obrigatório), voltar para pendente e responder como o ateliê.
 * Corpo: {revisao, status?, motivo?, resposta?}. Versão antiga responde 409 REVISION_CONFLICT.
 */
export async function moderarAvaliacao(id: string, entrada: Record<string, unknown>, actor: Actor) {
  if (Object.keys(entrada).some((chave) => !['revisao', 'status', 'motivo', 'resposta'].includes(chave))) throw new ApiError(400, 'Um ou mais campos não são permitidos nesta operação.', 'UNKNOWN_FIELD');
  const revisao = entrada.revisao;
  if (!Number.isSafeInteger(revisao) || Number(revisao) < 1) throw new ApiError(400, 'Informe a versão atual da avaliação.', 'REVISION_REQUIRED');
  const status = entrada.status;
  if (status !== undefined && (typeof status !== 'string' || !(status in STATUS_AVALIACAO))) throw new ApiError(400, 'Situação inválida.', 'INVALID_STATUS');
  if (entrada.motivo !== undefined && typeof entrada.motivo !== 'string' || entrada.resposta !== undefined && typeof entrada.resposta !== 'string') throw new ApiError(400, 'Texto inválido.', 'INVALID_INPUT');
  const motivo = limparTexto(entrada.motivo), resposta = entrada.resposta === undefined ? undefined : limparTexto(entrada.resposta);
  if (status === 'recusada' && (motivo.length < 3 || motivo.length > LIMITES_AVALIACAO.motivo)) throw new ApiError(400, `Informe o motivo interno da recusa (3 a ${LIMITES_AVALIACAO.motivo} caracteres).`, 'REASON_REQUIRED');
  if (resposta !== undefined && [...resposta].length > LIMITES_AVALIACAO.resposta) throw new ApiError(400, `A resposta do ateliê tem no máximo ${LIMITES_AVALIACAO.resposta} caracteres.`, 'INVALID_INPUT');
  if (status === undefined && resposta === undefined) throw new ApiError(400, 'Nada para alterar.', 'INVALID_INPUT');
  const database = avaliacoesDb();
  return database.transaction(async () => {
    await travar();
    const linha = await linhaDaAvaliacao(id);
    if (Number(linha.revisao) !== revisao) throw new ApiError(409, 'Esta avaliação foi alterada por outra pessoa. Atualize a lista e tente novamente.', 'REVISION_CONFLICT');
    const agora = Date.now();
    const novoStatus = (status ?? linha.status) as StatusAvaliacao;
    const mudouStatus = novoStatus !== linha.status;
    const novaResposta = resposta ?? String(linha.resposta);
    const mudouResposta = novaResposta !== linha.resposta;
    await database.prepare(`UPDATE loja_avaliacoes SET status = ?, motivo_recusa = ?, resposta = ?, resposta_em = ?, revisao = revisao + 1, atualizada = ?, moderada_em = ?, moderada_por = ?${mudouStatus ? ", ip_hash = ''" : ''} WHERE id = ? AND revisao = ?`).run(
      novoStatus, novoStatus === 'recusada' ? (status === 'recusada' ? motivo : String(linha.motivo_recusa)) : '', novaResposta,
      mudouResposta ? (novaResposta ? agora : null) : (linha.resposta_em as number | null) ?? null, agora,
      mudouStatus ? agora : (linha.moderada_em as number | null) ?? null, mudouStatus ? actor.name : String(linha.moderada_por), id, revisao,
    );
    if (mudouStatus) await auditar(actor.id, novoStatus === 'aprovada' ? 'approved' : novoStatus === 'recusada' ? 'rejected' : 'reopened', id);
    if (mudouResposta) await auditar(actor.id, novaResposta ? 'replied' : 'reply_removed', id);
    const atualizada = await linhaDaAvaliacao(id);
    return {avaliacao: moderacao(atualizada, (await fotosDe([id])).get(id) ?? []), publicadaMudou: mudouStatus && (linha.status === 'aprovada' || novoStatus === 'aprovada') || mudouResposta && novoStatus === 'aprovada'};
  });
}

/** Exclusão definitiva (a pedido da cliente, LGPD, ou spam): apaga também as fotos. */
export async function excluirAvaliacao(id: string, revisao: number, actor: Actor) {
  if (!Number.isSafeInteger(revisao) || revisao < 1) throw new ApiError(400, 'Informe a versão atual da avaliação.', 'REVISION_REQUIRED');
  const database = avaliacoesDb();
  let keys:string[]=[];
  const result=await database.transaction(async () => {
    await travar();
    const linha = await linhaDaAvaliacao(id);
    if (Number(linha.revisao) !== revisao) throw new ApiError(409, 'Esta avaliação foi alterada por outra pessoa. Atualize a lista e tente novamente.', 'REVISION_CONFLICT');
    const removed=await database.prepare('DELETE FROM loja_avaliacao_fotos WHERE avaliacao_id = ? RETURNING id,grande_key,mini_key').all(id);
    keys=removed.flatMap(row=>[row.grande_key,row.mini_key].filter(Boolean).map(String));for(const row of removed)keys.push(...await deleteImageVariants(database,'review',String(row.id)));
    await database.prepare('DELETE FROM loja_avaliacoes WHERE id = ?').run(id);
    await auditar(actor.id, 'removed', id);
    return {deleted: true, produto: String(linha.produto), estavaPublicada: linha.status === 'aprovada'};
  });
  await discardBinaries(keys);return result;
}
