import { completeDeletion, deletionDb, listDeletionRequests } from '../src/lib/meta/deletion.ts';
import { closeDatabases } from '../src/lib/database.ts';

try {
  const [action, code, outcome, note] = process.argv.slice(2);
  if (action === 'list') console.log(JSON.stringify(await listDeletionRequests(), null, 2));
  else if (action === 'complete' && ['completed', 'no_matching_data'].includes(outcome)) console.log(JSON.stringify(await completeDeletion(code || '', outcome, note || ''), null, 2));
  else throw new Error('Uso: npm run meta:deletion -- list | complete <protocolo> <completed|no_matching_data> "evidência da revisão, sem dados pessoais". O comando registra revisão; não executa exclusão de contatos.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Falha ao revisar protocolos.');
  process.exitCode = 1;
} finally { await deletionDb().close(); await closeDatabases(); }
