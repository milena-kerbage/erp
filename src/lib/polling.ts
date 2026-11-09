/** Polling sequencial, suspenso em segundo plano/offline, com recuo em falhas. */
export function startPolling(task: () => Promise<void>, interval: number, changedEvent?: string) {
  let stopped = false, busy = false, failures = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const available = () => document.visibilityState !== 'hidden' && navigator.onLine !== false;
  const clear = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };
  async function run() {
    if (stopped || busy || !available()) return;
    clear(); busy = true;
    try { await task(); failures = 0; }
    catch { failures = Math.min(failures + 1, 4); }
    finally {
      busy = false;
      if (!stopped && available()) timer = setTimeout(() => void run(), Math.min(interval * 2 ** failures, 120_000));
    }
  }
  const changed = () => { if (available()) void run(); else clear(); };
  document.addEventListener('visibilitychange', changed);
  window.addEventListener('online', changed);
  window.addEventListener('offline', changed);
  if (changedEvent) window.addEventListener(changedEvent, changed);
  void run();
  return () => {
    stopped = true; clear();
    document.removeEventListener('visibilitychange', changed);
    window.removeEventListener('online', changed);
    window.removeEventListener('offline', changed);
    if (changedEvent) window.removeEventListener(changedEvent, changed);
  };
}
