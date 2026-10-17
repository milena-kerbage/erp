import { test } from 'node:test';
import assert from 'node:assert/strict';
import { supabaseProject, databaseTargetProblems, environmentPresence } from '../src/lib/supabase.ts';

// Valores sintéticos: nenhum identificador ou credencial real é usado nos testes.
const ref = 'abcdefghijklmnopqrst';
const other = 'tsrqponmlkjihgfedcba';
const pooler = (user, host = 'aws-0-sa-east-1.pooler.supabase.com') => `postgresql://${user}:senha-de-teste@${host}:6543/postgres`;

test('SUPABASE_URL e SUPABASE_PROJECT_ID precisam ser consistentes', () => {
  assert.deepEqual(supabaseProject({}), { projectId: undefined, problems: [] });
  assert.equal(supabaseProject({ SUPABASE_PROJECT_ID: ref }).projectId, ref);
  assert.equal(supabaseProject({ SUPABASE_URL: `https://${ref}.supabase.co` }).projectId, ref);
  assert.equal(supabaseProject({ SUPABASE_URL: `https://${ref}.supabase.co/`, SUPABASE_PROJECT_ID: ref }).problems.length, 0);
  assert.match(supabaseProject({ SUPABASE_URL: `https://${ref}.supabase.co`, SUPABASE_PROJECT_ID: other }).problems.join(' '), /projetos diferentes/);
  for (const url of [`http://${ref}.supabase.co`, `https://${ref}.example.com`, `https://user:x@${ref}.supabase.co`, `https://${ref}.supabase.co/rest/v1`, 'não é url']) {
    assert.match(supabaseProject({ SUPABASE_URL: url }).problems.join(' '), /SUPABASE_URL/);
  }
  assert.match(supabaseProject({ SUPABASE_PROJECT_ID: 'curto' }).problems.join(' '), /SUPABASE_PROJECT_ID/);
});

test('DATABASE_URL precisa pertencer ao projeto configurado', () => {
  const environment = { SUPABASE_PROJECT_ID: ref };
  assert.deepEqual(databaseTargetProblems(pooler(`postgres.${ref}`), environment), []);
  assert.deepEqual(databaseTargetProblems(`postgresql://postgres:senha-de-teste@db.${ref}.supabase.co:5432/postgres`, environment), []);
  assert.equal(databaseTargetProblems(pooler(`postgres.${other}`), environment).length, 1);
  assert.equal(databaseTargetProblems(`postgresql://postgres:senha-de-teste@db.${other}.supabase.co:5432/postgres`, environment).length, 1);
  assert.equal(databaseTargetProblems('postgresql://postgres:senha-de-teste@127.0.0.1:5432/postgres', environment).length, 1);
  // Sem projeto configurado não há o que conferir.
  assert.deepEqual(databaseTargetProblems('postgresql://postgres:senha-de-teste@127.0.0.1:5432/postgres', {}), []);
});

test('mensagens de erro e diagnóstico não repetem valores de variáveis', () => {
  const secret = 'senha-super-secreta-de-teste';
  const url = `postgresql://postgres.${other}:${secret}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`;
  assert.ok(!databaseTargetProblems(url, { SUPABASE_PROJECT_ID: ref }).join(' ').includes(secret));
  assert.deepEqual(environmentPresence(['A', 'B', 'C'], { A: 'valor', B: '  ', C: undefined }), { A: true, B: false, C: false });
});

test('sem DATABASE_URL o banco local só abre com opt-in explícito', async () => {
  const saved = { ...process.env };
  try {
    delete process.env.DATABASE_URL; delete process.env.VERCEL; delete process.env.ALLOW_LOCAL_SQLITE;
    const { databaseFor, storageConfiguration } = await import('../src/lib/database.ts');
    assert.throws(() => databaseFor('auth', ':memory:', ''), error => error.code === 'DATABASE_NOT_CONFIGURED' && /DATABASE_URL/.test(error.message));
    assert.deepEqual(storageConfiguration(), { backend: 'sqlite', configured: false, persistent: false });
    process.env.ALLOW_LOCAL_SQLITE = 'true';
    assert.equal(databaseFor('auth', ':memory:', '').backend, 'sqlite');
    process.env.VERCEL = '1';
    assert.throws(() => databaseFor('auth', ':memory:', ''), error => error.code === 'DATABASE_NOT_CONFIGURED');
    delete process.env.VERCEL;
    // Projeto configurado + conexão de outro projeto: recusa antes de abrir o pool.
    process.env.SUPABASE_PROJECT_ID = ref; process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = pooler(`postgres.${other}`);
    assert.throws(() => databaseFor('auth', ':memory:', ''), error => error.code === 'DATABASE_NOT_CONFIGURED' && /SUPABASE_PROJECT_ID/.test(error.message));
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});
