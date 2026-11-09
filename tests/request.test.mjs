import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestOnce } from '../src/lib/request.ts';
const originalFetch = globalThis.fetch;

test('GETs simultâneos compartilham rede, têm corpos independentes e não ficam em cache', async () => {
  let finish, calls = 0;
  globalThis.fetch = () => { calls++; return new Promise(resolve => { finish = resolve; }); };
  try {
    const first = requestOnce('/read'), second = requestOnce('/read');
    assert.equal(calls, 1);
    finish(Response.json({value: 1}));
    assert.deepEqual(await (await first).json(), {value: 1});
    assert.deepEqual(await (await second).json(), {value: 1});
    const next = requestOnce('/read');
    assert.equal(calls, 2); finish(Response.json({value: 2}));
    assert.deepEqual(await (await next).json(), {value: 2});
  } finally { globalThis.fetch = originalFetch; }
});

test('escrita invalida leituras pendentes e requisições canceláveis continuam independentes', async () => {
  let calls = 0;
  const resolvers = [];
  globalThis.fetch = () => { calls++; return new Promise(resolve => resolvers.push(resolve)); };
  try {
    const old = requestOnce('/race');
    const write = requestOnce('/write', {method: 'POST'});
    const fresh = requestOnce('/race');
    assert.equal(calls, 3);
    resolvers[1](Response.json({})); await write;
    resolvers[0](Response.json({old: true})); await old;
    // A conclusão da leitura velha não apaga uma leitura nova iniciada depois da escrita.
    const afterWrite = requestOnce('/race');
    const shared = requestOnce('/race');
    assert.equal(calls, 4);
    resolvers[3](Response.json({fresh: true}));
    await afterWrite; await shared;
    resolvers[2](Response.json({})); await fresh;
    const a = requestOnce('/cancel', {signal: new AbortController().signal});
    const b = requestOnce('/cancel', {signal: new AbortController().signal});
    assert.equal(calls, 6);
    resolvers[4](Response.json({})); resolvers[5](Response.json({})); await a; await b;
  } finally { globalThis.fetch = originalFetch; }
});

test('falha de rede não fica memorizada e pode ser tentada novamente', async () => {
  let calls = 0;
  globalThis.fetch = async () => { if (++calls === 1) throw new Error('offline'); return Response.json({ok: true}); };
  try {
    await assert.rejects(requestOnce('/retry'), /offline/);
    assert.deepEqual(await (await requestOnce('/retry')).json(), {ok: true});
  } finally { globalThis.fetch = originalFetch; }
});
