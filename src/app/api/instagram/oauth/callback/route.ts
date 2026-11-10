import { cookies } from 'next/headers';
import { COOKIE_NAME } from '@/lib/auth/cookies';
import { requireManager } from '@/lib/integrations/manager';
import { exchangeCode } from '@/lib/instagram/api';
import { instagramOrigin } from '@/lib/instagram/config';
import { consumeState } from '@/lib/instagram/store';
import { instagramError, instagramHeaders, invalidateInstagramFeed } from '@/lib/instagram/server';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  let outcome = 'failed';
  let origin: string;
  try { origin = instagramOrigin(); } catch (error) { return instagramError(error); }
  try {
    const user = await requireManager(request), session = (await cookies()).get(COOKIE_NAME)?.value;
    const params = new URL(request.url).searchParams;
    if (!session || user.development || params.getAll('state').length !== 1) throw new Error('Invalid state');
    const authorizedAt = await consumeState(params.get('state') || '', user.id, session);
    if (authorizedAt === null) throw new Error('Invalid state');
    if (params.has('error')) outcome = 'denied';
    else {
      if (params.getAll('code').length !== 1) throw new Error('Invalid code');
      await exchangeCode(params.get('code') || '', fetch, authorizedAt);
      invalidateInstagramFeed();
      outcome = 'connected';
    }
  } catch { /* Código OAuth, URL e credenciais nunca são registrados em log ou retornados. */ }
  return new Response(null, { status: 303, headers: { ...instagramHeaders, Location: `${origin}/configuracoes/instagram?instagram=${outcome}` } });
}
