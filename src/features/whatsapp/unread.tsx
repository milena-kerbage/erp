"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

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
        const response = await fetch('/api/whatsapp/status', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal });
        if (!response.ok) { if (!controller.signal.aborted) setUnread(0); return; }
        const data = await response.json() as { unreadConversations?: unknown };
        if (!controller.signal.aborted) setUnread(typeof data.unreadConversations === 'number' && Number.isSafeInteger(data.unreadConversations) && data.unreadConversations >= 0 ? data.unreadConversations : 0);
      } catch { if (!controller.signal.aborted) setUnread(0); }
      finally { busy = false; }
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 15000);
    const changed = () => void refresh();
    window.addEventListener('whatsapp:changed', changed);
    return () => { controller.abort(); window.clearInterval(interval); window.removeEventListener('whatsapp:changed', changed); };
  }, []);
  return <UnreadContext.Provider value={unread}>{children}</UnreadContext.Provider>;
}
export function useWhatsAppUnread() { return useContext(UnreadContext); }
