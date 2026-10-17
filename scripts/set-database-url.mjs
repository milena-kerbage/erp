// Grava DATABASE_URL (e, opcionalmente, DATABASE_SSL_CA) em .env.local a partir de prompts no terminal.
// A senha é lida de forma OCULTA: não é exibida, não vai para o histórico do shell nem passa por argumento ou chat.
//   npm run env:set-database-url
//
// Basta a senha do banco: a URL é montada com o id do projeto (SUPABASE_PROJECT_ID), pela conexão direta
// postgresql://postgres:<senha>@db.<project-id>.supabase.co:5432/postgres. Também aceita colar a URL
// completa (por exemplo a do Transaction Pooler, copiada do painel Connect).
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { resolve } from 'node:path';
import { stdin, stdout } from 'node:process';
import { databaseTargetProblems, supabaseProject } from '../src/lib/supabase.ts';

if (!stdin.isTTY || !stdout.isTTY) throw new Error('Execute em um terminal interativo. Não informe a senha como argumento ou variável de ambiente.');

async function hiddenInput(label) {
  stdout.write(label);
  stdin.setRawMode(true);
  stdin.resume();
  return new Promise((resolveInput, reject) => {
    let value = '';
    const done = error => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
      if (error) reject(error); else resolveInput(value.trim());
    };
    const onData = chunk => {
      for (const char of chunk.toString('utf8')) {
        if (char === '\u0003') return done(new Error('Cancelado.'));
        if (char === '\r' || char === '\n') return done();
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else if (char >= ' ' && value.length < 1024) value += char;
      }
    };
    stdin.on('data', onData);
  });
}

/** Troca (ou acrescenta) NOME=valor em .env.local, preservando as demais linhas. */
function setVariable(lines, name, value) {
  const index = lines.findIndex(line => line.startsWith(`${name}=`));
  if (index >= 0) lines[index] = `${name}=${value}`;
  else { if (lines.length && lines[lines.length - 1] === '') lines.pop(); lines.push(`${name}=${value}`, ''); }
}

let secret = await hiddenInput('Senha do banco do Supabase, ou a URL completa (não será exibida): ');
try {
  let connection = secret;
  if (!/^postgres(ql)?:\/\//.test(secret)) {
    const { projectId } = supabaseProject();
    if (!projectId) throw new Error('SUPABASE_PROJECT_ID (ou SUPABASE_URL) válido precisa estar no .env.local para montar a URL.');
    if (!secret) throw new Error('Nenhuma senha informada.');
    connection = `postgresql://postgres:${encodeURIComponent(secret)}@db.${projectId}.supabase.co:5432/postgres`;
  }
  let url;
  try { url = new URL(connection); } catch { throw new Error('Formato inválido: use a senha do banco ou uma URL postgresql://usuario:senha@host:porta/postgres.'); }
  if (!url.hostname || !url.username || !url.password) throw new Error('A URL precisa ter usuário, senha e host. Se ela mostrar [YOUR-PASSWORD], substitua pela senha do banco antes de colar.');
  if (/[\s"'#\\]/.test(connection)) throw new Error('A URL tem caracteres que quebram o .env (espaço, aspas, # ou \\). Codifique a senha com percent-encoding (ex.: # → %23).');
  const problems = databaseTargetProblems(connection);
  if (problems.length) throw new Error(problems.join(' '));

  // O Supabase usa uma CA própria ("Supabase Root 2021 CA"): sem ela o Node recusa a conexão, com razão.
  const prompts = createInterface({ input: stdin, output: stdout });
  const certificatePath = (await prompts.question('Caminho do certificado CA baixado do painel Supabase (Database Settings > SSL Configuration), ou Enter para pular: ')).trim().replace(/^['"]|['"]$/g, '');
  prompts.close();
  let certificate = '';
  if (certificatePath) {
    const file = resolve(certificatePath.replace(/^~(?=\/)/, process.env.HOME || '~'));
    if (!existsSync(file)) throw new Error('Arquivo do certificado não encontrado.');
    const pem = readFileSync(file, 'utf8').trim();
    if (!pem.startsWith('-----BEGIN CERTIFICATE-----') || !pem.endsWith('-----END CERTIFICATE-----') || /PRIVATE KEY/.test(pem)) throw new Error('O arquivo não parece um certificado PEM público.');
    certificate = `"${pem.replace(/\r?\n/g, '\\n')}"`;
  }

  const file = resolve('.env.local');
  const lines = existsSync(file) ? readFileSync(file, 'utf8').split('\n') : [];
  setVariable(lines, 'DATABASE_URL', connection);
  if (certificate) setVariable(lines, 'DATABASE_SSL_CA', certificate);
  writeFileSync(file, lines.join('\n'), { mode: 0o600 });
  chmodSync(file, 0o600);
  stdout.write(`DATABASE_URL gravada em .env.local (valor não exibido)${certificate ? ' e DATABASE_SSL_CA também' : ''}.\n`);
  if (!certificate) stdout.write('Atenção: sem DATABASE_SSL_CA a verificação TLS do Supabase falha. Baixe o certificado no painel e rode este comando de novo.\n');
  stdout.write('Reinicie o servidor de desenvolvimento e rode: npm run db:check\n');
} catch (error) {
  stdout.write(`${error.message}\n`);
  process.exitCode = 1;
} finally { secret = ''; }
