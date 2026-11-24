// Une os produtos repetidos da loja (lista em src/loja/lib/catalogo/unidos.ts): arquiva o repetido, leva
// ao mantido as fotos que faltavam e guarda um retrato do antes. IDEMPOTENTE e sem apagar nada
// (src/lib/loja/gestao/duplicados.ts). Sem --aplicar só confere e relata.
//
//   SQLite local:  DATABASE_URL= ALLOW_LOCAL_SQLITE=true npm run loja:duplicados -- --aplicar
//   PostgreSQL:    npm run loja:duplicados                      (só confere)
//                  npm run loja:duplicados -- --aplicar --retrato=<arquivo.json> --confirm=UNIR-DUPLICADOS
import { writeFileSync } from 'node:fs';
import { databaseTargetProblems, supabaseProject } from '../src/lib/supabase.ts';

const argumento = (nome) => process.argv.find((item) => item.startsWith(`--${nome}=`))?.split('=').slice(1).join('=');
const aplicar = process.argv.includes('--aplicar');
const remoto = Boolean(process.env.DATABASE_URL);
if (remoto) {
  if (aplicar && !process.argv.includes('--confirm=UNIR-DUPLICADOS')) { console.log('Recusado: DATABASE_URL definido (possivelmente PRODUÇÃO). Repita com --confirm=UNIR-DUPLICADOS.'); process.exit(1); }
  if (aplicar && !argumento('retrato')) { console.log('Informe --retrato=<arquivo.json> para guardar o antes.'); process.exit(1); }
  const problemas = [...supabaseProject().problems, ...databaseTargetProblems(process.env.DATABASE_URL)];
  if (problemas.length) { console.log([...new Set(problemas)].join('\n')); process.exit(1); }
} else if (process.env.ALLOW_LOCAL_SQLITE !== 'true') { console.log('Sem DATABASE_URL: use ALLOW_LOCAL_SQLITE=true.'); process.exit(1); }
if (aplicar) process.env.LOJA_GRAVAR_EM_DESENVOLVIMENTO = 'true';

const { PRODUTOS_UNIDOS } = await import('../src/loja/lib/catalogo/unidos.ts');
const { retratoDosPares, unirDuplicados } = await import('../src/lib/loja/gestao/duplicados.ts');
const { closeDatabases } = await import('../src/lib/database.ts');
try {
  if (aplicar && argumento('retrato')) {
    writeFileSync(argumento('retrato'), JSON.stringify({ tirado: new Date().toISOString(), pares: PRODUTOS_UNIDOS, produtos: await retratoDosPares(PRODUTOS_UNIDOS) }, null, 1), { flag: 'wx' });
    console.log(`Retrato do antes em ${argumento('retrato')}`);
  }
  const resumo = await unirDuplicados(PRODUTOS_UNIDOS, { simular: !aplicar });
  for (const par of resumo.pares) console.log(`  · ${par.situacao.padEnd(14)} ${par.arquivar} → ${par.manter}${par.fotosMovidas.length ? ` (+${par.fotosMovidas.length} foto${par.fotosMovidas.length > 1 ? 's' : ''})` : ''}${par.categoriaExtra ? ` [+${par.categoriaExtra}]` : ''}${par.situacao === 'nao_encontrado' ? ` — ${par.detalhe}` : ''}`);
  console.log(aplicar ? `Unidos: ${resumo.unidos} · já estavam: ${resumo.jaUnidos} · não encontrados: ${resumo.naoEncontrados} · fotos movidas: ${resumo.fotosMovidas} · textos de foto corrigidos: ${resumo.textosCorrigidos}` : `Só conferência (nada gravado): ${resumo.textosCorrigidos} texto(s) de foto a corrigir. Use --aplicar para gravar.`);
  if (aplicar && (resumo.unidos || resumo.textosCorrigidos)) console.log('A loja reflete em até 1 h (cache do catálogo); salvar qualquer produto no ERP faz valer na hora.');
} catch (erro) {
  console.log(`\nFalhou (${erro?.code || erro?.name || 'erro'}): ${erro?.message ?? ''}`);
  process.exitCode = 1;
} finally { await closeDatabases(); }
