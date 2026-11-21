// Chat do Instagram (Direct) no ERP. As mensagens chegam pelo webhook (objeto "instagram", campo messaging) e o histórico
// vem da API de conversas da Meta; tudo fica em instagram_chat_* (migração 019). Envio pela API de mensagens:
// login pelo Facebook usa a página ligada ({page-id}/messages, acesso da página); login do Instagram usa /me/messages.
// Janela da Meta: resposta livre até 24 h após a última mensagem da pessoa; até 7 dias com a etiqueta HUMAN_AGENT.

import { metaRequest } from './api.ts';
import { InstagramError, instagramConfig } from './config.ts';
import { connectionToken, currentConnection, instagramDb } from './store.ts';

type Json = Record<string, unknown>;
const objeto = (v: unknown): Json => (v && typeof v === 'object' && !Array.isArray(v) ? v as Json : {});
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const texto = (v: unknown, max = 4096) => (typeof v === 'string' ? v.slice(0, max) : typeof v === 'number' ? String(v) : '');
const ehId = (v: string) => /^\d{1,40}$/.test(v);
const DIA = 86_400_000;

export type AnexoInstagram = { tipo: string; url: string };
export type ConversaInstagram = { igsid: string; nome: string; username: string; foto: string; ultimaMensagem: string; ultimoTipo: string; ultimaDirecao: 'entrada' | 'saida' | ''; ultimaEm: string | null; naoLidas: number; janelaAte: string | null };
export type MensagemInstagram = { id: string; igsid: string; direcao: 'entrada' | 'saida'; tipo: string; texto: string; anexos: AnexoInstagram[]; criadoEm: string; status: string; autor: string | null };

function base() {
  const config = instagramConfig();
  return config.modo === 'facebook' ? `https://graph.facebook.com/${config.version}` : `https://graph.instagram.com/${config.version}`;
}
async function acesso() {
  const conexao = await currentConnection();
  if (!conexao) throw new InstagramError(409, 'Conecte o Instagram em Configurações > Instagram.', 'NOT_CONNECTED');
  if (conexao.expires_at <= Date.now()) throw new InstagramError(409, 'O acesso ao Instagram venceu. Conecte de novo em Configurações > Instagram.', 'TOKEN_EXPIRED');
  return { conexao, token: await connectionToken(conexao) };
}
const comToken = (url: URL, token: string) => { url.searchParams.set('access_token', token); return url; };
/** Quem "fala" na API: a página ligada (login pelo Facebook com página), a conta do Instagram (só Instagram) ou "me". */
function dono(conta: string) {
  const config = instagramConfig();
  return config.modo === 'facebook' ? (ehId(config.pageId) ? config.pageId : conta) : 'me';
}

function anexosDe(bruto: unknown): AnexoInstagram[] {
  const itens = Array.isArray(bruto) ? bruto : lista(objeto(bruto).data);
  return itens.map(objeto).map((a) => {
    const payload = objeto(a.payload), imagem = objeto(a.image_data), video = objeto(a.video_data);
    const url = texto(payload.url || imagem.url || video.url || a.file_url, 2000);
    const tipo = texto(a.type, 30) || (imagem.url ? 'image' : video.url ? 'video' : String(a.mime_type ?? '').startsWith('audio') ? 'audio' : 'file');
    return { tipo, url };
  }).filter((a) => a.url || a.tipo);
}

