import { randomBytes } from 'node:crypto';
import { effectiveConfiguration, gravarAjustesLivres, lerAjustesLivres, limparSegredo } from '../whatsapp/config.ts';
import { definirAjustesSalvos, instagramConfig, InstagramError, PERMISSIONS, VERSAO_INSTAGRAM_PADRAO } from './config.ts';

// Credenciais do Instagram cadastradas pelo gestor na tela (sem mexer na hospedagem), cifradas na mesma tabela das
// integrações (`instagram.*`). Toda rota chama `carregarAjustesInstagram()` antes de usar instagramConfig().

const CHAVES = { appId: 'instagram.appId', appSecret: 'instagram.appSecret', webhookSecret: 'instagram.webhookSecret', version: 'instagram.version', scopes: 'instagram.scopes', verifyToken: 'instagram.verifyToken', configId: 'instagram.configId', pageId: 'instagram.pageId', loginTipo: 'instagram.loginTipo', clientBusinessId: 'instagram.clientBusinessId' } as const;
let carregadoEm = 0;

export async function carregarAjustesInstagram(forcar = false) {
  if (!forcar && Date.now() - carregadoEm < 15_000) return;
  try {
    const ajustes = await lerAjustesLivres('instagram.');
    let metaAppSecret = '';
    try { metaAppSecret = (await effectiveConfiguration()).appSecret; } catch { /* WhatsApp sem configuração */ }
    definirAjustesSalvos({
      appId: ajustes[CHAVES.appId] || undefined, appSecret: ajustes[CHAVES.appSecret] || undefined, webhookSecret: ajustes[CHAVES.webhookSecret] || undefined,
      version: ajustes[CHAVES.version] || undefined, scopes: ajustes[CHAVES.scopes] || undefined, verifyToken: ajustes[CHAVES.verifyToken] || undefined, metaAppSecret: metaAppSecret || undefined,
      configId: ajustes[CHAVES.configId] || undefined, pageId: ajustes[CHAVES.pageId] || undefined,
      loginTipo: ajustes[CHAVES.loginTipo] || undefined, clientBusinessId: ajustes[CHAVES.clientBusinessId] || undefined,
    });
    carregadoEm = Date.now();
  } catch { /* Banco ou chave indisponível: segue com o ambiente. */ }
}

/** Cadastro na tela: App ID e App Secret do Instagram (Login da empresa), App Secret do app (webhooks) e o que receber. */
export async function salvarAjustesInstagram(entrada: Record<string, unknown>, ator: string) {
  const texto = (valor: unknown, maximo: number) => (typeof valor === 'string' ? valor.slice(0, maximo) : '');
  const appId = texto(entrada.appId, 40).trim(), configId = texto(entrada.configId, 40).trim(), pageId = texto(entrada.pageId, 40).trim();
  if (pageId && !/^\d{5,32}$/.test(pageId)) throw Object.assign(new InstagramError(400, 'O ID da página tem só números. No Facebook: página > Sobre > Transparência da página. (No login unificado esse campo fica vazio.)', 'INVALID_PAGE_ID'), { field: 'pageId' });
  if (configId && !/^\d{5,32}$/.test(configId)) throw Object.assign(new InstagramError(400, 'O ID da configuração tem só números. Copie na Meta, em Casos de uso > Instagram > Configuração da API com login unificado.', 'INVALID_CONFIG_ID'), { field: 'configId' });
  const appSecret = limparSegredo(texto(entrada.appSecret, 400)), webhookSecret = limparSegredo(texto(entrada.webhookSecret, 400));
  if (appId && !/^\d{5,32}$/.test(appId)) throw Object.assign(new InstagramError(400, 'O App ID do Instagram tem só números. Copie em Instagram > Configuração da API com login do Instagram > Configurações do login da empresa.', 'INVALID_APP_ID'), { field: 'appId' });
  for (const [campo, valor, nome] of [['appSecret', appSecret, 'App Secret do Instagram'], ['webhookSecret', webhookSecret, 'App Secret do app']] as const) {
    if (valor && (valor.length < 16 || valor.length > 200)) throw Object.assign(new InstagramError(400, `${nome}: tem ${valor.length} caracteres; o da Meta tem 32 letras e números. Clique em "Mostrar" na Meta e copie de novo (confira se o navegador não preencheu uma senha salva).`, 'INVALID_SECRET'), { field: campo });
  }
  const recursos = Array.isArray(entrada.recursos) ? entrada.recursos.filter((item): item is string => typeof item === 'string') : null;
  const escopos = recursos ? ['instagram_business_basic', ...recursos.filter((item) => PERMISSIONS.includes(item as typeof PERMISSIONS[number]) && item !== 'instagram_business_content_publish' && item !== 'instagram_business_basic')] : null;
  const atual = instagramConfig();
  const valores: Record<string, { valor: string; secreto: boolean }> = {};
  if (appId) valores[CHAVES.appId] = { valor: appId, secreto: false };
  if (configId) valores[CHAVES.configId] = { valor: configId, secreto: false };
  if (pageId) valores[CHAVES.pageId] = { valor: pageId, secreto: false };
  if (appSecret) valores[CHAVES.appSecret] = { valor: appSecret, secreto: true };
  if (webhookSecret) valores[CHAVES.webhookSecret] = { valor: webhookSecret, secreto: true };
  if (!/^v\d{2,3}\.0$/.test(atual.version)) valores[CHAVES.version] = { valor: VERSAO_INSTAGRAM_PADRAO, secreto: false };
  if (escopos) valores[CHAVES.scopes] = { valor: [...new Set(escopos)].join(','), secreto: false };
  // Token de verificação do webhook: só nasce se ainda não existir (o que já está na Meta nunca muda).
  if (!atual.verifyToken) valores[CHAVES.verifyToken] = { valor: randomBytes(32).toString('hex'), secreto: true };
  if (!(appId || atual.appId)) throw Object.assign(new InstagramError(400, 'Informe o App ID do Instagram.', 'MISSING_FIELD'), { field: 'appId' });
  if (!(appSecret || atual.appSecret)) throw Object.assign(new InstagramError(400, 'Informe o App Secret do Instagram.', 'MISSING_FIELD'), { field: 'appSecret' });
  await gravarAjustesLivres(valores, ator);
  await carregarAjustesInstagram(true);
}

/** Página do Facebook ligada ao Instagram (login antigo, pela página): usada para inscrever os webhooks de mensagens. */
export async function gravarPaginaInstagram(pageId: string, ator: string) {
  await gravarAjustesLivres({ [CHAVES.pageId]: { valor: pageId, secreto: false }, [CHAVES.loginTipo]: { valor: pageId ? 'pagina' : 'unificado', secreto: false } }, ator);
  await carregarAjustesInstagram(true);
}

/**
 * Conexão pelo login unificado: sem página (o ID que estiver cadastrado é apagado, para nenhuma chamada cair nela) e
 * com o portfólio da cliente guardado junto.
 */
export async function gravarLoginUnificado(clientBusinessId: string, ator: string) {
  await gravarAjustesLivres({ [CHAVES.pageId]: { valor: '', secreto: false }, [CHAVES.loginTipo]: { valor: 'unificado', secreto: false }, [CHAVES.clientBusinessId]: { valor: clientBusinessId, secreto: false } }, ator);
  await carregarAjustesInstagram(true);
}
