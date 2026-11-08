import { normalizarTexto } from "@/loja/lib/catalogo/sugestoes";

// Buscas recentes da gaveta (só neste navegador). localStorage pode falhar (aba privada, cota,
// bloqueio): tudo em try/catch e a gaveta funciona sem elas.
const CHAVE = "mk_buscas_recentes";
const MAXIMO = 5;

export function lerBuscasRecentes(): string[] {
  try {
    const lidas: unknown = JSON.parse(window.localStorage.getItem(CHAVE) ?? "[]");
    return Array.isArray(lidas) ? lidas.filter((item): item is string => typeof item === "string" && item.length > 0).slice(0, MAXIMO) : [];
  } catch {
    return [];
  }
}

export function guardarBuscaRecente(termo: string): string[] {
  const limpo = termo.replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
  if (!limpo) return lerBuscasRecentes();
  const chave = normalizarTexto(limpo);
  const lista = [limpo, ...lerBuscasRecentes().filter((item) => normalizarTexto(item) !== chave)].slice(0, MAXIMO);
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {
    // sem armazenamento: a busca segue normalmente
  }
  return lista;
}

export function limparBuscasRecentes() {
  try {
    window.localStorage.removeItem(CHAVE);
  } catch {
    // idem
  }
}