async function gravarMensagem(m: { id: string; igsid: string; account: string; direcao: 'entrada' | 'saida'; texto: string; anexos: AnexoInstagram[]; criado: number; lida: boolean; status: string; username?: string; autor?: string | null }) {
  const db = instagramDb();
  await db.prepare(`INSERT INTO instagram_chat_contatos (igsid, account_id, username, atualizado) VALUES (?, ?, ?, ?)
    ON CONFLICT(igsid) DO UPDATE SET username = CASE WHEN excluded.username <> '' THEN excluded.username ELSE instagram_chat_contatos.username END, atualizado = greatest(instagram_chat_contatos.atualizado, excluded.atualizado)`).run(m.igsid, m.account, m.username ?? '', m.criado);
  const tipo = m.anexos[0]?.tipo || 'text';
  const r = await db.prepare(`INSERT INTO instagram_chat_mensagens (id, igsid, account_id, direcao, tipo, texto, anexos, criado, lida, status, autor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`)
    .run(m.id, m.igsid, m.account, m.direcao, tipo, m.texto, JSON.stringify(m.anexos), m.criado, m.lida ? 1 : 0, m.status, m.autor ?? null);
  if (m.direcao === 'entrada') await db.prepare('UPDATE instagram_chat_contatos SET ultima_entrada = greatest(COALESCE(ultima_entrada, 0), ?) WHERE igsid = ?').run(m.criado, m.igsid);
  return r.changes > 0;
}

/** Um evento "messaging" do webhook: mensagem recebida ou eco do que a conta enviou (inclusive pelo app do Instagram). */
export async function receberDoWebhook(evento: Json, conta: string, agora = Date.now()) {
  const mensagem = objeto(evento.message);
  const mid = texto(mensagem.mid, 300);
  if (!mid || mensagem.is_deleted) return null;
  const remetente = texto(objeto(evento.sender).id, 40), destinatario = texto(objeto(evento.recipient).id, 40);
  const eco = mensagem.is_echo === true || remetente === conta;
  const igsid = eco ? destinatario : remetente;
  if (!ehId(igsid) || igsid === conta) return null;
  const quando = Number(evento.timestamp);
  const criado = Number.isFinite(quando) && quando > 0 ? Math.min(quando < 1e12 ? quando * 1000 : quando, agora) : agora;
  const nova = await gravarMensagem({ id: mid, igsid, account: conta, direcao: eco ? 'saida' : 'entrada', texto: texto(mensagem.text), anexos: anexosDe(mensagem.attachments), criado, lida: eco, status: eco ? 'enviada' : 'recebida' });
  return nova ? igsid : null;
}

/** Nome, @ e foto dos contatos que ainda não têm (a API de perfil é por pessoa). */
export async function completarPerfis(igsids: string[], fetcher: typeof fetch = fetch) {
  if (!igsids.length) return 0;
  const { token } = await acesso();
  const modoFacebook = instagramConfig().modo === 'facebook';
  let completos = 0;
  for (const igsid of [...new Set(igsids)].slice(0, 20)) {
    try {
      const url = new URL(`${base()}/${igsid}`);
      url.searchParams.set('fields', modoFacebook ? 'name,username,profile_pic' : 'name,username,profile_pic');
      const perfil = await metaRequest(modoFacebook ? comToken(url, token) : url, modoFacebook ? {} : { headers: { Authorization: `Bearer ${token}` } }, fetcher);
      await instagramDb().prepare('UPDATE instagram_chat_contatos SET nome = ?, username = CASE WHEN ? <> \'\' THEN ? ELSE username END, foto = ? WHERE igsid = ?')
        .run(texto(perfil.name, 120), texto(perfil.username, 60), texto(perfil.username, 60), texto(perfil.profile_pic, 2000), igsid);
      completos++;
    } catch { /* perfil indisponível (privacidade da conta): fica o @ ou o ID */ }
  }
  return completos;
}

