import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Credenciais do Instagram cadastradas pela tela (src/lib/instagram/ajustes.ts).
const directory = mkdtempSync(join(tmpdir(), 'mk-ig-ajustes-'));
process.env.NODE_ENV = 'test';
delete process.env.DATABASE_URL; process.env.ALLOW_LOCAL_SQLITE = 'true'; delete process.env.VERCEL;
process.env.WHATSAPP_DB_PATH = join(directory, 'wa.sqlite'); process.env.META_DELETION_DB_PATH = join(directory, 'meta.sqlite');
process.env.INTEGRATION_ENCRYPTION_KEY = randomBytes(32).toString('base64');
for (const key of ['INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET', 'INSTAGRAM_WEBHOOK_APP_SECRET', 'INSTAGRAM_GRAPH_VERSION', 'INSTAGRAM_SCOPES', 'META_APP_SECRET', 'WHATSAPP_APP_SECRET']) delete process.env[key];
const TOKEN_NA_META = 'v'.repeat(64);
process.env.INSTAGRAM_VERIFY_TOKEN = TOKEN_NA_META;
process.env.AUTH_ORIGIN = process.env.PUBLIC_BASE_URL = 'https://app.ateliemilenakerbage.com.br';
const storage = await import('../src/lib/database.ts');
const waConfig = await import('../src/lib/whatsapp/config.ts');
const config = await import('../src/lib/instagram/config.ts');
const ajustes = await import('../src/lib/instagram/ajustes.ts');
after(async () => { await storage.closeDatabases(); rmSync(directory, { recursive: true, force: true }); });

test('campos errados apontam o campo e o tamanho (senha salva do navegador)', async () => {
  await assert.rejects(ajustes.salvarAjustesInstagram({ appId: '12ab' }, 'gestor'), (erro) => erro.field === 'appId');
  await assert.rejects(ajustes.salvarAjustesInstagram({ appId: '123456789', appSecret: 'Senha@202' }, 'gestor'), (erro) => erro.field === 'appSecret' && /9 caracteres/.test(erro.message));
  await assert.rejects(ajustes.salvarAjustesInstagram({ appId: '123456789' }, 'gestor'), (erro) => erro.field === 'appSecret');
});

test('salvo pela tela vale sem variáveis de ambiente, cifrado; webhook usa o App Secret do WhatsApp; token já na Meta não muda', async () => {
  await waConfig.saveSettings({ secrets: { appSecret: 'w'.repeat(32) } }, 'gestor');
  await ajustes.salvarAjustesInstagram({ appId: '123456789', appSecret: ` ${'i'.repeat(32)} `, recursos: ['instagram_business_manage_messages', 'instagram_business_manage_comments', 'instagram_business_content_publish'] }, 'gestor');
  const atual = config.instagramConfig();
  assert.equal(atual.appId, '123456789'); assert.equal(atual.appSecret, 'i'.repeat(32));
  assert.equal(atual.webhookSecret, 'w'.repeat(32), 'sem segredo próprio, usa o App Secret do mesmo app (WhatsApp)');
  assert.equal(atual.version, config.VERSAO_INSTAGRAM_PADRAO);
  assert.deepEqual(atual.scopes, ['instagram_business_basic', 'instagram_business_manage_messages', 'instagram_business_manage_comments'], 'publicação não é pedida');
  assert.equal(atual.verifyToken, TOKEN_NA_META);
  const linha = await waConfig.settingsDb().prepare("SELECT value, encrypted FROM integration_settings WHERE key = 'instagram.appSecret'").get();
  assert.equal(linha.encrypted, 1); assert.ok(!linha.value.includes('iiii'));
  assert.equal((await waConfig.effectiveConfiguration()).appSecret, 'w'.repeat(32), 'ajustes do Instagram não mexem no WhatsApp');
  assert.doesNotThrow(() => config.requireOAuthConfig());
  // Salvar de novo sem segredo mantém o guardado.
  await ajustes.salvarAjustesInstagram({ appId: '123456789', webhookSecret: 'h'.repeat(32) }, 'gestor');
  assert.equal(config.instagramConfig().appSecret, 'i'.repeat(32)); assert.equal(config.instagramConfig().webhookSecret, 'h'.repeat(32));
});
