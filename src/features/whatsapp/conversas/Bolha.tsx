"use client";

import { Fragment, type ReactNode } from "react";
import { ArrowBendUpLeftIcon, CheckIcon, ChecksIcon, ClockIcon, DownloadSimpleIcon, FileTextIcon, SmileyIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { AudioPlayer } from "@/components/ui/Chat/AudioPlayer";
import type { WhatsAppMessage } from "../types";
import { AcoesBalao, Balao, Citacao, Documento, Falha, Foto, Legenda, LinhaMensagem, PassoEnvio, Reacoes, Rodape, Texto } from "./estilos";
import { horaDaMensagem, rotuloDoTipo, tamanhoArquivo, textoDaMensagem, textoSimples } from "./formato";

export const urlDaMidia = (m: Pick<WhatsAppMessage, "id">, baixar = false) => `/api/whatsapp/media?messageId=${encodeURIComponent(m.id)}${baixar ? "&download=1" : ""}`;

/** *negrito*, _itálico_, ~tachado~, `mono` e links clicáveis, como no WhatsApp. */
export function FormatoWhatsApp({ texto }: { texto: string }) {
  const partes: ReactNode[] = [];
  const regex = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])|(\*[^*\n]+\*)|(_[^_\n]+_)|(~[^~\n]+~)|(`[^`\n]+`)/g;
  let ultimo = 0, chave = 0;
  for (const achado of texto.matchAll(regex)) {
    if (achado.index > ultimo) partes.push(texto.slice(ultimo, achado.index));
    const [valor, link] = achado;
    const miolo = valor.slice(1, -1);
    partes.push(link ? <a key={chave++} href={link} target="_blank" rel="noopener noreferrer">{link}</a>
      : valor.startsWith("*") ? <strong key={chave++}>{miolo}</strong>
      : valor.startsWith("_") ? <em key={chave++}>{miolo}</em>
      : valor.startsWith("~") ? <s key={chave++}>{miolo}</s>
      : <code key={chave++}>{miolo}</code>);
    ultimo = achado.index + valor.length;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return <>{partes.map((parte, i) => <Fragment key={i}>{parte}</Fragment>)}</>;
}

function Ticks({ status }: { status: string }) {
  if (status === "read") return <ChecksIcon size={15} weight="bold" data-lido aria-label="Lida" />;
  if (status === "delivered") return <ChecksIcon size={15} weight="bold" aria-label="Entregue" />;
  if (status === "sent" || status === "accepted") return <CheckIcon size={14} weight="bold" aria-label="Enviada" />;
  if (status === "failed") return <WarningCircleIcon size={14} weight="fill" data-falhou aria-label="Não enviada" />;
  return <ClockIcon size={13} aria-label="Enviando" />;
}

export function Bolha({ mensagem, primeira, nomeContato, aoResponder, aoReagir, aoAbrirMenu, aoAbrirFoto, aoIrPara, aoDescartar, aoReenviar }: {
  mensagem: WhatsAppMessage; primeira: boolean; nomeContato: string;
  aoResponder: (m: WhatsAppMessage) => void; aoReagir: (m: WhatsAppMessage, x: number, y: number) => void; aoAbrirMenu: (m: WhatsAppMessage, x: number, y: number) => void;
  aoAbrirFoto: (m: WhatsAppMessage) => void; aoIrPara: (id: string) => void; aoDescartar: (m: WhatsAppMessage) => void; aoReenviar: (m: WhatsAppMessage) => void;
}) {
  const saida = mensagem.direction === "outbound";
  const local = mensagem.id.startsWith("temp-");
  const temMidia = Boolean(mensagem.hasMedia || mensagem.local?.previewUrl || (local && mensagem.type !== "text"));
  const src = mensagem.local?.previewUrl ?? (temMidia && !local ? urlDaMidia(mensagem) : undefined);
  const visual = (mensagem.type === "image" || mensagem.type === "sticker" || mensagem.type === "video") && Boolean(src);
  const texto = textoDaMensagem(mensagem);
  const legenda = visual && texto && !/^(Foto|Vídeo|Figurinha)$/.test(texto) ? texto : "";
  const rodape = (
    <Rodape $sobreMidia={visual && !legenda}>
      {horaDaMensagem(mensagem.createdAt)}
      {saida && <Ticks status={mensagem.status} />}
    </Rodape>
  );

  let corpo: ReactNode;
  if (visual) {
    corpo = (
      <>
        <Foto type="button" onClick={() => aoAbrirFoto(mensagem)} aria-label={mensagem.type === "video" ? "Assistir ao vídeo" : "Abrir a foto"}>
          {mensagem.type === "video"
            ? <video src={src} preload="metadata" muted playsInline controls={!local} onClick={(e) => e.stopPropagation()} />
            : <img src={src} alt={legenda || "Foto"} loading="lazy" decoding="async" />}
        </Foto>
        {legenda && <Legenda><FormatoWhatsApp texto={legenda} /></Legenda>}
      </>
    );
  } else if (mensagem.type === "audio" && (src || temMidia)) {
    corpo = <div style={{ minWidth: "15rem", padding: "4px 4px 14px" }}>{src ? <AudioPlayer src={src} duration={mensagem.duration} /> : <span>Áudio</span>}</div>;
  } else if (mensagem.type === "document" && (src || temMidia)) {
    corpo = (
      <Documento href={local ? undefined : urlDaMidia(mensagem, true)} download={mensagem.filename}>
        <FileTextIcon size={32} weight="duotone" />
        <div><strong>{mensagem.filename || texto || "Documento"}</strong><span>{[mensagem.mimeType?.split("/")[1]?.toUpperCase().slice(0, 6), tamanhoArquivo(mensagem.size)].filter(Boolean).join(" · ") || "Documento"}</span></div>
        {!local && <DownloadSimpleIcon size={18} />}
      </Documento>
    );
  } else {
    corpo = <Texto><FormatoWhatsApp texto={texto || rotuloDoTipo(mensagem.type) || "Mensagem"} /></Texto>;
  }

  const reacoes = mensagem.reactions ?? [];
  return (
    <div id={`m-${mensagem.id}`} data-mensagem>
      <LinhaMensagem $saida={saida} $primeira={primeira}
        onContextMenu={(e) => { if (local) return; e.preventDefault(); aoAbrirMenu(mensagem, e.clientX, e.clientY); }}
        onDoubleClick={() => !local && aoResponder(mensagem)}>
        <Balao $saida={saida} $primeira={primeira} $midia={visual} $falhou={mensagem.status === "failed"} style={reacoes.length ? { marginBottom: "0.875rem" } : undefined}>
          {mensagem.replyTo && (
            <Citacao type="button" $saida={mensagem.replyTo.direction === "outbound"} onClick={() => aoIrPara(mensagem.replyTo!.id)}>
              <strong>{mensagem.replyTo.direction === "outbound" ? "Você" : nomeContato}</strong>
              <span>{textoSimples(textoDaMensagem({ type: mensagem.replyTo.type, text: mensagem.replyTo.text }))}</span>
            </Citacao>
          )}
          {corpo}
          {rodape}
          {reacoes.length > 0 && <Reacoes aria-label="Reações">{reacoes.map((r) => <span key={r.from} title={r.from === "me" ? "Você" : nomeContato}>{r.emoji}</span>)}</Reacoes>}
        </Balao>
        {!local && (
          <AcoesBalao data-acoes>
            <button type="button" aria-label="Responder" onClick={() => aoResponder(mensagem)}><ArrowBendUpLeftIcon size={14} weight="bold" /></button>
            <button type="button" aria-label="Reagir" onClick={(e) => aoReagir(mensagem, e.clientX, e.clientY)}><SmileyIcon size={15} /></button>
          </AcoesBalao>
        )}
      </LinhaMensagem>
      {local && mensagem.status === "sending" && mensagem.local?.progress && <PassoEnvio>{mensagem.local.progress}</PassoEnvio>}
      {mensagem.status === "failed" && (
        <Falha>
          <span>{mensagem.error || "Não enviada."}</span>
          {mensagem.local?.retry ? <button type="button" onClick={mensagem.local.retry}>Tentar de novo</button>
            : !local && mensagem.type === "text" && <button type="button" onClick={() => aoReenviar(mensagem)}>Tentar de novo</button>}
          <button type="button" onClick={() => aoDescartar(mensagem)}>Descartar</button>
        </Falha>
      )}
    </div>
  );
}
