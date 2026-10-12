import { randomUUID, createHmac, randomBytes, createHash } from 'node:crypto';
import { db, signatureValid, lastWebhookAt, readBytes, diagnostics, listTemplates, WhatsAppError } from '../whatsapp/core.ts';
import { effectiveConfiguration, integrationSettingsSchema } from '../whatsapp/config.ts';
import { storageConfiguration } from '../database.ts';
import { INTEGRATION_CHECKLIST_GROUPS, INTEGRATION_ENDPOINTS } from '../../features/integrations/catalog.ts';
import { managerEmails } from './access.ts';
import { localBootstrapAvailable } from './bootstrap.ts';

const localSchema = `CREATE TABLE IF NOT EXISTS management_checklist (id TEXT PRIMARY KEY, status TEXT NOT NULL, note TEXT NOT NULL, updated INTEGER NOT NULL, actor TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS management_tests (id TEXT PRIMARY KEY, name TEXT NOT NULL, ok INTEGER NOT NULL, summary TEXT NOT NULL, details_json TEXT NOT NULL, created INTEGER NOT NULL, actor TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS management_oauth_states (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, session_hash TEXT NOT NULL, expires INTEGER NOT NULL);`;
export async function managementDb() {
  const database = db();
  database.registerSqliteSchema(integrationSettingsSchema);
  database.registerSqliteSchema(localSchema);
  return database;
}
export type ManagementTest = { id: string; test: string; ok: boolean; summary: string; details: string[]; checkedAt: string };
type TestRow = { id: string; name: string; ok: number; summary: string; details_json: string; created: number };
const testFromRow = (row: TestRow): ManagementTest => ({ id: row.id, test: row.name, ok: Boolean(row.ok), summary: row.summary, details: JSON.parse(row.details_json), checkedAt: new Date(row.created).toISOString() });

export async function recentTests() {
  const database = await managementDb();
  const rows = await database.prepare('SELECT * FROM management_tests ORDER BY created DESC LIMIT 30').all() as TestRow[];
  return rows.map(testFromRow);
}
export async function recordManagementTest(test: string, ok: boolean, summary: string, details: string[], actor: string) {
  const result = { id: randomUUID(), test, ok, summary, details: details.slice(0, 30).map(value => value.slice(0, 500)), checkedAt: new Date().toISOString() };
  const database = await managementDb();
  await database.prepare('INSERT INTO management_tests VALUES (?, ?, ?, ?, ?, ?, ?)').run(result.id, test, ok ? 1 : 0, summary.slice(0, 500), JSON.stringify(result.details), Date.now(), actor);
  await database.prepare('DELETE FROM management_tests WHERE created < ?').run(Date.now() - 90 * 86400000);
  return result;
}

