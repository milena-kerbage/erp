"use client";

// Chat do Direct do Instagram, no mesmo desenho das conversas do WhatsApp (lista | conversa), com a troca de canal no
// topo. Mensagens chegam pelo webhook e o histórico vem da sincronização com a Meta (src/lib/instagram/chat.ts).
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowClockwiseIcon, ArrowLeftIcon, ArrowSquareOutIcon, GearSixIcon, ImageIcon, MagnifyingGlassIcon, PaperPlaneRightIcon, XIcon } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tooltip } from "@/components/ui/Tooltip";
import { LogoInstagram } from "@/components/brand/LogosCanais";
import { TrocaCanal } from "@/features/canais/TrocaCanal";
import { ColunaConversa, ColunaLista, Raiz } from "@/features/whatsapp/conversas/estilos";
import { horaDaLista, horaDaMensagem, rotuloDoDia, mesmoDia } from "@/features/whatsapp/conversas/formato";

type Conversa = { igsid: string; nome: string; username: string; foto: string; ultimaMensagem: string; ultimoTipo: string; ultimaDirecao: "entrada" | "saida" | ""; ultimaEm: string | null; naoLidas: number; janelaAte: string | null };
type Anexo = { tipo: string; url: string };
type Mensagem = { id: string; igsid: string; direcao: "entrada" | "saida"; tipo: string; texto: string; anexos: Anexo[]; criadoEm: string; status: string; autor: string | null; local?: boolean; erro?: string };
type Lista = { conectado: boolean; username: string | null; conversas: Conversa[]; naoLidas: number };

async function pedir<T>(caminho: string, opcoes: { method?: string; corpo?: unknown } = {}): Promise<T> {
  const resposta = await fetch(`/api/instagram/${caminho}`, {
    method: opcoes.method ?? (opcoes.corpo === undefined ? "GET" : "POST"), credentials: "same-origin", cache: "no-store",
    headers: opcoes.corpo === undefined ? undefined : { "Content-Type": "application/json" }, body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
  });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(resposta.status === 401 ? "Sua sessão expirou. Entre novamente." : dados.error || "Não foi possível concluir.");
  return dados as T;
}
const ROTULO_TIPO: Record<string, string> = { image: "Foto", video: "Vídeo", audio: "Áudio", file: "Arquivo", share: "Publicação compartilhada", story_mention: "Menção no story", reel: "Reel", ig_reel: "Reel" };
const previa = (c: Conversa) => c.ultimaMensagem || ROTULO_TIPO[c.ultimoTipo] || "Mensagem";
const DIA = 86_400_000;

