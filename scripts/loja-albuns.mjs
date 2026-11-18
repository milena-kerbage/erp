// Produtos catalogados dos álbuns do ateliê (Google Fotos): ativos e sem preço ("Sob consulta").
// IDEMPOTENTE (src/lib/loja/gestao/albuns.ts). Rode depois de loja:segmentacoes.
//
//   SQLite local:  DATABASE_URL= ALLOW_LOCAL_SQLITE=true MEDIA_STORAGE_DRIVER=database npm run loja:albuns -- --lista=<produtos.json> --fotos=<pasta>
//   PostgreSQL:    npm run loja:albuns -- --lista=<produtos.json> --fotos=<pasta> --confirm=APLICAR-ALBUNS
import { readFileSync } from 'node:fs';
import { databaseTargetProblems, supabaseProject } from '../src/lib/supabase.ts';

const argumento = (nome) => process.argv.find((item) => item.startsWith(`--${nome}=`))?.split('=').slice(1).join('=');
const remoto = Boolean(process.env.DATABASE_URL);
if (remoto) {
  if (!process.argv.includes('--confirm=APLICAR-ALBUNS')) { console.log('Recusado: DATABASE_URL definido (possivelmente PRODUÇÃO). Repita com --confirm=APLICAR-ALBUNS.'); process.exit(1); }
  const problemas = [...supabaseProject().problems, ...databaseTargetProblems(process.env.DATABASE_URL)];
  if (problemas.length) { console.log([...new Set(problemas)].join('\n')); process.exit(1); }
} else if (process.env.ALLOW_LOCAL_SQLITE !== 'true') { console.log('Sem DATABASE_URL: use ALLOW_LOCAL_SQLITE=true.'); process.exit(1); }
process.env.LOJA_GRAVAR_EM_DESENVOLVIMENTO = 'true';
const lista = argumento('lista'), fotos = argumento('fotos');
if (!lista || !fotos) { console.log('Informe --lista=<produtos.json> e --fotos=<pasta>.'); process.exit(1); }
const { aplicarProdutosDosAlbuns } = await import('../src/lib/loja/gestao/albuns.ts');
const { closeDatabases } = await import('../src/lib/database.ts');
try {
  const resumo = await aplicarProdutosDosAlbuns(JSON.parse(readFileSync(lista, 'utf8')), fotos);
  for (const [chave, valor] of Object.entries(resumo)) console.log(`  · ${chave}: ${valor}`);
} catch (erro) {
  console.log(`\nFalhou (${erro?.code || erro?.name || 'erro'}): ${erro?.message ?? ''}`);
  process.exitCode = 1;
} finally { await closeDatabases(); }
