"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { startPolling } from '@/lib/polling';

const UnreadContext = createContext(0);
/** Um único polling compartilhado evita cotas duplicadas entre sidebar e navegação móvel. */
export function WhatsAppUnreadProvider({ children }: { children: ReactNode }) {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    async function refresh() {
      if (busy || controller.signal.aborted) return;
      busy = true;
      try {
        const response = await fetch('/api/whatsapp/unread', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal });
        if (!response.ok) { if (!controller.signal.aborted) setUnread(0); throw new Error('Contagem indisponível'); }
        const data = await response.json() as { unreadConversations?: unknown };
        if (!controller.signal.aborted) setUnread(typeof data.unreadConversations === 'number' && Number.isSafeInteger(data.unreadConversations) && data.unreadConversations >= 0 ? data.unreadConversations : 0);
      } catch (error) { if (!controller.signal.aborted) setUnread(0); throw error; }
      finally { busy = false; }
    }
    const stop = startPolling(refresh, 30_000, 'whatsapp:changed');
    return () => { stop(); controller.abort(); };
  }, []);
  return <UnreadContext.Provider value={unread}>{children}</UnreadContext.Provider>;
}
export function useWhatsAppUnread() { return useContext(UnreadContext); }
