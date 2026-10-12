import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const folder = mkdtempSync(join(tmpdir(), 'mk-meta-deletion-'));
delete process.env.DATABASE_URL;
delete process.env.VERCEL;
process.env.META_DELETION_DB_PATH = join(folder, 'meta.sqlite');
process.env.WHATSAPP_DB_PATH = join(folder, 'whatsapp.sqlite');
process.env.META_APP_SECRET = 'test-secret-meta-'.repeat(3);
process.env.PUBLIC_BASE_URL = 'https://example.test';
const meta = await import('../src/lib/meta/deletion.ts');
after(async () => { const storage = await import('../src/lib/database.ts'); await storage.closeDatabases(); rmSync(folder, { recursive: true, force: true }); });
function signed(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${createHmac('sha256', process.env.META_APP_SECRET).update(encoded).digest('base64url')}.${encoded}`;
}

test('HMAC real valida assinatura e rejeita fraude, algoritmo incorreto e identificador impróprio', () => {
  const subject = meta.verifyDeletionRequest(signed({ algorithm: 'HMAC-SHA256', user_id: '123456' }));
  assert.match(subject, /^[a-f0-9]{64}$/);
  assert.throws(() => meta.verifyDeletionRequest('invalid.payload'));
  assert.throws(() => meta.verifyDeletionRequest(signed({ algorithm: 'sha256', user_id: '123456' })));
  assert.throws(() => meta.verifyDeletionRequest(signed({ algorithm: 'HMAC-SHA256', user_id: '5511999999999', issued_at: Date.now() / 1000 + 500 })));
  assert.throws(() => meta.verifyDeletionRequest(signed({ algorithm: 'HMAC-SHA256', user_id: 123 })));
});
test('callback durável gera protocolo opaco e não transforma Facebook user_id em contato WhatsApp', async () => {
  const subject = meta.verifyDeletionRequest(signed({ algorithm: 'HMAC-SHA256', user_id: '123456' }));
  const first = await meta.registerDeletion(subject);
  assert.deepEqual(await meta.registerDeletion(subject), first);
  assert.equal(first.url, `https://example.test/exclusao-de-dados/status?code=${first.confirmation_code}`);
  assert.equal((await meta.deletionStatus(first.confirmation_code)).status, 'pending_review');
  assert.ok(!JSON.stringify(await meta.deletionStatus(first.confirmation_code)).includes(subject));
  assert.equal(await meta.deletionStatus('123456'), null);
  assert.equal((await meta.completeDeletion(first.confirmation_code, 'no_matching_data', 'Revisão de vínculos realizada; app não utiliza Facebook Login.')).status, 'no_matching_data');
  await assert.rejects(meta.completeDeletion(first.confirmation_code, 'completed', 'Revisão duplicada não permitida.'));
});
test('callbacks concorrentes reutilizam um protocolo pendente sem registro duplicado', async () => {
  const subject = meta.verifyDeletionRequest(signed({ algorithm: 'HMAC-SHA256', user_id: '987654321' }));
  const receipts = await Promise.all(Array.from({ length: 8 }, () => meta.registerDeletion(subject)));
  assert.equal(new Set(receipts.map(receipt => receipt.confirmation_code)).size, 1);
});
test('callback falha fechado sem segredo e não usa Host arbitrário como URL de confirmação', () => {
  const previous = process.env.META_APP_SECRET;
  delete process.env.META_APP_SECRET;
  assert.throws(() => meta.verifyDeletionRequest('invalid.payload'), { status: 503 });
  process.env.META_APP_SECRET = previous;
  process.env.PUBLIC_BASE_URL = 'https://user:secret@example.test';
  assert.throws(() => meta.deletionOrigin(), { status: 503 });
  process.env.PUBLIC_BASE_URL = 'https://example.test';
});
test('parser formulário limita tamanho e rejeita duplicidade signed_request', async () => {
  const request = body => new Request('https://example.test', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
  assert.equal(await meta.readDeletionBody(request('signed_request=a.b')), 'a.b');
  await assert.rejects(meta.readDeletionBody(request('signed_request=a.b&signed_request=c.d')), { status: 400 });
  await assert.rejects(meta.readDeletionBody(request('x'.repeat(16385))), { status: 413 });
});
