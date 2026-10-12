import { randomBytes, randomUUID } from 'node:crypto';
import { db as authDb, normalizeEmail, validEmail, hashPassword, digest } from '../auth/core.ts';

export type Permission = 'admin' | 'manager' | 'member';
export type Actor = { id: string; name: string; email: string; permission: Permission; authMode?: 'session' | 'api-key' | 'development' };
export class ApiError extends Error {
  status:number; code:string;
  constructor(status: number, message: string, code = 'ERP_ERROR') { super(message); this.status=status; this.code=code; }
}
export const accessSchema = `CREATE TABLE IF NOT EXISTS members (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, permission TEXT NOT NULL, status TEXT NOT NULL, role TEXT NOT NULL, metadata_json TEXT NOT NULL, joined_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS invitations (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL, created INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS api_keys (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, hash TEXT UNIQUE NOT NULL, name TEXT NOT NULL, scope TEXT NOT NULL, prefix TEXT NOT NULL, last4 TEXT NOT NULL, created INTEGER NOT NULL, last_used INTEGER);
  CREATE TABLE IF NOT EXISTS profile_photos (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, content BLOB NOT NULL, mime_type TEXT NOT NULL, updated INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS app_webhooks (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, url TEXT NOT NULL, events_json TEXT NOT NULL, active INTEGER NOT NULL, secret_encrypted TEXT NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS webhook_deliveries (id TEXT PRIMARY KEY, webhook_id TEXT NOT NULL REFERENCES app_webhooks(id) ON DELETE CASCADE, event TEXT NOT NULL, payload_json TEXT NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL, response_status INTEGER);
  CREATE TABLE IF NOT EXISTS notification_states (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, notification_id TEXT NOT NULL, is_read INTEGER NOT NULL, archived INTEGER NOT NULL, updated INTEGER NOT NULL, PRIMARY KEY(user_id,notification_id));
  CREATE TABLE IF NOT EXISTS access_audit (id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, entity_id TEXT NOT NULL, created INTEGER NOT NULL);`;
