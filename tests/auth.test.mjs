import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const folder = mkdtempSync(join(tmpdir(), 'mk-auth-'));
delete process.env.DATABASE_URL;
delete process.env.VERCEL;
process.env.AUTH_DB_PATH = join(folder, 'auth.sqlite');
const auth = await import('../src/lib/auth/core.ts');
after(async()=>{await auth.db().close(); rmSync(folder,{recursive:true,force:true});});

test('política exige letras, números e símbolos, sem limitar a apenas 8 caracteres', ()=>{
  for(const password of ['curta1!', 'abcdefgh', 'abcdefgh1', '12345678!', ' '.repeat(8)]) assert.equal(auth.validPassword(password),false);
  assert.equal(auth.validPassword('Senha#123'),true);
  assert.equal(auth.validPassword('áéíó123!'),true);
});
test('hash com salt, comparação real e mesmo algoritmo para conta inexistente', async()=>{
  const first = await auth.hashPassword('Teste#12345');
  const second = await auth.hashPassword('Teste#12345');
  assert.notEqual(first,second);
  assert.ok(!first.includes('Teste#12345'));
  assert.equal(await auth.verifyPassword('Teste#12345',first),true);
  assert.equal(await auth.verifyPassword('Errada#12345',first),false);
  assert.equal(await auth.verifyPassword('Teste#12345'),false);
  await auth.createUser('teste@example.test','Teste',first,'test-user');
});
test('sessões opacas, revogação no servidor e rejeição de cookies forjados', async()=>{
  const token = await auth.createSession('test-user');
  assert.equal((await auth.sessionUser(token))?.id,'test-user');
  assert.equal(await auth.sessionUser('a'.repeat(64)),null);
  assert.equal(await auth.db().prepare('SELECT hash FROM sessions WHERE hash = ?').get(token),undefined);
  await auth.revokeSession(token);
  assert.equal(await auth.sessionUser(token),null);
});
test('sessões expiram por inatividade e por prazo absoluto', async()=>{
  const token = await auth.createSession('test-user');
  await auth.db().prepare('UPDATE sessions SET seen = ? WHERE hash = ?').run(Date.now()-auth.IDLE_TTL-1,auth.digest(token));
  assert.equal(await auth.sessionUser(token),null);
  const next=await auth.createSession('test-user');
  await auth.db().prepare('UPDATE sessions SET expires = ? WHERE hash = ?').run(Date.now()-1,auth.digest(next));
  assert.equal(await auth.sessionUser(next),null);
});

test('validação para polling não renova atividade nem reativa sessão expirada ou revogada', async()=>{
  const token=await auth.createSession('test-user');
  const seen=Date.now()-10*60*1000;
  await auth.db().prepare('UPDATE sessions SET seen = ? WHERE hash = ?').run(seen,auth.digest(token));
  assert.equal((await auth.sessionUser(token,false))?.id,'test-user');
  assert.equal((await auth.db().prepare('SELECT seen FROM sessions WHERE hash = ?').get(auth.digest(token))).seen,seen);
  assert.equal((await auth.sessionUser(token))?.id,'test-user');
  assert.ok((await auth.db().prepare('SELECT seen FROM sessions WHERE hash = ?').get(auth.digest(token))).seen>seen);
  const expiredSeen=Date.now()-auth.IDLE_TTL-1;
  await auth.db().prepare('UPDATE sessions SET seen = ? WHERE hash = ?').run(expiredSeen,auth.digest(token));
  assert.equal(await auth.sessionUser(token,false),null);
  assert.equal((await auth.db().prepare('SELECT seen FROM sessions WHERE hash = ?').get(auth.digest(token))).seen,expiredSeen);
  await auth.revokeSession(token);
  assert.equal(await auth.sessionUser(token,false),null);
});
test('limite compartilhado e persistente, independente de existência da conta',async()=>{
  for(let i=0;i<5;i++) assert.equal(await auth.limited('login:teste',5),false);
  assert.equal(await auth.limited('login:teste',5),true);
});
test('link de recuperação expira, funciona uma vez e revoga todas as sessões',async()=>{
  const session=await auth.createSession('test-user');
  const token=await auth.issueReset(await auth.findUser('teste@example.test'));
  assert.equal(await auth.resetPassword('x'.repeat(64),'Nova#12345'),false);
  assert.equal(await auth.resetPassword(token,'Nova#12345'),true);
  assert.equal(await auth.resetPassword(token,'Outra#12345'),false);
  assert.equal(await auth.sessionUser(session),null);
  assert.equal(await auth.verifyPassword('Nova#12345',(await auth.findUser('teste@example.test')).password_hash),true);
  const expired=await auth.issueReset(await auth.findUser('teste@example.test'));
  await auth.db().prepare('UPDATE resets SET expires = ? WHERE hash = ?').run(Date.now()-1,auth.digest(expired));
  assert.equal(await auth.resetPassword(expired,'Outra#12345'),false);
});
test('SQL injection no e-mail não retorna usuário',async()=>assert.equal(await auth.findUser("' OR 1=1 --"),undefined));

test('senha alterada revoga sessões e rejeita login validado com hash antigo',async()=>{
  const previous=await auth.findUser('teste@example.test');
  const first=await auth.createVerifiedSession(previous);
  const second=await auth.createSession(previous.id);
  const token=await auth.changeUserPassword(previous,'Segura!Nova12345');
  assert.ok(token);
  assert.equal(await auth.sessionUser(first),null);
  assert.equal(await auth.sessionUser(second),null);
  assert.equal((await auth.sessionUser(token))?.id,previous.id);
  assert.equal(await auth.createVerifiedSession(previous),null);
  assert.equal(await auth.changeUserPassword(previous,'Invalida!Nova12345'),null);
});

test('resets concorrentes consomem o token uma vez e rejeitam sessões do hash anterior', async()=>{
  const previous=await auth.findUser('teste@example.test');
  const token=await auth.issueReset(previous);
  const results=await Promise.all([auth.resetPassword(token,'Primeira!Nova123'),auth.resetPassword(token,'Segunda!Nova123')]);
  assert.equal(results.filter(Boolean).length,1);
  assert.equal(await auth.createVerifiedSession(previous),null);
  assert.equal(await auth.resetPassword(token,'Terceira!Nova123'),false);
});

test('falha na transação desfaz alteração de senha e preserva sessão anterior', async()=>{
  const previous=await auth.findUser('teste@example.test');
  const session=await auth.createSession(previous.id);
  await assert.rejects(auth.db().transaction(async()=>{
    await auth.db().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run('hash-que-deve-ser-desfeito',previous.id);
    await auth.db().prepare('DELETE FROM sessions WHERE user_id = ?').run(previous.id);
    throw new Error('Falha intencional de teste.');
  }));
  assert.equal((await auth.findUser(previous.email)).password_hash,previous.password_hash);
  assert.equal((await auth.sessionUser(session))?.id,previous.id);
});
