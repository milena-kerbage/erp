import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { InstagramError, instagramConfig } from './config.ts';

export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
function encryptionKey() {
  const encoded = process.env.INTEGRATION_ENCRYPTION_KEY || '';
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32 || key.toString('base64') !== encoded) throw new InstagramError(503, 'Configure INTEGRATION_ENCRYPTION_KEY com 32 bytes aleatórios em base64.', 'ENCRYPTION_NOT_CONFIGURED');
  return key;
}
export function encryptionReady() { try { encryptionKey(); return true; } catch { return false; } }
export function seal(value: string, purpose: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  cipher.setAAD(Buffer.from(`erp-instagram:${instagramConfig().appId}:${purpose}:v1`));
  const bytes = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: bytes.toString('base64') });
}
export function unseal(envelope: string, purpose: string) {
  const key = encryptionKey();
  try {
    const p = JSON.parse(envelope);
    if (p.v !== 1 || Buffer.from(p.iv, 'base64').length !== 12 || Buffer.from(p.tag, 'base64').length !== 16) throw new Error();
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(p.iv, 'base64'));
    decipher.setAAD(Buffer.from(`erp-instagram:${instagramConfig().appId}:${purpose}:v1`));
    decipher.setAuthTag(Buffer.from(p.tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(p.data, 'base64')), decipher.final()]).toString('utf8');
  } catch { throw new InstagramError(503, 'Não foi possível ler os dados protegidos do Instagram. Confira a chave original.', 'DECRYPTION_FAILED'); }
}
export function subjectHash(id: string) {
  return createHmac('sha256', encryptionKey()).update(`erp-instagram:${instagramConfig().appId}:subject:${id}`).digest('hex');
}
export function secretMatches(actual: string, expected: string) {
  return timingSafeEqual(createHash('sha256').update(actual).digest(), createHash('sha256').update(expected).digest());
}
/** Retorna o ID validado, preservando a distinção entre ID app-scoped e ID da conta. */
export function signedSubject(signed: string) {
  const { appSecret } = instagramConfig();
  if (appSecret.length < 16) throw new InstagramError(503, 'Configure INSTAGRAM_APP_SECRET.', 'LIFECYCLE_NOT_CONFIGURED');
  const parts = signed.split('.');
  if (signed.length > 8192 || parts.length !== 2 || parts.some(v => !/^[A-Za-z0-9_-]+={0,2}$/.test(v))) throw new InstagramError(400, 'Solicitação inválida.');
  const sig = Buffer.from(parts[0], 'base64url'), expected = createHmac('sha256', appSecret).update(parts[1]).digest();
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) throw new InstagramError(403, 'Assinatura inválida.', 'INVALID_SIGNATURE');
  let payload;
  try { payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')); } catch { throw new InstagramError(400, 'Solicitação inválida.'); }
  if (!payload || payload.algorithm !== 'HMAC-SHA256' || typeof payload.user_id !== 'string' || !/^\d{1,32}$/.test(payload.user_id) ||
    (payload.issued_at !== undefined && (!Number.isSafeInteger(payload.issued_at) || payload.issued_at < 0 || payload.issued_at > Date.now() / 1000 + 300))) throw new InstagramError(400, 'Solicitação inválida.');
  return payload.user_id as string;
}
export function verifyWebhook(bytes: Buffer, signature: string | null) {
  const { webhookSecret } = instagramConfig();
  if (webhookSecret.length < 16) throw new InstagramError(503, 'Configure INSTAGRAM_WEBHOOK_APP_SECRET.', 'WEBHOOK_NOT_CONFIGURED');
  if (!signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  return timingSafeEqual(Buffer.from(signature.slice(7), 'hex'), createHmac('sha256', webhookSecret).update(bytes).digest());
}
