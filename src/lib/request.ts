const pendingReads = new Map<string, Promise<Response>>();

/** Une apenas GETs simultâneos, sem guardar respostas prontas nem compartilhar cancelamento. */
export async function requestOnce(url: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase();
  if (method !== 'GET') {
    // Leituras iniciadas antes de uma escrita não podem atender uma atualização posterior.
    pendingReads.clear();
    try { return await fetch(url, init); }
    finally { pendingReads.clear(); }
  }
  // Um AbortSignal pertence ao seu consumidor. Preservamos a requisição independente.
  if (init.signal) return fetch(url, init);
  const key = JSON.stringify([url, init.credentials, init.cache, [...new Headers(init.headers).entries()]]);
  let pending = pendingReads.get(key);
  if (!pending) {
    pending = fetch(url, init).finally(() => {
      if (pendingReads.get(key) === pending) pendingReads.delete(key);
    });
    pendingReads.set(key, pending);
  }
  return (await pending).clone();
}
