import { deletionOrigin } from '../meta/deletion.ts';

export class InstagramError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code = 'INSTAGRAM_ERROR') {
    super(message); this.status = status; this.code = code;
  }
}

export const PERMISSIONS = ['instagram_business_basic', 'instagram_business_manage_messages', 'instagram_business_manage_comments', 'instagram_business_content_publish'] as const;
export function instagramConfig() {
  const scopes = (process.env.INSTAGRAM_SCOPES || 'instagram_business_basic').split(',').map(v => v.trim()).filter(Boolean);
  if (!scopes.includes('instagram_business_basic') || scopes.some(v => !PERMISSIONS.includes(v as typeof PERMISSIONS[number]))) {
    throw new InstagramError(503, 'Configure INSTAGRAM_SCOPES com permissões atuais do Instagram.', 'INVALID_SCOPES');
  }
  return {
    appId: process.env.INSTAGRAM_APP_ID?.trim() || '',
    appSecret: process.env.INSTAGRAM_APP_SECRET?.trim() || '',
    webhookSecret: process.env.INSTAGRAM_WEBHOOK_APP_SECRET?.trim() || '',
    verifyToken: process.env.INSTAGRAM_VERIFY_TOKEN?.trim() || '',
    version: process.env.INSTAGRAM_GRAPH_VERSION?.trim() || '',
    expectedUsername: (process.env.INSTAGRAM_EXPECTED_USERNAME || 'milenakerbageatelie').replace(/^@/, '').toLowerCase(),
    scopes: [...new Set(scopes)],
  };
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
    throw new InstagramError(503, 'Configure INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET e INSTAGRAM_GRAPH_VERSION no servidor.', 'OAUTH_NOT_CONFIGURED');
  }
  instagramOrigin();
  return config;
}
export function retentionDays() {
  const days = Number(process.env.INSTAGRAM_RETENTION_DAYS || 90);
  if (!Number.isInteger(days) || days < 1 || days > 365) throw new InstagramError(503, 'INSTAGRAM_RETENTION_DAYS deve ser de 1 a 365.', 'INVALID_RETENTION');
  return days;
}
