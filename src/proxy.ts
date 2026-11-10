import { NextResponse, type NextRequest } from 'next/server';
import { sessionUser } from './lib/auth/core';
import { developmentAccess } from './lib/auth/environment';
import { COOKIE_NAME } from './lib/auth/cookies';
import { DatabaseConfigurationError } from './lib/database';
import { ehHostDaLoja, PASTA_PUBLICA_LOJA, PREFIXO_LOJA } from './lib/hosts';
import { proxyLoja } from './loja/proxy';

// Verificação em cada requisição, inclusive navegação RSC e prefetch.
// Primeiro separa por host: www./domínio principal é a loja pública (src/loja/proxy.ts);
// qualquer outro host (erp., localhost, prévias) é o ERP, com autenticação.
export async function proxy(request: NextRequest) {
  if (ehHostDaLoja(request.headers.get('host'))) return proxyLoja(request);
  const path = request.nextUrl.pathname;
  // Rotas internas e arquivos da loja não existem no host do ERP.
  const storePath = [PREFIXO_LOJA, PASTA_PUBLICA_LOJA].some(prefix => path === prefix || path.startsWith(`${prefix}/`));
  if (storePath) return new NextResponse('Not Found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const publicPage = ['/login', '/recuperar-senha', '/redefinir-senha', '/convite', '/politicas', '/privacidade', '/termos', '/exclusao-de-dados', '/exclusao-de-dados/status', '/exclusao-de-dados/instagram/status', '/cookies', '/politica-de-comunicacao'].includes(path);
  const publicAsset = /^\/(logotipo-horizontal|simbolo|assinatura)-(green|black|white)\.svg$/.test(path) || ['/icon.png', '/apple-icon.png', '/favicon.ico', '/robots.txt'].includes(path);
  const authApi = path.startsWith('/api/auth/');
  // ERP Route Handlers validam sessão/papel ou chave de escopo permitido junto aos dados.
  const erpApi = path === '/api/erp' || path.startsWith('/api/erp/');
  // Callbacks validam assinatura no próprio handler. As APIs operacionais seguem privadas.
  const metaCallback = ['/api/whatsapp/webhook', '/api/meta/data-deletion', '/api/meta/data-deletion/status', '/api/instagram/webhook', '/api/instagram/deauthorize', '/api/instagram/data-deletion', '/api/instagram/data-deletion/status', '/api/instagram/oauth/callback'].includes(path);
  if (!developmentAccess() && !publicPage && !publicAsset && !authApi && !erpApi && !metaCallback) {
    let user;
    try { user = await sessionUser(request.cookies.get(COOKIE_NAME)?.value, false); }
    catch (error) {
      // Variável de banco ausente/inválida: páginas vão a /login, que explica o problema; APIs recebem a mensagem (só nomes de variáveis).
      const unconfigured = error instanceof DatabaseConfigurationError;
      if (unconfigured && !path.startsWith('/api/')) return NextResponse.redirect(new URL('/login', request.url));
      const response = NextResponse.json(unconfigured ? { error: error.message, code: error.code } : { error: 'Acesso temporariamente indisponível. Tente novamente.' }, { status: 503 });
      response.headers.set('Cache-Control', 'no-store');
      response.headers.set('Referrer-Policy', 'no-referrer');
      return response;
    }
    if (!user) {
      const response = path.startsWith('/api/')
        ? NextResponse.json({ error: 'Sessão encerrada. Entre novamente.' }, { status: 401 })
        : NextResponse.redirect(new URL('/login', request.url));
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }
  }
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
