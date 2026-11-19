"use client";

// O campo da conversa, no desenho do ERP da Le Ange (composer.tsx): uma caixa só, o texto em cima (duas linhas de saída,
// cresce até sete) e, embaixo, a fileira de funções: Mensagem | Nota interna, o "+" com o leque de anexos, as respostas
// rápidas (o raio, ou "/" em qualquer ponto do texto) e os emojis; à direita, as dicas de teclado e o microfone, que vira
// seta quando há texto. Enter envia, Shift+Enter quebra linha, e a composição de acento não dispara. Fora da janela de 24h,
// a faixa acima do campo oferece o modelo aprovado e o campo segue aberto para a nota interna.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ClipboardEvent, type CSSProperties, type KeyboardEvent } from "react";
import {
  ArrowUpIcon, ChatTextIcon, FileIcon, FilePdfIcon, FileTextIcon, ImageIcon, LightningIcon, LockSimpleIcon, MicrophoneIcon, PauseIcon, PlayIcon, PlusIcon, ProhibitIcon, SmileyIcon, TrashIcon, UploadSimpleIcon, WaveformIcon, XIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/Menu";
import { TextField } from "@/components/ui/TextField";
import { Tooltip } from "@/components/ui/Tooltip";
import { whatsappRequest } from "../client";
import type { WhatsAppMessage } from "../types";
import { Citacao } from "./Bolha";
import { gravarRascunho, lerRascunho } from "./cache";
import { duracao as mmss, tamanhoArquivo } from "./formato";

type Resposta = { id: string; shortcut: string; title: string; body: string };
type Modo = "message" | "note";
/** O que o "+" deixa escolher do computador, no que a Cloud API aceita de cada tipo (foto e vídeo são convertidos aqui). */
const ACEITA = {
  midia: "image/jpeg,image/png,image/webp,image/heic,image/gif,video/mp4,video/quicktime,video/3gpp,video/webm,video/x-m4v",
  documento: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip",
  audio: "audio/aac,audio/mp4,audio/mpeg,audio/amr,audio/ogg,audio/*",
} as const;
/** O "/" que abre as respostas rápidas: no começo do texto ou depois de um espaço, até onde está o cursor. */
const BARRA = /(^|\s)\/([^\s/]*)$/;
const MAX_GRAVACAO = 120, MAX_ARQUIVOS = 10;
const GRUPOS_EMOJI: Array<[string, string[]]> = [
  ["Ateliê", ["🧵", "🪡", "✂️", "📏", "🛏️", "🧸", "🎀", "👶", "🍼", "🎁", "📦", "🚚", "💐", "🌸", "🌿", "🤍", "💚", "💖", "✨", "🏡"]],
  ["Rostos", ["😊", "🙂", "😉", "😍", "🥰", "🤩", "😘", "😂", "🤣", "🥹", "😅", "😇", "🤗", "🤔", "😮", "😢", "😭", "😴", "😎", "🥳", "😬", "🙃", "😌", "😋"]],
  ["Gestos", ["👍", "👏", "🙏", "🙌", "💪", "👌", "✌️", "🤝", "👋", "🤞", "👀", "🫶", "❤️", "🧡", "💛", "💙", "💜", "🖤", "💯", "🔥"]],
  ["Recados", ["✅", "☑️", "❌", "⚠️", "❗", "❓", "📅", "⏰", "⌛", "📍", "📸", "📎", "📝", "💬", "📞", "💳", "💰", "🧾", "🎉", "⭐"]],
];

function IconeArquivo({ arquivo }: { arquivo: File }) {
  if (arquivo.type === "application/pdf") return <FilePdfIcon aria-hidden />;
  if (arquivo.type.startsWith("audio/")) return <WaveformIcon aria-hidden />;
  if (arquivo.type.startsWith("text/") || /\.(docx?|odt|rtf|txt)$/i.test(arquivo.name)) return <FileTextIcon aria-hidden />;
  return <FileIcon aria-hidden />;
}

/** Os arquivos escolhidos, dentro da caixa, acima do texto: documentos em linha, fotos e vídeos em miniatura. */
function Anexos({ arquivos, aoTirar, aoAdicionar }: { arquivos: File[]; aoTirar: (indice: number) => void; aoAdicionar: () => void }) {
  const entradas = useMemo(() => arquivos.map((arquivo, indice) => ({ arquivo, indice, visual: arquivo.type.startsWith("image/") || arquivo.type.startsWith("video/") })), [arquivos]);
  // A miniatura sai do próprio arquivo, sem subir nada; o endereço é solto quando a lista muda.
  const previas = useMemo(() => new Map(entradas.filter((e) => e.visual).map((e) => [e.indice, URL.createObjectURL(e.arquivo)])), [entradas]);
  useEffect(() => () => previas.forEach((url) => URL.revokeObjectURL(url)), [previas]);
  if (!arquivos.length) return null;
  const visuais = entradas.filter((e) => e.visual), outros = entradas.filter((e) => !e.visual);
  return (
    <div className="attachments" aria-label="Arquivos anexados">
      {outros.length > 0 && (
        <ul className="attachRows">
          {outros.map(({ arquivo, indice }) => (
            <li key={`${arquivo.name}-${indice}`} className="attachRow">
              <span className="attachRowBody"><IconeArquivo arquivo={arquivo} /><strong title={arquivo.name}>{arquivo.name}</strong><small>{tamanhoArquivo(arquivo.size)}</small></span>
              <button type="button" className="attachRowRemove" aria-label={`Tirar ${arquivo.name}`} onClick={() => aoTirar(indice)}><XIcon size={14} /></button>
            </li>
          ))}
        </ul>
      )}
      {visuais.length > 0 && (
        <ul className="attachThumbs">
          {visuais.map(({ arquivo, indice }) => (
            <li key={`${arquivo.name}-${indice}`} className="attachThumb" data-video={arquivo.type.startsWith("video/") || undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {arquivo.type.startsWith("video/") ? <video src={previas.get(indice)} controls preload="metadata" playsInline aria-label={arquivo.name} /> : <img src={previas.get(indice)} alt={arquivo.name} />}
              <span className="attachSize">{tamanhoArquivo(arquivo.size)}</span>
              <button type="button" className="attachRemove" aria-label={`Tirar ${arquivo.name}`} onClick={() => aoTirar(indice)}><XIcon /></button>
            </li>
          ))}
          {arquivos.length < MAX_ARQUIVOS && <li><button type="button" className="attachMore" aria-label="Anexar mais" onClick={aoAdicionar}><PlusIcon size={18} /></button></li>}
        </ul>
      )}
    </div>
  );
}

export function Compositor({ phone, nomeContato, janelaAberta, bloqueado, respondendo, aoCancelarResposta, aoEnviarTexto, aoEnviarNota, aoEnviarArquivo, aoAbrirModelo, aoMedir }: {
  phone: string; nomeContato: string; janelaAberta: boolean; bloqueado: boolean; respondendo: WhatsAppMessage | null; aoCancelarResposta: () => void;
  aoEnviarTexto: (texto: string, resposta?: WhatsAppMessage) => void; aoEnviarNota: (texto: string) => void;
  aoEnviarArquivo: (arquivo: File, extra: { legenda?: string; replyTo?: WhatsAppMessage; voz?: boolean; duracao?: number }) => void;
  aoAbrirModelo: () => void; aoMedir: (altura: number) => void;
}) {
  const primeiroNome = nomeContato.split(" ")[0] || nomeContato;
  const podeMensagem = janelaAberta && !bloqueado;
  const [texto, setTexto] = useState("");
  const [cursor, setCursor] = useState(0);
  const [modoPedido, setModo] = useState<Modo>("message");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [soltando, setSoltando] = useState(false);
  const [painel, setPainel] = useState<null | "quick" | "emoji">(null);
  const [grupoEmoji, setGrupoEmoji] = useState(0);
  const [respostas, setRespostas] = useState<Resposta[] | null>(null);
  const [ativa, setAtiva] = useState(0);
  const [editando, setEditando] = useState<Partial<Resposta> | null>(null);
  const doca = useRef<HTMLDivElement>(null), campo = useRef<HTMLTextAreaElement>(null), seletor = useRef<HTMLInputElement>(null), listaRapida = useRef<HTMLDivElement>(null);
  // Fora da janela (ou com o contato bloqueado) só a nota interna segue disponível.
  const modo: Modo = podeMensagem ? modoPedido : "note";
  const nota = modo === "note";
  const gravador = useGravador((arquivo, segundos) => aoEnviarArquivo(arquivo, { voz: true, duracao: segundos, replyTo: respondendo ?? undefined }));
  const gravando = gravador.estado !== "parado";

  // Rascunho por conversa.
  useEffect(() => { setTexto(lerRascunho(phone)); setArquivos([]); setPainel(null); setModo("message"); }, [phone]);
  useEffect(() => { const t = window.setTimeout(() => gravarRascunho(phone, texto), 300); return () => window.clearTimeout(t); }, [phone, texto]);
  // O campo cresce com o texto (até 11rem); a doca informa a altura para a última mensagem ficar sempre acima dela.
  useLayoutEffect(() => { const c = campo.current; if (!c) return; c.style.height = "auto"; c.style.height = `${Math.min(c.scrollHeight, 176)}px`; }, [texto, gravando]);
  useEffect(() => {
    const alvo = doca.current;
    if (!alvo) return;
    const observador = new ResizeObserver(() => aoMedir(alvo.offsetHeight));
    observador.observe(alvo);
    return () => observador.disconnect();
  }, [aoMedir]);
  useEffect(() => { if (respondendo) campo.current?.focus(); }, [respondendo]);

  // Respostas rápidas: o "/" antes do cursor abre o painel já filtrado; o raio abre com todas.
  const barra = BARRA.exec(texto.slice(0, cursor));
  const trecho = barra ? barra[2].toLowerCase() : null;
  const mostrarRapidas = !gravando && (trecho !== null || painel === "quick");
  useEffect(() => { if (mostrarRapidas && respostas === null) void whatsappRequest<{ replies: Resposta[] }>("respostas-rapidas").then((d) => setRespostas(d.replies)).catch(() => setRespostas([])); }, [mostrarRapidas, respostas]);
  const encontradas = useMemo(() => (respostas ?? []).filter((r) => !trecho || r.shortcut.includes(trecho) || r.title.toLowerCase().includes(trecho) || r.body.toLowerCase().includes(trecho)), [respostas, trecho]);
  const previa = encontradas[Math.min(ativa, encontradas.length - 1)];
  const comNome = (corpo: string) => corpo.replace(/\{nome\}/gi, primeiroNome);
  useEffect(() => { listaRapida.current?.querySelector("[data-active]")?.scrollIntoView({ block: "nearest" }); }, [ativa]);

  const focar = () => window.setTimeout(() => campo.current?.focus(), 0);
  const trocarTexto = (novo: string, posicao = novo.length) => { setTexto(novo); setCursor(posicao); focar(); window.setTimeout(() => campo.current?.setSelectionRange(posicao, posicao), 0); };
  const usarResposta = (resposta: Resposta) => {
    const corpo = comNome(resposta.body);
    if (barra) { const inicio = barra.index + barra[1].length; trocarTexto(texto.slice(0, inicio) + corpo + texto.slice(cursor), inicio + corpo.length); }
    else trocarTexto(texto ? `${texto}${/\s$/.test(texto) ? "" : " "}${corpo}` : corpo);
    setPainel(null); setAtiva(0);
  };
  const inserir = (pedaco: string) => { const c = campo.current, inicio = c?.selectionStart ?? texto.length, fim = c?.selectionEnd ?? texto.length; trocarTexto(texto.slice(0, inicio) + pedaco + texto.slice(fim), inicio + pedaco.length); };

  const adicionar = useCallback((lista: FileList | File[]) => { setArquivos((atuais) => [...atuais, ...lista].slice(0, MAX_ARQUIVOS)); setPainel(null); campo.current?.focus(); }, []);
  const escolher = (tipo: keyof typeof ACEITA | "") => { if (!seletor.current) return; seletor.current.accept = tipo ? ACEITA[tipo] : ""; seletor.current.click(); };

  const enviar = () => {
    const limpo = texto.trim();
    if (nota) { if (!limpo) return; aoEnviarNota(limpo); }
    else if (arquivos.length) {
      // A legenda vai na primeira mídia que aceita legenda; o resto vai sem.
      let usada = false;
      for (const arquivo of arquivos) {
        const aceita = !usada && !arquivo.type.startsWith("audio/");
        aoEnviarArquivo(arquivo, { legenda: aceita && limpo ? limpo : undefined, replyTo: respondendo ?? undefined });
        if (aceita && limpo) usada = true;
      }
      if (limpo && !usada) aoEnviarTexto(limpo, respondendo ?? undefined);
      setArquivos([]);
    } else if (limpo) aoEnviarTexto(limpo, respondendo ?? undefined);
    else return;
    setTexto(""); setCursor(0); gravarRascunho(phone, ""); setPainel(null);
    if (!nota) aoCancelarResposta();
    focar();
  };

  const teclas = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mostrarRapidas) {
      if (e.key === "Escape") { e.preventDefault(); setPainel(null); if (barra) trocarTexto(texto.slice(0, barra.index + barra[1].length) + texto.slice(cursor), barra.index + barra[1].length); return; }
      if (encontradas.length) {
        if (e.key === "ArrowDown") { e.preventDefault(); setAtiva((i) => (i + 1) % encontradas.length); return; }
        if (e.key === "ArrowUp") { e.preventDefault(); setAtiva((i) => (i - 1 + encontradas.length) % encontradas.length); return; }
        if ((e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) || e.key === "Tab") { e.preventDefault(); usarResposta(encontradas[Math.min(ativa, encontradas.length - 1)]); return; }
      }
    }
    if (e.key === "Escape" && painel) { e.preventDefault(); setPainel(null); return; }
    if (e.key === "Escape" && respondendo) { e.preventDefault(); aoCancelarResposta(); return; }
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    enviar();
  };
  const colar = (e: ClipboardEvent) => {
    if (nota) return;
    const lista = [...e.clipboardData.items].filter((item) => item.kind === "file").flatMap((item) => { const arquivo = item.getAsFile(); return arquivo ? [arquivo] : []; });
    if (lista.length) { e.preventDefault(); adicionar(lista); }
  };
  const apagarResposta = async (id: string) => { try { setRespostas((await whatsappRequest<{ replies: Resposta[] }>(`respostas-rapidas?id=${encodeURIComponent(id)}`, { method: "DELETE" })).replies); setAtiva(0); } catch { /* fica como estava */ } };

  const vazio = !texto.trim() && !arquivos.length;
  return (
    <div className="dock" ref={doca}>
      <div className="composer">
        {/* Respostas rápidas em duas metades: à esquerda a lista com o atalho, à direita o texto inteiro da que está em foco,
            já com o nome do contato, para conferir antes de usar. */}
        {mostrarRapidas && (
          <div className="quick" role="dialog" aria-label="Respostas rápidas">
            <div ref={listaRapida} className="quickList" role="listbox" aria-label="Respostas">
              <span className="popoverTitle">Respostas rápidas {trecho ? <kbd>/{trecho}</kbd> : null}</span>
              {respostas === null ? <p className="popoverEmpty">Carregando…</p>
                : encontradas.length === 0 ? <p className="popoverEmpty">{respostas.length ? "Nenhuma resposta com esse atalho." : "Ainda não há respostas rápidas. Crie a primeira: o preço, o prazo, o endereço."}</p>
                : encontradas.map((resposta, indice) => (
                  <button key={resposta.id} type="button" role="option" aria-selected={indice === ativa} data-active={indice === ativa || undefined} onMouseEnter={() => setAtiva(indice)} onMouseDown={(e) => { e.preventDefault(); usarResposta(resposta); }}>
                    <span>{resposta.title}</span><kbd>/{resposta.shortcut}</kbd>
                  </button>
                ))}
              <button type="button" data-new="" onMouseDown={(e) => { e.preventDefault(); setEditando({ body: trecho === null ? texto.trim() : "" }); }}><span>+ Nova resposta rápida</span></button>
            </div>
            <div className="quickPreview" aria-live="polite">
              {previa ? (
                <>
                  <span className="popoverTitle">Vai ficar assim</span>
                  <p>{comNome(previa.body)}</p>
                  <span className="quickActions"><button type="button" onClick={() => setEditando(previa)}>Editar</button><button type="button" onClick={() => void apagarResposta(previa.id)}>Excluir</button></span>
                  <span className="quickKeys"><span><kbd>↑</kbd> <kbd>↓</kbd> escolher</span><span><kbd>Enter</kbd> usar</span><span><kbd>Esc</kbd> fechar</span></span>
                </>
              ) : <p className="popoverEmpty">Escolha uma resposta para ver o texto. Use {"{nome}"} no texto para o primeiro nome do contato.</p>}
            </div>
          </div>
        )}
        {painel === "emoji" && !mostrarRapidas && (
          <div className="emojiPanel" role="dialog" aria-label="Emojis">
            <div className="emojiGroups" role="group" aria-label="Grupos de emojis">{GRUPOS_EMOJI.map(([nome], indice) => <button key={nome} type="button" aria-pressed={indice === grupoEmoji} onClick={() => setGrupoEmoji(indice)}>{nome}</button>)}</div>
            <div className="emojiGrid">{GRUPOS_EMOJI[grupoEmoji][1].map((emoji) => <button key={emoji} type="button" aria-label={`Inserir ${emoji}`} onMouseDown={(e) => { e.preventDefault(); inserir(emoji); }}>{emoji}</button>)}</div>
          </div>
        )}
        <input ref={seletor} type="file" hidden multiple onChange={(e) => { if (e.target.files?.length) adicionar(e.target.files); e.target.value = ""; }} />

        {bloqueado ? (
          <div className="closedStrip"><ProhibitIcon weight="fill" aria-hidden /><span>{primeiroNome} pediu para não receber mais mensagens (PARAR). O envio fica bloqueado até a pessoa escrever de novo; a nota interna segue liberada.</span></div>
        ) : !janelaAberta && (
          <div className="closedStrip">
            <LockSimpleIcon weight="fill" aria-hidden />
            <span>Janela de 24 horas fechada. Para falar com {primeiroNome}, envie um modelo aprovado.</span>
            <Button size="sm" variant="secondary" onClick={aoAbrirModelo}>Enviar modelo</Button>
          </div>
        )}

        {/* A caixa: o texto ocupa a parte de cima e as funções ficam numa fileira embaixo. Clicar no vão leva o foco ao texto. */}
        <div className="box" data-note={nota || undefined}
          onDragOver={(e) => { if (nota || !Array.from(e.dataTransfer.types).includes("Files")) return; e.preventDefault(); if (!soltando) setSoltando(true); }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSoltando(false); }}
          onDrop={(e) => { if (nota || !e.dataTransfer.files.length) return; e.preventDefault(); setSoltando(false); adicionar(e.dataTransfer.files); }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); campo.current?.focus(); } }}>
          {soltando && <span className="drop" aria-hidden><strong><UploadSimpleIcon /> Solte para anexar</strong><small>Fotos, vídeos, áudios e documentos, até {MAX_ARQUIVOS} por envio</small></span>}
          {respondendo && !nota && <Citacao mensagem={respondendo} nomeContato={nomeContato} noCampo aoFechar={aoCancelarResposta} />}
          {!nota && <Anexos arquivos={arquivos} aoTirar={(indice) => setArquivos((atuais) => atuais.filter((_, posicao) => posicao !== indice))} aoAdicionar={() => escolher("")} />}
          {gravando ? (
            <div className="recorder" data-state={gravador.estado} role="status" aria-label={gravador.estado === "gravando" ? `Gravando áudio, ${mmss(gravador.segundos)}` : `Áudio pausado, ${mmss(gravador.segundos)}`}>
              <button type="button" className="recButton" data-tone="danger" aria-label="Descartar o áudio" onClick={gravador.descartar}><TrashIcon /></button>
              {gravador.estado === "pausado" && (
                <>
                  {gravador.previa && <audio ref={gravador.tocador} src={gravador.previa} preload="auto" onPlay={() => gravador.setOuvindo(true)} onPause={() => gravador.setOuvindo(false)} onTimeUpdate={(e) => gravador.setOuvido(e.currentTarget.currentTime)} onEnded={() => { gravador.setOuvindo(false); gravador.setOuvido(0); }} />}
                  <button type="button" className="recPlay" aria-label={gravador.ouvindo ? "Pausar a escuta" : "Ouvir antes de enviar"} disabled={!gravador.previa} onClick={gravador.ouvir}>{gravador.ouvindo ? <PauseIcon weight="fill" /> : <PlayIcon weight="fill" />}</button>
                </>
              )}
              <span className="recClock">{gravador.estado === "gravando" && <span className="recDot" aria-hidden />}{mmss(gravador.estado === "pausado" && gravador.ouvindo ? gravador.ouvido : gravador.segundos)}</span>
              <span className="recWave" data-still={gravador.estado === "pausado" ? "" : undefined} aria-hidden>
                {gravador.niveis.map((nivel, indice, todos) => <i key={indice} data-played={gravador.estado === "pausado" && gravador.segundos > 0 && (indice + 1) / todos.length <= gravador.ouvido / gravador.segundos ? "" : undefined} style={{ "--level": Math.max(0.14, nivel) } as CSSProperties} />)}
              </span>
              <span className="recHint wideOnly">{gravador.segundos >= MAX_GRAVACAO ? "Limite de 2 minutos" : `até ${mmss(MAX_GRAVACAO)}`}</span>
              {gravador.estado === "gravando"
                ? <button type="button" className="recButton" aria-label="Pausar a gravação" onClick={gravador.pausar}><PauseIcon weight="fill" /></button>
                : <button type="button" className="recButton" aria-label={gravador.segundos >= MAX_GRAVACAO ? "Limite de 2 minutos" : "Continuar gravando"} disabled={gravador.segundos >= MAX_GRAVACAO} onClick={gravador.continuar}><MicrophoneIcon /></button>}
              <button type="button" className="recSend" aria-label="Enviar o áudio" onClick={gravador.concluir}><ArrowUpIcon weight="bold" /></button>
            </div>
          ) : (
            <>
              <textarea ref={campo} rows={1} value={texto} className="field" maxLength={4096} placeholder={nota ? "Nota interna: só a equipe vê" : arquivos.length ? "Legenda (opcional)" : `Mensagem para ${primeiroNome}`} aria-label={nota ? "Nota interna" : "Mensagem"}
                onChange={(e) => { setTexto(e.target.value); setCursor(e.target.selectionStart); setAtiva(0); if (painel === "emoji" && BARRA.test(e.target.value.slice(0, e.target.selectionStart))) setPainel(null); }}
                onSelect={(e) => setCursor(e.currentTarget.selectionStart)} onKeyDown={teclas} onPaste={colar} />
              <div className="tools">
                <div className="toolGroup">
                  <Tooltip label={nota ? "Nota interna: voltar para mensagem" : "Nota interna: só a equipe vê"} side="top">
                    <button type="button" className="tool modeNarrow" data-on={nota || undefined} disabled={!podeMensagem} aria-label={nota ? "Voltar para mensagem" : "Escrever nota interna"} onClick={() => { setModo(nota ? "message" : "note"); focar(); }}><LockSimpleIcon weight={nota ? "fill" : "regular"} /></button>
                  </Tooltip>
                  <Tooltip label={podeMensagem ? "Mensagem para o contato ou nota só da equipe" : "Fora da janela de 24 horas, só nota interna ou modelo aprovado"} side="top">
                    <span className="modeSwitch" role="group" aria-label="Tipo do registro">
                      <button type="button" aria-pressed={!nota} disabled={!podeMensagem} onClick={() => { setModo("message"); focar(); }}>Mensagem</button>
                      <button type="button" aria-pressed={nota} onClick={() => { setModo("note"); focar(); }}>Nota interna</button>
                    </span>
                  </Tooltip>
                  <Menu label={nota ? "Mais ações" : "Anexar"} side="top" align="start" width="14.5rem" trigger={(props) => <button {...props} type="button" className="tool" aria-label={nota ? "Mais ações" : "Anexar foto, documento e mais"}><PlusIcon /></button>}>
                    {!nota && <><MenuLabel>Do computador</MenuLabel>
                      <MenuItem icon={ImageIcon} onSelect={() => escolher("midia")}>Foto ou vídeo</MenuItem>
                      <MenuItem icon={FileTextIcon} onSelect={() => escolher("documento")}>Documento</MenuItem>
                      <MenuItem icon={WaveformIcon} onSelect={() => escolher("audio")}>Áudio</MenuItem>
                      <MenuSeparator /></>}
                    <MenuLabel>Mais</MenuLabel>
                    <MenuItem icon={ChatTextIcon} disabled={bloqueado} onSelect={aoAbrirModelo}>Modelo aprovado</MenuItem>
                    <MenuItem icon={LightningIcon} onSelect={() => setEditando({ body: texto.trim() })}>Criar resposta rápida</MenuItem>
                  </Menu>
                  <span className="toolDivider" aria-hidden />
                  <Tooltip label="Respostas rápidas (/)" side="top">
                    <button type="button" className="tool" aria-label="Respostas rápidas (/)" data-on={mostrarRapidas || undefined} onClick={() => { setPainel((atual) => (atual === "quick" ? null : "quick")); focar(); }}><LightningIcon weight={mostrarRapidas ? "fill" : "regular"} /></button>
                  </Tooltip>
                  <Tooltip label="Emojis" side="top">
                    <button type="button" className="tool wideOnly" aria-label="Emojis" data-on={painel === "emoji" || undefined} onClick={() => { setPainel((atual) => (atual === "emoji" ? null : "emoji")); focar(); }}><SmileyIcon weight={painel === "emoji" ? "fill" : "regular"} /></button>
                  </Tooltip>
                </div>
                <div className="toolGroup">
                  <span className="toolHint" aria-hidden>
                    <span><kbd>/</kbd> respostas</span>
                    <span><kbd>Enter</kbd> {nota ? "salva a nota" : "envia"}</span>
                    <span><kbd>Shift</kbd> + <kbd>Enter</kbd> quebra linha</span>
                  </span>
                  {!vazio || nota
                    ? <button type="button" className="send" aria-label={nota ? "Salvar nota" : "Enviar"} disabled={nota ? !texto.trim() : vazio} onClick={enviar}><ArrowUpIcon weight="bold" /></button>
                    : <button type="button" className="send" data-soft="" aria-label="Gravar áudio" onClick={() => void gravador.iniciar()}><MicrophoneIcon /></button>}
                </div>
              </div>
            </>
          )}
        </div>
        {gravador.erro && <p className="composerError" role="alert">{gravador.erro}</p>}
      </div>
      <RespostaDialog valor={editando} aoFechar={(lista) => { setEditando(null); if (lista) setRespostas(lista); focar(); }} />
    </div>
  );
}