function checklistSteps() { return INTEGRATION_CHECKLIST_GROUPS.flatMap(group => group.steps); }
export async function managementOverview(requestOrigin: string, development = false) {
  const database = await managementDb(), config = await effectiveConfiguration();
  const rows = await database.prepare('SELECT * FROM management_checklist').all() as { id: string; status: string; note: string; updated: number }[];
  const states = new Map(rows.map(row => [row.id, row]));
  const stages = checklistSteps().map(step => {
    const row = states.get(step.id);
    return { ...step, status: row?.status || 'pending', note: row?.note || '', updatedAt: row ? new Date(row.updated).toISOString() : null };
  });
  const base = config.publicBaseUrl || requestOrigin;
  const originConfigured = Boolean(process.env.AUTH_ORIGIN?.startsWith('https://'));
  return { canManage: true, environment: { production: process.env.NODE_ENV === 'production', storage: storageConfiguration(), publicBaseUrl: base, localBootstrapAvailable: localBootstrapAvailable(requestOrigin), managementMode: development ? 'development' : 'session' },
    bootstrap: [
      { key: 'DATABASE_URL', label: 'Banco Supabase', ready: Boolean(process.env.DATABASE_URL), detail: 'Configurado uma vez na hospedagem. A integração é salva neste banco.' },
      { key: 'INTEGRATION_ENCRYPTION_KEY', label: 'Chave de criptografia dos segredos', ready: encryptionConfigured(), detail: 'Chave base64 de 32 bytes no ambiente da hospedagem; não é gravada junto aos segredos.' },
      { key: 'INTEGRATION_MANAGER_EMAILS', label: 'Gestores autorizados', ready: managerEmails().size > 0, detail: 'E-mails autorizados pelo administrador no ambiente da hospedagem.' },
      { key: 'AUTH_ORIGIN', label: 'Origem HTTPS de autenticação', ready: originConfigured, detail: 'Deve corresponder ao domínio publicado do ERP.' },
    ], stages, routes: INTEGRATION_ENDPOINTS.map(route => ({ ...route, label: route.title, auth: route.access, url: `${base}${route.path}` })),
    progress: { complete: stages.filter(stage => stage.status === 'complete').length, total: stages.length }, recentTests: await recentTests(), lastWebhookAt: await lastWebhookAt(),
    oauth: { available: oauthAvailable(config), callbackUrl: `${base}/api/whatsapp/management/oauth/callback`, reason: 'O login opcional exige app Meta com Facebook Login habilitado, URI cadastrada, permissões concedidas e META_OAUTH_ENABLED=true na hospedagem.' } };
}
export function encryptionConfigured() {
  const value = process.env.INTEGRATION_ENCRYPTION_KEY || '';
  return /^[A-Za-z0-9+/]{43}=$/.test(value) && Buffer.from(value, 'base64').length === 32;
}
export async function saveChecklist(input: Record<string, unknown>, actor: string) {
  const id = typeof input.id === 'string' ? input.id : '';
  const status = String(input.status), note = typeof input.note === 'string' ? input.note.trim() : '';
  if (!checklistSteps().some(step => step.id === id) || !['pending', 'in_progress', 'complete', 'blocked'].includes(status) || note.length > 1000) throw new WhatsAppError(400, 'Informe uma etapa, situação e observação de até 1000 caracteres.', 'INVALID_CHECKLIST');
  if (status === 'complete' && note.length < 5) throw new WhatsAppError(400, 'Registre a evidência de conclusão da etapa.', 'EVIDENCE_REQUIRED');
  const database = await managementDb();
  await database.prepare('INSERT INTO management_checklist VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET status = excluded.status, note = excluded.note, updated = excluded.updated, actor = excluded.actor').run(id, status, note, Date.now(), actor);
  return { id, status, note, updatedAt: new Date().toISOString() };
}

export async function managementEvents() {
  const database = await managementDb();
  const tests = await database.prepare('SELECT * FROM management_tests ORDER BY created DESC LIMIT 60').all() as TestRow[];
  const audit = await database.prepare('SELECT id, action, created FROM integration_audit ORDER BY created DESC LIMIT 60').all() as { id: string; action: string; created: number }[];
  return { events: [...tests.map(row => ({ id: row.id, kind: row.name, level: row.ok ? 'success' : 'error', message: row.summary, createdAt: new Date(row.created).toISOString() })),
    ...audit.map(row => ({ id: row.id, kind: 'configuration', level: 'info', message: `Configuração atualizada: ${row.action}`, createdAt: new Date(row.created).toISOString() }))].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 80) };
}

