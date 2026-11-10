// Execute diariamente no ambiente do servidor; não imprime tokens, payloads ou identificadores.
import { currentConnection, pruneEvents } from '../src/lib/instagram/store.ts';
import { refreshToken } from '../src/lib/instagram/api.ts';
import { closeDatabases } from '../src/lib/database.ts';
try {
  await pruneEvents();
  const connection = await currentConnection();
  if (!connection) console.log('Retenção aplicada. Nenhuma conta OAuth conectada.');
  else if (connection.expires_at <= Date.now()) { console.error('Retenção aplicada. Token expirado: conecte novamente pelo ERP.'); process.exitCode = 1; }
  else if (connection.expires_at - Date.now() <= 15 * 86400_000 && Date.now() - connection.refreshed_at >= 86400_000) {
    await refreshToken(); console.log('Retenção aplicada e token renovado no banco criptografado.');
  } else console.log('Retenção aplicada. Renovação ainda não necessária.');
} catch { console.error('A manutenção não pôde ser concluída. Verifique a configuração, o banco e a conexão com a Meta pelo ERP.'); process.exitCode = 1; }
finally { await closeDatabases(); }
