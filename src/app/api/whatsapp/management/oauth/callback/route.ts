import { cookies } from 'next/headers';
import { COOKIE_NAME } from '@/lib/auth/cookies';
import { requireManager } from '@/lib/integrations/manager';
import { consumeOAuthState, recordManagementTest } from '@/lib/integrations/management';
import { exchangeOAuthCode } from '@/lib/integrations/oauth';
import { noStore } from '@/lib/whatsapp/server';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  let outcome = 'failed';
  try {
    const user = await requireManager(request);
    const session = (await cookies()).get(COOKIE_NAME)?.value;
    const params = new URL(request.url).searchParams;
    if (!session || !await consumeOAuthState(params.get('state') || '', user.id, session)) throw new Error('Invalid state');
    if (params.has('error')) {
      outcome = 'denied';
      await recordManagementTest('oauth', false, 'A autorização com a Meta foi cancelada ou recusada.', [], user.id);
    } else {
      await exchangeOAuthCode(params.get('code') || '', user.id);
      outcome = 'connected';
    }
  } catch { /* Não imprimir código OAuth, URL de retorno nem resposta com credenciais. */ }
  const origin = process.env.AUTH_ORIGIN || new URL(request.url).origin;
  return new Response(null, { status: 303, headers: { ...noStore, 'Referrer-Policy': 'no-referrer', Location: new URL(`/configuracoes/integracoes?meta=${outcome}`, origin).toString() } });
}
