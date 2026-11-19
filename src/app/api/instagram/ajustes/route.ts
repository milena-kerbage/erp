import { salvarAjustesInstagram } from '@/lib/instagram/ajustes';
import { instagramApi } from '@/lib/instagram/server';
import { jsonBody } from '@/lib/whatsapp/server';
export const runtime = 'nodejs';
// Cadastro das credenciais do Instagram pela tela (gestão autorizada, Origin confiável). Segredos nunca voltam ao navegador.
export async function POST(request: Request) {
  return instagramApi(request, true, async (usuario) => { await salvarAjustesInstagram(await jsonBody(request), usuario.id); return { salvo: true }; });
}
