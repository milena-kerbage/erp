// De onde veio a conversa do WhatsApp. Duas fontes:
//  1. Anúncio "Click to WhatsApp" da Meta: a 1ª mensagem chega com o objeto `referral` (título do anúncio, link, ID).
//  2. Botão de WhatsApp do site: /ir/whatsapp guarda a atribuição do visitante (campanha, busca, indicação, página)
//     e acrescenta "(ref. ABC123)" à mensagem pronta; quando a mensagem chega, o código devolve a origem.
// As referências ficam na tabela `metadata` (chave "ref:<código>"), sem tabela nova, e somem depois de 90 dias.
import { randomInt } from 'node:crypto';
import type { Database } from '../database.ts';
import { resumoDaOrigem, type OrigemLead } from '../../loja/lib/rastreamento/origem.ts';

export type OrigemDetectada = { phone: string; nome: string; tipo: 'site' | 'anuncio'; origem: OrigemLead };

const ALFABETO = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // sem 0/O e 1/I, que se confundem
const DIAS_REFERENCIA = 90;
/** "(ref. K7M2QX)" no fim da mensagem pronta do site. */
export const REF_NA_MENSAGEM = /\s*\(ref\.? ?([2-9A-HJ-NP-Z]{6})\)\s*$/;

export const gerarCodigoRef = () => Array.from({ length: 6 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
export const textoComRef = (texto: string, codigo: string) => `${texto.trimEnd()}\n\n(ref. ${codigo})`;

export async function guardarReferencia(database: Database, codigo: string, origem: OrigemLead, agora = Date.now()) {
  await database.prepare('INSERT INTO metadata VALUES (?, ?) ON CONFLICT(key) DO NOTHING').run(`ref:${codigo}`, JSON.stringify({ em: agora, origem }).slice(0, 6000));
}

export async function lerReferencia(database: Database, codigo: string, agora = Date.now()): Promise<OrigemLead | null> {
  const linha = await database.prepare('SELECT value FROM metadata WHERE key = ?').get(`ref:${codigo}`) as { value: string } | undefined;
  if (!linha) return null;
  try {
    const dados = JSON.parse(linha.value) as { em?: number; origem?: OrigemLead };
    if (!dados.origem || !Number.isFinite(dados.em) || agora - Number(dados.em) > DIAS_REFERENCIA * 86_400_000) return null;
    return dados.origem;
  } catch { return null; }
}

/** Limpeza junto com a retenção: referências com mais de 90 dias. */
export async function limparReferencias(database: Database, agora = Date.now()) {
  const linhas = await database.prepare("SELECT key, value FROM metadata WHERE key LIKE 'ref:%'").all() as Array<{ key: string; value: string }>;
  let apagadas = 0;
  for (const linha of linhas) {
    let em = 0;
    try { em = Number((JSON.parse(linha.value) as { em?: number }).em) || 0; } catch { em = 0; }
    if (agora - em > DIAS_REFERENCIA * 86_400_000) { await database.prepare('DELETE FROM metadata WHERE key = ?').run(linha.key); apagadas++; }
  }
  return apagadas;
}

const texto = (valor: unknown, maximo: number) => (typeof valor === 'string' ? valor.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maximo) : '');

/** Anúncio "Click to WhatsApp" (objeto `referral` da mensagem) no formato da ficha do lead. */
export function origemDoAnuncio(referral: Record<string, unknown>, quandoMs: number): OrigemLead | null {
  const link = texto(referral.source_url, 280), titulo = texto(referral.headline, 200), id = texto(referral.source_id, 100), clique = texto(referral.ctwa_clid, 400);
  if (!link && !titulo && !id && !clique) return null;
  const rede = /instagram\.com|ig\.me/i.test(link) ? 'instagram' : 'facebook';
  let pagina: string | undefined;
  try { const url = new URL(link); if (url.protocol === 'https:' || url.protocol === 'http:') pagina = url.href.slice(0, 280); } catch { pagina = undefined; }
  return Object.fromEntries(Object.entries({
    channel: 'Meta Ads (Click to WhatsApp)',
    utmSource: rede,
    utmMedium: texto(referral.source_type, 20) === 'post' ? 'post' : 'ctwa',
    ad: titulo || texto(referral.body, 200) || undefined,
    adId: id || undefined,
    landingPage: pagina,
    firstVisitAt: new Date(quandoMs).toISOString(),
    clickId: clique ? `ctwa_clid=${clique}` : undefined,
  }).filter(([, valor]) => valor)) as OrigemLead;
}

/** A pílula que aparece na conversa: "Veio do site: Google Ads · campanha natal · entrou por /kit-berco". */
export const eventoDaOrigem = (tipo: OrigemDetectada['tipo'], origem: OrigemLead) =>
  tipo === 'anuncio' ? `Veio de um anúncio (Click to WhatsApp)${origem.ad ? `: "${origem.ad}"` : ''}` : `Veio do site: ${resumoDaOrigem(origem)}`;
