"use client";

// Estado das conversas (padrão do ERP da Le Ange): cache local para abrir na hora, revisão leve a cada 3 s (só busca lista
// e conversa quando algo mudou), envio otimista com reconciliação, leitura automática ao abrir, pré-carga no hover.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { errorMessage, whatsappRequest } from "../client";
import type { WhatsAppConversation, WhatsAppMessage } from "../types";
import { gravarConversa, gravarLista, lerConversa, lerLista } from "./cache";
import { statusMaisNovo } from "./formato";
import { enviarPreparado, ErroMidia, prepararArquivo, type Preparado } from "./midiaCliente";
import { tocar } from "./sons";

export type Aba = "todas" | "nao_lidas" | "favoritas" | "fixadas" | "arquivadas";
type Lista = { conversations: WhatsAppConversation[]; nextOffset: number | null };
export type Fio = { messages: WhatsAppMessage[]; nextBefore: string | null; carregado: boolean; carregandoAntigas?: boolean; conversation?: WhatsAppConversation | null };
type AcaoConversa = { fixar?: boolean; arquivar?: boolean; naoLida?: boolean; favoritar?: boolean; etiquetas?: string[] };

const PAGINA = 60, RECENTES = 80;
const novoId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/** Junta mensagens do servidor com as locais: o servidor manda; envios otimistas ficam até o servidor ter a deles. */
export function mesclar(atuais: WhatsAppMessage[], doServidor: WhatsAppMessage[], completo = false) {
  const porId = new Map<string, WhatsAppMessage>();
  if (!completo) for (const m of atuais) if (!m.id.startsWith("temp-")) porId.set(m.id, m);
  for (const m of doServidor) {
    const antes = porId.get(m.id);
    porId.set(m.id, antes ? { ...m, status: statusMaisNovo(antes.status, m.status) } : m);
  }
  let servidor = [...porId.values()];
  // Envio otimista some quando o servidor já tem a mesma mensagem (mesmo tipo e texto, até 2 min de diferença).
  // Se o envio falhou, fica o local (que tem "Tentar de novo") e o registro de falha do servidor não aparece duplicado.
  const usados = new Set<string>(), escondidos = new Set<string>();
  const par = (temp: WhatsAppMessage) => servidor.find((m) => !usados.has(m.id) && m.direction === "outbound" && m.type === temp.type && (temp.type !== "text" || m.text === temp.text) && Math.abs(Date.parse(m.createdAt) - Date.parse(temp.createdAt)) < 120_000 && !atuais.some((outra) => outra.id === m.id && !outra.id.startsWith("temp-")));
  const locais = atuais.filter((temp) => {
    if (!temp.id.startsWith("temp-")) return false;
    const achado = par(temp);
    const pendente = (m: WhatsAppMessage) => m.status === "failed" || m.status === "sending" || m.status === "unknown";
    if (temp.status === "failed" || temp.status === "sending") {
      if (achado && pendente(achado)) { usados.add(achado.id); escondidos.add(achado.id); return true; }
      if (achado && temp.status === "sending") { usados.add(achado.id); return false; } // o servidor já confirmou
      return true;
    }
    if (achado) { usados.add(achado.id); return false; }
    return true;
  });
  servidor = servidor.filter((m) => !escondidos.has(m.id));
  return [...servidor, ...locais].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id));
}

