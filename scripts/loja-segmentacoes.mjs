// Segmentações da loja (Kit berço menina/menino/unissex, Kit cama kids, Kit maternidade, Kit paninhos,
// Para presentear, Itens complementares), produtos das planilhas de orçamento e o menu novo.
// IDEMPOTENTE (src/lib/loja/gestao/segmentacoes.ts). Aplique a migração 016 (relevância) antes.
//
//   SQLite local:  DATABASE_URL= ALLOW_LOCAL_SQLITE=true MEDIA_STORAGE_DRIVER=database npm run loja:segmentacoes -- --fotos=<pasta>
//   PostgreSQL:    npm run loja:segmentacoes -- --fotos=<pasta> --confirm=APLICAR-SEGMENTACOES
//
// --fotos: pasta com as fotos de produto (a3-*.jpg, ninho-*.png…). Sem ela, os produtos entram sem foto.
// O menu anterior é salvo em --backup (padrão: ./.data/menu-antes-segmentacoes-<data>.json).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { databaseTargetProblems, supabaseProject } from '../src/lib/supabase.ts';

const argumento = (nome) => process.argv.find((item) => item.startsWith(`--${nome}=`))?.split('=').slice(1).join('=');
const remoto = Boolean(process.env.DATABASE_URL);
if (remoto) {
  if (!process.argv.includes('--confirm=APLICAR-SEGMENTACOES')) {
    console.log('Recusado: DATABASE_URL está definido (possivelmente PRODUÇÃO). Confira com npm run db:check e repita com --confirm=APLICAR-SEGMENTACOES.');
    process.exit(1);
  }
  const problemas = [...supabaseProject().problems, ...databaseTargetProblems(process.env.DATABASE_URL)];
  if (problemas.length) { console.log([...new Set(problemas)].join('\n')); process.exit(1); }
} else if (process.env.ALLOW_LOCAL_SQLITE !== 'true') {
  console.log('Sem DATABASE_URL: para o SQLite local, use ALLOW_LOCAL_SQLITE=true.');
  process.exit(1);
}
process.env.LOJA_GRAVAR_EM_DESENVOLVIMENTO = 'true';

const fotos = argumento('fotos');
const backup = argumento('backup') ?? `.data/menu-antes-segmentacoes-${new Date().toISOString().slice(0, 10)}.json`;
const { aplicarSegmentacoes } = await import('../src/lib/loja/gestao/segmentacoes.ts');
const { closeDatabases } = await import('../src/lib/database.ts');
try {
  console.log(`Aplicando segmentações (${remoto ? 'PostgreSQL de DATABASE_URL' : 'SQLite local'})…`);
  const { menuAntes, ...resumo } = await aplicarSegmentacoes(fotos ?? '', Boolean(fotos));
  mkdirSync(dirname(backup), { recursive: true });
  writeFileSync(backup, JSON.stringify(menuAntes, null, 2));
  for (const [chave, valor] of Object.entries(resumo)) console.log(`  · ${chave}: ${valor}`);
  console.log(`  · backup do menu anterior: ${backup} (${menuAntes.length} itens)`);
} catch (erro) {
  console.log(`\nFalhou (${erro?.code || erro?.name || 'erro'}): ${erro?.message ?? ''}`);
  process.exitCode = 1;
} finally {
  await closeDatabases();
}
