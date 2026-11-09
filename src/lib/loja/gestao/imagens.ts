import {storeBinary,readBinary,discardBinaries} from '../../storage/r2.ts';
import { createHash } from 'node:crypto';
import {compressImage,ImageCompressionError} from '../../storage/images.ts';
import {prepareImageVariants,saveImageVariants,imageVariant,deleteImageVariants,variantsDb,variantsTable} from '../../storage/variants.ts';
import { ApiError, type Actor } from '../../erp/access.ts';
import { imageMime, MAX_FILE_BYTES } from '../../erp/files.ts';
import type { ImagemProdutoGestao, RespostaImagensProduto, TipoImagemProduto } from './tipos.ts';
import { auditarGestao, conflito, exigirGravacaoGestao, gestaoDb, ID, iso, type Linha, listaIds, naoEncontrado, novoId, objeto, opcaoCampo, permitidos, revisaoCampo, textoCampo, texto, travarGestao } from './esquema.ts';

// Fotos até 3 MiB: perfil product em WebP/AVIF e miniaturas, sem metadados.
// R2 guarda os bytes; BYTEA permanece como compatibilidade explícita/legada.

export const LIMITES_IMAGEM = { porProduto: 12, ladoGrande: 1600, ladoMini: 400, bytes: MAX_FILE_BYTES } as const;
const TIPOS: readonly TipoImagemProduto[] = ['principal', 'detalhe', 'aplicacao'];

const bytes = (valor: unknown) => Buffer.from(valor as Uint8Array);

/** Cópias de produtos compartilham objetos imutáveis; só a última referência libera o arquivo. */
export async function liberarObjetosDasImagens(keys: string[]) {
  const unique=[...new Set(keys)];if(!unique.length)return;
  const database=variantsDb(gestaoDb()),parameters=unique.map(()=>'?').join(',');
  const referenced=await database.prepare(`SELECT grande_key AS key FROM loja_produto_imagens WHERE grande_key IN (${parameters}) UNION SELECT mini_key AS key FROM loja_produto_imagens WHERE mini_key IN (${parameters}) UNION SELECT object_key AS key FROM ${variantsTable(database)} WHERE object_key IN (${parameters})`).all(...unique,...unique,...unique);
  const keep=new Set(referenced.map(row=>String(row.key)));
  await discardBinaries(unique.filter(key=>!keep.has(key)));
}

export async function processarImagemProduto(conteudo: Buffer) {
  if (!conteudo.length) throw new ApiError(400, 'A foto está vazia.', 'FOTO_VAZIA');
  if (conteudo.length > LIMITES_IMAGEM.bytes) throw new ApiError(413, 'A foto tem mais de 3 MB. Envie fotos de até 3 MB.', 'FOTO_GRANDE');
  try { imageMime(conteudo); } catch { throw new ApiError(415, 'A foto não é JPEG, PNG ou WebP.', 'FOTO_TIPO'); }
  try {
    const compressed=await compressImage(conteudo,'product');
    return {grande:compressed.webp.large,mini:compressed.webp.small,largura:compressed.width,altura:compressed.height,hash:createHash('sha256').update(compressed.webp.large).digest('hex'),compressed};
  } catch (error) {
    if(error instanceof ImageCompressionError&&error.status===429)throw new ApiError(429,error.message,error.code);
    throw new ApiError(415, 'Não foi possível ler a foto. Envie outra imagem.', 'FOTO_INVALIDA');
  }
}

export function imagemGestao(produtoId: string, linha: Linha): ImagemProdutoGestao {
  const base = `/api/erp/loja/produtos/${produtoId}/imagens/${texto(linha.id)}`;
  return {
    id: texto(linha.id), posicao: Number(linha.posicao), alt: texto(linha.alt), cor: texto(linha.cor), tipo: texto(linha.tipo) as TipoImagemProduto,
    largura: Number(linha.largura), altura: Number(linha.altura), tamanho: Number(linha.tamanho), url: `${base}?tamanho=grande&v=${texto(linha.hash).slice(0, 12)}`,
    urlMini: `${base}?tamanho=mini&v=${texto(linha.hash).slice(0, 12)}`, criadaEm: iso(linha.criada),
  };
}

export async function imagensDoProduto(produtoId: string) {
  const linhas = await gestaoDb().prepare('SELECT id, posicao, alt, cor, tipo, largura, altura, tamanho, hash, criada FROM loja_produto_imagens WHERE produto_id = ? ORDER BY posicao').all(produtoId);
  return linhas.map((linha) => imagemGestao(produtoId, linha));
}