export function ChatInstagram() {
  const [lista, setLista] = useState<Lista | null>(null);
  const [selecionado, setSelecionado] = useState<string>();
  const [busca, setBusca] = useState("");
  const [sincronizando, setSincronizando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [erro, setErro] = useState("");
  const sincronizouAuto = useRef(false);

  const carregar = useCallback(async () => {
    try { setLista(await pedir<Lista>("chat")); setErro(""); } catch (falha) { setErro(falha instanceof Error ? falha.message : "Falha ao carregar."); }
  }, []);
  const sincronizar = useCallback(async (automatico = false) => {
    setSincronizando(true);
    try {
      const r = await pedir<{ conversas: number; mensagens: number }>("chat", { corpo: { acao: "sincronizar" } });
      if (!automatico || r.mensagens) setAviso(r.mensagens ? `${r.mensagens} mensagens trazidas do Instagram (${r.conversas} conversas).` : "Tudo em dia com o Instagram.");
      await carregar();
    } catch (falha) { if (!automatico) setAviso(falha instanceof Error ? falha.message : "Não foi possível sincronizar."); }
    finally { setSincronizando(false); }
  }, [carregar]);

  useEffect(() => { void carregar(); const t = window.setInterval(() => { if (document.visibilityState === "visible") void carregar(); }, 10_000); return () => window.clearInterval(t); }, [carregar]);
  // Primeira abertura conectada e sem conversas: traz o histórico do Direct sozinho.
  useEffect(() => { if (lista?.conectado && !lista.conversas.length && !sincronizouAuto.current) { sincronizouAuto.current = true; void sincronizar(true); } }, [lista, sincronizar]);
  useEffect(() => { if (!aviso) return; const t = window.setTimeout(() => setAviso(""), 4000); return () => window.clearTimeout(t); }, [aviso]);

  const conversas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const todas = lista?.conversas ?? [];
    return termo ? todas.filter((c) => `${c.nome} ${c.username} ${c.ultimaMensagem}`.toLowerCase().includes(termo)) : todas;
  }, [lista, busca]);
  const atual = lista?.conversas.find((c) => c.igsid === selecionado);

  if (lista && !lista.conectado) {
    return (
      <Raiz data-flush>
        <ColunaLista data-pane="lista" aria-label="Instagram"><div className="listHead"><div className="listTitleRow"><TrocaCanal atual="instagram" /></div></div></ColunaLista>
        <ColunaConversa data-pane="conversa" aria-label="Instagram">
          <div className="threadEmpty">
            <EmptyState icon={<LogoInstagram size={28} />} title="Conecte o Instagram do ateliê" description="Depois de conectar, as mensagens do Direct aparecem aqui e você responde pelo ERP.">
              <Button href="/configuracoes/instagram" icon={GearSixIcon}>Conectar o Instagram</Button>
            </EmptyState>
          </div>
        </ColunaConversa>
      </Raiz>
    );
  }

  return (
    <Raiz data-flush data-open={selecionado ? "" : undefined}>
      <ColunaLista data-pane="lista" aria-label="Conversas do Instagram">
        <div className="listHead">
          <div className="listTitleRow">
            <h1 className="listTitle" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Instagram</h1>
            <TrocaCanal atual="instagram" />
            <span className="listTitleActions">
              <Tooltip label="Buscar mensagens no Instagram" side="bottom">
                <button type="button" className="squareButton" data-size="sm" aria-label="Buscar mensagens no Instagram" disabled={sincronizando} onClick={() => void sincronizar()}>
                  <ArrowClockwiseIcon style={sincronizando ? { animation: "spin 1s linear infinite" } : undefined} />
                </button>
              </Tooltip>
            </span>
          </div>
          <div className="searchRow">
            <label className="search">
              <MagnifyingGlassIcon aria-hidden />
              <input type="search" value={busca} placeholder="Nome, @ ou mensagem" aria-label="Buscar nas conversas do Instagram" onChange={(e) => setBusca(e.target.value)} />
              {busca && <button type="button" aria-label="Limpar a busca" onClick={() => setBusca("")}><XIcon size={14} /></button>}
            </label>
          </div>
          {lista?.username && <p className="searchStatus" style={{ marginTop: "0.5rem" }}>Direct de @{lista.username}</p>}
        </div>
        <div className="listBody">
          {!lista && <ul className="listSkeleton" aria-hidden>{Array.from({ length: 8 }, (_, i) => <li key={i}><span className="bone" style={{ width: "2.25rem", height: "2.25rem", borderRadius: "50%" }} /><span><span className="bone" style={{ width: `${55 + (i % 3) * 12}%` }} /><span className="bone" style={{ width: `${80 - (i % 4) * 9}%`, height: "0.625rem" }} /></span></li>)}</ul>}
          {lista && !conversas.length && <p className="listEmpty">{busca ? "Nenhuma conversa com essa busca." : sincronizando ? "Buscando as conversas do Instagram…" : "As mensagens do Direct aparecem aqui assim que alguém escrever."}</p>}
          {conversas.length > 0 && (
            <section>
              <ul>
                {conversas.map((c) => (
                  <li key={c.igsid}>
                    <button type="button" className="item" data-selected={c.igsid === selecionado || undefined} data-unread={c.naoLidas > 0 || undefined} aria-current={c.igsid === selecionado || undefined} onClick={() => setSelecionado(c.igsid)}>
                      <span className="itemAvatar"><Foto conversa={c} /></span>
                      <span className="itemText">
                        <span className="itemRow">
                          <strong className="itemName"><span>{c.nome}</span></strong>
                          <time dateTime={c.ultimaEm ?? undefined}>{horaDaLista(c.ultimaEm)}</time>
                        </span>
                        <span className="itemRow">
                          <span className="preview">{c.ultimaDirecao === "saida" ? "Você: " : ""}{previa(c)}</span>
                          <span className="itemFlags">{c.naoLidas > 0 && <b>{c.naoLidas > 99 ? "99+" : c.naoLidas}</b>}</span>
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {erro && <p className="listEmpty" role="alert">{erro}</p>}
        </div>
      </ColunaLista>

      {atual ? <Fio key={atual.igsid} conversa={atual} aoVoltar={() => setSelecionado(undefined)} aoMudar={carregar} />
        : (
          <ColunaConversa data-pane="conversa" aria-label="Conversa">
            <div className="threadEmpty"><EmptyState icon={<LogoInstagram size={28} />} title="Selecione uma conversa" description="As mensagens do Direct do Instagram do ateliê aparecem aqui. Responda pelo ERP dentro do prazo da Meta." /></div>
          </ColunaConversa>
        )}
      {aviso && <div role="status" style={{ position: "fixed", left: "50%", bottom: "1.5rem", zIndex: 20, transform: "translateX(-50%)", padding: "0.5rem 0.875rem", fontSize: "0.8125rem", color: "var(--color-bg)", background: "var(--color-ink)", borderRadius: "0.5rem", boxShadow: "var(--shadow-md)" }}>{aviso}</div>}
    </Raiz>
  );
}

function Foto({ conversa }: { conversa: Conversa }) {
  const [falhou, setFalhou] = useState(false);
  if (conversa.foto && !falhou) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={conversa.foto} alt="" width={36} height={36} style={{ width: "2.25rem", height: "2.25rem", borderRadius: "50%", objectFit: "cover" }} onError={() => setFalhou(true)} referrerPolicy="no-referrer" />;
  }
  return <Avatar name={conversa.nome} seed={conversa.igsid} size="sm" shape="circle" />;
}

function Fio({ conversa, aoVoltar, aoMudar }: { conversa: Conversa; aoVoltar: () => void; aoMudar: () => Promise<void> }) {
  const [mensagens, setMensagens] = useState<Mensagem[] | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const area = useRef<HTMLDivElement>(null);
  const igsid = conversa.igsid;

  const carregar = useCallback(async () => {
    try { const r = await pedir<{ mensagens: Mensagem[] }>(`chat/${igsid}`); setMensagens((antes) => [...r.mensagens, ...(antes ?? []).filter((m) => m.local && !r.mensagens.some((n) => n.texto === m.texto && n.direcao === "saida"))]); } catch { /* tenta no próximo ciclo */ }
  }, [igsid]);
  useEffect(() => {
    void carregar();
    // Abriu: marca como lidas e atualiza o contador do menu.
    void pedir(`chat/${igsid}`, { method: "PATCH", corpo: {} }).then(() => { window.dispatchEvent(new Event("instagram:changed")); void aoMudar(); }).catch(() => {});
    const t = window.setInterval(() => { if (document.visibilityState === "visible") void carregar(); }, 5_000);
    return () => window.clearInterval(t);
  }, [igsid, carregar, aoMudar]);
  useEffect(() => { area.current?.scrollTo({ top: area.current.scrollHeight }); }, [mensagens?.length]);

  const ultimaEntrada = conversa.janelaAte ? Date.parse(conversa.janelaAte) - DIA : 0;
  const desde = ultimaEntrada ? Date.now() - ultimaEntrada : Infinity;
  const janela = desde <= DIA ? "aberta" : desde <= 7 * DIA ? "atendimento" : "fechada";
  const dica = janela === "aberta" ? `Resposta livre até ${new Date(ultimaEntrada + DIA).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
    : janela === "atendimento" ? "Fora das 24 h: a resposta vai como atendimento humano (até 7 dias)" : "Prazo da Meta encerrado: a pessoa precisa escrever de novo";

  async function enviar() {
    const corpo = texto.trim();
    if (!corpo || enviando || janela === "fechada") return;
    const temp: Mensagem = { id: `temp-${Date.now()}`, igsid, direcao: "saida", tipo: "text", texto: corpo, anexos: [], criadoEm: new Date().toISOString(), status: "enviando", autor: null, local: true };
    setMensagens((atual) => [...(atual ?? []), temp]); setTexto(""); setEnviando(true);
    try { await pedir(`chat/${igsid}`, { corpo: { texto: corpo } }); await carregar(); setMensagens((atual) => (atual ?? []).filter((m) => m.id !== temp.id)); void carregar(); void aoMudar(); }
    catch (falha) { setMensagens((atual) => (atual ?? []).map((m) => (m.id === temp.id ? { ...m, status: "falhou", erro: falha instanceof Error ? falha.message : "Não enviada" } : m))); }
    finally { setEnviando(false); }
  }

  const dias = useMemo(() => {
    const grupos: Array<{ chave: string; itens: Mensagem[] }> = [];
    for (const m of mensagens ?? []) {
      const ultimo = grupos.at(-1);
      if (ultimo && mesmoDia(ultimo.itens[0].criadoEm, m.criadoEm)) ultimo.itens.push(m); else grupos.push({ chave: m.criadoEm, itens: [m] });
    }
    return grupos;
  }, [mensagens]);

  return (
    <ColunaConversa data-pane="conversa" aria-label={`Conversa com ${conversa.nome}`} style={{ "--composer-h": "4.5rem" } as CSSProperties}>
      <header className="threadHead">
        <span className="back"><button type="button" className="iconGhost" data-soft="" aria-label="Voltar para a lista" onClick={aoVoltar}><ArrowLeftIcon /></button></span>
        <Foto conversa={conversa} />
        <div className="threadName" style={{ cursor: "default" }}>
          <span className="threadTitle"><strong>{conversa.nome}</strong><LogoInstagram size={14} /></span>
          <span className="threadMeta">{conversa.username ? `@${conversa.username} · ` : ""}{dica}</span>
        </div>
        {conversa.username && (
          <div className="threadActions">
            <Tooltip label="Abrir o perfil no Instagram" side="bottom">
              <a className="iconGhost" href={`https://www.instagram.com/${conversa.username}`} target="_blank" rel="noreferrer" aria-label="Abrir o perfil no Instagram"><ArrowSquareOutIcon /></a>
            </Tooltip>
          </div>
        )}
      </header>

      <div className="messages" ref={area} role="log" aria-live="polite">
        {!mensagens && <div className="threadSkeleton" aria-hidden>{[0, 1, 0, 0, 1].map((lado, i) => <span key={i} className="skeletonBubble" data-out={lado ? "" : undefined} />)}</div>}
        {mensagens && !mensagens.length && <div className="loading">Nenhuma mensagem ainda.</div>}
        {dias.map((dia) => (
          <section key={dia.chave} className="dayGroup" aria-label={rotuloDoDia(dia.itens[0].criadoEm)}>
            <div className="day"><span>{rotuloDoDia(dia.itens[0].criadoEm)}</span></div>
            {dia.itens.map((m, i) => {
              const saida = m.direcao === "saida", primeira = i === 0 || dia.itens[i - 1].direcao !== m.direcao;
              const visual = m.anexos.find((a) => (a.tipo === "image" || a.tipo === "video" || a.tipo === "share" || a.tipo === "story_mention" || a.tipo === "ig_reel" || a.tipo === "reel") && a.url);
              const rotulo = !m.texto && !visual ? ROTULO_TIPO[m.tipo] || "Mensagem" : "";
              return (
                <div key={m.id} className="row" id={`m-${m.id}`} data-out={saida || undefined} data-first={primeira || undefined}>
                  <div className="passThrough">
                    <div className="bubble" data-tone={saida ? "agent" : "contact"} data-first={primeira || undefined} data-media={visual ? "" : undefined} data-pending={m.status === "enviando" || undefined}>
                      {primeira && saida && m.autor && <span className="bubbleAuthor">{m.autor.split(" ").slice(0, 2).join(" ")}</span>}
                      {visual && (visual.tipo === "video"
                        ? <video className="image" src={visual.url} controls preload="metadata" playsInline />
                        // eslint-disable-next-line @next/next/no-img-element
                        : <a className="mediaLink" href={visual.url} target="_blank" rel="noreferrer"><img className="image" src={visual.url} alt={ROTULO_TIPO[visual.tipo] || "Foto"} loading="lazy" referrerPolicy="no-referrer" /></a>)}
                      {(m.texto || rotulo) && <p className="text">{rotulo ? <span className="imageMissing"><ImageIcon aria-hidden /> {rotulo}</span> : m.texto}<span className="spacer" aria-hidden /></p>}
                      <span className="meta" data-overlay={visual && !m.texto ? "" : undefined}>{horaDaMensagem(m.criadoEm)}</span>
                    </div>
                  </div>
                  {m.status === "falhou" && <span className="failedLine" role="status">Não enviada{m.erro ? ` / ${m.erro}` : ""}</span>}
                </div>
              );
            })}
          </section>
        ))}
      </div>

      <form className="composerIg" onSubmit={(e) => { e.preventDefault(); void enviar(); }}
        style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", padding: "0.75rem 1rem", borderTop: "var(--line)", background: "var(--color-bg)" }}>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={1} maxLength={1000} disabled={janela === "fechada"}
          placeholder={janela === "fechada" ? "A Meta só permite responder até 7 dias depois da última mensagem da pessoa." : `Mensagem para ${conversa.nome.split(" ")[0]}`}
          aria-label="Mensagem" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void enviar(); } }}
          style={{ flex: 1, resize: "none", minHeight: "2.5rem", maxHeight: "8rem", padding: "0.625rem 0.875rem", border: "var(--line)", borderRadius: "1.25rem", background: "var(--color-elevated)", font: "inherit", fontSize: "0.9375rem", color: "var(--color-ink)", fieldSizing: "content" } as CSSProperties} />
        <Button type="submit" icon={PaperPlaneRightIcon} loading={enviando} disabled={!texto.trim() || janela === "fechada"} aria-label="Enviar">Enviar</Button>
      </form>
    </ColunaConversa>
  );
}
