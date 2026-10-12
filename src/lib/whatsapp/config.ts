import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import { databaseFor, storageConfiguration } from '../database.ts';

export class IntegrationConfigurationError extends Error {
  status: number; code: string;
  constructor(status: number, message: string, code = 'INTEGRATION_CONFIG_ERROR') { super(message); this.status = status; this.code = code; }
}
export const secretKeys = ['appSecret', 'accessToken', 'verifyToken', 'suppressionSecret'] as const;
export type SecretKey = typeof secretKeys[number];
export type IntegrationValues = {graphVersion: string; appId: string; phoneNumberId: string; businessAccountId: string; publicBaseUrl: string; retentionDays: number; legalEntityName: string; legalCnpj: string; legalAddress: string; legalPrivacyEmail: string; legalSupportEmail: string; legalWhatsAppPhone: string};
export const integrationSettingsSchema = `CREATE TABLE IF NOT EXISTS integration_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, encrypted INTEGER NOT NULL DEFAULT 0, updated INTEGER NOT NULL, actor TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS integration_audit (id TEXT PRIMARY KEY, action TEXT NOT NULL, keys_json TEXT NOT NULL, actor TEXT NOT NULL, created INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS suppression (phone_hash TEXT PRIMARY KEY, created INTEGER NOT NULL);`;
export const settingsDb = () => databaseFor('whatsapp', process.env.WHATSAPP_DB_PATH || '.data/whatsapp.sqlite', integrationSettingsSchema);
const environmentSecrets = (): Record<SecretKey, string> => ({appSecret: process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || '', accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '', verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '', suppressionSecret: process.env.WHATSAPP_SUPPRESSION_SECRET || ''});
const valueKeys: Array<keyof IntegrationValues> = ['graphVersion','appId','phoneNumberId','businessAccountId','publicBaseUrl','retentionDays','legalEntityName','legalCnpj','legalAddress','legalPrivacyEmail','legalSupportEmail','legalWhatsAppPhone'];
export function environmentValues(): IntegrationValues {
  const days = Number(process.env.WHATSAPP_RETENTION_DAYS || 90);
  return {graphVersion: process.env.WHATSAPP_GRAPH_VERSION || '', appId: process.env.META_APP_ID || '', phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '', businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '', publicBaseUrl: process.env.PUBLIC_BASE_URL || process.env.WHATSAPP_PUBLIC_BASE_URL || process.env.AUTH_ORIGIN || '', retentionDays: Number.isInteger(days) && days >= 1 && days <= 3650 ? days : 90, legalEntityName: process.env.LEGAL_ENTITY_NAME || 'Milena Cavalcante Kerbage', legalCnpj: process.env.LEGAL_CNPJ || '13.592.162/0001-08', legalAddress: process.env.LEGAL_ADDRESS || 'Rua Professor Heraclito, 233, Vicente Pinzon, Fortaleza - CE, CEP 60181-245', legalPrivacyEmail: process.env.LEGAL_PRIVACY_EMAIL || 'milenakerbageatelie@gmail.com', legalSupportEmail: process.env.LEGAL_SUPPORT_EMAIL || 'milenakerbageatelie@gmail.com', legalWhatsAppPhone: process.env.LEGAL_WHATSAPP_PHONE || ''};
}
function encryptionKey() {
  const encoded = process.env.INTEGRATION_ENCRYPTION_KEY || '';
  if (!/^[A-Za-z0-9+/]{43}=$/.test(encoded)) throw new IntegrationConfigurationError(503, 'Configure INTEGRATION_ENCRYPTION_KEY com 32 bytes aleatórios em base64 no servidor.', 'ENCRYPTION_NOT_CONFIGURED');
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32 || key.toString('base64') !== encoded) throw new IntegrationConfigurationError(503, 'A chave de criptografia da integração é inválida.', 'ENCRYPTION_NOT_CONFIGURED');
  return key;
}
export function encryptionReady() { try { encryptionKey(); return true; } catch { return false; } }
function encrypt(key: SecretKey, value: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  cipher.setAAD(Buffer.from(`erp-whatsapp-integration:${key}:v1`));
  const bytes = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return JSON.stringify({v: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: bytes.toString('base64')});
}
function decrypt(key: SecretKey, envelope: string) {
  const secret = encryptionKey();
  try {
    const parsed = JSON.parse(envelope);
    if (parsed.v !== 1 || typeof parsed.iv !== 'string' || typeof parsed.tag !== 'string' || typeof parsed.data !== 'string') throw new Error();
    const iv = Buffer.from(parsed.iv, 'base64'), tag = Buffer.from(parsed.tag, 'base64');
    if (iv.length !== 12 || tag.length !== 16) throw new Error();
    const decipher = createDecipheriv('aes-256-gcm', secret, iv);
    decipher.setAAD(Buffer.from(`erp-whatsapp-integration:${key}:v1`)); decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(Buffer.from(parsed.data, 'base64')), decipher.final()]).toString('utf8');
  } catch { throw new IntegrationConfigurationError(503, 'Os segredos armazenados não puderam ser decifrados. Verifique a chave original de criptografia no servidor.', 'ENCRYPTION_DECRYPT_FAILED'); }
}
type SettingRow = {key: string; value: string; encrypted: number; updated: number; actor: string};
async function storedRows() { return await settingsDb().prepare('SELECT * FROM integration_settings').all() as SettingRow[]; }
function buildConfiguration(values: IntegrationValues, secrets: Record<SecretKey, string>) {
  let validUrl = false;
  try { const url = new URL(values.publicBaseUrl); validUrl = url.protocol === 'https:' && url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password; } catch { /* Configuração pendente. */ }
  const checks = [
    {key: 'WHATSAPP_GRAPH_VERSION', label: 'Versão explícita da Graph API', configured: /^v[0-9]{2,3}\.0$/.test(values.graphVersion)},
    {key: 'WHATSAPP_ACCESS_TOKEN', label: 'Token de acesso no servidor', configured: secrets.accessToken.length >= 20},
    {key: 'META_APP_SECRET', label: 'App Secret para validar assinaturas', configured: secrets.appSecret.length >= 16},
    {key: 'WHATSAPP_VERIFY_TOKEN', label: 'Token de verificação do webhook', configured: secrets.verifyToken.length >= 16},
    {key: 'WHATSAPP_PHONE_NUMBER_ID', label: 'ID do número comercial', configured: /^[0-9]{5,30}$/.test(values.phoneNumberId)},
    {key: 'WHATSAPP_BUSINESS_ACCOUNT_ID', label: 'ID da conta WABA', configured: /^[0-9]{5,30}$/.test(values.businessAccountId)},
    {key: 'WHATSAPP_PUBLIC_BASE_URL', label: 'Origem pública HTTPS', configured: validUrl},
    {key: 'WHATSAPP_SUPPRESSION_SECRET', label: 'Chave de proteção da lista de supressão', configured: secrets.suppressionSecret.length >= 32},
    {key: 'DATABASE_URL', label: 'Armazenamento durável PostgreSQL/Supabase na Vercel', configured: storageConfiguration().configured},
    {key: 'INTEGRATION_ENCRYPTION_KEY', label: 'Criptografia das configurações do gestor', configured: process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1' || encryptionReady()},
  ];
  return {apiVersion: values.graphVersion, appId: values.appId, accessToken: secrets.accessToken, appSecret: secrets.appSecret, verifyToken: secrets.verifyToken, suppressionSecret: secrets.suppressionSecret, phoneNumberId: values.phoneNumberId, businessAccountId: values.businessAccountId, publicBaseUrl: validUrl ? new URL(values.publicBaseUrl).origin : '', retentionDays: values.retentionDays, checks, configured: checks.every(check => check.configured)};
}
export function environmentConfiguration() { return buildConfiguration(environmentValues(), environmentSecrets()); }
export async function effectiveSettings() {
  const values = environmentValues(), secrets = environmentSecrets(), rows = await storedRows();
  for (const row of rows) {
    if (secretKeys.includes(row.key as SecretKey)) {
      if (row.encrypted !== 1) throw new IntegrationConfigurationError(503, 'O armazenamento de segredos está inválido.', 'ENCRYPTION_DECRYPT_FAILED');
      secrets[row.key as SecretKey] = decrypt(row.key as SecretKey, row.value);
    } else if (valueKeys.includes(row.key as keyof IntegrationValues)) {
      const parsed = JSON.parse(row.value);
      Object.assign(values, {[row.key]: parsed});
    }
  }
  return {values, secrets, rows};
}
export async function effectiveConfiguration() { const settings = await effectiveSettings(); return buildConfiguration(settings.values, settings.secrets); }
export async function effectiveAppSecret() { return (await effectiveConfiguration()).appSecret; }
async function effectivePublicValues() {
  const values = environmentValues();
  const rows = await settingsDb().prepare('SELECT key, value FROM integration_settings WHERE encrypted = 0').all() as Array<{key: string; value: string}>;
  for (const row of rows) if (valueKeys.includes(row.key as keyof IntegrationValues)) Object.assign(values, {[row.key]: JSON.parse(row.value)});
  return values;
}
export async function effectivePublicBaseUrl() { return buildConfiguration(await effectivePublicValues(), environmentSecrets()).publicBaseUrl; }
export async function effectiveLegalFields() {
  const values = await effectivePublicValues();
  return {entity: values.legalEntityName, cnpj: values.legalCnpj, address: values.legalAddress, privacyEmail: values.legalPrivacyEmail || undefined, supportEmail: values.legalSupportEmail || undefined, whatsappPhone: values.legalWhatsAppPhone || undefined, retentionDays: values.retentionDays};
}
export async function sanitizedSettings() {
  const settings = await effectiveSettings(), config = buildConfiguration(settings.values, settings.secrets);
  const secrets = Object.fromEntries(secretKeys.map(key => { const row = settings.rows.find(row => row.key === key); return [key, {configured: Boolean(settings.secrets[key]), source: row ? 'database' : settings.secrets[key] ? 'environment' : 'none', updatedAt: row ? new Date(row.updated).toISOString() : null}]; }));
  return {values: settings.values, secrets, editable: true, storageReady: storageConfiguration().configured, encryptionReady: encryptionReady(), configured: config.configured, checks: config.checks};
}
function validateValues(input: Record<string, unknown>) {
  const result: Partial<IntegrationValues> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!valueKeys.includes(key as keyof IntegrationValues)) throw new IntegrationConfigurationError(400, 'Campo de configuração desconhecido.', 'INVALID_CONFIG_FIELD');
    if (key === 'retentionDays') { if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 3650) throw new IntegrationConfigurationError(400, 'Retenção deve ter de 1 a 3650 dias.', 'INVALID_RETENTION'); Object.assign(result, {[key]: value}); continue; }
    if (typeof value !== 'string' || value.length > 1000) throw new IntegrationConfigurationError(400, 'Campo de configuração inválido.', 'INVALID_CONFIG_VALUE');
    const text = value.trim();
    if (text && key === 'graphVersion' && !/^v[0-9]{2,3}\.0$/.test(text)) throw new IntegrationConfigurationError(400, 'Use uma versão Graph explícita no formato vXX.0.', 'INVALID_GRAPH_VERSION');
    if (text && ['appId','phoneNumberId','businessAccountId'].includes(key) && !/^[0-9]{5,30}$/.test(text)) throw new IntegrationConfigurationError(400, 'Os IDs Meta devem conter de 5 a 30 dígitos.', 'INVALID_META_ID');
    if (text && key === 'publicBaseUrl') { try { const url = new URL(text); if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) throw new Error(); } catch { throw new IntegrationConfigurationError(400, 'Informe somente a origem pública HTTPS, sem caminho ou credenciais.', 'INVALID_PUBLIC_URL'); } }
    if (text && ['legalPrivacyEmail','legalSupportEmail'].includes(key) && (text.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))) throw new IntegrationConfigurationError(400, 'E-mail de contato inválido.', 'INVALID_LEGAL_EMAIL');
    if (text && key === 'legalWhatsAppPhone' && !/^[1-9][0-9]{7,14}$/.test(text)) throw new IntegrationConfigurationError(400, 'Telefone de contato deve conter DDI e somente dígitos.', 'INVALID_LEGAL_PHONE');
    Object.assign(result, {[key]: key === 'publicBaseUrl' && text ? new URL(text).origin : text});
  }
  return result;
}
export async function saveSettings(input: Record<string, unknown>, actor: string) {
  if (Object.keys(input).some(key => !['values','secrets','removeSecrets'].includes(key))) throw new IntegrationConfigurationError(400, 'Campos de configuração desconhecidos.', 'INVALID_CONFIG_FIELD');
  const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  if (input.values !== undefined && !isObject(input.values) || input.secrets !== undefined && !isObject(input.secrets) || input.removeSecrets !== undefined && !Array.isArray(input.removeSecrets)) throw new IntegrationConfigurationError(400, 'Formato de configuração inválido.', 'INVALID_CONFIG_VALUE');
  const values = validateValues(isObject(input.values) ? input.values : {}), secrets: Partial<Record<SecretKey, string>> = {};
  for (const [key, value] of Object.entries(isObject(input.secrets) ? input.secrets : {})) {
    if (!secretKeys.includes(key as SecretKey) || typeof value !== 'string') throw new IntegrationConfigurationError(400, 'Segredo inválido.', 'INVALID_SECRET');
    if (!value.trim()) continue;
    if (value.length > 4096 || value.length < (key === 'accessToken' ? 20 : key === 'suppressionSecret' ? 32 : 16) || /\s/.test(value)) throw new IntegrationConfigurationError(400, 'Segredo fora do formato ou tamanho permitido.', 'INVALID_SECRET');
    secrets[key as SecretKey] = value;
  }
  for (const key of Array.isArray(input.removeSecrets) ? input.removeSecrets : []) {
    if (!secretKeys.includes(key as SecretKey) || secrets[key as SecretKey] !== undefined) throw new IntegrationConfigurationError(400, 'Remoção de segredo inválida.', 'INVALID_SECRET');
    secrets[key as SecretKey] = '';
  }
  const updates = [...Object.entries(values).map(([key, value]) => ({key, value: JSON.stringify(value), encrypted: 0})), ...Object.entries(secrets).map(([key, value]) => ({key, value: encrypt(key as SecretKey, value!), encrypted: 1}))];
  if (!updates.length) return sanitizedSettings();
  const database = settingsDb();
  await database.transaction(async () => {
    if (database.backend === 'postgres') await database.prepare('SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(?, 0))').get('whatsapp-integration-settings');
    const current = await effectiveSettings();
    if (secrets.suppressionSecret !== undefined && secrets.suppressionSecret !== current.secrets.suppressionSecret) {
      const table = await database.prepare('SELECT COUNT(*) AS count FROM suppression').get() as {count: number};
      if (table.count || current.secrets.suppressionSecret) throw new IntegrationConfigurationError(409, 'A chave de supressão já configurada deve permanecer estável para proteger os bloqueios; a rotação exige migração administrada.', 'SUPPRESSION_ROTATION_BLOCKED');
    }
    for (const update of updates) await database.prepare('INSERT INTO integration_settings (key, value, encrypted, updated, actor) VALUES (?, ?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, encrypted = excluded.encrypted, updated = excluded.updated, actor = excluded.actor').run(update.key, update.value, update.encrypted, Date.now(), actor);
    await database.prepare('INSERT INTO integration_audit VALUES (?, ?, ?, ?, ?)').run(randomUUID(), 'configuration_updated', JSON.stringify(updates.map(update => update.key)), actor, Date.now());
  });
  return sanitizedSettings();
}
export async function generateSecret(kind: unknown, actor: string) {
  if (kind !== 'verifyToken' && kind !== 'suppressionSecret') throw new IntegrationConfigurationError(400, 'Somente tokens locais de webhook e supressão podem ser gerados. Credenciais Meta são emitidas pela Meta.', 'INVALID_GENERATED_SECRET');
  if (kind === 'suppressionSecret' && (await effectiveSettings()).secrets.suppressionSecret) throw new IntegrationConfigurationError(409, 'A chave de supressão já está configurada. Preserve esta chave para manter os bloqueios.', 'SUPPRESSION_ROTATION_BLOCKED');
  const secret = randomBytes(32).toString('hex');
  await saveSettings({secrets: {[kind]: secret}}, actor);
  return {kind, secret, stored: true};
}