/** Lista das fotos + revisão nova do produto (o editor do ERP segue editando sem recarregar). */
async function respostaImagens(produtoId: string): Promise<RespostaImagensProduto> {
  const linha = await gestaoDb().prepare('SELECT revisao FROM loja_produtos WHERE id = ?').get(produtoId);
  return { imagens: await imagensDoProduto(produtoId), revisao: Number(linha?.revisao ?? 0) };
}

async function produtoParaEditar(produtoId: string, revisao: number) {
  const linha = await gestaoDb().prepare('SELECT id, revisao FROM loja_produtos WHERE id = ?').get(produtoId);
  if (!linha) throw naoEncontrado('Produto');
  if (Number(linha.revisao) !== revisao) throw conflito();
}
/** Mexer nas fotos conta como edição do produto (revisão + 1): a loja invalida o cache pelo mesmo caminho. */
const tocarProduto = (produtoId: string) => gestaoDb().prepare('UPDATE loja_produtos SET revisao = revisao + 1, atualizado = ? WHERE id = ?').run(Date.now(), produtoId);

export type EntradaUpload = { conteudo: Buffer; revisao: unknown; alt?: unknown; cor?: unknown; tipo?: unknown };

/** Upload (multipart: arquivo, revisao, alt?, cor?, tipo?). A foto entra no fim da lista. */
export async function enviarImagem(produtoId: string, entrada: EntradaUpload, ator: Actor) {
  exigirGravacaoGestao();
  const revisao = revisaoCampo(Number(entrada.revisao));
  const alt = textoCampo(entrada.alt ?? '', 'Texto alternativo', 200), cor = textoCampo(entrada.cor ?? '', 'Cor', 40);
  const tipo = entrada.tipo === undefined || entrada.tipo === '' ? undefined : opcaoCampo(entrada.tipo, 'Tipo da foto', TIPOS);
  const foto = await processarImagemProduto(entrada.conteudo);
  const database = gestaoDb(), id = novoId();
  variantsDb(database);const variants=await prepareImageVariants('product',id,foto.compressed);
  const grandeKey=variants.find(v=>v.format==='webp'&&v.variant==='large')!.key,miniKey=variants.find(v=>v.format==='webp'&&v.variant==='small')!.key;
  await database.transaction(async () => {
    await travarGestao();
    await produtoParaEditar(produtoId, revisao);
    const atual = await database.prepare('SELECT COUNT(*) AS total, COALESCE(MAX(posicao), -1) AS ultima FROM loja_produto_imagens WHERE produto_id = ?').get(produtoId);
    if (Number(atual?.total) >= LIMITES_IMAGEM.porProduto) throw new ApiError(409, `Cada produto tem até ${LIMITES_IMAGEM.porProduto} fotos.`, 'FOTOS_DEMAIS');
    const posicao = Number(atual?.ultima) + 1;
    await database.prepare('INSERT INTO loja_produto_imagens (id, produto_id, posicao, alt, cor, tipo, largura, altura, mime, tamanho, hash, grande, mini, criada, grande_key, mini_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, produtoId, posicao, alt, cor, tipo ?? (posicao === 0 ? 'principal' : 'detalhe'), foto.largura, foto.altura, 'image/webp', foto.grande.length, foto.hash, grandeKey?Buffer.alloc(0):foto.grande, miniKey?Buffer.alloc(0):foto.mini, Date.now(),grandeKey,miniKey);
    await saveImageVariants(database,variants);
    await tocarProduto(produtoId);
    await auditarGestao(ator.id, 'file_attached', 'loja_produtos', produtoId);
  });
  return respostaImagens(produtoId);
}

/** PATCH {revisao, alt?, cor?, tipo?} */
export async function editarImagem(produtoId: string, imagemId: string, entradaBruta: unknown, ator: Actor) {
  exigirGravacaoGestao();
  const entrada = objeto(entradaBruta);
  permitidos(entrada, ['revisao', 'alt', 'cor', 'tipo']);
  const revisao = revisaoCampo(entrada.revisao);
  const database = gestaoDb();
  await database.transaction(async () => {
    await travarGestao();
    await produtoParaEditar(produtoId, revisao);
    const linha = await database.prepare('SELECT id,alt,cor,tipo FROM loja_produto_imagens WHERE id = ? AND produto_id = ?').get(imagemId, produtoId);
    if (!linha) throw naoEncontrado('Foto');
    await database.prepare('UPDATE loja_produto_imagens SET alt = ?, cor = ?, tipo = ? WHERE id = ?').run(
      entrada.alt === undefined ? texto(linha.alt) : textoCampo(entrada.alt, 'Texto alternativo', 200),
      entrada.cor === undefined ? texto(linha.cor) : textoCampo(entrada.cor, 'Cor', 40),
      entrada.tipo === undefined ? texto(linha.tipo) : opcaoCampo(entrada.tipo, 'Tipo da foto', TIPOS),
      imagemId,
    );
    await tocarProduto(produtoId);
    await auditarGestao(ator.id, 'updated', 'loja_produtos', produtoId);
  });
  return respostaImagens(produtoId);
}

/** PUT {revisao, ids}: todas as fotos do produto, uma vez cada, na nova ordem (a 1ª é a do card). */
export async function reordenarImagens(produtoId: string, entradaBruta: unknown, ator: Actor) {
  exigirGravacaoGestao();
  const entrada = objeto(entradaBruta);
  permitidos(entrada, ['revisao', 'ids']);
  const revisao = revisaoCampo(entrada.revisao), ids = listaIds(entrada.ids, 'Fotos', LIMITES_IMAGEM.porProduto);
  const database = gestaoDb();
  await database.transaction(async () => {
    await travarGestao();
    await produtoParaEditar(produtoId, revisao);
    const atuais = (await database.prepare('SELECT id FROM loja_produto_imagens WHERE produto_id = ?').all(produtoId)).map((linha) => texto(linha.id));
    if (atuais.length !== ids.length || atuais.some((id) => !ids.includes(id))) throw new ApiError(400, 'Informe todas as fotos do produto uma única vez.', 'INVALID_ORDER');
    // Duas passadas para não violar UNIQUE (produto_id, posicao) no meio da troca.
    for (const [posicao, id] of ids.entries()) await database.prepare('UPDATE loja_produto_imagens SET posicao = ? WHERE id = ?').run(posicao + 50, id);
    for (const [posicao, id] of ids.entries()) await database.prepare('UPDATE loja_produto_imagens SET posicao = ? WHERE id = ?').run(posicao, id);
    await tocarProduto(produtoId);
    await auditarGestao(ator.id, 'reordered', 'loja_produtos', produtoId);
  });
  return respostaImagens(produtoId);
}

/** DELETE ?revisao=N: remove a foto e fecha o buraco na ordem. */
export async function removerImagem(produtoId: string, imagemId: string, revisaoBruta: unknown, ator: Actor) {
  exigirGravacaoGestao();
  const revisao = revisaoCampo(revisaoBruta);
  const database = gestaoDb();let keys:string[]=[];
  await database.transaction(async () => {
    await travarGestao();
    await produtoParaEditar(produtoId, revisao);
    const removida = await database.prepare('DELETE FROM loja_produto_imagens WHERE id = ? AND produto_id = ? RETURNING grande_key,mini_key').get(imagemId, produtoId);
    if (!removida) throw naoEncontrado('Foto');
    keys=[removida.grande_key,removida.mini_key].filter(Boolean).map(String);keys.push(...await deleteImageVariants(database,'product',imagemId));
    const restantes = (await database.prepare('SELECT id FROM loja_produto_imagens WHERE produto_id = ? ORDER BY posicao').all(produtoId)).map((linha) => texto(linha.id));
    for (const [posicao, id] of restantes.entries()) await database.prepare('UPDATE loja_produto_imagens SET posicao = ? WHERE id = ?').run(posicao, id);
    await tocarProduto(produtoId);
    await auditarGestao(ator.id, 'file_removed', 'loja_produtos', produtoId);
  });
  await liberarObjetosDasImagens(keys);
  return respostaImagens(produtoId);
}

/** Binário da foto. Na loja, só de produto ATIVO; no ERP (prévia), de qualquer situação. */
export async function arquivoDaImagem(imagemId: string, tamanho: 'grande' | 'mini', somenteAtivos: boolean, produtoId?: string,formato:'webp'|'avif'='webp') {
  if (typeof imagemId !== 'string' || !ID.test(imagemId)) throw naoEncontrado('Foto');
  const coluna = tamanho === 'mini' ? 'mini' : 'grande';
  const linha = await gestaoDb().prepare(`SELECT i.${coluna} AS conteudo, i.${coluna}_key AS object_key, i.hash FROM loja_produto_imagens i JOIN loja_produtos p ON p.id = i.produto_id WHERE i.id = ?${somenteAtivos ? " AND p.status = 'ativo'" : ''}${produtoId ? ' AND i.produto_id = ?' : ''}`)
    .get(...[imagemId, ...(produtoId ? [produtoId] : [])]);
  if (!linha) throw naoEncontrado('Foto');
  if(formato==='avif'){const variant=await imageVariant(gestaoDb(),'product',imagemId,tamanho==='mini'?'small':'large','avif');if(variant)return{conteudo:variant.content,tipo:variant.type,etag:`"${texto(linha.hash).slice(0,32)}-${coluna}-avif"`};}
  if(linha.object_key)linha.conteudo=await readBinary(String(linha.object_key));
  return { conteudo: bytes(linha.conteudo), tipo: 'image/webp', etag: `"${texto(linha.hash).slice(0, 32)}-${coluna}"` };
}
