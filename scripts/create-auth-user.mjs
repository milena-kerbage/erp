import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { createUser, db, hashPassword, normalizeEmail, validEmail, newToken } from '../src/lib/auth/core.ts';

if (!stdin.isTTY || !stdout.isTTY) throw new Error('Execute em um terminal interativo. Não informe a senha como argumento ou variável de ambiente.');
const prompts = createInterface({input: stdin, output: stdout});
const email = normalizeEmail(process.argv[2] || await prompts.question('E-mail de acesso: '));
const name = (await prompts.question('Nome: ')).trim();
prompts.close();
if (!validEmail(email) || !name) throw new Error('Informe um e-mail válido e um nome.');
async function hiddenPassword(label) {
  stdout.write(label);
  stdin.setRawMode(true);
  stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const done = (error) => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
      if (error) reject(error); else resolve(value);
    };
    const onData = chunk => {
      for (const char of chunk.toString('utf8')) {
        if (char === '\u0003') return done(new Error('Cancelado.'));
        if (char === '\r' || char === '\n') return done();
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else if (char >= ' ' && value.length < 128) value += char;
      }
    };
    stdin.on('data', onData);
  });
}
let password = await hiddenPassword('Senha (não será exibida): ');
let confirm = await hiddenPassword('Confirme a senha: ');
try {
  if (password !== confirm) throw new Error('As senhas não são iguais.');
  const hash = await hashPassword(password);
  const first = !db().prepare('SELECT id FROM users LIMIT 1').get();
  createUser(email, name, hash, first ? 'user-milena' : newToken());
  stdout.write('Conta criada. Entre em /login com suas credenciais.\n');
} catch { stdout.write('Não foi possível criar a conta. Verifique se o e-mail já está cadastrado e se a senha tem de 8 a 128 caracteres, com letras, números e símbolos.\n'); process.exitCode = 1; }
finally {password = ''; confirm = ''; db().close();}