async function debugToken(fetcher: typeof fetch = fetch) {
  const config = await effectiveConfiguration();
  if (!config.appId || !config.appSecret || !config.accessToken || !config.apiVersion) throw new WhatsAppError(503, 'Configure App ID, App Secret, token de acesso e versão Graph para inspecionar o token.', 'TOKEN_INSPECTION_NOT_CONFIGURED');
  const url = new URL(`https://graph.facebook.com/${config.apiVersion}/debug_token`);
  url.searchParams.set('input_token', config.accessToken);
  let response: Response;
  try { response = await fetcher(url.toString(), { headers: { Authorization: `Bearer ${config.appId}|${config.appSecret}` }, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000) }); }
  catch { throw new WhatsAppError(502, 'A Meta não respondeu à inspeção do token.', 'META_UNAVAILABLE'); }
  let body: Record<string, unknown>;
  try { body = JSON.parse((await readBytes(response, 128 * 1024)).toString('utf8')); } catch { throw new WhatsAppError(502, 'Resposta de inspeção inválida.', 'META_INVALID_RESPONSE'); }
  if (!response.ok || body.error) throw new WhatsAppError(502, 'A Meta recusou a inspeção. Confira o App ID e o App Secret do aplicativo que emitiu o token.', 'META_REJECTED');
  const data = body.data && typeof body.data === 'object' ? body.data as Record<string, unknown> : {};
  const scopes = Array.isArray(data.scopes) ? data.scopes.filter((value): value is string => typeof value === 'string' && /^[a-z_]{1,100}$/.test(value)).slice(0, 30) : [];
  const expectedScopes = ['whatsapp_business_messaging', 'whatsapp_business_management'];
  const expires = Number(data.expires_at), dataExpires = Number(data.data_access_expires_at);
  const date = (value: number) => Number.isSafeInteger(value) && value > 0 && value <= 253402300799 ? new Date(value * 1000).toISOString() : null;
  return { valid: data.is_valid === true, appMatches: String(data.app_id) === config.appId, type: typeof data.type === 'string' ? data.type.slice(0, 40) : 'Não informado', scopes,
    missingScopes: expectedScopes.filter(scope => !scopes.includes(scope)), expiresAt: date(expires), dataAccessExpiresAt: date(dataExpires) };
}
export { debugToken };

export async function runManagementTest(test: unknown, actor: string, requestOrigin: string, fetcher: typeof fetch = fetch) {
  if (!['database', 'webhook', 'public-routes', 'meta', 'templates', 'token', 'retention'].includes(String(test))) throw new WhatsAppError(400, 'Selecione um teste disponível no painel.', 'INVALID_TEST');
  let ok = false, summary = '', details: string[] = [];
  try {
    const config = await effectiveConfiguration();
    if (test === 'database') {
      const database = await managementDb(), id = randomUUID();
      await database.transaction(async () => { await database.prepare("INSERT INTO management_tests VALUES (?, 'database-probe', 1, 'probe', '[]', ?, ?)").run(id, Date.now(), actor); const saved = await database.prepare('SELECT id FROM management_tests WHERE id = ?').get(id); if (!saved) throw new Error(); await database.prepare('DELETE FROM management_tests WHERE id = ?').run(id); });
      ok = true; summary = 'Leitura, escrita e transação no banco confirmadas.'; details = [storageConfiguration().backend === 'postgres' ? 'Driver PostgreSQL ativo.' : 'SQLite local ativo; confirme Supabase antes de publicar.'];
    } else if (test === 'webhook') {
      if (config.appSecret.length < 16 || config.verifyToken.length < 16) throw new WhatsAppError(503, 'Configure App Secret e token de verificação antes deste teste.', 'NOT_CONFIGURED');
      const raw = Buffer.from(JSON.stringify({ object: 'whatsapp_business_account', verification: randomBytes(12).toString('hex') }));
      const signature = `sha256=${createHmac('sha256', config.appSecret).update(raw).digest('hex')}`;
      ok = signatureValid(raw, signature, config.appSecret) && !signatureValid(Buffer.from('tampered'), signature, config.appSecret);
      summary = 'Assinatura válida aceita e alteração do conteúdo rejeitada.'; details = ['Teste criptográfico local. Não injeta conversas nem confirma entrega da Meta.', `Último evento recebido: ${await lastWebhookAt() || 'ainda não recebido'}.`];
    } else if (test === 'public-routes') {
      const base = config.publicBaseUrl || requestOrigin, url = new URL(base);
      const trusted = process.env.AUTH_ORIGIN ? new URL(process.env.AUTH_ORIGIN).origin : requestOrigin;
      if (url.origin !== trusted) throw new WhatsAppError(400, 'A URL pública e AUTH_ORIGIN precisam corresponder para verificar as páginas deste ambiente.', 'PUBLIC_ORIGIN_MISMATCH');
      const paths = ['/politicas', '/privacidade', '/termos', '/exclusao-de-dados', '/cookies', '/politica-de-comunicacao'];
      const responses = await Promise.all(paths.map(async path => { const response = await fetcher(`${base}${path}`, { redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(8000) }); await response.body?.cancel(); return { path, status: response.status }; }));
      ok = responses.every(response => response.status === 200); summary = ok ? 'Todas as políticas responderam HTTP 200 sem sessão.' : 'Uma ou mais políticas não responderam HTTP 200 sem sessão.'; details = responses.map(response => `${response.path}: HTTP ${response.status}`);
    } else if (test === 'meta') {
      const result = await diagnostics(fetcher); ok = true; summary = 'A Meta confirmou acesso ao número e à conta WhatsApp.'; details = [`Número: ${result.phoneNumber.displayPhoneNumber || 'não informado'}`, `Aplicativos inscritos: ${result.subscriptions.length}.`, ...result.subscriptions.slice(0, 20).map(app => `App ${app.id || 'ID não informado'}: ${app.name || 'nome não informado'}`), config.appId && result.subscriptions.some(app => app.id === config.appId) ? 'O App ID configurado aparece na lista de inscrição consultada.' : 'O App ID configurado não aparece na lista consultada; confira a inscrição e a configuração do aplicativo.'];
    } else if (test === 'templates') {
      const result = await listTemplates(fetcher), approved = result.templates.filter(template => template.status === 'APPROVED'); ok = true; summary = `Consulta confirmada: ${approved.length} modelos aprovados.`; details = [`Total consultado: ${result.templates.length}.`, result.truncated ? 'A consulta atingiu o limite de páginas; refine no WhatsApp Manager.' : 'Paginação concluída.'];
    } else if (test === 'token') {
      const result = await debugToken(fetcher); ok = result.valid && result.appMatches && result.missingScopes.length === 0; summary = ok ? 'Token válido, do aplicativo correto e com as permissões necessárias.' : 'O token precisa de revisão de validade, aplicativo ou permissões.'; details = [`Tipo: ${result.type}`, `Permissões: ${result.scopes.join(', ') || 'nenhuma informada'}`, `Expiração: ${result.expiresAt || 'não informada pelo endpoint; isso não garante validade permanente'}`, ...result.missingScopes.map(scope => `Permissão ausente: ${scope}`)];
    } else {
      const days = config.retentionDays, database = db();
      const row = await database.prepare('SELECT COUNT(*) AS count FROM messages WHERE created < ?').get(Date.now() - days * 86400000) as { count: number };
      ok = true; summary = `Prévia de retenção: ${row.count} mensagens anteriores ao prazo.`; details = [`Prazo: ${days} dias.`, 'A prévia não elimina dados. A rotina de manutenção e as decisões de conservação precisam estar estabelecidas.'];
    }
  } catch (error) { summary = error instanceof WhatsAppError ? error.message : 'O teste não foi concluído. Confira a configuração, as migrações e o acesso ao serviço.'; }
  return recordManagementTest(String(test), ok, summary, details, actor);
}