/** Histórico do Direct pela API de conversas (todas as conversas da conta, até 50 mensagens cada). Entra como lido. */
export async function sincronizarHistorico(fetcher: typeof fetch = fetch, maxPaginas = 20) {
  const { conexao, token } = await acesso();
  const config = instagramConfig(), conta = conexao.account_id;
  const campos = 'participants,updated_time,messages.limit(50){id,message,from,to,created_time,attachments{image_data,video_data,file_url,mime_type,name}}';
  let url: URL | null = new URL(`${base()}/${dono(conta)}/conversations`);
  url.search = new URLSearchParams({ platform: 'instagram', fields: campos, limit: '25' }).toString();
  let conversas = 0, mensagens = 0, paginas = 0;
  const semPerfil: string[] = [];
  while (url && paginas < maxPaginas) {
    const resposta: Json = await metaRequest(config.modo === 'facebook' ? comToken(url, token) : url, config.modo === 'facebook' ? {} : { headers: { Authorization: `Bearer ${token}` } }, fetcher);
    for (const c of lista(resposta.data).map(objeto)) {
      const outro = lista(objeto(c.participants).data).map(objeto).find((p) => texto(p.id, 40) !== conta && ehId(texto(p.id, 40)));
      if (!outro) continue;
      const igsid = texto(outro.id, 40), username = texto(outro.username, 60);
      conversas++;
      for (const m of lista(objeto(c.messages).data).map(objeto)) {
        const de = texto(objeto(m.from).id, 40), criado = Date.parse(texto(m.created_time, 40));
        if (!texto(m.id, 300) || !Number.isFinite(criado)) continue;
        if (await gravarMensagem({ id: texto(m.id, 300), igsid, account: conta, direcao: de === conta ? 'saida' : 'entrada', texto: texto(m.message), anexos: anexosDe(m.attachments), criado, lida: true, status: de === conta ? 'enviada' : 'recebida', username })) mensagens++;
      }
      if (!username) semPerfil.push(igsid);
    }
    const proxima = texto(objeto(resposta.paging).next, 4000);
    url = proxima ? new URL(proxima) : null;
    paginas++;
  }
  // Sem @ na conversa: busca o perfil. Contatos sem nome também.
  const semNome = (await instagramDb().prepare("SELECT igsid FROM instagram_chat_contatos WHERE nome = '' LIMIT 20").all() as Array<{ igsid: string }>).map((r) => r.igsid);
  await completarPerfis([...semPerfil, ...semNome], fetcher);
  return { conversas, mensagens };
}

type LinhaConversa = { igsid: string; nome: string; username: string; foto: string; ultima_entrada: number | null; ultimo_texto: string | null; ultimo_tipo: string | null; ultima_direcao: string | null; ultimo_criado: number | null; nao_lidas: number };
export async function listarConversas(): Promise<ConversaInstagram[]> {
  const linhas = await instagramDb().prepare(`SELECT c.igsid, c.nome, c.username, c.foto, c.ultima_entrada,
      (SELECT texto FROM instagram_chat_mensagens m WHERE m.igsid = c.igsid ORDER BY criado DESC, id DESC LIMIT 1) AS ultimo_texto,
      (SELECT tipo FROM instagram_chat_mensagens m WHERE m.igsid = c.igsid ORDER BY criado DESC, id DESC LIMIT 1) AS ultimo_tipo,
      (SELECT direcao FROM instagram_chat_mensagens m WHERE m.igsid = c.igsid ORDER BY criado DESC, id DESC LIMIT 1) AS ultima_direcao,
      (SELECT criado FROM instagram_chat_mensagens m WHERE m.igsid = c.igsid ORDER BY criado DESC, id DESC LIMIT 1) AS ultimo_criado,
      (SELECT COUNT(*) FROM instagram_chat_mensagens m WHERE m.igsid = c.igsid AND m.direcao = 'entrada' AND m.lida = 0) AS nao_lidas
    FROM instagram_chat_contatos c WHERE EXISTS (SELECT 1 FROM instagram_chat_mensagens m WHERE m.igsid = c.igsid)
    ORDER BY ultimo_criado DESC LIMIT 300`).all() as LinhaConversa[];
  return linhas.map((l) => ({
    igsid: l.igsid, nome: l.nome || (l.username ? `@${l.username}` : 'Conta do Instagram'), username: l.username, foto: l.foto,
    ultimaMensagem: l.ultimo_texto ?? '', ultimoTipo: l.ultimo_tipo ?? 'text', ultimaDirecao: l.ultima_direcao === 'saida' ? 'saida' : l.ultima_direcao === 'entrada' ? 'entrada' : '',
    ultimaEm: l.ultimo_criado ? new Date(Number(l.ultimo_criado)).toISOString() : null, naoLidas: Number(l.nao_lidas) || 0,
    janelaAte: l.ultima_entrada ? new Date(Number(l.ultima_entrada) + DIA).toISOString() : null,
  }));
}

