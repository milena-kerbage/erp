// Renova o token de LONGA duração do Instagram (60 dias) usado pela seção de Instagram da home da loja.
//   npm run instagram:renovar-token              # renova e mostra só a nova validade (token mascarado)
//   npm run instagram:renovar-token -- --gravar  # também grava o novo token em .env.local (fora do git)
//   npm run instagram:renovar-token -- --mostrar # imprime o token completo (para colar na Vercel)
//
// API oficial (Instagram API with Instagram Login):
//   GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=<token>
// Regras da Meta: o token precisa ter pelo menos 24 h e ainda estar válido; a renovação vale por mais
// 60 dias a partir de hoje. Token vencido não renova: gere outro pelo painel (docs/loja.md, "Instagram").
// O token atual vem de INSTAGRAM_ACCESS_TOKEN (.env.local ou ambiente). Nunca é passado por argumento,
// nunca vai para arquivo versionado e só é impresso por inteiro com --mostrar.
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const argumentos = new Set(process.argv.slice(2));
const atual = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
if (!atual) {
  console.error('INSTAGRAM_ACCESS_TOKEN vazio. Preencha em .env.local (ou no ambiente) e rode de novo. Passo a passo: docs/loja.md, seção "Instagram".');
  process.exit(1);
}

const mascarar = (token) => (token.length > 12 ? `${token.slice(0, 6)}…${token.slice(-4)}` : '***');

const url = new URL('https://graph.instagram.com/refresh_access_token');
url.searchParams.set('grant_type', 'ig_refresh_token');
url.searchParams.set('access_token', atual);

let resposta;
try {
  resposta = await fetch(url, { signal: AbortSignal.timeout(15000) });
} catch (erro) {
  console.error(`Não foi possível falar com a API do Instagram: ${erro instanceof Error ? erro.name : 'erro de rede'}.`);
  process.exit(1);
}
const json = await resposta.json().catch(() => null);
if (!resposta.ok || typeof json?.access_token !== 'string' || !json.access_token) {
  const mensagem = typeof json?.error?.message === 'string' ? json.error.message.split(atual).join('***') : 'resposta inesperada';
  const codigo = json?.error?.code ? ` (código ${json.error.code})` : '';
  console.error(`A Meta recusou a renovação: HTTP ${resposta.status}${codigo}: ${mensagem}`);
  console.error('Token com menos de 24 h, vencido ou sem a permissão instagram_business_basic? Veja docs/loja.md, seção "Instagram".');
  process.exit(1);
}

const novo = json.access_token;
const segundos = Number(json.expires_in) || 0;
const vence = segundos ? new Date(Date.now() + segundos * 1000) : null;
console.log(`Token renovado: ${mascarar(novo)}${vence ? `, válido até ${vence.toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })} (${Math.round(segundos / 86400)} dias)` : ''}.`);

if (argumentos.has('--gravar')) {
  const caminho = resolve(process.cwd(), '.env.local');
  const linhas = existsSync(caminho) ? readFileSync(caminho, 'utf8').split('\n') : [];
  const indice = linhas.findIndex((linha) => linha.startsWith('INSTAGRAM_ACCESS_TOKEN='));
  if (indice >= 0) linhas[indice] = `INSTAGRAM_ACCESS_TOKEN=${novo}`;
  else linhas.push(`INSTAGRAM_ACCESS_TOKEN=${novo}`);
  writeFileSync(caminho, `${linhas.join('\n').replace(/\n*$/, '')}\n`, { mode: 0o600 });
  chmodSync(caminho, 0o600);
  console.log('Gravado em .env.local (permissão 600).');
}
if (argumentos.has('--mostrar')) {
  console.log(`\nINSTAGRAM_ACCESS_TOKEN=${novo}\n`);
}
console.log('Atualize também a variável INSTAGRAM_ACCESS_TOKEN na Vercel (Production) e faça um novo deploy, ou o site continua com o token antigo.');
