import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { createUser, db, findUser, hashPassword, normalizeEmail, validEmail, validPassword, newToken } from '../src/lib/auth/core.ts';

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
  // Mensagens específicas: só estes erros (e a configuração do banco) explicam o motivo; o resto fica genérico.
  const reason = message => Object.assign(new Error(message), { explained: true });
  if (password !== confirm) throw reason('As senhas digitadas não são iguais. Tente de novo.');
  if (!validPassword(password)) throw reason('Senha fora da política: use de 8 a 128 caracteres, com pelo menos uma letra, um número e um símbolo (por exemplo ! @ # ?).');
  if (await findUser(email)) throw reason('Este e-mail já está cadastrado. Entre em /login ou use outro e-mail.');
  const hash = await hashPassword(password);
  await createUser(email, name, hash, newToken());
  stdout.write('Conta criada. Entre em /login com suas credenciais.\n');
} catch (error) {
  if (error?.code === 'DATABASE_NOT_CONFIGURED' || error?.explained) stdout.write(`${error.message}\n`);
  else stdout.write(`Não foi possível criar a conta (${error?.code || error?.name || 'erro'}). Rode npm run db:check para conferir a conexão com o banco.\n`);
  process.exitCode = 1;
}
finally {password = ''; confirm = ''; try { await db().close(); } catch { /* banco não configurado: nada a fechar */ }}
