"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from "react";
import {
  FileTextIcon, ImageIcon, LightningIcon, MicrophoneIcon, PaperPlaneRightIcon, PauseIcon, PaperclipIcon, PlayIcon, SmileyIcon, TrashIcon, WaveformIcon, XIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { EmojiPicker } from "@/components/ui/Chat/EmojiPicker";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { whatsappRequest } from "../client";
import type { WhatsAppMessage } from "../types";
import { gravarRascunho, lerRascunho } from "./cache";
import { Anexo, Anexos, BarraCompositor, BotaoRedondo, Doca, Folha, Gravando, JanelaFechada, Respondendo } from "./estilos";
import { duracao as formatarDuracao, textoDaMensagem } from "./formato";

type Resposta = { id: string; shortcut: string; body: string };
const ACEITA_MIDIA = "image/jpeg,image/png,image/webp,image/heic,image/gif,video/mp4,video/quicktime,video/3gpp,video/webm,video/x-m4v";
const ACEITA_DOC = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip";
const ACEITA_AUDIO = "audio/*";
const MAX_GRAVACAO = 120;

export function Compositor({ phone, nomeContato, janelaAberta, bloqueado, respondendo, aoCancelarResposta, aoEnviarTexto, aoEnviarArquivo, aoAbrirModelo, aoMedir }: {
  phone: string; nomeContato: string; janelaAberta: boolean; bloqueado: boolean; respondendo: WhatsAppMessage | null; aoCancelarResposta: () => void;
  aoEnviarTexto: (texto: string, resposta?: WhatsAppMessage) => void; aoEnviarArquivo: (arquivo: File, extra: { legenda?: string; replyTo?: WhatsAppMessage; voz?: boolean; duracao?: number }) => void;
  aoAbrirModelo: () => void; aoMedir: (altura: number) => void;
}) {
  const [texto, setTexto] = useState("");
  const [arquivos, setArquivos] = useState<Array<{ arquivo: File; url?: string }>>([]);
  const [arrastando, setArrastando] = useState(false);
  const [respostas, setRespostas] = useState<Resposta[] | null>(null);
  const [escolhida, setEscolhida] = useState(0);
  const [novaResposta, setNovaResposta] = useState(false);
  const doca = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const entradaMidia = useRef<HTMLInputElement>(null), entradaDoc = useRef<HTMLInputElement>(null), entradaAudio = useRef<HTMLInputElement>(null);
  const gravador = useGravador((arquivo, segundos) => aoEnviarArquivo(arquivo, { voz: true, duracao: segundos, replyTo: respondendo ?? undefined }));

  // Rascunho por conversa.
  useEffect(() => { setTexto(lerRascunho(phone)); setArquivos([]); }, [phone]);
  useEffect(() => { const t = window.setTimeout(() => gravarRascunho(phone, texto), 300); return () => window.clearTimeout(t); }, [phone, texto]);
  // Campo cresce com o texto (até 11rem); a doca informa a altura para a conversa não ficar por baixo dela.
  useLayoutEffect(() => { const c = campo.current; if (!c) return; c.style.height = "auto"; c.style.height = `${Math.min(c.scrollHeight, 176)}px`; }, [texto]);
  useEffect(() => {
    const alvo = doca.current;
    if (!alvo) return;
    const observador = new ResizeObserver(() => aoMedir(alvo.offsetHeight));
    observador.observe(alvo);
    return () => observador.disconnect();
  }, [aoMedir]);
  useEffect(() => { if (respondendo) campo.current?.focus(); }, [respondendo]);

  // Respostas rápidas: "/" no começo abre a lista.
  const comando = texto.startsWith("/") && !texto.includes(" ") ? texto.slice(1).toLowerCase() : null;
  useEffect(() => { if (comando !== null && respostas === null) void whatsappRequest<{ replies: Resposta[] }>("respostas-rapidas").then((d) => setRespostas(d.replies)).catch(() => setRespostas([])); }, [comando, respostas]);
  const filtradas = comando === null ? [] : (respostas ?? []).filter((r) => r.shortcut.includes(comando) || r.body.toLowerCase().includes(comando)).slice(0, 8);
  useEffect(() => setEscolhida(0), [comando]);
  const usarResposta = (r: Resposta) => { setTexto(r.body.replace(/\{nome\}/gi, nomeContato.split(" ")[0] ?? "")); campo.current?.focus(); };

  const adicionar = useCallback((lista: FileList | File[]) => {
    const novos = [...lista].slice(0, 10).map((arquivo) => ({ arquivo, url: arquivo.type.startsWith("image/") || arquivo.type.startsWith("video/") ? URL.createObjectURL(arquivo) : undefined }));
    setArquivos((atuais) => [...atuais, ...novos].slice(0, 10));
    campo.current?.focus();
  }, []);

  const enviar = () => {
    const limpo = texto.trim();
    if (arquivos.length) {
      // Legenda vai na primeira mídia que aceita legenda; o resto vai sem.
      let legendaUsada = false;
      for (const { arquivo } of arquivos) {
        const aceitaLegenda = !legendaUsada && !arquivo.type.startsWith("audio/");
        aoEnviarArquivo(arquivo, { legenda: aceitaLegenda && limpo ? limpo : undefined, replyTo: respondendo ?? undefined });
        if (aceitaLegenda && limpo) legendaUsada = true;
      }
      if (limpo && !legendaUsada) aoEnviarTexto(limpo, respondendo ?? undefined);
      setArquivos([]);
    } else if (limpo) aoEnviarTexto(limpo, respondendo ?? undefined);
    else return;
    setTexto("");
    gravarRascunho(phone, "");
    aoCancelarResposta();
  };

  const teclas = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (comando !== null && filtradas.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setEscolhida((i) => (i + 1) % filtradas.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setEscolhida((i) => (i - 1 + filtradas.length) % filtradas.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); usarResposta(filtradas[escolhida]); return; }
    }
    if (e.key === "Escape" && respondendo) { e.preventDefault(); aoCancelarResposta(); return; }
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); enviar(); }
  };
  const colar = (e: ClipboardEvent) => { const lista = [...e.clipboardData.files]; if (lista.length) { e.preventDefault(); adicionar(lista); } };
  const soltar = (e: DragEvent) => { e.preventDefault(); setArrastando(false); if (e.dataTransfer.files.length) adicionar(e.dataTransfer.files); };

  if (bloqueado) return <Doca ref={doca}><JanelaFechada>Esta pessoa pediu para não receber mais mensagens (PARAR/STOP). O envio fica bloqueado até ela escrever de novo pedindo contato.</JanelaFechada></Doca>;
  if (!janelaAberta) return (
    <Doca ref={doca}>
      <JanelaFechada>
        <span>A janela de 24 horas está fechada: o WhatsApp só permite retomar a conversa com um modelo aprovado.</span>
        <Button size="sm" onClick={aoAbrirModelo}>Enviar modelo</Button>
      </JanelaFechada>
    </Doca>
  );

  const vazio = !texto.trim() && !arquivos.length;
  return (
    <Doca ref={doca} data-arrastando={arrastando || undefined} onDragOver={(e) => { e.preventDefault(); setArrastando(true); }} onDragLeave={() => setArrastando(false)} onDrop={soltar}>
      {comando !== null && (
        <Folha role="listbox" aria-label="Respostas rápidas">
          {filtradas.map((r, i) => <button key={r.id} type="button" data-opcao role="option" aria-selected={i === escolhida} onMouseDown={(e) => { e.preventDefault(); usarResposta(r); }}><strong>/{r.shortcut}</strong><span>{r.body}</span></button>)}
          {!filtradas.length && <p style={{ padding: "8px 10px", fontSize: "0.8125rem", opacity: 0.7 }}>{respostas === null ? "Carregando…" : "Nenhuma resposta rápida com esse atalho."}</p>}
          <button type="button" data-opcao onMouseDown={(e) => { e.preventDefault(); setNovaResposta(true); }}><strong>+ Nova resposta rápida</strong><span>Crie atalhos como /preco ou /prazo. Use {"{nome}"} para o primeiro nome.</span></button>
        </Folha>
      )}
      {novaResposta && <NovaResposta aoFechar={(lista) => { setNovaResposta(false); if (lista) setRespostas(lista); }} />}
      {respondendo && (
        <Respondendo>
          <div><strong>Respondendo {respondendo.direction === "outbound" ? "a você" : nomeContato}</strong><span>{textoDaMensagem(respondendo)}</span></div>
          <BotaoRedondo type="button" aria-label="Cancelar resposta" onClick={aoCancelarResposta} style={{ width: "1.75rem", height: "1.75rem" }}><XIcon size={14} /></BotaoRedondo>
        </Respondendo>
      )}
      {arquivos.length > 0 && (
        <Anexos>
          {arquivos.map(({ arquivo, url }, i) => (
            <Anexo key={`${arquivo.name}-${i}`} title={arquivo.name}>
              {url && arquivo.type.startsWith("image/") ? <img src={url} alt="" /> : url ? <video src={url} muted /> : arquivo.type.startsWith("audio/") ? <WaveformIcon size={24} /> : <FileTextIcon size={24} />}
              {!url && <small>{arquivo.name}</small>}
              <button type="button" aria-label={`Remover ${arquivo.name}`} onClick={() => setArquivos((atuais) => atuais.filter((_, j) => j !== i))}><XIcon size={11} weight="bold" /></button>
            </Anexo>
          ))}
        </Anexos>
      )}
      <BarraCompositor>
        {gravador.estado !== "parado" ? (
          <>
            <BotaoRedondo type="button" $perigo aria-label="Descartar gravação" onClick={gravador.descartar}><TrashIcon size={18} /></BotaoRedondo>
            <Gravando aria-live="polite">
              {gravador.estado === "gravando" && <span data-ponto />}
              <span>{formatarDuracao(gravador.segundos)}</span>
              <span data-ondas aria-hidden>{gravador.niveis.map((n, i) => <i key={i} style={{ height: `${Math.max(12, n * 100)}%` }} />)}</span>
              <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>{gravador.estado === "pausado" ? "Pausado" : `até ${formatarDuracao(MAX_GRAVACAO)}`}</span>
            </Gravando>
            <BotaoRedondo type="button" aria-label={gravador.estado === "pausado" ? "Continuar gravando" : "Pausar"} onClick={gravador.estado === "pausado" ? gravador.continuar : gravador.pausar}>{gravador.estado === "pausado" ? <PlayIcon size={18} /> : <PauseIcon size={18} />}</BotaoRedondo>
            <BotaoRedondo type="button" $principal aria-label="Enviar nota de voz" onClick={gravador.concluir}><PaperPlaneRightIcon size={18} weight="fill" /></BotaoRedondo>
          </>
        ) : (
          <>
            <Menu label="Anexar" side="top" width="13rem" trigger={(props) => <BotaoRedondo {...props} type="button" aria-label="Anexar"><PaperclipIcon size={20} /></BotaoRedondo>}>
              <MenuItem icon={ImageIcon} onSelect={() => entradaMidia.current?.click()}>Fotos e vídeos</MenuItem>
              <MenuItem icon={FileTextIcon} onSelect={() => entradaDoc.current?.click()}>Documento</MenuItem>
              <MenuItem icon={WaveformIcon} onSelect={() => entradaAudio.current?.click()}>Arquivo de áudio</MenuItem>
              <MenuItem icon={LightningIcon} onSelect={() => { setTexto("/"); campo.current?.focus(); }}>Respostas rápidas</MenuItem>
            </Menu>
            <EmojiPicker onSelect={(emoji) => { setTexto((t) => t + emoji); campo.current?.focus(); }} trigger={({ open, ...props }) => <BotaoRedondo {...props} type="button" aria-label="Emoji" aria-pressed={open}><SmileyIcon size={20} /></BotaoRedondo>} />
            <textarea ref={campo} rows={1} value={texto} placeholder={arquivos.length ? "Legenda (opcional)" : "Mensagem"} aria-label="Mensagem" maxLength={4096}
              onChange={(e) => setTexto(e.target.value)} onKeyDown={teclas} onPaste={colar} />
            {vazio
              ? <BotaoRedondo type="button" aria-label="Gravar nota de voz" onClick={() => void gravador.iniciar()}><MicrophoneIcon size={20} /></BotaoRedondo>
              : <BotaoRedondo type="button" $principal aria-label="Enviar" onClick={enviar}><PaperPlaneRightIcon size={18} weight="fill" /></BotaoRedondo>}
          </>
        )}
      </BarraCompositor>
      {gravador.erro && <p role="alert" style={{ marginTop: 6, fontSize: "0.8125rem", color: "#b42318" }}>{gravador.erro}</p>}
      <input ref={entradaMidia} type="file" hidden multiple accept={ACEITA_MIDIA} onChange={(e) => { if (e.target.files) adicionar(e.target.files); e.target.value = ""; }} />
      <input ref={entradaDoc} type="file" hidden multiple accept={ACEITA_DOC} onChange={(e) => { if (e.target.files) adicionar(e.target.files); e.target.value = ""; }} />
      <input ref={entradaAudio} type="file" hidden accept={ACEITA_AUDIO} onChange={(e) => { if (e.target.files) adicionar(e.target.files); e.target.value = ""; }} />
    </Doca>
  );
}

