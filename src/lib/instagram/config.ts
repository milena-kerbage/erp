import { deletionOrigin } from '../meta/deletion.ts';

export class InstagramError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code = 'INSTAGRAM_ERROR') {
    super(message); this.status = status; this.code = code;
  }
}

/** Versão da Graph API do Instagram quando a instalação não define outra. */
export const VERSAO_INSTAGRAM_PADRAO = 'v27.0';
// Ajustes cadastrados pelo gestor na tela (cifrados no banco; src/lib/instagram/ajustes.ts). Prevalecem sobre o ambiente.
type AjustesSalvos = { appId?: string; appSecret?: string; webhookSecret?: string; version?: string; scopes?: string; metaAppSecret?: string; verifyToken?: string; configId?: string; pageId?: string; loginTipo?: string; clientBusinessId?: string };
let salvos: AjustesSalvos = {};
export function definirAjustesSalvos(valores: AjustesSalvos) { salvos = valores; }

export const PERMISSIONS = ['instagram_business_basic', 'instagram_business_manage_messages', 'instagram_business_manage_comments', 'instagram_business_content_publish'] as const;
export function instagramConfig() {
  const scopes = (salvos.scopes || process.env.INSTAGRAM_SCOPES || 'instagram_business_basic').split(',').map(v => v.trim()).filter(Boolean);
  if (!scopes.includes('instagram_business_basic') || scopes.some(v => !PERMISSIONS.includes(v as typeof PERMISSIONS[number]))) {
    throw new InstagramError(503, 'Configure INSTAGRAM_SCOPES com permissões atuais do Instagram.', 'INVALID_SCOPES');
  }
  return {
    appId: salvos.appId || process.env.INSTAGRAM_APP_ID?.trim() || '',
    appSecret: salvos.appSecret || process.env.INSTAGRAM_APP_SECRET?.trim() || '',
    // Assinatura dos webhooks: App Secret do app da Meta (Configurações do app > Básico). Sem um próprio, usa o do WhatsApp (mesmo app).
    webhookSecret: salvos.webhookSecret || process.env.INSTAGRAM_WEBHOOK_APP_SECRET?.trim() || salvos.metaAppSecret || '',
    // O do ambiente (já cadastrado na Meta) nunca é trocado; o salvo só existe quando o ambiente não tem.
    verifyToken: process.env.INSTAGRAM_VERIFY_TOKEN?.trim() || salvos.verifyToken || '',
    version: salvos.version || process.env.INSTAGRAM_GRAPH_VERSION?.trim() || VERSAO_INSTAGRAM_PADRAO,
    // Com o ID da configuração (config_id), o login é o UNIFICADO da Meta (Instagram API with Unified Login): a pessoa
    // entra com Instagram ou Facebook e escolhe a conta do Instagram; o token é do usuário do sistema do portfólio e as
    // chamadas vão para graph.facebook.com com o ID da conta do Instagram, sem página do Facebook. Sem o config_id, o
    // login é o do Instagram (graph.instagram.com).
    configId: salvos.configId || process.env.INSTAGRAM_FB_CONFIG_ID?.trim() || '',
    modo: (salvos.configId || process.env.INSTAGRAM_FB_CONFIG_ID?.trim() ? 'facebook' : 'instagram') as 'facebook' | 'instagram',
    pageId: salvos.pageId || '',
    // Como a conexão atual foi feita: 'unificado' (conta do Instagram, sem página) ou 'pagina' (login antigo, pela página).
    loginTipo: (salvos.loginTipo === 'pagina' ? 'pagina' : salvos.loginTipo === 'unificado' ? 'unificado' : '') as '' | 'unificado' | 'pagina',
    // Portfólio da cliente no login unificado (serve para renovar ou consultar o token depois).
    clientBusinessId: salvos.clientBusinessId || '',
    expectedUsername: (process.env.INSTAGRAM_EXPECTED_USERNAME || 'milenakerbageatelie').replace(/^@/, '').toLowerCase(),
    scopes: [...new Set(scopes)],
  };
}
/**
 * Quem "fala" na Graph API quando o login é pelo config_id: a página do Facebook só no login antigo (conexão feita pela
 * página); no login unificado é sempre a própria conta do Instagram, mesmo que exista um ID de página cadastrado.
 */
export function usaPaginaDoFacebook(config = instagramConfig()) {
  return config.modo === 'facebook' && config.loginTipo !== 'unificado' && /^\d{1,32}$/.test(config.pageId);
}
export function instagramOrigin() {
  return deletionOrigin(process.env.INSTAGRAM_PUBLIC_BASE_URL || process.env.PUBLIC_BASE_URL || process.env.AUTH_ORIGIN);
}
export function instagramUrls() {
  const base = instagramOrigin();
  return {
    redirect: `${base}/api/instagram/oauth/callback`,
    deauthorize: `${base}/api/instagram/deauthorize`,
    dataDeletion: `${base}/api/instagram/data-deletion`,
    webhook: `${base}/api/instagram/webhook`,
    privacy: `${base}/privacidade`, terms: `${base}/termos`, deletionInstructions: `${base}/exclusao-de-dados`,
  };
}
export function requireOAuthConfig() {
  const config = instagramConfig();
  if (!/^\d{5,32}$/.test(config.appId) || config.appSecret.length < 16 || !/^v\d{2,3}\.0$/.test(config.version)) {
    throw new InstagramError(503, 'Cadastre o App ID e o App Secret do Instagram em Configurações > Instagram.', 'OAUTH_NOT_CONFIGURED');
  }
  instagramOrigin();
  return config;
}
export function retentionDays() {
  const days = Number(process.env.INSTAGRAM_RETENTION_DAYS || 90);
  if (!Number.isInteger(days) || days < 1 || days > 365) throw new InstagramError(503, 'INSTAGRAM_RETENTION_DAYS deve ser de 1 a 365.', 'INVALID_RETENTION');
  return days;
}
