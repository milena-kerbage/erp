// Resolução de módulos para rodar código da loja (escrito para o Next) direto no Node, com
// --experimental-strip-types: "@/x" → src/x, imports relativos sem extensão → .ts/.tsx/index.ts e
// "server-only" → módulo vazio (fora do Next não há a condição react-server).
// Uso: node --import ./scripts/lib/registrar-ts.mjs --experimental-strip-types arquivo.mjs
import { existsSync, statSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC = new URL('../../src/', import.meta.url);
const VAZIO = 'data:text/javascript,export {};';
const EXTENSOES = ['.ts', '.tsx', '.mjs', '.js', '/index.ts', '/index.tsx'];

function existente(caminho) {
  if (existsSync(caminho) && statSync(caminho).isFile()) return caminho;
  for (const extensao of EXTENSOES) if (existsSync(caminho + extensao)) return caminho + extensao;
  return null;
}

registerHooks({
  resolve(especificador, contexto, proximo) {
    if (especificador === 'server-only' || especificador === 'client-only') return { url: VAZIO, shortCircuit: true };
    let alvo = null;
    if (especificador.startsWith('@/')) alvo = fileURLToPath(new URL(especificador.slice(2), SRC));
    else if ((especificador.startsWith('./') || especificador.startsWith('../')) && contexto.parentURL?.startsWith('file:') && !/\.[cm]?[jt]sx?$|\.json$/.test(especificador))
      alvo = fileURLToPath(new URL(especificador, contexto.parentURL));
    if (alvo) {
      const arquivo = existente(alvo);
      if (arquivo) return { url: pathToFileURL(arquivo).href, shortCircuit: true };
    }
    return proximo(especificador, contexto);
  },
});
