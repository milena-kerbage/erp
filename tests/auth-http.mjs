import assert from 'node:assert/strict';
import { createUser, hashPassword, newToken, db, digest, issueReset, findUser, createSession } from '../src/lib/auth/core.ts';
const origin=process.env.AUTH_TEST_ORIGIN || 'http://localhost:3000';
const id=newToken(), email=`test-${id}@example.test`;
let password=`Teste!${newToken()}`;
const createdKeys=[];
async function post(action,body={},cookie='',requestOrigin=process.env.AUTH_ORIGIN || origin) {
  return fetch(`${origin}/api/auth/${action}`,{method:'POST',redirect:'manual',headers:{origin:requestOrigin,'Content-Type':'application/json',...(cookie?{cookie}: {})},body:JSON.stringify(body)});
}
async function login() {
  const response=await post('login',{email,password});
  assert.equal(response.status,200,JSON.stringify(await response.clone().json()));
  const header=response.headers.get('set-cookie');
  assert.match(header,/HttpOnly/i);assert.match(header,/SameSite=lax/i);assert.match(header,/Path=\//i);
  if(process.env.AUTH_ORIGIN?.startsWith('https://')) assert.match(header,/Secure/i);
  assert.ok(!/Max-Age|Expires/i.test(header),'cookie de sessão sem persistência');
  return header.split(';')[0];
}
try {
  createUser(email,'Teste temporário',await hashPassword(password),id);
  for (const path of ['/','/leads','/clientes','/conversas','/configuracoes/perfil','/leads/lead-001']) {
    const response=await fetch(origin+path,{redirect:'manual'});
    assert.equal(response.status,307,`${path} precisa bloquear acesso anônimo`);
    assert.ok(response.headers.get('location').endsWith('/login'));
  }
  console.log('OK: páginas internas bloqueadas sem sessão');
  assert.equal((await fetch(origin+'/login')).status,200);
  const fake=await fetch(origin+'/',{redirect:'manual',headers:{cookie:'mk_session='+'a'.repeat(64)}});
  assert.equal(fake.status,307);
  assert.equal((await post('login',{email,password},'','https://attacker.example')).status,403);
  console.log('OK: cookie forjado e requisição de outra origem rejeitados');
  const wrong=await post('login',{email,password:'Errada!12345'});
  const absentEmail=`absent-${id}@example.test`;
  const absent=await post('login',{email:absentEmail,password:'Errada!12345'});
  createdKeys.push('login:'+digest(absentEmail));
  assert.equal(wrong.status,401); assert.equal(absent.status,401);
  assert.deepEqual(await wrong.json(),await absent.json());
  console.log('OK: erro igual para senha errada e conta inexistente');
  let cookie=await login();
  const page=await fetch(origin+'/',{redirect:'manual',headers:{cookie}});
  assert.equal(page.status,200);
  assert.match(page.headers.get('cache-control'),/no-store|no-cache/);
  console.log('OK: login real permite acesso e resposta não é armazenada em cache');
  const other=cookie.split('=')[0]+'='+createSession(id);
  assert.equal((await post('logout-others',{},cookie)).status,200);
  assert.equal((await fetch(origin+'/',{redirect:'manual',headers:{cookie:other}})).status,307);
  assert.equal((await fetch(origin+'/',{redirect:'manual',headers:{cookie}})).status,200);
  console.log('OK: sair dos outros aparelhos mantém somente a sessão atual');
  const beforeChange=cookie;
  const newPassword='Atualizada!Senha12345';
  const changed=await post('change-password',{current:password,password:newPassword},cookie);
  assert.equal(changed.status,200);
  cookie=changed.headers.get('set-cookie').split(';')[0];
  password=newPassword;
  assert.equal((await fetch(origin+'/',{redirect:'manual',headers:{cookie:beforeChange}})).status,307);
  assert.equal((await fetch(origin+'/',{redirect:'manual',headers:{cookie}})).status,200);
  console.log('OK: troca de senha real renova cookie e invalida sessão anterior');
  assert.equal((await post('logout',{},cookie,'https://attacker.example')).status,403);
  const logout=await post('logout',{},cookie);
  assert.equal(logout.status,200);
  assert.match(logout.headers.get('set-cookie'),/Max-Age=0/i);
  assert.equal((await fetch(origin+'/',{redirect:'manual',headers:{cookie}})).status,307);
  console.log('OK: logout invalida cookie capturado, inclusive no servidor');
  const fresh=await login();
  const resetToken=issueReset(findUser(email));
  assert.equal((await post('reset',{token:resetToken,password:'Nova!Senha12345'})).status,200);
  assert.equal((await post('reset',{token:resetToken,password:'Outra!Senha12345'})).status,400);
  assert.equal((await fetch(origin+'/',{redirect:'manual',headers:{cookie:fresh}})).status,307);
  console.log('OK: redefinição via API usa token uma vez e revoga sessões');
  for(let i=0;i<6;i++) {
    const result=await post('login',{email,password:'Errada!12345'});
    if(i===5) assert.equal(result.status,429);
  }
  console.log('OK: limite de tentativas aplicado pelo backend');
} finally {
  db().prepare('DELETE FROM users WHERE id = ?').run(id);
  for (const key of ['login:'+digest(email),'reset:'+digest(''),...createdKeys]) db().prepare('DELETE FROM attempts WHERE key = ?').run(key);
  db().close();
}
