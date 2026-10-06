import { NextResponse, type NextRequest } from 'next/server';
import { sessionUser } from './lib/auth/core';
import { developmentAccess } from './lib/auth/environment';
import { COOKIE_NAME } from './lib/auth/cookies';

// Verificação em cada requisição, inclusive navegação RSC e prefetch.
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const publicPage = ['/login', '/recuperar-senha', '/redefinir-senha'].includes(path);
  const publicAsset = /^\/(logotipo-horizontal|simbolo|assinatura)-(green|black|white)\.svg$/.test(path) || ['/icon.png', '/apple-icon.png', '/favicon.ico', '/robots.txt'].includes(path);
  const authApi = path.startsWith('/api/auth/');
  if (!developmentAccess() && !publicPage && !publicAsset && !authApi && !sessionUser(request.cookies.get(COOKIE_NAME)?.value)) {
    const response = path.startsWith('/api/')
      ? NextResponse.json({ error: 'Sessão encerrada. Entre novamente.' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url));
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
