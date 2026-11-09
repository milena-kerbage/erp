import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startPolling } from '../src/lib/polling.ts';

test('polling pausa offline/oculto, não sobrepõe tarefas, recua em falhas e limpa listeners', async () => {
  const originals = Object.fromEntries(['window', 'document', 'navigator', 'setTimeout', 'clearTimeout'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const document = new EventTarget(), window = new EventTarget(), navigator = {onLine: true};
  document.visibilityState = 'hidden';
  const timers = new Map(); let sequence = 0, calls = 0, finish, fail = false;
  const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
  for (const [key, value] of Object.entries({window, document, navigator, setTimeout: (callback, delay) => { const id = ++sequence; timers.set(id, {callback, delay}); return id; }, clearTimeout: id => timers.delete(id)})) Object.defineProperty(globalThis, key, {configurable: true, writable: true, value});
  let stop;
  try {
    stop = startPolling(async () => { calls++; await new Promise(resolve => {finish = resolve;}); if (fail) throw new Error('503'); }, 1000, 'changed');
    assert.equal(calls, 0);
    document.visibilityState = 'visible'; document.dispatchEvent(new Event('visibilitychange'));
    assert.equal(calls, 1);
    window.dispatchEvent(new Event('changed')); assert.equal(calls, 1);
    finish(); await flush(); assert.equal([...timers.values()][0].delay, 1000);
    navigator.onLine = false; window.dispatchEvent(new Event('offline')); assert.equal(timers.size, 0);
    navigator.onLine = true; fail = true; window.dispatchEvent(new Event('online')); assert.equal(calls, 2);
    finish(); await flush(); assert.equal([...timers.values()][0].delay, 2000);
    document.visibilityState = 'hidden'; document.dispatchEvent(new Event('visibilitychange')); assert.equal(timers.size, 0);
    document.visibilityState = 'visible'; fail = false; document.dispatchEvent(new Event('visibilitychange'));
    finish(); await flush(); assert.equal([...timers.values()][0].delay, 1000);
    stop(); assert.equal(timers.size, 0);
    window.dispatchEvent(new Event('changed')); document.dispatchEvent(new Event('visibilitychange')); assert.equal(calls, 3);
  } finally {
    stop?.();
    for (const [key, descriptor] of Object.entries(originals)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});
