import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const folder = mkdtempSync(join(tmpdir(), 'mk-auth-'));
process.env.AUTH_DB_PATH = join(folder, 'auth.sqlite');
const auth = await import('../src/lib/auth/core.ts');
after(()=>{auth.db().close(); rmSync(folder,{recursive:true,force:true});});

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
  auth.createUser('teste@example.test','Teste',first,'test-user');
});
test('sessões opacas, revogação no servidor e rejeição de cookies forjados', ()=>{
  const token = auth.createSession('test-user');
  assert.equal(auth.sessionUser(token)?.id,'test-user');
  assert.equal(auth.sessionUser('a'.repeat(64)),null);
  assert.equal(auth.db().prepare('SELECT hash FROM sessions WHERE hash = ?').get(token),undefined);
  auth.revokeSession(token);
  assert.equal(auth.sessionUser(token),null);
});
test('sessões expiram por inatividade e por prazo absoluto', ()=>{
  const token = auth.createSession('test-user');
  auth.db().prepare('UPDATE sessions SET seen = ? WHERE hash = ?').run(Date.now()-auth.IDLE_TTL-1,auth.digest(token));
  assert.equal(auth.sessionUser(token),null);
  const next=auth.createSession('test-user');
  auth.db().prepare('UPDATE sessions SET expires = ? WHERE hash = ?').run(Date.now()-1,auth.digest(next));
  assert.equal(auth.sessionUser(next),null);
});
test('limite compartilhado e persistente, independente de existência da conta',()=>{
  for(let i=0;i<5;i++) assert.equal(auth.limited('login:teste',5),false);
  assert.equal(auth.limited('login:teste',5),true);
});
test('link de recuperação expira, funciona uma vez e revoga todas as sessões',async()=>{
  const session=auth.createSession('test-user');
  const token=auth.issueReset(auth.findUser('teste@example.test'));
  assert.equal(await auth.resetPassword('x'.repeat(64),'Nova#12345'),false);
  assert.equal(await auth.resetPassword(token,'Nova#12345'),true);
  assert.equal(await auth.resetPassword(token,'Outra#12345'),false);
  assert.equal(auth.sessionUser(session),null);
  assert.equal(await auth.verifyPassword('Nova#12345',auth.findUser('teste@example.test').password_hash),true);
  const expired=auth.issueReset(auth.findUser('teste@example.test'));
  auth.db().prepare('UPDATE resets SET expires = ? WHERE hash = ?').run(Date.now()-1,auth.digest(expired));
  assert.equal(await auth.resetPassword(expired,'Outra#12345'),false);
});
test('SQL injection no e-mail não retorna usuário',()=>assert.equal(auth.findUser("' OR 1=1 --"),undefined));

test('senha alterada revoga sessões e rejeita login validado com hash antigo',async()=>{
  const previous=auth.findUser('teste@example.test');
  const first=auth.createVerifiedSession(previous);
  const second=auth.createSession(previous.id);
  const token=await auth.changeUserPassword(previous,'Segura!Nova12345');
  assert.ok(token);
  assert.equal(auth.sessionUser(first),null);
  assert.equal(auth.sessionUser(second),null);
  assert.equal(auth.sessionUser(token)?.id,previous.id);
  assert.equal(auth.createVerifiedSession(previous),null);
  assert.equal(await auth.changeUserPassword(previous,'Invalida!Nova12345'),null);
});
