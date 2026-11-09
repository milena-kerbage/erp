import 'server-only';
import { revalidateTag } from 'next/cache';
import { ApiError, type Actor, type Permission } from '@/lib/erp/access';
import { MAX_FILE_BYTES } from '@/lib/erp/files';
import { erpApi, jsonBodyERP } from '@/lib/erp/server';
import { TAGS_LOJA } from '@/lib/loja/catalogo';
import { readBytes } from '@/lib/whatsapp/core';
import { ORIGEM_LOJA, nomeDoHost } from '@/lib/hosts';

// Peças comuns das rotas de gestão do e-commerce (src/app/api/erp/loja/**): papéis, invalidação do cache
// da loja e leitura de upload. Mesmo padrão de autenticação, validação, limite e auditoria das demais
// rotas do ERP (erpApi: sessão da equipe; escrita só com sessão e origem confiável).

/** Leitura do catálogo (categorias, produtos, opções, coleções e menu): toda a equipe ativa. */
export const LEITURA_CATALOGO: Permission[] = ['admin', 'manager', 'member'];
/** Escritas e dados de clientes (cupons e usos, carrinhos, painel): administração e gestão. */
export const GESTAO: Permission[] = ['admin', 'manager'];

type Tag = keyof typeof TAGS_LOJA;

/** A loja vê a mudança na próxima visita (sem servir a versão velha). */
export function invalidarLoja(...tags: Tag[]) {
  for (const tag of tags) {
    try { revalidateTag(TAGS_LOJA[tag], { expire: 0 }); } catch { /* fora de um handler do Next (testes) */ }
  }
}

export function lerGestao(request: Request, acao: (ator: Actor) => Promise<unknown>, roles: Permission[] = LEITURA_CATALOGO) {
  return erpApi(request, { roles }, acao);
}

export function escreverGestao(request: Request, tags: Tag[], acao: (ator: Actor) => Promise<unknown>) {
  return erpApi(request, { mutation: true, roles: GESTAO }, async (ator) => {
    const resultado = await acao(ator);
    invalidarLoja(...tags);
    return resultado;
  });
}

export const corpoJson = (request: Request) => jsonBodyERP(request, 256 * 1024);
export const revisaoDaUrl = (request: Request) => Number(new URL(request.url).searchParams.get('revisao'));

/** multipart/form-data com o campo `arquivo` (até 3 MiB) e os demais campos de texto. */
export async function lerUploadImagem(request: Request) {
  const tipo = request.headers.get('content-type') || '';
  if (!/^multipart\/form-data;/i.test(tipo)) throw new ApiError(415, 'Envie multipart/form-data com o campo arquivo.', 'INVALID_CONTENT_TYPE');
  const bruto = await readBytes(request, MAX_FILE_BYTES + 64 * 1024);
  let formulario: FormData;
  try { formulario = await new Request('http://localhost/upload', { method: 'POST', headers: { 'content-type': tipo }, body: new Uint8Array(bruto) }).formData(); }
  catch { throw new ApiError(400, 'Envio de arquivo inválido.', 'INVALID_UPLOAD'); }
  const arquivo = formulario.get('arquivo');
  if (!(arquivo instanceof File)) throw new ApiError(400, 'Selecione a foto no campo arquivo.', 'INVALID_UPLOAD');
  const campo = (nome: string) => { const valor = formulario.get(nome); return typeof valor === 'string' ? valor : undefined; };
  return { conteudo: Buffer.from(await arquivo.arrayBuffer()), revisao: campo('revisao'), alt: campo('alt'), cor: campo('cor'), tipo: campo('tipo') };
}

/** Origem pública da loja (para os links "ver na loja" e a mensagem do carrinho). */
export function origemLojaDoErp(request: Request): string {
  const configurada = process.env.LOJA_ORIGEM;
  if (configurada) return new URL(configurada).origin;
  const host = request.headers.get('host');
  if (process.env.NODE_ENV === 'production' && !nomeDoHost(host).endsWith('localhost')) return ORIGEM_LOJA;
  const url = new URL(request.url), porta = (host ?? '').split(':')[1] ?? url.port;
  return `${url.protocol}//www.localhost${porta ? `:${porta}` : ''}`;
}
