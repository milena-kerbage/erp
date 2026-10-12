import { effectiveConfiguration, diagnostics, WhatsAppError, closeDatabase } from '../src/lib/whatsapp/core.ts';
import { legalIdentity } from '../src/features/legal/config.ts';
import { storageConfiguration, closeDatabases } from '../src/lib/database.ts';

try {
  const config = await effectiveConfiguration();
  const storage = storageConfiguration();
  console.log(`${storage.backend === 'postgres' ? 'OK' : 'PENDENTE'}: PostgreSQL/Supabase de produção (DATABASE_URL)`);
  for (const check of config.checks) console.log(`${check.configured ? 'OK' : 'PENDENTE'}: ${check.label} (${check.key})`);
  const identity = await legalIdentity();
  for (const [label, configured] of [['Identificação jurídica', Boolean(identity.entity && identity.cnpj && identity.address)], ['E-mail de privacidade', Boolean(identity.privacyEmail)], ['E-mail de suporte', Boolean(identity.supportEmail)]]) console.log(`${configured ? 'OK' : 'PENDENTE'}: ${label}`);
  if (!config.configured || storage.backend !== 'postgres' || !identity.privacyEmail || !identity.supportEmail) process.exitCode = 1;
  if (process.argv.includes('--remote')) {
    if (!config.configured) throw new Error('Complete a configuração local antes do diagnóstico remoto.');
    const result = await diagnostics();
    console.log(`OK: Meta respondeu ao diagnóstico. Aplicativos inscritos: ${result.subscriptions.length}.`);
    console.log('Confirme o aplicativo correto na WABA e execute o teste de envio e recebimento descrito no manual.');
  }
} catch (error) {
  console.error(error instanceof WhatsAppError || error instanceof Error && error.message === 'Complete a configuração local antes do diagnóstico remoto.' ? error.message : 'Diagnóstico falhou. Verifique a configuração e o acesso à Meta.');
  process.exitCode = 1;
} finally { await closeDatabase(); await closeDatabases(); }
