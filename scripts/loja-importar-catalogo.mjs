// Importa o catálogo de exemplo da loja (em código) para as tabelas da gestão do e-commerce (migração 010):
// categorias, grupos de opções, produtos, a coleção "Mais vendidos", o menu do cabeçalho e o cupom ENXOVAL10.
// IDEMPOTENTE: só insere o que falta (pelo caminho, slug, chave e código); nunca sobrescreve o que a equipe
// editou no ERP. O menu só entra com a tabela vazia.
//
//   SQLite local:  DATABASE_URL= ALLOW_LOCAL_SQLITE=true npm run loja:importar-catalogo
//   PostgreSQL:    npm run loja:importar-catalogo -- --confirm=IMPORTAR-CATALOGO
//
// Com DATABASE_URL (que em .env.local é o banco de PRODUÇÃO), exige a confirmação explícita, como o db:migrate.
// Mostra só contagens; nunca URLs, senhas ou conteúdo de registros. Aplique a migração 010 antes.
import { databaseTargetProblems, supabaseProject } from '../src/lib/supabase.ts';

const remoto = Boolean(process.env.DATABASE_URL);
if (remoto) {
  if (!process.argv.includes('--confirm=IMPORTAR-CATALOGO')) {
    console.log('Recusado: DATABASE_URL está definido (possivelmente PRODUÇÃO) e a importação grava nele.\nConfira o destino com npm run db:check e repita com --confirm=IMPORTAR-CATALOGO, ou rode no SQLite local: DATABASE_URL= ALLOW_LOCAL_SQLITE=true npm run loja:importar-catalogo');
    process.exit(1);
  }
  const problemas = [...supabaseProject().problems, ...databaseTargetProblems(process.env.DATABASE_URL)];
  if (problemas.length) { console.log([...new Set(problemas)].join('\n')); process.exit(1); }
} else if (process.env.ALLOW_LOCAL_SQLITE !== 'true') {
  console.log('Sem DATABASE_URL: para o SQLite local, use ALLOW_LOCAL_SQLITE=true (arquivo em ERP_DB_PATH ou .data/erp.sqlite).');
  process.exit(1);
}

const { importarCatalogoDeExemplo } = await import('../src/lib/loja/gestao/semente.ts');
const { closeDatabases } = await import('../src/lib/database.ts');
try {
  console.log(`Importando o catálogo de exemplo (${remoto ? 'PostgreSQL de DATABASE_URL' : 'SQLite local'})…`);
  const resumo = await importarCatalogoDeExemplo('importacao');
  for (const [nome, { criados, existentes }] of Object.entries(resumo)) console.log(`  · ${nome}: ${criados} criado(s), ${existentes} já existia(m)`);
  console.log('\nResultado: importação concluída. A loja passa a ler o catálogo do banco no próximo carregamento (cache de até 1 h; escritas pelo ERP invalidam na hora).');
} catch (erro) {
  console.log(`\nFalhou (${erro?.code || erro?.name || 'erro'}): ${erro?.message ?? ''}\nNada foi gravado (uma transação só). Confira se a migração 010 foi aplicada (npm run db:check).`);
  process.exitCode = 1;
} finally {
  await closeDatabases();
}
