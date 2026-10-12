import { randomUUID } from 'node:crypto';
import { databaseFor } from '../database.ts';
import type { Lead, LeadDetails, ChatMessage, ConversationStatus, HistoryEvent, Attachment, Person } from '../../features/leads/types.ts';
import type { Preferences } from '../../features/settings/types.ts';
import { ERP_RESOURCES, RESOURCE_DEFINITIONS, type ERPActor, type ERPResource, type ERPRecord, type FunnelDTO, type LeadsSnapshot, type LeadDTO, type WorkspaceSnapshot, type QuoteItem, type ERPPage } from './types.ts';

export class ERPError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code = 'ERP_ERROR') { super(message); this.status=status; this.code=code; }
}
type Json = Record<string, unknown>;
type Row = Record<string, unknown>;
export const erpSchema = `PRAGMA journal_mode = DELETE; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA secure_delete = ON;
CREATE TABLE IF NOT EXISTS workspace_settings (id TEXT PRIMARY KEY, data_json TEXT NOT NULL, revision INTEGER NOT NULL, updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS funnels (id TEXT PRIMARY KEY, data_json TEXT NOT NULL, revision INTEGER NOT NULL, position INTEGER NOT NULL, updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, funnel_id TEXT NOT NULL REFERENCES funnels(id), stage TEXT NOT NULL, data_json TEXT NOT NULL, details_json TEXT NOT NULL, status TEXT NOT NULL, revision INTEGER NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL, archived_at INTEGER);
CREATE INDEX IF NOT EXISTS leads_active_updated ON leads(archived_at, updated);
CREATE TABLE IF NOT EXISTS lead_notes (id TEXT PRIMARY KEY, lead_id TEXT NOT NULL REFERENCES leads(id), actor TEXT NOT NULL, author_name TEXT NOT NULL, text TEXT NOT NULL, attachment_ids_json TEXT NOT NULL, created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS lead_notes_lead_created ON lead_notes(lead_id, created);
CREATE TABLE IF NOT EXISTS lead_attachments (id TEXT PRIMARY KEY, lead_id TEXT NOT NULL REFERENCES leads(id), name TEXT NOT NULL, size INTEGER NOT NULL, mime_type TEXT NOT NULL, created INTEGER NOT NULL, duration REAL, content BLOB NOT NULL);
CREATE INDEX IF NOT EXISTS lead_attachments_lead ON lead_attachments(lead_id, created);
CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, resource TEXT NOT NULL, data_json TEXT NOT NULL, lead_id TEXT NOT NULL DEFAULT '', parent_id TEXT NOT NULL DEFAULT '', revision INTEGER NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL, archived_at INTEGER);
CREATE INDEX IF NOT EXISTS records_resource_active ON records(resource,archived_at,created);
CREATE INDEX IF NOT EXISTS records_parent ON records(parent_id);
CREATE INDEX IF NOT EXISTS records_lead ON records(lead_id);
CREATE TABLE IF NOT EXISTS erp_audit (id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, resource TEXT NOT NULL, record_id TEXT NOT NULL, created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS erp_audit_created ON erp_audit(created);
`;
export function erpDB() { return databaseFor('erp', process.env.ERP_DB_PATH || '.data/erp.sqlite', erpSchema); }
export const erpDb = erpDB;
export function jsonObject(value: unknown, label = 'Dados'): Json {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new ERPError(400, `${label}: informe um objeto válido.`, 'INVALID_INPUT');
  return value as Json;
}
function whitelist(value: Json, names: readonly string[]) {
  if (Object.keys(value).some(key => !names.includes(key))) throw new ERPError(400, 'Um ou mais campos não são permitidos nesta operação.', 'UNKNOWN_FIELD');
}
export function revision(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) < 1) throw new ERPError(400, 'Informe a versão atual do registro.', 'REVISION_REQUIRED');
  return Number(value);
}
function conflict() { return new ERPError(409, 'Este registro foi alterado por outra pessoa. Atualize a página e tente novamente.', 'REVISION_CONFLICT'); }
function text(value: unknown, label: string, maximum = 300, required = false) {
  if (typeof value !== 'string' || value.length > maximum || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new ERPError(400, `${label}: texto inválido (máximo de ${maximum} caracteres).`, 'INVALID_INPUT');
  const result = value.trim();
  if (required && !result) throw new ERPError(400, `${label} é obrigatório.`, 'INVALID_INPUT');
  return result;
}
function number(value: unknown, label: string, decimals = 2, maximum = 1_000_000_000, positive = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > maximum || (positive && value <= 0) || Math.abs(Math.round(value * 10 ** decimals) - value * 10 ** decimals) > 0.00001) throw new ERPError(400, `${label}: informe um número ${positive ? 'positivo' : 'não negativo'} com até ${decimals} casas decimais.`, 'INVALID_NUMBER');
  return value;
}
function date(value: unknown, label: string, required = false, datetime = false) {
  const result = text(value, label, 40, required);
  if (!result) return '';
  if (datetime) {
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(result) || !Number.isFinite(Date.parse(result))) throw new ERPError(400, `${label}: informe data e hora com fuso horário.`, 'INVALID_DATE');
    date(result.slice(0,10),label,true);
    return new Date(result).toISOString();
  }
  if (!/^\d{4}-\d\d-\d\d$/.test(result) || !Number.isFinite(Date.parse(`${result}T00:00:00Z`)) || new Date(`${result}T00:00:00Z`).toISOString().slice(0,10) !== result) throw new ERPError(400, `${label}: data inválida.`, 'INVALID_DATE');
  return result;
}
function identifier(value: unknown, label = 'Identificador', required = true) {
  const result = text(value, label, 100, required);
  if (result && !/^[a-zA-Z0-9_-]+$/.test(result)) throw new ERPError(400, `${label}: identificador inválido.`, 'INVALID_ID');
  return result;
}
function url(value: unknown, label: string) {
  const raw = text(value,label,2000); if (!raw) return '';
  try { const parsed = new URL(raw); if (!['https:','http:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error(); return parsed.toString(); }
  catch { throw new ERPError(400, `${label}: informe uma URL HTTP ou HTTPS válida.`, 'INVALID_URL'); }
}
const decode = <T>(value: unknown): T => JSON.parse(String(value)) as T;
const iso = (value: unknown) => new Date(Number(value)).toISOString();
type ArchiveFilter = boolean|'only';
export function archiveFilterFromURL(url: URL): ArchiveFilter {
  const value=url.searchParams.get('archived');
  if (value===null || value==='false') return false;
  if (value==='true' || value==='all') return true;
  if (value==='only') return 'only';
  throw new ERPError(400,'Filtro archived deve ser false, true, all ou only.','INVALID_FILTER');
}
export function pageFromURL(url: URL): ERPPage|undefined {
  const limitValue=url.searchParams.get('limit'),offsetValue=url.searchParams.get('offset');
  if (limitValue===null) { if (offsetValue!==null) throw new ERPError(400,'Informe limit ao utilizar offset.','INVALID_PAGINATION'); return undefined; }
  if (!/^\d+$/.test(limitValue) || (offsetValue!==null && !/^\d+$/.test(offsetValue))) throw new ERPError(400,'Paginação inválida.','INVALID_PAGINATION');
  return validatePage({limit:Number(limitValue),offset:Number(offsetValue ?? 0)});
}
export function reportPeriodFromURL(url: URL): {from:string;until:string}|undefined {
  const from=url.searchParams.get('from'),until=url.searchParams.get('until');
  if (from===null && until===null) return undefined;
  if (from===null || until===null) throw new ERPError(400,'Informe from e until juntos para filtrar o período financeiro.','INVALID_REPORT_PERIOD');
  const validatedFrom=date(from,'Início do período',true),validatedUntil=date(until,'Fim do período',true);
  if (validatedFrom>validatedUntil) throw new ERPError(400,'O início do período deve ocorrer antes do fim.','INVALID_REPORT_PERIOD');
  return {from:validatedFrom,until:validatedUntil};
}
function validatePage(page: ERPPage) {
  if (!Number.isSafeInteger(page.limit) || page.limit<1 || page.limit>500 || !Number.isSafeInteger(page.offset) || page.offset<0 || page.offset>1_000_000) throw new ERPError(400,'Limit deve ser entre 1 e 500; offset entre 0 e 1000000.','INVALID_PAGINATION');
  return page;
}
const archiveWhere = (filter: ArchiveFilter) => filter===true ? '' : filter==='only' ? 'archived_at IS NOT NULL' : 'archived_at IS NULL';
const tones = ['blue','lavender','peach','rose','green','yellow','teal','neutral'];
const icons = ['Vendas','Dinheiro','Sacola','Acordo','Meta','Divulgação','Retorno','Clientes','Conquista','Em espera','Vestido','Tesoura','Agulha','Medidas','Cores','Fotos','Joia','Presente','Coração','Brinde','Coroa','Formatura','Bebê','Bolo','Flor','Borboleta','Brilho','Estrela'];
export const initialPreferences: Preferences = {
  workspaceName:'Ateliê Milena Kerbage',businessPhone:'',businessEmail:'milenakerbageatelie@gmail.com',city:'Fortaleza, CE',timeZone:'America/Sao_Paulo',weekStart:'sunday',openingTime:'09:00',closingTime:'18:00',saturday:true,enterSends:true,signMessages:false,awayMessage:false,awayText:'',staleLeadDays:3,autoAssign:false,notifyNewLead:true,notifyNewMessage:true,notifyStaleLead:true,dailySummary:false,
};
const initialFunnels: Omit<FunnelDTO,'revision'|'position'>[] = [
 {id:'vendas',name:'Vendas',icon:'Vendas',tone:'green',stages:[{id:'novo',label:'Novo lead',tone:'blue'},{id:'contato',label:'Em contato',tone:'lavender'},{id:'orcamento',label:'Orçamento',tone:'peach'},{id:'negociacao',label:'Negociação',tone:'rose'},{id:'fechado',label:'Fechado',tone:'green'}]},
 {id:'clientes',name:'Clientes',icon:'Vestido',tone:'rose',stages:[{id:'confirmado',label:'Pedido confirmado',tone:'blue'},{id:'provas',label:'Em provas',tone:'lavender'},{id:'ajustes',label:'Ajustes',tone:'peach'},{id:'pronto',label:'Pronto para retirar',tone:'teal'},{id:'entregue',label:'Entregue',tone:'green'}]},
 {id:'remarketing',name:'Remarketing',icon:'Retorno',tone:'lavender',stages:[{id:'reativar',label:'Para reativar',tone:'neutral'},{id:'contato',label:'Contato feito',tone:'lavender'},{id:'interesse',label:'Com interesse',tone:'peach'},{id:'recuperado',label:'Recuperado',tone:'green'}]},
];
export async function lockErpCore() { if (erpDB().backend === 'postgres') await erpDB().prepare('SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(?, 0))').get('erp-core-mutations'); }
const lock=lockErpCore;
export async function initializeERP() {
  const database = erpDB();
  await database.transaction(async () => {
    await lock();
    const result = await database.prepare('INSERT INTO workspace_settings (id,data_json,revision,updated) VALUES (?, ?, 1, ?) ON CONFLICT(id) DO NOTHING').run('workspace', JSON.stringify(initialPreferences), Date.now());
    if (Number(result.changes)) for (const [position,funnel] of initialFunnels.entries()) await database.prepare('INSERT INTO funnels VALUES (?, ?, 1, ?, ?) ON CONFLICT(id) DO NOTHING').run(funnel.id,JSON.stringify(funnel),position,Date.now());
  });
}
async function audit(actor: ERPActor, action: string, resource: string, id: string) {
  await erpDB().prepare('INSERT INTO erp_audit VALUES (?, ?, ?, ?, ?, ?)').run(randomUUID(),actor.id,action,resource,id,Date.now());
}
async function mutate<T>(action: () => Promise<T>) { await initializeERP(); return erpDB().transaction(async () => { await lock(); return action(); }); }
async function bumpWorkspace() { await erpDB().prepare('UPDATE workspace_settings SET revision = revision + 1, updated = ? WHERE id = ?').run(Date.now(),'workspace'); return (await erpDB().prepare('SELECT revision FROM workspace_settings WHERE id = ?').get('workspace'))!.revision as number; }
function funnelDTO(row: Row): FunnelDTO { return {...decode<Omit<FunnelDTO,'revision'|'position'>>(row.data_json),revision:Number(row.revision),position:Number(row.position)}; }
async function requireFunnel(id: string) { const row = await erpDB().prepare('SELECT * FROM funnels WHERE id = ?').get(identifier(id)); if (!row) throw new ERPError(404,'Funil não encontrado.','NOT_FOUND'); return funnelDTO(row); }
export async function workspaceSnapshot(): Promise<WorkspaceSnapshot> {
  await initializeERP();
  return erpDB().transaction(async () => {
    const row = await erpDB().prepare('SELECT * FROM workspace_settings WHERE id = ?').get('workspace');
    return {funnels:(await erpDB().prepare('SELECT * FROM funnels ORDER BY position,id').all()).map(funnelDTO),preferences:decode<Preferences>(row!.data_json),revision:Number(row!.revision)};
  });
}
export async function getFunnel(id: string) { await initializeERP(); return {funnel:await requireFunnel(id)}; }
function validatePreferences(input: Json, current: Preferences): Preferences {
  whitelist(input,Object.keys(initialPreferences)); const result = {...current};
  for (const [key,value] of Object.entries(input)) {
    if (typeof initialPreferences[key as keyof Preferences] === 'boolean') { if (typeof value !== 'boolean') throw new ERPError(400,'Preferência deve ser verdadeiro ou falso.','INVALID_INPUT'); Object.assign(result,{[key]:value}); }
    else if (key === 'staleLeadDays') Object.assign(result,{[key]:number(value,'Dias para lead parado',0,365,true)});
    else { const parsed = text(value,key,key === 'awayText' ? 2000 : 200,key === 'workspaceName'); Object.assign(result,{[key]:parsed}); }
  }
  if (result.businessPhone && !/^\+?[1-9][0-9]{7,14}$/.test(result.businessPhone)) throw new ERPError(400,'Telefone comercial inválido.','INVALID_PHONE');
  if (result.businessEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.businessEmail)) throw new ERPError(400,'E-mail comercial inválido.','INVALID_EMAIL');
  if (!['sunday','monday'].includes(result.weekStart)) throw new ERPError(400,'Dia inicial da semana inválido.','INVALID_INPUT');
  for (const time of [result.openingTime,result.closingTime]) if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new ERPError(400,'Informe horário no formato HH:MM.','INVALID_INPUT');
  if (result.openingTime >= result.closingTime) throw new ERPError(400,'O fechamento deve ocorrer após a abertura.','INVALID_INPUT');
  try { new Intl.DateTimeFormat('pt-BR',{timeZone:result.timeZone}); } catch { throw new ERPError(400,'Fuso horário inválido.','INVALID_INPUT'); }
  return result;
}
export async function updatePreferences(inputValue: unknown, actor: ERPActor) {
  const input = jsonObject(inputValue); whitelist(input,['revision','preferences']); const expected = revision(input.revision);
  return mutate(async () => {
    const row = (await erpDB().prepare('SELECT * FROM workspace_settings WHERE id = ?').get('workspace'))!;
    if (Number(row.revision) !== expected) throw conflict();
    const preferences = validatePreferences(jsonObject(input.preferences),decode<Preferences>(row.data_json));
    await erpDB().prepare('UPDATE workspace_settings SET data_json = ?, revision = revision + 1, updated = ? WHERE id = ? AND revision = ?').run(JSON.stringify(preferences),Date.now(),'workspace',expected);
    await audit(actor,'updated','preferences','workspace'); return {preferences,revision:expected+1};
  });
}
function validateFunnel(input: Json, current?: FunnelDTO) {
  whitelist(input,['id','name','icon','tone','stages']);
  const merged = {...current,...input};
  const name = text(merged.name,'Nome do funil',100,true), icon = text(merged.icon ?? 'Vendas','Ícone',50,true), tone = String(merged.tone ?? 'neutral');
  if (!icons.includes(icon) || !tones.includes(tone)) throw new ERPError(400,'Ícone ou cor de funil inválido.','INVALID_INPUT');
  const stagesInput = merged.stages ?? [{id:'novo',label:'Novo lead',tone:'blue'},{id:'contato',label:'Em contato',tone:'lavender'},{id:'fechado',label:'Fechado',tone:'green'}];
  if (!Array.isArray(stagesInput) || stagesInput.length < 1 || stagesInput.length > 30) throw new ERPError(400,'O funil deve ter entre 1 e 30 etapas.','INVALID_INPUT');
  const stages = stagesInput.map(value => {
    const stage = jsonObject(value,'Etapa'); whitelist(stage,['id','label','tone']);
    const id = identifier(stage.id,'ID da etapa'), label = text(stage.label,'Nome da etapa',100,true), stageTone = String(stage.tone ?? 'neutral');
    if (!tones.includes(stageTone)) throw new ERPError(400,'Cor da etapa inválida.','INVALID_INPUT'); return {id,label,tone:stageTone as FunnelDTO['tone']};
  });
  if (new Set(stages.map(stage => stage.id)).size !== stages.length) throw new ERPError(400,'As etapas precisam ter IDs únicos.','DUPLICATE_STAGE');
  return {name,icon,tone:tone as FunnelDTO['tone'],stages};
}
export async function createFunnel(inputValue: unknown, actor: ERPActor) {
  const input = jsonObject(inputValue); whitelist(input,['funnel']); const fields = jsonObject(input.funnel);
  const validated = validateFunnel(fields); const id = fields.id ? identifier(fields.id) : `funil-${randomUUID()}`;
  return mutate(async () => {
    if (await erpDB().prepare('SELECT id FROM funnels WHERE id = ?').get(id)) throw new ERPError(409,'Já existe um funil com esse identificador.','DUPLICATE_ID');
    const all = await erpDB().prepare('SELECT id FROM funnels').all(); if (all.length >= 50) throw new ERPError(409,'Limite de 50 funis atingido.','FUNNEL_LIMIT');
    const funnel = {id,...validated}; const position = Number((await erpDB().prepare('SELECT COALESCE(MAX(position), -1) AS maximum FROM funnels').get())!.maximum) + 1;
    await erpDB().prepare('INSERT INTO funnels VALUES (?, ?, 1, ?, ?)').run(id,JSON.stringify(funnel),position,Date.now());
    const workspaceRevision = await bumpWorkspace(); await audit(actor,'created','funnels',id); return {funnel:{...funnel,revision:1,position},revision:workspaceRevision};
  });
}
export async function updateFunnel(id: string, inputValue: unknown, actor: ERPActor) {
  const input = jsonObject(inputValue); whitelist(input,['revision','funnel']); const expected = revision(input.revision);
  return mutate(async () => {
    const current = await requireFunnel(id); if (current.revision !== expected) throw conflict();
    const patch = jsonObject(input.funnel); if ('id' in patch) throw new ERPError(400,'O ID do funil não pode ser alterado.','IMMUTABLE_FIELD');
    const validated = validateFunnel(patch,current);
    const leads = await erpDB().prepare('SELECT stage FROM leads WHERE funnel_id = ?').all(id);
    if (leads.some(row => !validated.stages.some(stage => stage.id === row.stage))) throw new ERPError(409,'Mova os leads desta etapa antes de removê-la, incluindo os arquivados.','STAGE_IN_USE');
    const funnel = {id,...validated,revision:expected+1,position:current.position};
    await erpDB().prepare('UPDATE funnels SET data_json = ?, revision = revision + 1, updated = ? WHERE id = ? AND revision = ?').run(JSON.stringify({id,...validated}),Date.now(),id,expected);
    const workspaceRevision = await bumpWorkspace(); await audit(actor,'updated','funnels',id); return {funnel,revision:workspaceRevision};
  });
}
export async function deleteFunnel(id: string, expectedValue: unknown, actor: ERPActor) {
  const expected = revision(expectedValue);
  return mutate(async () => {
    const current = await requireFunnel(id); if (current.revision !== expected) throw conflict();
    if (Number((await erpDB().prepare('SELECT COUNT(*) AS count FROM funnels').get())!.count) <= 1) throw new ERPError(409,'Mantenha ao menos um funil.','LAST_FUNNEL');
    if (await erpDB().prepare('SELECT id FROM leads WHERE funnel_id = ? LIMIT 1').get(id)) throw new ERPError(409,'Mova os leads deste funil antes de removê-lo, incluindo os arquivados.','FUNNEL_IN_USE');
    await erpDB().prepare('DELETE FROM funnels WHERE id = ? AND revision = ?').run(id,expected);
    const workspaceRevision = await bumpWorkspace(); await audit(actor,'removed','funnels',id); return {deleted:true,revision:workspaceRevision};
  });
}
export async function reorderFunnels(inputValue: unknown, actor: ERPActor) {
  const input = jsonObject(inputValue); whitelist(input,['revision','ids']); const expected = revision(input.revision);
  if (!Array.isArray(input.ids) || input.ids.some(id => typeof id !== 'string')) throw new ERPError(400,'Informe a lista de funis.','INVALID_INPUT');
  const ids = input.ids as string[];
  return mutate(async () => {
    const workspace = (await erpDB().prepare('SELECT revision FROM workspace_settings WHERE id = ?').get('workspace'))!;
    if (Number(workspace.revision) !== expected) throw conflict();
    const rows = await erpDB().prepare('SELECT * FROM funnels').all();
    if (new Set(ids).size !== rows.length || ids.length !== rows.length || rows.some(row => !ids.includes(String(row.id)))) throw new ERPError(400,'Informe todos os funis uma única vez.','INVALID_ORDER');
    for (const [position,id] of ids.entries()) await erpDB().prepare('UPDATE funnels SET position = ?, revision = revision + 1, updated = ? WHERE id = ?').run(position,Date.now(),id);
    const workspaceRevision = await bumpWorkspace(); await audit(actor,'reordered','funnels','all');
    return {funnels:(await erpDB().prepare('SELECT * FROM funnels ORDER BY position,id').all()).map(funnelDTO),revision:workspaceRevision};
  });
}

function leadDTO(row: Row): LeadDTO { return {...decode<Lead>(row.data_json),revision:Number(row.revision),updatedAt:iso(row.updated),...(row.archived_at ? {archivedAt:iso(row.archived_at)} : {})}; }
async function requireLead(id: string, archived = false) {
  const row = await erpDB().prepare('SELECT * FROM leads WHERE id = ?').get(identifier(id));
  if (!row || (!archived && row.archived_at)) throw new ERPError(404,'Lead não encontrado.','NOT_FOUND'); return row;
}
function event(actor: ERPActor, fields: Omit<HistoryEvent,'id'|'at'|'by'>): HistoryEvent { return {...fields,id:randomUUID(),at:new Date().toISOString(),by:actor.name} as HistoryEvent; }
function validateLead(input: Json, current?: Lead) {
  whitelist(input,['name','phone','budget','funnelId','stage','photoUrl','tags']);
  const merged = {...current,...input}; const name = text(merged.name,'Nome',150,true), rawPhone = text(merged.phone ?? '','Telefone',30,true);
  const phone = rawPhone.replace(/[+()\s.-]/g,''); if (!/^[1-9]\d{7,14}$/.test(phone)) throw new ERPError(400,'Informe o telefone com DDD ou DDI, entre 8 e 15 dígitos.','INVALID_PHONE');
  const budget = number(merged.budget ?? 0,'Orçamento');
  const funnelId = identifier(merged.funnelId ?? 'vendas','Funil'), stage = identifier(merged.stage ?? 'novo','Etapa');
  if (!Array.isArray(merged.tags ?? []) || (merged.tags as unknown[]).length > 20) throw new ERPError(400,'Informe até 20 etiquetas.','INVALID_INPUT');
  const tags = [...new Set(((merged.tags ?? []) as unknown[]).map(tag => text(tag,'Etiqueta',60,true)))];
  let photoUrl: string | null = null;
  if (merged.photoUrl !== undefined && merged.photoUrl !== null) photoUrl = url(merged.photoUrl,'Foto');
  return {name,phone,budget,funnelId,stage,tags,photoUrl};
}
function owner(value: unknown): Person { const input = jsonObject(value,'Responsável'); whitelist(input,['name','seed','avatarUrl']); const person: Person = {name:text(input.name,'Nome do responsável',150,true),seed:identifier(input.seed,'Responsável')}; if (input.avatarUrl) person.avatarUrl=typeof input.avatarUrl==='string' && /^\/api\/erp\/profile\/photo\?userId=[A-Za-z0-9_-]+$/.test(input.avatarUrl) ? input.avatarUrl : url(input.avatarUrl,'Foto do responsável'); return person; }
function validateDetails(input: Json, current: LeadDetails): LeadDetails {
  whitelist(input,['email','instagram','city','eventType','eventDate','owner','source','links','campaign']);
  const result = {...current};
  for (const [key,value] of Object.entries(input)) {
    if (key === 'owner') result.owner = owner(value);
    else if (key === 'eventDate') result.eventDate = date(value,'Data do evento');
    else if (key === 'links') {
      if (!Array.isArray(value) || value.length > 20) throw new ERPError(400,'Informe até 20 links.','INVALID_INPUT');
      result.links = value.map(item => { const link=jsonObject(item); whitelist(link,['label','url']); return {label:text(link.label,'Nome do link',100,true),url:url(link.url,'Link')}; });
    } else if (key === 'campaign') {
      const campaign = jsonObject(value); whitelist(campaign,['utmSource','utmMedium','utmCampaign','utmContent','utmTerm','landingPage','referrer','ad','device','firstVisitAt']);
      result.campaign = Object.fromEntries(Object.entries(campaign).map(([field,content]) => [field,['landingPage','referrer'].includes(field) ? url(content,field) : field === 'firstVisitAt' ? date(content,field,false,true) : text(content,field,300)]));
    } else Object.assign(result,{[key]:text(value,key,key === 'source' ? 300 : 150)});
  }
  if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw new ERPError(400,'E-mail inválido.','INVALID_EMAIL');
  return result;
}
async function validateLeadStage(fields: Pick<Lead,'funnelId'|'stage'>) { const funnel = await requireFunnel(fields.funnelId); if (!funnel.stages.some(stage => stage.id === fields.stage)) throw new ERPError(400,'A etapa não pertence ao funil selecionado.','INVALID_STAGE'); }
export async function createLead(inputValue: unknown, actor: ERPActor) {
  const input = jsonObject(inputValue); whitelist(input,['lead','details']); const fields = validateLead(jsonObject(input.lead));
  const baseDetails: LeadDetails = {owner:{name:actor.name,seed:actor.id},source:'Cadastro manual',links:[],attachments:[],history:[]};
  const details = validateDetails(input.details === undefined ? {} : jsonObject(input.details),baseDetails);
  return mutate(async () => {
    await validateLeadStage(fields); const id=randomUUID(),now=Date.now();
    const lead: Lead = {id,...fields,createdAt:iso(now)};
    details.history=[event(actor,{type:'created',source:details.source} as Omit<HistoryEvent,'id'|'at'|'by'>)];
    await erpDB().prepare('INSERT INTO leads VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, NULL)').run(id,lead.funnelId,lead.stage,JSON.stringify(lead),JSON.stringify(details),'open',now,now);
    await audit(actor,'created','leads',id); return {lead:{...lead,revision:1,updatedAt:iso(now)},details,status:'open' as ConversationStatus};
  });
}
export async function updateLead(id: string, inputValue: unknown, actor: ERPActor) {
  const input = jsonObject(inputValue); whitelist(input,['revision','lead','details','status','restore']); const expected=revision(input.revision);
  if (input.restore !== undefined && input.restore !== true) throw new ERPError(400,'Para restaurar, informe restore=true.','INVALID_INPUT');
  return mutate(async () => {
    const row=await requireLead(id,Boolean(input.restore)); if (Number(row.revision)!==expected) throw conflict();
    const current=decode<Lead>(row.data_json), oldDetails=decode<LeadDetails>(row.details_json);
    const fields = validateLead(input.lead === undefined ? {} : jsonObject(input.lead),current);
    await validateLeadStage(fields);
    const details=validateDetails(input.details === undefined ? {} : jsonObject(input.details),oldDetails);
    const status=input.status === undefined ? String(row.status) : String(input.status);
    if (!['open','progress','resolved'].includes(status)) throw new ERPError(400,'Situação da conversa inválida.','INVALID_STATUS');
    if (current.stage!==fields.stage || current.funnelId!==fields.funnelId) details.history.push(event(actor,{type:'stage',stage:fields.stage} as Omit<HistoryEvent,'id'|'at'|'by'>));
    if (oldDetails.owner.seed!==details.owner.seed) details.history.push(event(actor,{type:'owner',owner:details.owner.name} as Omit<HistoryEvent,'id'|'at'|'by'>));
    if (row.status!==status) details.history.push(event(actor,{type:'status',from:row.status as ConversationStatus,to:status as ConversationStatus} as Omit<HistoryEvent,'id'|'at'|'by'>));
    const lead={...current,...fields},now=Date.now();
    await erpDB().prepare('UPDATE leads SET funnel_id = ?, stage = ?, data_json = ?, details_json = ?, status = ?, revision = revision + 1, updated = ?, archived_at = NULL WHERE id = ? AND revision = ?').run(lead.funnelId,lead.stage,JSON.stringify(lead),JSON.stringify(details),status,now,id,expected);
    await audit(actor,input.restore ? 'restored':'updated','leads',id); return {lead:{...lead,revision:expected+1,updatedAt:iso(now)},details,status:status as ConversationStatus,changed:{stage:current.stage!==fields.stage || current.funnelId!==fields.funnelId,conversationResolved:row.status!==status && status==='resolved'}};
  });
}
export async function archiveLead(id: string, expectedValue: unknown, actor: ERPActor) {
  const expected=revision(expectedValue);
  return mutate(async () => {
    const row=await requireLead(id); if (Number(row.revision)!==expected) throw conflict();
    if (await erpDB().prepare('SELECT id FROM records WHERE lead_id = ? AND archived_at IS NULL LIMIT 1').get(id)) throw new ERPError(409,'Arquive os registros operacionais deste cliente antes de arquivá-lo.','LEAD_IN_USE');
    const now=Date.now(); await erpDB().prepare('UPDATE leads SET archived_at = ?, updated = ?, revision = revision + 1 WHERE id = ? AND revision = ?').run(now,now,id,expected);
    await audit(actor,'archived','leads',id); return {archived:true,revision:expected+1};
  });
}
export async function addNote(id: string, inputValue: unknown, actor: ERPActor) {
  const input=jsonObject(inputValue); whitelist(input,['text','attachmentIds']); const value=text(input.text ?? '','Nota',10_000);
  const attachments=input.attachmentIds ?? [];
  if (!Array.isArray(attachments) || attachments.length > 10 || attachments.some(item => typeof item!=='string')) throw new ERPError(400,'Informe até 10 anexos.','INVALID_INPUT');
  if (!value && !attachments.length) throw new ERPError(400,'Informe a nota ou seus anexos.','EMPTY_NOTE');
  return mutate(async () => {
    await requireLead(id); const attachmentIds=attachments.map(item => identifier(item));
    for (const attachmentId of attachmentIds) if (!await erpDB().prepare('SELECT id FROM lead_attachments WHERE id = ? AND lead_id = ?').get(attachmentId,id)) throw new ERPError(400,'Anexo não encontrado nesta ficha.','INVALID_ATTACHMENT');
    const noteId=randomUUID(),created=Date.now(); await erpDB().prepare('INSERT INTO lead_notes VALUES (?, ?, ?, ?, ?, ?, ?)').run(noteId,id,actor.id,actor.name,value,JSON.stringify(attachmentIds),created);
    await audit(actor,'note_created','leads',id);
    const message: ChatMessage={id:noteId,direction:'out',kind:'note',author:{name:actor.name,seed:actor.id},text:value,at:iso(created)};
    return {message};
  });
}
async function snapshotForRows(rows: Row[], singleId?: string): Promise<LeadsSnapshot> {
    const details: Record<string,LeadDetails>={},messages: Record<string,ChatMessage[]>={},statuses: Record<string,ConversationStatus>={};
    for (const row of rows) { const id=String(row.id); details[id]=decode<LeadDetails>(row.details_json); messages[id]=[]; statuses[id]=row.status as ConversationStatus; }
    if (!rows.length) return {leads:[],details,messages,statuses};
    const selectedIds=singleId ? [singleId] : rows.length<=500 ? rows.map(row=>String(row.id)) : [];
    const subset=selectedIds.length ? `WHERE lead_id IN (${selectedIds.map(()=>'?').join(',')})` : '';
    const attachments=await erpDB().prepare(`SELECT id,lead_id,name,size,mime_type,created,duration FROM lead_attachments ${subset} ORDER BY created,id`).all(...selectedIds);
    const attachmentMap=new Map<string,Attachment>();
    for (const item of attachments) { const id=String(item.lead_id); if (!details[id]) continue; const attachment: Attachment={id:String(item.id),name:String(item.name),size:Number(item.size),type:String(item.mime_type),addedAt:iso(item.created),url:`/api/erp/leads/${id}/attachments/${item.id}`,...(item.duration ? {duration:Number(item.duration)} : {})}; attachmentMap.set(attachment.id,attachment); details[id].attachments.push(attachment); }
    const notes=await erpDB().prepare(`SELECT * FROM lead_notes ${subset} ORDER BY created,id`).all(...selectedIds);
    for (const note of notes) { const id=String(note.lead_id); if (!details[id]) continue; const attached=decode<string[]>(note.attachment_ids_json).flatMap(attachmentId=>attachmentMap.has(attachmentId) ? [attachmentMap.get(attachmentId)!] : []); messages[id].push({id:String(note.id),direction:'out',kind:'note',author:{name:String(note.author_name),seed:String(note.actor)},text:String(note.text),at:iso(note.created),...(attached.length ? {attachments:attached} : {})}); }
    return {leads:rows.map(leadDTO),details,messages,statuses};
}
export async function getLead(id: string, includeArchived=false) {
  await initializeERP();
  return erpDB().transaction(async () => {
    const row=await requireLead(id,includeArchived),data=await snapshotForRows([row],id);
    return {lead:data.leads[0],details:data.details[id],messages:data.messages[id],status:data.statuses[id]};
  });
}
export async function leadsSnapshot(includeArchived: ArchiveFilter=false, page?: ERPPage): Promise<LeadsSnapshot> {
  await initializeERP();
  if (page) validatePage(page);
  return erpDB().transaction(async () => {
    const filter=archiveWhere(includeArchived),where=filter ? `WHERE ${filter}` : '';
    const rows=await erpDB().prepare(`SELECT * FROM leads ${where} ORDER BY updated DESC,id ${page ? 'LIMIT ? OFFSET ?' : ''}`).all(...(page ? [page.limit,page.offset] : []));
    const data=await snapshotForRows(rows);
    if (!page) return data;
    const total=Number((await erpDB().prepare(`SELECT COUNT(*) AS count FROM leads ${where}`).get())!.count);
    return {...data,pagination:{...page,total,hasMore:page.offset+rows.length<total}};
  });
}

export function resourceName(input: unknown): ERPResource { if (typeof input!=='string' || !(ERP_RESOURCES as readonly string[]).includes(input)) throw new ERPError(404,'Módulo não encontrado.','RESOURCE_NOT_FOUND'); return input as ERPResource; }
function recordDTO(row: Row): ERPRecord { return {...decode<Json>(row.data_json),id:String(row.id),resource:row.resource as ERPResource,revision:Number(row.revision),createdAt:iso(row.created),updatedAt:iso(row.updated),...(row.archived_at ? {archivedAt:iso(row.archived_at)} : {})} as ERPRecord; }
async function requireRecord(resource: ERPResource, id: string, archived=false) { const row=await erpDB().prepare('SELECT * FROM records WHERE resource = ? AND id = ?').get(resource,identifier(id)); if (!row || (!archived && row.archived_at)) throw new ERPError(404,'Registro não encontrado.','NOT_FOUND'); return row; }
function quoteItems(value: unknown): QuoteItem[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) throw new ERPError(400,'O orçamento deve ter de 1 a 100 itens.','INVALID_ITEMS');
  return value.map(item => { const row=jsonObject(item,'Item'); whitelist(row,['description','quantity','unitPrice']); return {description:text(row.description,'Descrição do item',500,true),quantity:number(row.quantity,'Quantidade',3,1_000_000,true),unitPrice:number(row.unitPrice,'Preço unitário')}; });
}
function validateRecord(resource: ERPResource, input: Json, existing?: Json): Json {
  const definition=RESOURCE_DEFINITIONS[resource]; const fieldKeys=definition.fields.filter(field=>!field.readOnly).map(field=>field.key);
  if (resource==='orcamentos') { const index=fieldKeys.indexOf('total'); if (index>=0) fieldKeys.splice(index,1); fieldKeys.push('items','discount'); }
  whitelist(input,fieldKeys);
  const current={...existing,...input},result: Json={};
  for (const field of definition.fields) {
    if (field.readOnly || (resource==='orcamentos' && field.key==='total')) continue;
    let value=current[field.key];
    if (value===undefined) value=field.type==='boolean' ? true : ['number','money'].includes(field.type) ? 0 : field.type==='select' ? field.choices![0].value : '';
    if (field.type==='boolean') { if (typeof value!=='boolean') throw new ERPError(400,`${field.label}: valor inválido.`,'INVALID_INPUT'); result[field.key]=value; }
    else if (field.type==='money' || field.type==='number') result[field.key]=number(value,field.label,field.type==='money' ? 2 : 3,1_000_000_000,resource==='movimentacoes' && field.key==='quantity');
    else if (field.type==='date' || field.type==='datetime') result[field.key]=date(value,field.label,field.required,field.type==='datetime');
    else if (['lead','order','quote','material'].includes(field.type)) result[field.key]=identifier(value,field.label,Boolean(field.required));
    else if (field.type==='select') { if (!field.choices!.some(choice=>choice.value===value)) throw new ERPError(400,`${field.label}: opção inválida.`,'INVALID_STATUS'); result[field.key]=value; }
    else result[field.key]=text(value,field.label,field.type==='textarea' ? 10_000 : 300,field.required);
  }
  if (resource==='agenda' && Date.parse(String(result.endAt))<=Date.parse(String(result.startAt))) throw new ERPError(400,'O término deve ocorrer após o início.','INVALID_DATE_RANGE');
  if (resource==='materiais') result.quantity=existing?.quantity ?? 0;
  if (resource==='orcamentos') {
    const items=quoteItems(current.items),discount=number(current.discount ?? 0,'Desconto');
    const cents=items.reduce((sum,item)=>sum+Math.round(item.quantity*item.unitPrice*100),0)-Math.round(discount*100);
    if (cents<0 || cents>100_000_000_000) throw new ERPError(400,'Desconto ou total do orçamento inválido.','INVALID_TOTAL');
    result.items=items; result.discount=discount; result.total=cents/100;
  }
  if (resource==='financeiro') {
    if (result.status==='paid' && !result.paidAt) throw new ERPError(400,'Informe a data da liquidação.','PAYMENT_DATE_REQUIRED');
    if (result.status!=='paid' && result.paidAt) throw new ERPError(400,'A data da liquidação requer situação liquidada.','INVALID_PAYMENT_STATUS');
    if (Number(result.amount)<=0) throw new ERPError(400,'O valor financeiro deve ser maior que zero.','INVALID_NUMBER');
  }
  return result;
}
async function validateRelations(resource: ERPResource, data: Json, existing?: Json) {
  if (data.leadId) await requireLead(String(data.leadId));
  if (data.orcamentoId) {
    const parent=await requireRecord('orcamentos',String(data.orcamentoId)),parentData=decode<Json>(parent.data_json);
    if (data.leadId!==parentData.leadId) throw new ERPError(400,'O orçamento pertence a outro cliente.','RELATION_MISMATCH');
    if (existing?.orcamentoId!==data.orcamentoId) {
      if (parentData.status!=='accepted') throw new ERPError(409,'Aceite o orçamento antes de vinculá-lo a um pedido.','QUOTE_NOT_ACCEPTED');
      data.total=parentData.total;
    } else if (data.total!==existing.total) throw new ERPError(409,'O valor contratado deste pedido foi copiado do orçamento. Vincule um novo orçamento aceito para alterar o valor.','CONTRACTED_TOTAL_IMMUTABLE');
  }
  if (data.pedidoId) { const parent=await requireRecord('pedidos',String(data.pedidoId)); const parentData=decode<Json>(parent.data_json); if (data.leadId && data.leadId!==parentData.leadId) throw new ERPError(400,'O pedido pertence a outro cliente.','RELATION_MISMATCH'); }
  if (resource==='movimentacoes') await requireRecord('materiais',String(data.materialId));
  if ((resource==='catalogo' || resource==='materiais') && data.sku) {
    const same=await erpDB().prepare('SELECT id,data_json FROM records WHERE resource = ? AND archived_at IS NULL').all(resource);
    // Caller checks identity separately while creating/updating; SQL JSON operators differ across adapters.
    return same.filter(row=>String(decode<Json>(row.data_json).sku).toLocaleLowerCase('pt-BR')===String(data.sku).toLocaleLowerCase('pt-BR')).map(row=>String(row.id));
  }
  return [];
}
function reference(data: Json) { return String(data.materialId || data.pedidoId || data.orcamentoId || ''); }
async function moveStock(data: Json, multiplier: 1|-1) {
  const row=await requireRecord('materiais',String(data.materialId)); const material=decode<Json>(row.data_json);
  const quantity=Math.round((Number(material.quantity)+(data.direction==='in' ? 1 : -1)*Number(data.quantity)*multiplier)*1000)/1000;
  if (quantity<0) throw new ERPError(409,'A movimentação deixaria o estoque negativo. Registre uma entrada ou corrija as movimentações posteriores.','INSUFFICIENT_STOCK');
  if (quantity>1_000_000_000) throw new ERPError(409,'A movimentação excede o limite de quantidade deste material.','STOCK_LIMIT');
  material.quantity=quantity;
  await erpDB().prepare('UPDATE records SET data_json = ?, revision = revision + 1, updated = ? WHERE id = ? AND revision = ?').run(JSON.stringify(material),Date.now(),String(row.id),Number(row.revision));
}
export async function getRecord(resourceValue: unknown,id: string,includeArchived=false) { const resource=resourceName(resourceValue); await initializeERP(); return {record:recordDTO(await requireRecord(resource,id,includeArchived))}; }
export async function listRecords(resourceValue: unknown, includeArchived: ArchiveFilter=false,page?: ERPPage) {
  const resource=resourceName(resourceValue); await initializeERP();
  if (page) validatePage(page);
  return erpDB().transaction(async()=>{
    const filter=archiveWhere(includeArchived),where=filter ? `AND ${filter}` : '';
    const rows=await erpDB().prepare(`SELECT * FROM records WHERE resource = ? ${where} ORDER BY created DESC,id ${page ? 'LIMIT ? OFFSET ?' : ''}`).all(resource,...(page ? [page.limit,page.offset] : []));
    if (!page) return {resource,records:rows.map(recordDTO)};
    const total=Number((await erpDB().prepare(`SELECT COUNT(*) AS count FROM records WHERE resource = ? ${where}`).get(resource))!.count);
    return {resource,records:rows.map(recordDTO),pagination:{...page,total,hasMore:page.offset+rows.length<total}};
  });
}
export async function createRecord(resourceValue: unknown, inputValue: unknown, actor: ERPActor) {
  const resource=resourceName(resourceValue),input=jsonObject(inputValue); whitelist(input,['record']);
  const data=validateRecord(resource,jsonObject(input.record));
  return mutate(async () => {
    const duplicates=await validateRelations(resource,data); if (duplicates.length) throw new ERPError(409,'Já existe um registro com esse SKU.','DUPLICATE_SKU');
    if (resource==='movimentacoes') await moveStock(data,1);
    const id=randomUUID(),now=Date.now();
    await erpDB().prepare('INSERT INTO records VALUES (?, ?, ?, ?, ?, 1, ?, ?, NULL)').run(id,resource,JSON.stringify(data),String(data.leadId || ''),reference(data),now,now);
    await audit(actor,'created',resource,id); return {record:{...data,id,resource,revision:1,createdAt:iso(now),updatedAt:iso(now)} as ERPRecord};
  });
}
export async function updateRecord(resourceValue: unknown, id: string, inputValue: unknown, actor: ERPActor) {
  const resource=resourceName(resourceValue),input=jsonObject(inputValue); whitelist(input,['revision','record','restore']); const expected=revision(input.revision);
  if (input.restore!==undefined && input.restore!==true) throw new ERPError(400,'Para restaurar, informe restore=true.','INVALID_INPUT');
  if (resource==='movimentacoes' && input.record!==undefined) throw new ERPError(409,'Movimentações são imutáveis. Arquive para estornar e registre a correção.','IMMUTABLE_MOVEMENT');
  return mutate(async () => {
    const row=await requireRecord(resource,id,Boolean(input.restore)); if (Number(row.revision)!==expected) throw conflict();
    if (input.restore && !row.archived_at) throw new ERPError(409,'O registro já está ativo.','ALREADY_ACTIVE');
    const data=validateRecord(resource,input.record===undefined ? {} : jsonObject(input.record),decode<Json>(row.data_json));
    const duplicates=await validateRelations(resource,data,decode<Json>(row.data_json)); if (duplicates.some(duplicate=>duplicate!==id)) throw new ERPError(409,'Já existe um registro com esse SKU.','DUPLICATE_SKU');
    if (resource==='movimentacoes' && input.restore) await moveStock(data,1);
    if (resource==='materiais' && data.unit!==decode<Json>(row.data_json).unit && await erpDB().prepare('SELECT id FROM records WHERE parent_id = ? LIMIT 1').get(id)) throw new ERPError(409,'Este material possui movimentações. Cadastre outro material para usar uma unidade diferente.','UNIT_IN_USE');
    // A parent change cannot silently break existing children.
    if (['pedidos','orcamentos'].includes(resource) && data.leadId!==row.lead_id && await erpDB().prepare('SELECT id FROM records WHERE parent_id = ? LIMIT 1').get(id)) throw new ERPError(409,'O registro possui vínculos; não é possível trocar o cliente.','RECORD_IN_USE');
    const now=Date.now(); await erpDB().prepare('UPDATE records SET data_json = ?, lead_id = ?, parent_id = ?, revision = revision + 1, updated = ?, archived_at = NULL WHERE id = ? AND revision = ?').run(JSON.stringify(data),String(data.leadId || ''),reference(data),now,id,expected);
    await audit(actor,input.restore ? 'restored':'updated',resource,id); return {record:{...data,id,resource,revision:expected+1,createdAt:iso(row.created),updatedAt:iso(now)} as ERPRecord};
  });
}
export async function archiveRecord(resourceValue: unknown, id: string, expectedValue: unknown, actor: ERPActor) {
  const resource=resourceName(resourceValue),expected=revision(expectedValue);
  return mutate(async () => {
    const row=await requireRecord(resource,id); if (Number(row.revision)!==expected) throw conflict();
    if (await erpDB().prepare('SELECT id FROM records WHERE parent_id = ? AND archived_at IS NULL LIMIT 1').get(id)) throw new ERPError(409,'Arquive os registros vinculados antes de arquivar este registro.','RECORD_IN_USE');
    if (resource==='movimentacoes') await moveStock(decode<Json>(row.data_json),-1);
    const now=Date.now(); await erpDB().prepare('UPDATE records SET archived_at = ?, updated = ?, revision = revision + 1 WHERE id = ? AND revision = ?').run(now,now,id,expected);
    await audit(actor,'archived',resource,id); return {archived:true,revision:expected+1};
  });
}
export async function reports(period?: {from:string;until:string}) {
  await initializeERP();
  if (period) reportPeriodFromURL(new URL(`https://local.invalid/?from=${encodeURIComponent(period.from)}&until=${encodeURIComponent(period.until)}`));
  return erpDB().transaction(async () => {
    const rows=await erpDB().prepare('SELECT * FROM records WHERE archived_at IS NULL').all();
    const counts=Object.fromEntries(ERP_RESOURCES.map(resource=>[resource,rows.filter(row=>row.resource===resource).length])) as Record<ERPResource,number>;
    const finance={incomePaid:0,expensePaid:0,incomePending:0,expensePending:0,overdueIncome:0,overdueExpense:0,byMonth:[] as {month:string;income:number;expense:number}[]};
    const months=new Map<string,{month:string;income:number;expense:number}>();
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const financialRows=rows.filter(row=>row.resource==='financeiro').filter(row=>{
      if (!period) return true;
      const data=decode<Json>(row.data_json),referenceDate=String(data.status==='paid' ? data.paidAt : data.dueDate);
      return referenceDate>=period.from && referenceDate<=period.until;
    });
    counts.financeiro=financialRows.length;
    for (const row of financialRows) {
      const data=decode<Json>(row.data_json); if (data.status==='cancelled') continue; const amount=Math.round(Number(data.amount)*100);
      const prefix=data.type==='income' ? 'income' : 'expense'; const key=`${prefix}${data.status==='paid' ? 'Paid':'Pending'}` as 'incomePaid'|'expensePaid'|'incomePending'|'expensePending'; finance[key]+=amount;
      if (data.status==='pending' && String(data.dueDate)<today) finance[data.type==='income' ? 'overdueIncome':'overdueExpense']+=amount;
      if (data.status==='paid') { const month=String(data.paidAt).slice(0,7),item=months.get(month) ?? {month,income:0,expense:0}; item[prefix]+=amount; months.set(month,item); }
    }
    for (const key of ['incomePaid','expensePaid','incomePending','expensePending','overdueIncome','overdueExpense'] as const) finance[key]/=100;
    finance.byMonth=[...months.values()].sort((a,b)=>a.month.localeCompare(b.month)).map(item=>({...item,income:item.income/100,expense:item.expense/100}));
    const materials=rows.filter(row=>row.resource==='materiais').map(recordDTO);
    const low=materials.filter(item=>Number((item as unknown as Json).quantity)<=Number((item as unknown as Json).minQuantity));
    const stockValue=materials.reduce((sum,item)=>sum+Math.round(Number((item as unknown as Json).quantity)*Number((item as unknown as Json).unitCost)*100),0)/100;
    const leadRows=await erpDB().prepare('SELECT * FROM leads WHERE archived_at IS NULL').all();
    const funnels=(await erpDB().prepare('SELECT * FROM funnels ORDER BY position').all()).map(funnelDTO);
    const byFunnel=funnels.map(funnel=>({funnelId:funnel.id,name:funnel.name,count:leadRows.filter(row=>row.funnel_id===funnel.id).length,budget:leadRows.filter(row=>row.funnel_id===funnel.id).reduce((sum,row)=>sum+Math.round(decode<Lead>(row.data_json).budget*100),0)/100}));
    const sources=new Map<string,number>(); for (const row of leadRows) { const source=decode<LeadDetails>(row.details_json).source || 'Não informada'; sources.set(source,(sources.get(source) ?? 0)+1); }
    return {counts,finance,inventory:{low,stockValue},leads:{total:leadRows.length,byFunnel,bySource:[...sources.entries()].map(([source,count])=>({source,count}))},...(period ? {period:{...period,appliesTo:'finance',dateBasis:'paidAt_or_dueDate',inventory:'current'}} : {})};
  });
}