export function useConversas(inicial?: string) {
  const [aba, setAba] = useState<Aba>("todas");
  const [busca, setBusca] = useState("");
  const [buscaAtiva, setBuscaAtiva] = useState("");
  const [etiqueta, setEtiqueta] = useState("");
  const [lista, setLista] = useState<Lista | null>(null);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [maisLista, setMaisLista] = useState(false);
  const [erro, setErro] = useState("");
  const [selecionado, setSelecionado] = useState<string | undefined>(inicial);
  const [fios, setFios] = useState<Record<string, Fio>>({});
  const [etiquetas, setEtiquetas] = useState<string[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const revisao = useRef("");
  const ultimaRecebida = useRef(0);
  const fiosRef = useRef(fios);
  fiosRef.current = fios;
  const chaveLista = `${aba}|${etiqueta}|${buscaAtiva}`;
  const chaveListaRef = useRef(chaveLista);
  chaveListaRef.current = chaveLista;

  // Busca com espera de 350 ms (no servidor, em todo o histórico).
  useEffect(() => { const t = window.setTimeout(() => setBuscaAtiva(busca.trim().length >= 2 ? busca.trim() : ""), 350); return () => window.clearTimeout(t); }, [busca]);

  const consultaLista = useCallback((offset = 0) => {
    const [a, e, q] = chaveListaRef.current.split("|");
    const params = new URLSearchParams({ aba: a, limit: String(PAGINA), offset: String(offset) });
    if (e) params.set("etiqueta", e);
    if (q) params.set("q", q);
    return whatsappRequest<Lista>(`conversations?${params}`);
  }, []);

  const recarregarLista = useCallback(async () => {
    const chave = chaveListaRef.current;
    try {
      const atual = await consultaLista(0);
      if (chave !== chaveListaRef.current) return;
      setLista((anterior) => {
        // Som de mensagem nova: a mais recente veio do contato e é mais nova que a última vista.
        const recebida = Math.max(0, ...atual.conversations.filter((c) => c.lastDirection === "inbound").map((c) => Date.parse(c.lastMessageAt ?? "") || 0));
        if (anterior && recebida > ultimaRecebida.current && ultimaRecebida.current) tocar("recebimento");
        ultimaRecebida.current = Math.max(ultimaRecebida.current, recebida);
        // Mantém as páginas já carregadas além da primeira.
        const extras = anterior && chave === chaveListaRef.current ? anterior.conversations.slice(PAGINA).filter((c) => !atual.conversations.some((n) => n.phone === c.phone)) : [];
        return { conversations: [...atual.conversations, ...extras], nextOffset: extras.length ? anterior!.nextOffset : atual.nextOffset };
      });
      if (!buscaAtivaRef.current) void gravarLista(chave, atual);
      setErro("");
    } catch (falha) { setErro(errorMessage(falha)); }
    finally { setCarregandoLista(false); }
  }, [consultaLista]);
  const buscaAtivaRef = useRef(buscaAtiva);
  buscaAtivaRef.current = buscaAtiva;

  // Troca de aba/filtro/busca: mostra o cache na hora e atualiza.
  useEffect(() => {
    let vivo = true;
    setCarregandoLista(true);
    void lerLista(chaveLista).then((cache) => { if (vivo && cache && !buscaAtiva) { setLista(cache); setCarregandoLista(false); } });
    void recarregarLista();
    return () => { vivo = false; };
  }, [chaveLista, buscaAtiva, recarregarLista]);

  const carregarMaisLista = useCallback(async () => {
    if (!lista?.nextOffset || maisLista) return;
    setMaisLista(true);
    try {
      const pagina = await consultaLista(lista.nextOffset);
      setLista((atual) => atual ? { conversations: [...atual.conversations, ...pagina.conversations.filter((c) => !atual.conversations.some((a) => a.phone === c.phone))], nextOffset: pagina.nextOffset } : pagina);
    } catch (falha) { setErro(errorMessage(falha)); }
    finally { setMaisLista(false); }
  }, [lista?.nextOffset, maisLista, consultaLista]);

  const atualizarFio = useCallback((phone: string, mudar: (fio: Fio) => Fio) => {
    setFios((todos) => ({ ...todos, [phone]: mudar(todos[phone] ?? { messages: [], nextBefore: null, carregado: false }) }));
  }, []);

  /** Últimas mensagens da conversa (cache primeiro, depois servidor). */
  const carregarFio = useCallback(async (phone: string, forcar = false) => {
    const atual = fiosRef.current[phone];
    if (!atual?.carregado && !atual?.messages.length) {
      const cache = await lerConversa(phone);
      if (cache?.messages.length) atualizarFio(phone, (fio) => (fio.carregado ? fio : { ...fio, messages: mesclar(fio.messages, cache.messages), nextBefore: cache.nextBefore }));
    }
    if (atual?.carregado && !forcar) return;
    try {
      const dados = await whatsappRequest<{ messages: WhatsAppMessage[]; conversation: WhatsAppConversation | null; nextBefore: string | null }>(`messages?phone=${encodeURIComponent(phone)}&limit=${RECENTES}`);
      atualizarFio(phone, (fio) => {
        const messages = mesclar(fio.messages, dados.messages);
        void gravarConversa(phone, { messages, nextBefore: fio.carregado ? fio.nextBefore : dados.nextBefore });
        return { ...fio, messages, nextBefore: fio.carregado ? fio.nextBefore : dados.nextBefore, carregado: true, conversation: dados.conversation };
      });
    } catch (falha) { setErro(errorMessage(falha)); }
  }, [atualizarFio]);

  const carregarAntigas = useCallback(async (phone: string) => {
    const fio = fiosRef.current[phone];
    if (!fio?.nextBefore || fio.carregandoAntigas) return false;
    atualizarFio(phone, (f) => ({ ...f, carregandoAntigas: true }));
    try {
      const dados = await whatsappRequest<{ messages: WhatsAppMessage[]; nextBefore: string | null }>(`messages?phone=${encodeURIComponent(phone)}&limit=100&before=${encodeURIComponent(fio.nextBefore)}`);
      atualizarFio(phone, (f) => ({ ...f, messages: mesclar(f.messages, dados.messages), nextBefore: dados.nextBefore, carregandoAntigas: false }));
      return true;
    } catch (falha) { setErro(errorMessage(falha)); atualizarFio(phone, (f) => ({ ...f, carregandoAntigas: false })); return false; }
  }, [atualizarFio]);

  // Abrir: carrega e marca como lida (recibo azul na última recebida).
  const conversaSelecionada = useMemo(() => (selecionado ? lista?.conversations.find((c) => c.phone === selecionado) ?? fios[selecionado]?.conversation ?? null : null), [selecionado, lista, fios]);
  const marcarLida = useCallback(async (phone: string) => {
    setLista((atual) => atual && { ...atual, conversations: atual.conversations.map((c) => (c.phone === phone ? { ...c, unreadCount: 0, markedUnread: false } : c)) });
    try { await whatsappRequest("read", { body: { phone } }); } catch { /* a próxima abertura tenta de novo */ }
  }, []);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selecionado) url.searchParams.set("phone", selecionado); else url.searchParams.delete("phone");
    window.history.replaceState(window.history.state, "", url);
    if (selecionado) void carregarFio(selecionado, true);
  }, [selecionado, carregarFio]);
  // Lida só quando alguém está olhando: com a aba visível agora ou assim que ela voltar a ficar visível.
  useEffect(() => {
    if (!selecionado || !conversaSelecionada || !(conversaSelecionada.unreadCount > 0 || conversaSelecionada.markedUnread)) return;
    if (document.visibilityState === "visible") { void marcarLida(selecionado); return; }
    const aoVoltar = () => { if (document.visibilityState === "visible") void marcarLida(selecionado); };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => document.removeEventListener("visibilitychange", aoVoltar);
  }, [selecionado, conversaSelecionada, marcarLida]);

  // Revisão leve: a cada 3 s com a aba visível; quando muda, lista + conversa aberta (só as recentes, mescladas).
  useEffect(() => {
    let parado = false, timer = 0;
    const verificar = async () => {
      if (parado) return;
      if (document.visibilityState === "visible" && navigator.onLine !== false) {
        try {
          const { revision, unread } = await whatsappRequest<{ revision: string; unread: number }>("revisao");
          setNaoLidas(unread);
          if (revision !== revisao.current) {
            const primeira = !revisao.current;
            revisao.current = revision;
            if (!primeira) {
              await recarregarLista();
              const aberto = selecionadoRef.current;
              if (aberto) await carregarFio(aberto, true);
            }
          }
        } catch { /* tenta de novo no próximo ciclo */ }
      }
      if (!parado) timer = window.setTimeout(verificar, 3000);
    };
    void verificar();
    const aoVoltar = () => { if (document.visibilityState === "visible") { window.clearTimeout(timer); void verificar(); } };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => { parado = true; window.clearTimeout(timer); document.removeEventListener("visibilitychange", aoVoltar); };
  }, [recarregarLista, carregarFio]);
  const selecionadoRef = useRef(selecionado);
  selecionadoRef.current = selecionado;

  useEffect(() => { void whatsappRequest<{ labels: string[] }>("etiquetas").then((d) => setEtiquetas(d.labels)).catch(() => undefined); }, []);

  /* ---------------------------------------------------------- organização (otimista, com volta em caso de erro) */
  const organizar = useCallback(async (phone: string, acao: AcaoConversa) => {
    const antes = lista;
    setLista((atual) => atual && { ...atual, conversations: atual.conversations.map((c) => c.phone !== phone ? c : {
      ...c, ...(acao.fixar !== undefined ? { pinned: acao.fixar } : {}), ...(acao.favoritar !== undefined ? { starred: acao.favoritar } : {}), ...(acao.arquivar !== undefined ? { archived: acao.arquivar, pinned: acao.arquivar ? false : c.pinned } : {}),
      ...(acao.naoLida !== undefined ? { markedUnread: acao.naoLida, unreadCount: acao.naoLida ? Math.max(1, c.unreadCount) : 0 } : {}), ...(acao.etiquetas ? { labels: acao.etiquetas } : {}),
    }).filter((c) => (aba === "arquivadas" ? c.archived : !c.archived)) });
    if (acao.naoLida && phone === selecionado) setSelecionado(undefined);
    try {
      await whatsappRequest("conversations", { body: { phone, ...acao } });
      if (acao.etiquetas) setEtiquetas((atuais) => [...new Set([...atuais, ...acao.etiquetas!])].sort((a, b) => a.localeCompare(b, "pt-BR")));
      void recarregarLista();
    } catch (falha) { setLista(antes); setErro(errorMessage(falha)); }
  }, [lista, aba, selecionado, recarregarLista]);

  /* ---------------------------------------------------------- envio (otimista) */
  const colocarLocal = useCallback((phone: string, mensagem: WhatsAppMessage) => atualizarFio(phone, (f) => ({ ...f, messages: [...f.messages, mensagem] })), [atualizarFio]);
  const trocarLocal = useCallback((phone: string, id: string, mudar: (m: WhatsAppMessage) => WhatsAppMessage | null) => atualizarFio(phone, (f) => ({ ...f, messages: f.messages.flatMap((m) => (m.id === id ? (mudar(m) ?? []) : [m])) })), [atualizarFio]);
  const confirmar = useCallback((phone: string, tempId: string, mensagem: WhatsAppMessage) => {
    atualizarFio(phone, (f) => ({ ...f, messages: mesclar(f.messages.filter((m) => m.id !== tempId), [mensagem]) }));
    tocar("envio");
    void recarregarLista();
  }, [atualizarFio, recarregarLista]);

  const enviarTexto = useCallback(async (phone: string, texto: string, replyTo?: WhatsAppMessage) => {
    const tempId = `temp-${novoId()}`, chave = novoId();
    const otimista: WhatsAppMessage = { id: tempId, phone, direction: "outbound", type: "text", text: texto, status: "sending", createdAt: new Date().toISOString(), ...(replyTo ? { replyTo: { id: replyTo.id, text: replyTo.text, type: replyTo.type, direction: replyTo.direction } } : {}) };
    const tentar = async () => {
      trocarLocal(phone, tempId, (m) => ({ ...m, status: "sending", error: undefined }));
      try {
        const { message } = await whatsappRequest<{ message: WhatsAppMessage }>("messages", { body: { phone, type: "text", text: texto, clientRequestId: chave, ...(replyTo ? { replyTo: replyTo.id } : {}) } });
        confirmar(phone, tempId, message);
      } catch (falha) { trocarLocal(phone, tempId, (m) => ({ ...m, status: "failed", error: errorMessage(falha), local: { retry: () => void tentar() } })); }
    };
    colocarLocal(phone, otimista);
    await tentar();
  }, [colocarLocal, trocarLocal, confirmar]);

  const enviarArquivo = useCallback(async (phone: string, arquivo: File, extra: { legenda?: string; replyTo?: WhatsAppMessage; voz?: boolean; duracao?: number } = {}) => {
    const tempId = `temp-${novoId()}`, chave = novoId(), previa = /^(image|video|audio)\//.test(arquivo.type) ? URL.createObjectURL(arquivo) : undefined;
    const tipo = arquivo.type.startsWith("image/") ? "image" : arquivo.type.startsWith("video/") ? "video" : arquivo.type.startsWith("audio/") ? "audio" : "document";
    colocarLocal(phone, { id: tempId, phone, direction: "outbound", type: tipo, text: extra.legenda || (tipo === "document" ? arquivo.name : `[${tipo}]`), filename: arquivo.name, size: arquivo.size, duration: extra.duracao, voice: extra.voz, status: "sending", createdAt: new Date().toISOString(), local: { previewUrl: previa, progress: tipo === "video" ? "Preparando o vídeo…" : "Preparando…" }, ...(extra.replyTo ? { replyTo: { id: extra.replyTo.id, text: extra.replyTo.text, type: extra.replyTo.type, direction: extra.replyTo.direction } } : {}) });
    let preparado: Preparado | null = null;
    const progresso = (texto: string) => trocarLocal(phone, tempId, (m) => ({ ...m, local: { ...m.local, progress: texto } }));
    const tentar = async () => {
      trocarLocal(phone, tempId, (m) => ({ ...m, status: "sending", error: undefined }));
      try {
        preparado ??= await prepararArquivo(arquivo, { voz: extra.voz, duracao: extra.duracao, aoProgredir: progresso });
        if (preparado.previewUrl && !previa) trocarLocal(phone, tempId, (m) => ({ ...m, local: { ...m.local, previewUrl: preparado!.previewUrl } }));
        const { message } = await enviarPreparado(phone, preparado, { caption: extra.legenda, replyTo: extra.replyTo?.id, clientRequestId: chave, aoProgredir: progresso });
        confirmar(phone, tempId, { ...message, local: undefined });
      } catch (falha) {
        trocarLocal(phone, tempId, (m) => ({ ...m, status: "failed", error: falha instanceof ErroMidia || falha instanceof Error ? falha.message : "Não foi possível enviar.", local: { ...m.local, progress: undefined, retry: () => void tentar() } }));
      }
    };
    await tentar();
  }, [colocarLocal, trocarLocal, confirmar]);

  /** Falha local some na hora; falha gravada no servidor é apagada lá também (só se não foi enviada). */
  const descartarFalha = useCallback(async (phone: string, id: string) => {
    const mensagem = fiosRef.current[phone]?.messages.find((m) => m.id === id);
    trocarLocal(phone, id, () => null);
    if (id.startsWith("temp-") || !mensagem) return;
    try { await whatsappRequest(`messages?phone=${encodeURIComponent(phone)}&id=${encodeURIComponent(id)}`, { method: "DELETE" }); }
    catch (falha) { setErro(errorMessage(falha)); void carregarFio(phone, true); }
  }, [trocarLocal, carregarFio]);
  /** "Tentar de novo" numa falha gravada no servidor (texto): apaga a falha e manda de novo. */
  const reenviarFalha = useCallback(async (phone: string, mensagem: WhatsAppMessage) => {
    await descartarFalha(phone, mensagem.id);
    const resposta = mensagem.replyTo ? fiosRef.current[phone]?.messages.find((m) => m.id === mensagem.replyTo!.id) : undefined;
    await enviarTexto(phone, mensagem.text, resposta);
  }, [descartarFalha, enviarTexto]);

  const reagir = useCallback(async (phone: string, mensagem: WhatsAppMessage, emoji: string) => {
    const minha = mensagem.reactions?.find((r) => r.from === "me");
    const novo = minha?.emoji === emoji ? "" : emoji;
    const aplicar = (lista: WhatsAppMessage["reactions"]) => [...(lista ?? []).filter((r) => r.from !== "me"), ...(novo ? [{ emoji: novo, from: "me" as const, at: Date.now() }] : [])];
    trocarLocal(phone, mensagem.id, (m) => ({ ...m, reactions: aplicar(m.reactions) }));
    try { await whatsappRequest("reacao", { body: { phone, messageId: mensagem.id, emoji: novo } }); }
    catch (falha) { trocarLocal(phone, mensagem.id, (m) => ({ ...m, reactions: mensagem.reactions })); setErro(errorMessage(falha)); }
  }, [trocarLocal]);

  const prefetchTimer = useRef(0);
  const preCarregar = useCallback((phone: string) => {
    window.clearTimeout(prefetchTimer.current);
    prefetchTimer.current = window.setTimeout(() => { if (!fiosRef.current[phone]?.carregado) void carregarFio(phone); }, 120);
  }, [carregarFio]);
  const cancelarPreCarga = useCallback(() => window.clearTimeout(prefetchTimer.current), []);

  const removerDaLista = useCallback((phone: string) => {
    setLista((atual) => atual && { ...atual, conversations: atual.conversations.filter((c) => c.phone !== phone) });
    setFios((todos) => { const copia = { ...todos }; delete copia[phone]; return copia; });
    setSelecionado(undefined);
  }, []);

  return {
    aba, setAba, busca, setBusca, buscaAtiva, etiqueta, setEtiqueta, etiquetas, naoLidas,
    lista: lista?.conversations ?? [], temMais: Boolean(lista?.nextOffset), carregarMaisLista, carregandoLista, maisLista, erro, setErro,
    selecionado, setSelecionado, conversaSelecionada, fio: selecionado ? fios[selecionado] : undefined,
    carregarAntigas, organizar, enviarTexto, enviarArquivo, descartarFalha, reenviarFalha, reagir, preCarregar, cancelarPreCarga, recarregarLista, removerDaLista,
    recarregarFio: carregarFio,
  };
}