function NovaResposta({ aoFechar }: { aoFechar: (lista?: Resposta[]) => void }) {
  const [atalho, setAtalho] = useState(""), [corpo, setCorpo] = useState(""), [erro, setErro] = useState(""), [salvando, setSalvando] = useState(false);
  const salvar = async () => {
    setSalvando(true); setErro("");
    try { aoFechar((await whatsappRequest<{ replies: Resposta[] }>("respostas-rapidas", { body: { shortcut: atalho, body: corpo } })).replies); }
    catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível salvar."); }
    finally { setSalvando(false); }
  };
  return (
    <Folha style={{ display: "grid", gap: 8, padding: 12 }}>
      <strong style={{ fontSize: "0.875rem" }}>Nova resposta rápida</strong>
      <input value={atalho} onChange={(e) => setAtalho(e.target.value)} placeholder="Atalho (ex.: preco)" maxLength={40} style={{ padding: 8, borderRadius: 8, border: "1px solid #ddd", font: "inherit" }} />
      <textarea value={corpo} onChange={(e) => setCorpo(e.target.value)} placeholder="Texto da resposta. Use {nome} para o primeiro nome do contato." rows={3} maxLength={4096} style={{ padding: 8, borderRadius: 8, border: "1px solid #ddd", font: "inherit", resize: "vertical" }} />
      {erro && <span role="alert" style={{ color: "#b42318", fontSize: "0.8125rem" }}>{erro}</span>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button size="sm" variant="ghost" onClick={() => aoFechar()}>Cancelar</Button>
        <Button size="sm" loading={salvando} disabled={!atalho.trim() || !corpo.trim()} onClick={() => void salvar()}>Salvar</Button>
      </div>
    </Folha>
  );
}

/** Gravação de voz (como na Le Ange): medidor ao vivo, pausar/continuar, limite de 2 minutos. */
function useGravador(aoConcluir: (arquivo: File, segundos: number) => void) {
  const [estado, setEstado] = useState<"parado" | "gravando" | "pausado">("parado");
  const [segundos, setSegundos] = useState(0);
  const [niveis, setNiveis] = useState<number[]>([]);
  const [erro, setErro] = useState("");
  const recursos = useRef<{ gravador: MediaRecorder; fluxo: MediaStream; contexto: AudioContext; partes: Blob[]; inicio: number; acumulado: number; quadro: number; descartar: boolean } | null>(null);

  const limpar = () => {
    const r = recursos.current;
    if (!r) return;
    cancelAnimationFrame(r.quadro);
    r.fluxo.getTracks().forEach((t) => t.stop());
    void r.contexto.close().catch(() => undefined);
    recursos.current = null;
    setEstado("parado"); setSegundos(0); setNiveis([]);
  };
  useEffect(() => () => { if (recursos.current) { recursos.current.descartar = true; try { recursos.current.gravador.stop(); } catch { /* já parado */ } limpar(); } }, []);

  const iniciar = async () => {
    setErro("");
    let fluxo: MediaStream;
    try { fluxo = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch { setErro("Permita o uso do microfone no navegador para gravar."); return; }
    const tipo = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"].find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
    const gravador = new MediaRecorder(fluxo, tipo ? { mimeType: tipo, audioBitsPerSecond: 32_000 } : undefined);
    const contexto = new AudioContext(), analisador = contexto.createAnalyser();
    analisador.fftSize = 256;
    contexto.createMediaStreamSource(fluxo).connect(analisador);
    const dados = new Uint8Array(analisador.frequencyBinCount);
    const r = { gravador, fluxo, contexto, partes: [] as Blob[], inicio: Date.now(), acumulado: 0, quadro: 0, descartar: false };
    recursos.current = r;
    gravador.ondataavailable = (e) => { if (e.data.size) r.partes.push(e.data); };
    gravador.onstop = () => {
      const total = Math.round((r.acumulado + (gravador.state === "inactive" && r.inicio ? (Date.now() - r.inicio) / 1000 : 0)));
      if (!r.descartar && r.partes.length) {
        const mime = (gravador.mimeType || tipo || "audio/webm").split(";")[0];
        const extensao = mime.includes("ogg") ? "ogg" : mime.includes("mp4") ? "m4a" : "webm";
        aoConcluir(new File(r.partes, `nota-de-voz.${extensao}`, { type: mime }), Math.max(1, total));
      }
      limpar();
    };
    let ultimo = 0;
    const medir = (agora: number) => {
      if (!recursos.current) return;
      if (agora - ultimo > 100) {
        ultimo = agora;
        analisador.getByteTimeDomainData(dados);
        let pico = 0;
        for (const v of dados) pico = Math.max(pico, Math.abs(v - 128) / 128);
        setNiveis((atual) => [...atual.slice(-47), Math.min(1, pico * 2.2)]);
        const decorrido = r.acumulado + (r.gravador.state === "recording" ? (Date.now() - r.inicio) / 1000 : 0);
        setSegundos(decorrido);
        if (decorrido >= MAX_GRAVACAO && r.gravador.state === "recording") { r.acumulado = decorrido; r.gravador.pause(); setEstado("pausado"); }
      }
      r.quadro = requestAnimationFrame(medir);
    };
    gravador.start(250);
    setEstado("gravando");
    r.quadro = requestAnimationFrame(medir);
  };
  const pausar = () => { const r = recursos.current; if (!r || r.gravador.state !== "recording") return; r.acumulado += (Date.now() - r.inicio) / 1000; r.gravador.pause(); setEstado("pausado"); };
  const continuar = () => { const r = recursos.current; if (!r || r.gravador.state !== "paused" || r.acumulado >= MAX_GRAVACAO) return; r.inicio = Date.now(); r.gravador.resume(); setEstado("gravando"); };
  const concluir = () => { const r = recursos.current; if (!r) return; if (r.gravador.state === "recording") { r.acumulado += (Date.now() - r.inicio) / 1000; } r.inicio = 0; r.gravador.stop(); };
  const descartar = () => { const r = recursos.current; if (!r) return; r.descartar = true; r.gravador.stop(); };
  return { estado, segundos, niveis, erro, iniciar, pausar, continuar, concluir, descartar };
}
