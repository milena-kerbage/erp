import { effectiveConfiguration, diagnostics, lastWebhookAt, unreadConversationCount, mediaMaximumBytes, WhatsAppError } from '@/lib/whatsapp/core';
import { storageConfiguration } from '@/lib/database';
import { api, publicUrls } from '@/lib/whatsapp/server';
import { developmentAccess } from '@/lib/auth/environment';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  return api(request, async () => {
    const config = await effectiveConfiguration();
    let remote: Awaited<ReturnType<typeof diagnostics>> | {ok: false; error: string; checkedAt: string} | undefined;
    if (new URL(request.url).searchParams.get('diagnostic') === '1') {
      try { remote = await diagnostics(); }
      catch (error) { remote = {ok: false, error: error instanceof WhatsAppError ? error.message : 'Diagnóstico indisponível.', checkedAt: new Date().toISOString()}; }
    }
    return {ready: config.configured, configured: config.configured, checks: config.checks, apiVersion: config.apiVersion || null, appId: config.appId || null, phoneNumberId: config.phoneNumberId || null, businessAccountId: config.businessAccountId || null, urls: await publicUrls(request), lastWebhookAt: await lastWebhookAt(), unreadConversations: await unreadConversationCount(), retentionDays: config.retentionDays, storage: storageConfiguration(), mediaMaximumBytes: mediaMaximumBytes(), authMode: developmentAccess() ? 'development' : 'session', ...(remote ? {remote} : {})};
  }, false, 30);
}