export function oauthAvailable(config: { appId?: string; appSecret: string; apiVersion: string; publicBaseUrl: string }) {
  return process.env.META_OAUTH_ENABLED === 'true' && encryptionConfigured() && Boolean(config.appId && config.appSecret.length >= 16 && /^v\d{2,3}\.0$/.test(config.apiVersion) && config.publicBaseUrl && config.publicBaseUrl === process.env.AUTH_ORIGIN);
}
export const tokenDigest = (value: string) => createHash('sha256').update(value).digest('hex');
export async function createOAuthState(userId: string, sessionToken: string) {
  const state = randomBytes(32).toString('hex'), database = await managementDb();
  await database.prepare('DELETE FROM management_oauth_states WHERE expires < ?').run(Date.now());
  await database.prepare('INSERT INTO management_oauth_states VALUES (?, ?, ?, ?)').run(tokenDigest(state), userId, tokenDigest(sessionToken), Date.now() + 10 * 60 * 1000);
  return state;
}
export async function consumeOAuthState(state: string, userId: string, sessionToken: string) {
  if (!/^[a-f0-9]{64}$/.test(state)) return false;
  const database = await managementDb();
  const row = await database.prepare('DELETE FROM management_oauth_states WHERE hash = ? AND user_id = ? AND session_hash = ? AND expires > ? RETURNING hash').get(tokenDigest(state), userId, tokenDigest(sessionToken), Date.now());
  return Boolean(row);
}