export async function mensagensDe(igsid: string): Promise<MensagemInstagram[]> {
  if (!ehId(igsid)) throw new InstagramError(400, 'Conversa inválida.', 'INVALID_THREAD');
  const linhas = await instagramDb().prepare('SELECT * FROM (SELECT * FROM instagram_chat_mensagens WHERE igsid = ? ORDER BY criado DESC, id DESC LIMIT 300) AS ultimas ORDER BY criado ASC, id ASC').all(igsid) as Array<Record<string, unknown>>;
  return linhas.map((l) => ({ id: String(l.id), igsid, direcao: l.direcao === 'saida' ? 'saida' : 'entrada', tipo: String(l.tipo), texto: String(l.texto ?? ''), anexos: (() => { try { return JSON.parse(String(l.anexos)) as AnexoInstagram[]; } catch { return []; } })(), criadoEm: new Date(Number(l.criado)).toISOString(), status: String(l.status), autor: l.autor ? String(l.autor) : null }));
}

export async function marcarLidas(igsid: string) {
  if (!ehId(igsid)) throw new InstagramError(400, 'Conversa inválida.', 'INVALID_THREAD');
  await instagramDb().prepare("UPDATE instagram_chat_mensagens SET lida = 1 WHERE igsid = ? AND direcao = 'entrada' AND lida = 0").run(igsid);
  return { ok: true };
}

export async function naoLidas() {
  const linha = await instagramDb().prepare("SELECT COUNT(DISTINCT igsid) AS n FROM instagram_chat_mensagens WHERE direcao = 'entrada' AND lida = 0").get() as { n: number } | undefined;
  return Number(linha?.n) || 0;
}

/** Resposta em texto. Dentro de 24 h: resposta comum; até 7 dias: etiqueta HUMAN_AGENT; depois, a Meta não permite. */
export async function enviarTexto(igsid: string, corpo: string, autor: string, fetcher: typeof fetch = fetch, agora = Date.now()) {
  if (!ehId(igsid)) throw new InstagramError(400, 'Conversa inválida.', 'INVALID_THREAD');
  const mensagem = corpo.trim();
  if (!mensagem || mensagem.length > 1000) throw new InstagramError(400, 'A mensagem do Instagram deve ter de 1 a 1000 caracteres.', 'INVALID_TEXT');
  const contato = await instagramDb().prepare('SELECT ultima_entrada FROM instagram_chat_contatos WHERE igsid = ?').get(igsid) as { ultima_entrada: number | null } | undefined;
  const ultima = Number(contato?.ultima_entrada) || 0;
  if (!ultima || agora - ultima > 7 * DIA) throw new InstagramError(409, 'A Meta só permite responder no Direct até 7 dias depois da última mensagem da pessoa. Peça para ela escrever de novo.', 'WINDOW_CLOSED');
  const { conexao, token } = await acesso();
  const config = instagramConfig();
  const payload: Json = { recipient: { id: igsid }, message: { text: mensagem }, ...(agora - ultima > DIA ? { messaging_type: 'MESSAGE_TAG', tag: 'HUMAN_AGENT' } : {}) };
  const resposta = config.modo === 'facebook'
    ? await metaRequest(comToken(new URL(`${base()}/${dono(conexao.account_id)}/messages`), token), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, fetcher)
    : await metaRequest(`${base()}/me/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) }, fetcher);
  const id = texto(resposta.message_id, 300) || `local.${agora}.${Math.random().toString(36).slice(2, 8)}`;
  await gravarMensagem({ id, igsid, account: conexao.account_id, direcao: 'saida', texto: mensagem, anexos: [], criado: agora, lida: true, status: 'enviada', autor });
  return { id };
}
