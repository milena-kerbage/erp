import { randomBytes } from 'node:crypto';
import { constants, existsSync, lstatSync, openSync, readFileSync, closeSync, writeFileSync, renameSync, chmodSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import { settingsDb, encryptionReady } from '../whatsapp/config.ts';
import { WhatsAppError } from '../whatsapp/core.ts';
import { loopbackOrigin } from './access.ts';

export function localBootstrapAvailable(origin: string) {
  return process.env.NODE_ENV === 'development' && process.env.VERCEL !== '1' && loopbackOrigin(origin);
}
let preparing: Promise<void> = Promise.resolve();
export async function prepareLocalEncryption(origin: string, directory = process.cwd()) {
  if (!localBootstrapAvailable(origin)) throw new WhatsAppError(403, 'A preparação automática da chave só está disponível no desenvolvimento local. Na Vercel, configure a chave nas variáveis de ambiente.', 'LOCAL_BOOTSTRAP_ONLY');
  const previous = preparing;
  let release!: () => void;
  preparing = new Promise<void>(resolve => { release = resolve; });
  await previous;
  try {
    if (encryptionReady()) return { created: false, configured: true };
    if (process.env.INTEGRATION_ENCRYPTION_KEY) throw new WhatsAppError(409, 'A chave existente é inválida. Corrija ou restaure a chave original antes de continuar.', 'ENCRYPTION_KEY_RESTORE_REQUIRED');
    const destination = join(directory, '.env.local');
    let source = '';
    if (existsSync(destination)) {
      const info = lstatSync(destination);
      if (!info.isFile() || info.isSymbolicLink() || info.size > 128 * 1024) throw new WhatsAppError(409, 'O arquivo de ambiente local precisa ser um arquivo regular de até 128 KiB.', 'ENV_FILE_UNSAFE');
      const descriptor = openSync(destination, constants.O_RDONLY | constants.O_NOFOLLOW);
      try { source = readFileSync(descriptor, 'utf8'); } finally { closeSync(descriptor); }
      const existing = parseEnv(source).INTEGRATION_ENCRYPTION_KEY;
      if (existing) {
        if (!/^[A-Za-z0-9+/]{43}=$/.test(existing) || Buffer.from(existing, 'base64').toString('base64') !== existing) throw new WhatsAppError(409, 'A chave no arquivo local é inválida. Restaure a chave original; não será substituída automaticamente.', 'ENCRYPTION_KEY_RESTORE_REQUIRED');
        process.env.INTEGRATION_ENCRYPTION_KEY = existing;
        chmodSync(destination, 0o600);
        return { created: false, configured: true };
      }
    }
    const row = await settingsDb().prepare('SELECT COUNT(*) AS count FROM integration_settings WHERE encrypted = 1').get() as { count: number };
    if (row.count) throw new WhatsAppError(409, 'Já existem segredos criptografados. Restaure a chave original para recuperá-los.', 'ENCRYPTION_KEY_RESTORE_REQUIRED');
    const key = randomBytes(32).toString('base64');
    const withoutEmptyKey = source.replace(/^\s*(?:export\s+)?INTEGRATION_ENCRYPTION_KEY\s*=.*$/gm, '');
    const temporary = join(directory, `.env.local.integration-${randomBytes(12).toString('hex')}.tmp`);
    try {
      writeFileSync(temporary, `${withoutEmptyKey}${withoutEmptyKey.endsWith('\n') || !withoutEmptyKey ? '' : '\n'}INTEGRATION_ENCRYPTION_KEY=${key}\n`, { mode: 0o600, flag: 'wx' });
      renameSync(temporary, destination);
    } finally { if (existsSync(temporary)) unlinkSync(temporary); }
    process.env.INTEGRATION_ENCRYPTION_KEY = key;
    return { created: true, key, configured: true };
  } finally { release(); }
}
