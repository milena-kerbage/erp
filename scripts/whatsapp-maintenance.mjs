import { closeDatabase, pruneRetention } from '../src/lib/whatsapp/core.ts';
import { closeDatabases } from '../src/lib/database.ts';

try {
  console.log(JSON.stringify(await pruneRetention(), null, 2));
} catch {
  console.error('Não foi possível executar a retenção. Verifique o caminho e o acesso ao banco WhatsApp.');
  process.exitCode = 1;
} finally { await closeDatabase(); await closeDatabases(); }