/** Criar ou editar uma resposta rápida: o nome que aparece na lista, o atalho do "/" e o texto. */
function RespostaDialog({ valor, aoFechar }: { valor: Partial<Resposta> | null; aoFechar: (lista?: Resposta[]) => void }) {
  const [titulo, setTitulo] = useState(""), [atalho, setAtalho] = useState(""), [corpo, setCorpo] = useState(""), [erro, setErro] = useState(""), [salvando, setSalvando] = useState(false);
  useEffect(() => { if (valor) { setTitulo(valor.title ?? ""); setAtalho(valor.shortcut ?? ""); setCorpo(valor.body ?? ""); setErro(""); } }, [valor]);
  const salvar = async () => {
    setSalvando(true); setErro("");
    const atalhoFinal = atalho.trim() || titulo.trim().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
    try { aoFechar((await whatsappRequest<{ replies: Resposta[] }>("respostas-rapidas", { body: { ...(valor?.id ? { id: valor.id } : {}), title: titulo.trim(), shortcut: atalhoFinal, body: corpo } })).replies); }
    catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível salvar."); }
    finally { setSalvando(false); }
  };
  return (
    <Dialog open={Boolean(valor)} onClose={() => aoFechar()} title={valor?.id ? "Editar resposta rápida" : "Nova resposta rápida"} width="30rem" description="Fica disponível para toda a equipe: digite / no campo da conversa para usar."
      footer={<><Button variant="ghost" onClick={() => aoFechar()}>Cancelar</Button><Button loading={salvando} disabled={!corpo.trim() || !(titulo.trim() || atalho.trim())} onClick={() => void salvar()}>Salvar</Button></>}>
      <div style={{ display: "grid", gap: "0.875rem" }}>
        <TextField label="Nome" placeholder="Ex.: Prazo de produção" value={titulo} maxLength={80} onChange={(e) => setTitulo(e.target.value)} />
        <TextField label="Atalho" placeholder="Ex.: prazo" value={atalho} maxLength={40} hint="Sem espaços. Em branco, sai do nome." onChange={(e) => setAtalho(e.target.value.replace(/^\//, ""))} />
        <TextField multiline rows={5} label="Texto" placeholder="Olá, {nome}! Nosso prazo de produção é…" value={corpo} maxLength={4096} hint="Use {nome} para o primeiro nome do contato." onChange={(e) => setCorpo(e.target.value)} />
        {erro && <span role="alert" style={{ color: "#b42318", fontSize: "0.8125rem" }}>{erro}</span>}
      </div>
    </Dialog>
  );
}

/** Gravação de voz (como na Le Ange): medidor ao vivo, pausar e continuar, ouvir antes de enviar, limite de 2 minutos. */
function useGravador(aoConcluir: (arquivo: File, segundos: number) => void) {
  const [estado, setEstado] = useState<"parado" | "gravando" | "pausado">("parado");
  const [segundos, setSegundos] = useState(0);
  const [niveis, setNiveis] = useState<number[]>([]);
  const [erro, setErro] = useState("");
  const [previa, setPrevia] = useState("");
  const [ouvindo, setOuvindo] = useState(false);
  const [ouvido, setOuvido] = useState(0);
  const tocador = useRef<HTMLAudioElement>(null);
  const recursos = useRef<{ gravador: MediaRecorder; fluxo: MediaStream; contexto: AudioContext; partes: Blob[]; inicio: number; acumulado: number; quadro: number; descartar: boolean; mime: string; aoPausar: boolean } | null>(null);
  const previaRef = useRef("");
  const trocarPrevia = (url: string) => { if (previaRef.current) URL.revokeObjectURL(previaRef.current); previaRef.current = url; setPrevia(url); };

  const limpar = () => {
    const r = recursos.current;
    if (!r) return;
    cancelAnimationFrame(r.quadro);
    r.fluxo.getTracks().forEach((t) => t.stop());
    void r.contexto.close().catch(() => undefined);
    recursos.current = null;
    trocarPrevia("");
    setEstado("parado"); setSegundos(0); setNiveis([]); setOuvindo(false); setOuvido(0);
  };
  useEffect(() => () => { if (recursos.current) { recursos.current.descartar = true; try { recursos.current.gravador.stop(); } catch { /* já parado */ } limpar(); } }, []);

  const iniciar = async () => {
    setErro("");
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) { setErro("Este navegador não grava áudio. Anexe um arquivo de áudio pelo +."); return; }
    let fluxo: MediaStream;
    try { fluxo = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch { setErro("Permita o uso do microfone no navegador para gravar."); return; }
    const tipo = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
    const gravador = new MediaRecorder(fluxo, tipo ? { mimeType: tipo, audioBitsPerSecond: 32_000 } : undefined);
    const contexto = new AudioContext(), analisador = contexto.createAnalyser();
    analisador.fftSize = 256;
    contexto.createMediaStreamSource(fluxo).connect(analisador);
    const dados = new Uint8Array(analisador.frequencyBinCount);
    const r = { gravador, fluxo, contexto, partes: [] as Blob[], inicio: Date.now(), acumulado: 0, quadro: 0, descartar: false, mime: (gravador.mimeType || tipo || "audio/webm").split(";")[0], aoPausar: false };
    recursos.current = r;
    gravador.ondataavailable = (e) => {
      if (e.data.size) r.partes.push(e.data);
      // Pausou: o que já foi gravado vira a prévia para ouvir antes de enviar.
      if (r.aoPausar) { r.aoPausar = false; trocarPrevia(URL.createObjectURL(new Blob(r.partes, { type: r.mime }))); }
    };
    gravador.onstop = () => {
      if (!r.descartar && r.partes.length) {
        const extensao = r.mime.includes("ogg") ? "ogg" : r.mime.includes("mp4") ? "m4a" : "webm";
        aoConcluir(new File(r.partes, `nota-de-voz.${extensao}`, { type: r.mime }), Math.max(1, Math.round(r.acumulado)));
      }
      limpar();
    };
    let ultimo = 0;
    const medir = (agora: number) => {
      if (!recursos.current) return;
      if (agora - ultimo > 100 && r.gravador.state === "recording") {
        ultimo = agora;
        analisador.getByteTimeDomainData(dados);
        let pico = 0;
        for (const v of dados) pico = Math.max(pico, Math.abs(v - 128) / 128);
        setNiveis((atual) => [...atual.slice(-63), Math.min(1, pico * 2.2)]);
        const decorrido = r.acumulado + (Date.now() - r.inicio) / 1000;
        setSegundos(decorrido);
        if (decorrido >= MAX_GRAVACAO) pausar();
      }
      r.quadro = requestAnimationFrame(medir);
    };
    gravador.start(250);
    setEstado("gravando");
    r.quadro = requestAnimationFrame(medir);
  };
  const pausar = () => {
    const r = recursos.current;
    if (!r || r.gravador.state !== "recording") return;
    r.acumulado += (Date.now() - r.inicio) / 1000;
    setSegundos(r.acumulado);
    r.aoPausar = true;
    r.gravador.pause();
    try { r.gravador.requestData(); } catch { r.aoPausar = false; }
    setEstado("pausado");
  };
  const continuar = () => {
    const r = recursos.current;
    if (!r || r.gravador.state !== "paused" || r.acumulado >= MAX_GRAVACAO) return;
    tocador.current?.pause(); setOuvindo(false); setOuvido(0); trocarPrevia("");
    r.inicio = Date.now(); r.gravador.resume(); setEstado("gravando");
  };
  const concluir = () => { const r = recursos.current; if (!r) return; if (r.gravador.state === "recording") r.acumulado += (Date.now() - r.inicio) / 1000; tocador.current?.pause(); r.gravador.stop(); };
  const descartar = () => { const r = recursos.current; if (!r) return; r.descartar = true; tocador.current?.pause(); r.gravador.stop(); };
  const ouvir = () => { const audio = tocador.current; if (!audio) return; if (audio.paused) void audio.play().catch(() => undefined); else audio.pause(); };
  return { estado, segundos, niveis, erro, previa, ouvindo, setOuvindo, ouvido, setOuvido, tocador, iniciar, pausar, continuar, concluir, descartar, ouvir };
}
