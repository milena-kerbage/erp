import { cookies } from 'next/headers';
import { COOKIE_NAME } from '@/lib/auth/cookies';
import { requireManager } from '@/lib/integrations/manager';
import { exchangeCode } from '@/lib/instagram/api';
import { InstagramError, instagramOrigin } from '@/lib/instagram/config';
import { consumeState } from '@/lib/instagram/store';
import { instagramError, instagramHeaders, invalidateInstagramFeed } from '@/lib/instagram/server';
import { carregarAjustesInstagram } from '@/lib/instagram/ajustes';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  let outcome = 'failed', motivo = '', detalhe = '';
  let origin: string;
  await carregarAjustesInstagram();
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
  } catch (erro) {
    // Código OAuth, URL e credenciais nunca vão para o log ou para a tela; só o motivo (código e mensagem da Meta).
    motivo = erro instanceof InstagramError ? erro.code : erro instanceof Error && erro.message === 'Invalid state' ? 'STATE' : 'ERRO';
    detalhe = erro instanceof InstagramError ? erro.message.slice(0, 400) : '';
    console.error(`[instagram] Conexão não concluída (${motivo}): ${detalhe || (erro instanceof Error ? erro.message : 'erro')}`);
  }
  const destino = new URL(`${origin}/configuracoes/instagram`);
  destino.searchParams.set('instagram', outcome);
  if (outcome === 'failed') { destino.searchParams.set('motivo', motivo); if (detalhe) destino.searchParams.set('detalhe', detalhe); }
  return new Response(null, { status: 303, headers: { ...instagramHeaders, Location: destino.toString() } });
}