export function accessDb() { const database = authDb(); database.registerSqliteSchema(accessSchema); return database; }
export async function accessAudit(actor:string,action:string,entityId:string) {await accessDb().prepare('INSERT INTO access_audit VALUES (?, ?, ?, ?, ?)').run(randomUUID(),actor,action,entityId,Date.now());}
type MemberRow = {id: string; name: string; email: string; permission?: Permission; status?: string; role?: string; metadata_json?: string; joined_at?: number;last_seen?:number};
const admins = () => new Set((process.env.ERP_ADMIN_EMAILS || '').split(',').map(normalizeEmail).filter(validEmail));
function memberDto(row: MemberRow) {
  const metadata = JSON.parse(row.metadata_json || '{}') as Record<string, unknown>;
  return {id: row.id, name: row.name, email: row.email, seed: row.id, phone: typeof metadata.phone === 'string' ? metadata.phone : '', avatarUrl: typeof metadata.avatarUrl === 'string' ? metadata.avatarUrl : null, role: row.role || 'Equipe', permission: row.permission || (admins().has(row.email) ? 'admin' : 'member'), status: row.status || 'active', invitationPending:metadata.invitationPending===true || row.status==='invited', joinedAt: new Date(Number(row.joined_at || Date.now())).toISOString().slice(0, 10),lastSeenAt:typeof metadata.lastSeenAt==='string'?metadata.lastSeenAt:row.last_seen?new Date(Number(row.last_seen)).toISOString():undefined};
}
const memberSelect = 'SELECT users.id, users.name, users.email, members.permission, members.status, members.role, members.metadata_json, members.joined_at, (SELECT MAX(seen) FROM sessions WHERE sessions.user_id = users.id) AS last_seen FROM users LEFT JOIN members ON members.user_id = users.id';
export async function patchMemberMetadata(id:string,patch:Record<string,unknown>) {const database=accessDb();await database.prepare(`UPDATE members SET metadata_json = ${database.backend==='postgres'?'(metadata_json::jsonb || ?::jsonb)::text':'json_patch(metadata_json, ?)'} WHERE user_id = ?`).run(JSON.stringify(patch),id);}
export async function recordMemberLogin(id:string) {await patchMemberMetadata(id,{lastSeenAt:new Date().toISOString()});}
export async function currentMember(identity: {id: string; name: string; email: string}) {
  const database = accessDb();
  const user = await database.prepare(`${memberSelect} WHERE users.id = ?`).get(identity.id) as MemberRow | undefined;
  if (!user) throw new ApiError(401, 'Entre novamente no sistema.', 'UNAUTHORIZED');
  if (!user.permission) {
    await database.prepare('INSERT INTO members VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO NOTHING').run(user.id, admins().has(user.email) ? 'admin' : 'member', 'active', 'Equipe', '{}', Date.now());
    return currentMember(identity);
  }
  if (user.status !== 'active') throw new ApiError(403, 'Esta conta não está ativa. Consulte a administração.', 'ACCOUNT_DISABLED');
  return memberDto(user);
}
export async function listTeam(actor?: {id: string; name: string; email: string}) {
  const currentUser = actor ? await currentMember(actor) : undefined;
  const members = (await accessDb().prepare(`${memberSelect} ORDER BY users.name ASC`).all() as MemberRow[]).map(memberDto).filter(member => currentUser?.permission==='admin' || member.status==='active');
  return {members, currentUser};
}
export async function resolveOwner(id: string) {
  if (typeof id !== 'string' || id.length > 100) throw new ApiError(400, 'Selecione um responsável da equipe.', 'INVALID_OWNER');
  const row = await accessDb().prepare(`${memberSelect} WHERE users.id = ?`).get(id) as MemberRow | undefined;
  if (!row || (row.status && row.status !== 'active')) throw new ApiError(400, 'O responsável precisa ser uma conta ativa.', 'INVALID_OWNER');
  const member = memberDto(row); return {name: member.name, seed: member.id, avatarUrl: member.avatarUrl};
}
function text(value: unknown, max: number, required = false) {
  if (typeof value !== 'string' || value.trim().length > max || required && !value.trim()) throw new ApiError(400, 'Confira os campos informados.', 'INVALID_INPUT');
  return value.trim();
}
function metadataPatch(patch: Record<string, unknown>, own = false) {
  const metadata: Record<string, unknown> = {};
  if (patch.phone !== undefined) { const phone = text(patch.phone, 30); if (phone && !/^\+?[0-9 ()-]{7,30}$/.test(phone)) throw new ApiError(400, 'Telefone inválido.', 'INVALID_PHONE'); metadata.phone = phone; }
  if (patch.avatarUrl !== undefined) {
    if (patch.avatarUrl === null || patch.avatarUrl === '') metadata.avatarUrl = null;
    else { const url = text(patch.avatarUrl, 1000); try { const parsed = new URL(url); if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error(); } catch { throw new ApiError(400, 'A foto externa precisa usar URL HTTPS.', 'INVALID_AVATAR'); } metadata.avatarUrl = url; }
  }
  if (own && patch.permission !== undefined) throw new ApiError(403, 'O perfil não altera a permissão de acesso.', 'FORBIDDEN');
  return metadata;
}
export async function updateMember(id: string, patch: Record<string, unknown>, actor: Actor, own = false) {
  if (!own && actor.permission !== 'admin' || own && actor.id !== id) throw new ApiError(403, 'Você não pode alterar esta conta.', 'FORBIDDEN');
  const allowed = own ? ['name','email','phone','role','avatarUrl'] : ['name','email','phone','role','avatarUrl','permission','status'];
  if (Object.keys(patch).some(key => !allowed.includes(key))) throw new ApiError(400, 'Campo de conta desconhecido.', 'INVALID_INPUT');
  const metadata = metadataPatch(patch, own), database = accessDb();
  if (patch.permission !== undefined && !['admin','manager','member'].includes(String(patch.permission))) throw new ApiError(400, 'Permissão inválida.', 'INVALID_PERMISSION');
  if (patch.status !== undefined && !['active','disabled'].includes(String(patch.status))) throw new ApiError(400, 'Situação inválida.', 'INVALID_STATUS');
  if (patch.email !== undefined && !validEmail(normalizeEmail(text(patch.email, 254, true)))) throw new ApiError(400, 'E-mail inválido.', 'INVALID_EMAIL');
  await database.transaction(async () => {
    if (database.backend === 'postgres') await database.prepare('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))').get('erp-team-administration');
    const row = await database.prepare(`${memberSelect} WHERE users.id = ?`).get(id) as MemberRow | undefined;
    if (!row) throw new ApiError(404, 'Pessoa não encontrada.', 'NOT_FOUND');
    if (own && actor.permission !== 'admin' && patch.email !== undefined && normalizeEmail(String(patch.email)) !== row.email) throw new ApiError(403, 'A administração deve autorizar a alteração do e-mail de acesso.', 'EMAIL_CHANGE_FORBIDDEN');
    if ((row.status === 'invited' || JSON.parse(row.metadata_json || '{}').invitationPending===true) && patch.status === 'active') throw new ApiError(409, 'A pessoa precisa concluir o convite e criar a senha. Reemita o convite.', 'INVITATION_PENDING');
    const permission = patch.permission ? String(patch.permission) : row.permission || (admins().has(row.email) ? 'admin' : 'member');
    const status = patch.status ? String(patch.status) : row.status || 'active';
    if (actor.id === id && status !== 'active') throw new ApiError(409, 'Você não pode desativar a própria conta.', 'SELF_DISABLE_BLOCKED');
    if ((row.permission || (admins().has(row.email) ? 'admin' : 'member')) === 'admin' && (permission !== 'admin' || status !== 'active')) {
      const count = await database.prepare("SELECT COUNT(*) AS count FROM members WHERE permission = 'admin' AND status = 'active' AND user_id != ?").get(id) as {count: number};
      if (!count.count) throw new ApiError(409, 'Mantenha ao menos uma administração ativa.', 'LAST_ADMIN');
    }
    if (patch.email !== undefined) {
      const conflict = await database.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(normalizeEmail(String(patch.email)), id);
      if (conflict) throw new ApiError(409, 'Esse e-mail já pertence a outra conta.', 'EMAIL_IN_USE');
    }
    await database.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(patch.name === undefined ? row.name : text(patch.name, 150, true), patch.email === undefined ? row.email : normalizeEmail(String(patch.email)), id);
    if (patch.email !== undefined && normalizeEmail(String(patch.email)) !== row.email) await database.prepare('DELETE FROM resets WHERE user_id = ?').run(id);
    await database.prepare(`INSERT INTO members VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET permission = excluded.permission, status = excluded.status, role = excluded.role, metadata_json = ${database.backend==='postgres'?'(members.metadata_json::jsonb || excluded.metadata_json::jsonb)::text':'json_patch(members.metadata_json, excluded.metadata_json)'}`).run(id, permission, status, patch.role === undefined ? row.role || 'Equipe' : text(patch.role, 100), JSON.stringify(metadata), row.joined_at || Date.now());
    if (status !== 'active' || patch.permission !== undefined) { await database.prepare('DELETE FROM sessions WHERE user_id = ?').run(id); await database.prepare('DELETE FROM api_keys WHERE user_id = ?').run(id); }
    if (status==='disabled') await database.prepare('DELETE FROM invitations WHERE user_id = ?').run(id);
    await accessAudit(actor.id,own?'profile_updated':'member_updated',id);
  });
  const row = await database.prepare(`${memberSelect} WHERE users.id = ?`).get(id) as MemberRow; return memberDto(row);
}
export async function inviteMember(input: Record<string, unknown>, actor: Actor, origin: string) {
  if (actor.permission !== 'admin') throw new ApiError(403, 'Somente a administração pode criar convites.', 'FORBIDDEN');
  if (Object.keys(input).some(key => !['name','email','role','permission'].includes(key))) throw new ApiError(400, 'Campo de convite desconhecido.', 'INVALID_INPUT');
  const name = text(input.name, 150, true), email = normalizeEmail(text(input.email, 254, true)), permission = String(input.permission || 'member'), role = text(input.role || 'Equipe', 100);
  if (!validEmail(email) || !['admin','manager','member'].includes(permission)) throw new ApiError(400, 'Confira e-mail e permissão do convite.', 'INVALID_INPUT');
  const id = `user-${randomUUID()}`, token = randomBytes(32).toString('hex'), inaccessibleHash = await hashPassword(randomBytes(32).toString('hex') + '!A7');
  const database = accessDb();
  await database.transaction(async () => {
    if (await database.prepare('SELECT id FROM users WHERE email = ?').get(email)) throw new ApiError(409, 'Esse e-mail já está cadastrado.', 'EMAIL_IN_USE');
    await database.prepare('INSERT INTO users VALUES (?, ?, ?, ?)').run(id, email, name, inaccessibleHash);
    await database.prepare('INSERT INTO members VALUES (?, ?, ?, ?, ?, ?)').run(id, permission, 'invited', role, '{"invitationPending":true}', Date.now());
    await database.prepare('INSERT INTO invitations VALUES (?, ?, ?, ?)').run(digest(token), id, Date.now() + 7 * 86400000, Date.now());
    await accessAudit(actor.id,'member_invited',id);
  });
  return {member: memberDto({id,name,email,permission: permission as Permission,status:'invited',role,joined_at:Date.now()}),inviteUrl: new URL(`/convite#${token}`, origin).toString(), delivery:'manual', emailSent:false};
}
export async function acceptInvitation(token: string, password: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new ApiError(400, 'Convite inválido ou expirado.', 'INVALID_INVITATION');
  const hash = await hashPassword(password), database = accessDb();
  return database.transaction(async () => {
    if (database.backend === 'postgres') await database.prepare('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))').get('erp-team-administration');
    const row = await database.prepare('DELETE FROM invitations WHERE hash = ? AND expires > ? RETURNING user_id').get(digest(token), Date.now()) as {user_id: string} | undefined;
    if (!row) throw new ApiError(400, 'Convite inválido ou expirado.', 'INVALID_INVITATION');
    const metadata=await database.prepare('SELECT metadata_json FROM members WHERE user_id = ?').get(row.user_id) as {metadata_json:string};
    const result = await database.prepare("UPDATE members SET status = 'active', metadata_json = ? WHERE user_id = ? AND status = 'invited'").run(JSON.stringify({...JSON.parse(metadata.metadata_json),invitationPending:false}),row.user_id);
    if (!result.changes) throw new ApiError(400, 'Convite inválido ou expirado.', 'INVALID_INVITATION');
    await database.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, row.user_id);
    await accessAudit(row.user_id,'invitation_accepted',row.user_id);
    return {ok:true};
  });
}
export async function reissueInvitation(id:string,actor:Actor,origin:string) {
  if(actor.permission!=='admin') throw new ApiError(403,'Somente a administração pode reemitir convites.','FORBIDDEN');
  const database=accessDb(),token=randomBytes(32).toString('hex');
  await database.transaction(async()=>{
    if (database.backend === 'postgres') await database.prepare('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))').get('erp-team-administration');
    const row=await database.prepare(`${memberSelect} WHERE users.id = ?`).get(id) as MemberRow | undefined;
    if(!row) throw new ApiError(404,'Pessoa não encontrada.','NOT_FOUND');
    if(row.status!=='invited' && !JSON.parse(row.metadata_json || '{}').invitationPending) throw new ApiError(409,'Essa conta já foi ativada. Utilize a recuperação de senha quando necessário.','ACCOUNT_ALREADY_ACTIVATED');
    await database.prepare('DELETE FROM invitations WHERE user_id = ?').run(id);
    await database.prepare("UPDATE members SET status = 'invited' WHERE user_id = ?").run(id);
    await database.prepare('INSERT INTO invitations VALUES (?, ?, ?, ?)').run(digest(token),id,Date.now()+7*86400000,Date.now());
    await accessAudit(actor.id,'invitation_reissued',id);
  });
  const member=memberDto(await database.prepare(`${memberSelect} WHERE users.id = ?`).get(id) as MemberRow);
  return {member,inviteUrl:new URL(`/convite#${token}`,origin).toString(),delivery:'manual',emailSent:false};
}
export async function apiKeys() {
  return (await accessDb().prepare('SELECT api_keys.id, api_keys.name, api_keys.scope, api_keys.prefix, api_keys.last4, api_keys.created, api_keys.last_used, users.name AS creator FROM api_keys JOIN users ON users.id = api_keys.user_id ORDER BY created DESC').all() as Array<{id:string;name:string;scope:string;prefix:string;last4:string;created:number;last_used?:number;creator:string}>).map(row => ({id:row.id,name:row.name,scope:row.scope,prefix:row.prefix,last4:row.last4,createdAt:new Date(row.created).toISOString(),createdBy:row.creator,lastUsedAt:row.last_used?new Date(row.last_used).toISOString():undefined}));
}
export async function createApiKey(input: Record<string, unknown>, actor: Actor) {
  if (actor.permission !== 'admin') throw new ApiError(403, 'Somente a administração pode emitir chaves.', 'FORBIDDEN');
  const name = text(input.name, 100, true), scope = String(input.scope);
  if (!['read','write'].includes(scope)) throw new ApiError(400, 'Escopo inválido.', 'INVALID_SCOPE');
  const key = `mk_live_${randomBytes(32).toString('hex')}`, id = randomUUID();
  await accessDb().prepare('INSERT INTO api_keys VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)').run(id,actor.id,digest(key),name,scope,'mk_live_',key.slice(-4),Date.now());
  await accessAudit(actor.id,'api_key_created',id);
  return {key,apiKey:(await apiKeys()).find(item=>item.id===id)};
}
export async function revokeApiKey(id: string,actorId='administration') { const result = await accessDb().prepare('DELETE FROM api_keys WHERE id = ?').run(id); if (!result.changes) throw new ApiError(404, 'Chave não encontrada.', 'NOT_FOUND'); await accessAudit(actorId,'api_key_revoked',id);return {revoked:true}; }
export async function authenticateApiKey(key: string, mutation: boolean) {
  if (!/^mk_live_[a-f0-9]{64}$/.test(key)) throw new ApiError(401, 'Chave de API inválida.', 'UNAUTHORIZED');
  const database = accessDb();
  const row = await database.prepare('SELECT api_keys.id, api_keys.scope, users.id AS user_id, users.name, users.email FROM api_keys JOIN users ON users.id = api_keys.user_id WHERE api_keys.hash = ?').get(digest(key)) as {id:string;scope:string;user_id:string;name:string;email:string} | undefined;
  if (!row) throw new ApiError(401, 'Chave de API inválida.', 'UNAUTHORIZED');
  if (mutation && row.scope !== 'write') throw new ApiError(403, 'Esta chave permite somente leitura.', 'READ_ONLY_KEY');
  const member = await currentMember({id:row.user_id,name:row.name,email:row.email});
  await database.prepare('UPDATE api_keys SET last_used = ? WHERE id = ?').run(Date.now(),row.id);
  return {id:member.id,name:member.name,email:member.email,permission:member.permission as Permission,authMode:'api-key' as const};
}
