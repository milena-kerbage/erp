"use client";

// Cache local das conversas (padrão do ERP da Le Ange): lista e últimas 200 mensagens de até 60 conversas no IndexedDB.
// A tela abre na hora com o que já tinha e só depois pergunta ao servidor; sem IndexedDB (modo privado), segue sem cache.
import type { WhatsAppConversation, WhatsAppMessage } from "../types";

const BANCO = "erp-conversas", VERSAO = 1, MAX_CONVERSAS = 60, MAX_MENSAGENS = 200;
type Registro<T> = { chave: string; valor: T; em: number };
let abrindo: Promise<IDBDatabase | null> | null = null;

function abrir() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  abrindo ??= new Promise((ok) => {
    try {
      const pedido = indexedDB.open(BANCO, VERSAO);
      pedido.onupgradeneeded = () => { for (const nome of ["listas", "conversas"]) if (!pedido.result.objectStoreNames.contains(nome)) pedido.result.createObjectStore(nome, { keyPath: "chave" }); };
      pedido.onsuccess = () => ok(pedido.result);
      pedido.onerror = () => ok(null);
      pedido.onblocked = () => ok(null);
    } catch { ok(null); }
  });
  return abrindo;
}
async function ler<T>(loja: string, chave: string): Promise<T | null> {
  const banco = await abrir();
  if (!banco) return null;
  return new Promise((ok) => {
    try { const pedido = banco.transaction(loja).objectStore(loja).get(chave); pedido.onsuccess = () => ok((pedido.result as Registro<T> | undefined)?.valor ?? null); pedido.onerror = () => ok(null); }
    catch { ok(null); }
  });
}
async function gravar<T>(loja: string, chave: string, valor: T) {
  const banco = await abrir();
  if (!banco) return;
  try { banco.transaction(loja, "readwrite").objectStore(loja).put({ chave, valor, em: Date.now() } satisfies Registro<T>); } catch { /* sem espaço: segue sem cache */ }
}

export const lerLista = (chave: string) => ler<{ conversations: WhatsAppConversation[]; nextOffset: number | null }>("listas", chave);
export const gravarLista = (chave: string, valor: { conversations: WhatsAppConversation[]; nextOffset: number | null }) => gravar("listas", chave, valor);

type Conversa = { messages: WhatsAppMessage[]; nextBefore: string | null };
export const lerConversa = (phone: string) => ler<Conversa>("conversas", phone);
export async function gravarConversa(phone: string, valor: Conversa) {
  // Só o que já foi confirmado pelo servidor; envios otimistas não entram no cache.
  await gravar("conversas", phone, { messages: valor.messages.filter((m) => !m.local && !m.id.startsWith("temp-")).slice(-MAX_MENSAGENS), nextBefore: valor.messages.length > MAX_MENSAGENS ? null : valor.nextBefore });
  void podar();
}
let podando = false;
async function podar() {
  const banco = await abrir();
  if (!banco || podando) return;
  podando = true;
  try {
    const loja = banco.transaction("conversas", "readwrite").objectStore("conversas"), todos = loja.getAll();
    todos.onsuccess = () => {
      const registros = (todos.result as Registro<Conversa>[]).sort((a, b) => b.em - a.em);
      for (const velho of registros.slice(MAX_CONVERSAS)) loja.delete(velho.chave);
      podando = false;
    };
    todos.onerror = () => { podando = false; };
  } catch { podando = false; }
}

/** Rascunhos por conversa (localStorage), como na Le Ange. */
const CHAVE_RASCUNHOS = "erp:whatsapp:rascunhos";
export function lerRascunho(phone: string) {
  try { return (JSON.parse(localStorage.getItem(CHAVE_RASCUNHOS) || "{}") as Record<string, string>)[phone] ?? ""; } catch { return ""; }
}
export function gravarRascunho(phone: string, texto: string) {
  try {
    const todos = JSON.parse(localStorage.getItem(CHAVE_RASCUNHOS) || "{}") as Record<string, string>;
    if (texto.trim()) todos[phone] = texto.slice(0, 4096); else delete todos[phone];
    localStorage.setItem(CHAVE_RASCUNHOS, JSON.stringify(todos));
  } catch { /* sem armazenamento */ }
}
export function todosRascunhos(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(CHAVE_RASCUNHOS) || "{}"); } catch { return {}; }
}
