// Gera somente o Verify Token local. Não substitui credenciais ou a chave de criptografia existente.
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, chmodSync, existsSync } from 'node:fs';
const file = new URL('../.env.local', import.meta.url);
const existing = process.env.INSTAGRAM_VERIFY_TOKEN?.trim();
if (existing) {
  if (existing.length < 32) { console.error('INSTAGRAM_VERIFY_TOKEN existente é curto demais; ajuste para pelo menos 32 caracteres.'); process.exitCode = 1; }
  else console.log('INSTAGRAM_VERIFY_TOKEN já está configurado. O valor existente foi preservado.');
} else {
  const token = randomBytes(32).toString('hex');
  let source = existsSync(file) ? readFileSync(file, 'utf8') : '';
  if (/^\s*(?:export\s+)?INSTAGRAM_VERIFY_TOKEN\s*=/m.test(source)) source = source.replace(/^\s*(?:export\s+)?INSTAGRAM_VERIFY_TOKEN\s*=.*$/m, `INSTAGRAM_VERIFY_TOKEN=${token}`);
  else source += `${source.endsWith('\n') || !source ? '' : '\n'}INSTAGRAM_VERIFY_TOKEN=${token}\n`;
  writeFileSync(file, source, { mode: 0o600 }); chmodSync(file, 0o600);
  console.log('INSTAGRAM_VERIFY_TOKEN gerado e salvo em .env.local. Reinicie o servidor e consulte Configurações → Instagram → Mostrar token de verificação. Em produção, configure o mesmo valor na hospedagem.');
}
