import { cookies } from 'next/headers';
import { COOKIE_NAME } from '@/lib/auth/cookies';
import { managementApi } from '@/lib/integrations/manager';
import { concluirConexao, conectarComToken, desconectar, prepararConexao, salvarApp, situacaoConexao, testarConexao } from '@/lib/whatsapp/conexao';
import { WhatsAppError } from '@/lib/whatsapp/core';
import { jsonBody } from '@/lib/whatsapp/server';

// Conexão do WhatsApp para o gestor (src/lib/whatsapp/conexao.ts). GET: situação; POST { acao, ... }.
export const runtime = 'nodejs';
export const maxDuration = 60;

const origem = (request: Request) => process.env.AUTH_ORIGIN?.startsWith('https://') ? new URL(process.env.AUTH_ORIGIN).origin : new URL(request.url).origin;

export async function GET(request: Request) {
  return managementApi(request, false, async () => situacaoConexao(origem(request)));
}

export async function POST(request: Request) {
  return managementApi(request, true, async (usuario) => {
    const corpo = await jsonBody(request);
    const sessao = (await cookies()).get(COOKIE_NAME)?.value;
    switch (corpo.acao) {
      case 'salvar-app': await salvarApp(corpo, usuario.id); return situacaoConexao(origem(request));
      case 'preparar': return prepararConexao(usuario, sessao);
      case 'concluir': return { ...(await concluirConexao(corpo, usuario, sessao)), situacao: await situacaoConexao(origem(request)) };
      case 'token': return { ...(await conectarComToken(corpo, usuario.id)), situacao: await situacaoConexao(origem(request)) };
      case 'testar': return testarConexao(usuario.id);
      case 'desconectar': await desconectar(usuario.id); return situacaoConexao(origem(request));
      default: throw new WhatsAppError(400, 'Ação de conexão desconhecida.', 'INVALID_ACTION');
    }
  });
}
