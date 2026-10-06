import { after, NextResponse, type NextRequest } from 'next/server';
import nodemailer from 'nodemailer';
import { COOKIE_NAME, cookieOptions } from '@/lib/auth/cookies';
import { createVerifiedSession, changeUserPassword, db, digest, findUser, issueReset, limited, normalizeEmail, resetPassword, revokeSession, sessionUser, validEmail, validPassword, verifyPassword } from '@/lib/auth/core';
import { HttpError, readBody, trustedOrigin } from '@/lib/auth/http';

export const runtime = 'nodejs';
export const maxDuration = 60;
const invalidLogin = 'E-mail ou senha incorretos.';
const recoveryMessage = 'Se houver uma conta com esse e-mail, você receberá as instruções de recuperação.';
const json = (body: unknown, status = 200) => NextResponse.json(body, {status, headers: {'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer'}});
const rateLimit = (key: string, max: number) => { if (limited(key, max)) throw new HttpError(429, 'Muitas tentativas. Aguarde 15 minutos e tente novamente.'); };

export async function POST(request: NextRequest, context: RouteContext<'/api/auth/[action]'>) {
  try {
    const origin = trustedOrigin(request);
    const {action} = await context.params;
    if (!['login','logout','forgot','reset','change-password','logout-others'].includes(action)) return json({error: 'Recurso não encontrado.'}, 404);
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (action === 'logout') {
      revokeSession(token);
      const response = json({ok: true});
      response.cookies.set(COOKIE_NAME, '', {...cookieOptions, maxAge: 0});
      response.headers.set('Clear-Site-Data', '"cache", "storage"');
      return response;
    }
    if (action === 'logout-others') {
      const user = sessionUser(token);
      if (!user || !token) return json({error: 'Sessão encerrada. Entre novamente.'}, 401);
      db().prepare('DELETE FROM sessions WHERE user_id = ? AND hash != ?').run(user.id, digest(token));
      return json({ok: true});
    }
    // Limite global persistente evita contornar a proteção alternando e-mails ou IPs falsos.
    rateLimit(`global:${action}`, action === 'forgot' ? 15 : 60);
    const body = await readBody(request);
    if (action === 'login') {
      const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
      const password = typeof body.password === 'string' ? body.password : '';
      rateLimit(`login:${digest(email)}`, 5);
      if (!validEmail(email) || !validPassword(password)) return json({error: invalidLogin}, 401);
      const user = findUser(email);
      if (!await verifyPassword(password, user?.password_hash) || !user) return json({error: invalidLogin}, 401);
      const session = createVerifiedSession(user);
      if (!session) return json({error: invalidLogin}, 401);
      revokeSession(token);
      const response = json({ok: true});
      response.cookies.set(COOKIE_NAME, session, cookieOptions);
      return response;
    }
    if (action === 'forgot') {
      const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
      if (!validEmail(email)) throw new HttpError(400, 'Informe um e-mail válido.');
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD || !process.env.SMTP_FROM || !process.env.AUTH_ORIGIN) throw new HttpError(503, 'Recuperação por e-mail indisponível. Contate a administração.');
      if (limited(`forgot:${digest(email)}`, 3)) return json({message: recoveryMessage});
      const user = findUser(email);
      if (user) {
        const resetToken = issueReset(user);
        // SMTP ocorre depois da resposta, evitando revelar a existência da conta pelo tempo de envio.
        after(async () => {
          try {
            const smtp = nodemailer.createTransport({host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_PORT === '465', requireTLS: true,
              auth: {user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD}, connectionTimeout: 10000, socketTimeout: 15000});
            const url = new URL('/redefinir-senha', origin);
            url.hash = resetToken; // O token não entra nos logs de URL, Referer ou HTML.
            await smtp.sendMail({from: process.env.SMTP_FROM, to: user.email, subject: 'Redefina sua senha — Ateliê Milena Kerbage', text: `Para redefinir sua senha, abra este link em até 20 minutos:\n${url}\n\nSe não pediu esta alteração, ignore esta mensagem.`});
          } catch { console.error('Falha no envio de recuperação de senha.'); }
        });
      }
      return json({message: recoveryMessage});
    }
    if (action === 'reset') {
      const password = typeof body.password === 'string' ? body.password : '';
      const resetToken = typeof body.token === 'string' ? body.token : '';
      rateLimit(`reset:${digest(resetToken)}`, 5);
      if (!validPassword(password)) throw new HttpError(400, 'Use de 8 a 128 caracteres, com letras, números e símbolos.');
      if (!await resetPassword(resetToken, password)) throw new HttpError(400, 'Link inválido ou expirado. Solicite outro link.');
      const response = json({ok: true});
      response.cookies.set(COOKIE_NAME, '', {...cookieOptions, maxAge: 0});
      return response;
    }
    const user = sessionUser(token);
    if (!user) return json({error: 'Sessão encerrada. Entre novamente.'}, 401);
    rateLimit(`change:${user.id}`, 5);
    const current = typeof body.current === 'string' ? body.current : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!validPassword(password)) throw new HttpError(400, 'Use de 8 a 128 caracteres, com letras, números e símbolos.');
    const record = findUser(user.email);
    if (!current || current.length > 128 || !await verifyPassword(current, record?.password_hash)) throw new HttpError(400, 'Não foi possível alterar a senha. Confira os dados.');
    const session = await changeUserPassword(record!, password);
    if (!session) throw new HttpError(400, 'Não foi possível alterar a senha. Confira os dados.');
    const response = json({ok: true});
    response.cookies.set(COOKIE_NAME, session, cookieOptions);
    return response;
  } catch (error) {
    if (error instanceof HttpError) {
      const response = json({error: error.message}, error.status);
      if (error.status === 429) response.headers.set('Retry-After', '900');
      return response;
    }
    console.error('Falha interna de autenticação.');
    return json({error: 'Acesso temporariamente indisponível. Tente novamente.'}, 503);
  }
}
