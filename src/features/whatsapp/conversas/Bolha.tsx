"use client";

// Um balão da conversa, no desenho do ERP da Le Ange (message-bubble.tsx). O contato fala à esquerda; a equipe e os modelos
// saem à direita, cada um no seu tom. A nota interna é amarela, com cadeado, e só a equipe vê. O evento do sistema é uma
// pílula no meio. A hora e os ticks moram na última linha; a que falhou diz isso em texto, com o "Tentar de novo".
import { numeroDoPedidoDoSite, PedidoDoSite } from "./PedidoDoSite";
import { Fragment, memo, useRef, type ReactNode } from "react";
import {
  ArrowBendUpLeftIcon, CameraIcon, CheckIcon, ChecksIcon, ClockIcon, DotsThreeIcon, FileTextIcon, FolderSimplePlusIcon, ImageIcon, LockSimpleIcon, MicrophoneIcon, VideoCameraIcon, WarningCircleIcon, XIcon,
} from "@phosphor-icons/react";
import { AudioPlayer } from "@/components/ui/Chat/AudioPlayer";
import type { WhatsAppMessage } from "../types";
import { horaDaMensagem, rotuloDoTipo, tamanhoArquivo, textoDaMensagem, textoSimples } from "./formato";

export const urlDaMidia = (m: Pick<WhatsAppMessage, "id">, baixar = false) => `/api/whatsapp/media?messageId=${encodeURIComponent(m.id)}${baixar ? "&download=1" : ""}`;
export const REACOES_RAPIDAS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
export const interna = (m: Pick<WhatsAppMessage, "type">) => m.type === "note" || m.type === "system";

/** O autor em dois nomes: o primeiro e o seguinte, pulando "da", "de", "dos"; "Maria da Silva Souza" vira "Maria Silva". */
const PARTICULAS = new Set(["da", "das", "de", "do", "dos", "e"]);
export const doisNomes = (nome: string | undefined) => {
  const palavras = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (palavras.length <= 2) return palavras.join(" ");
  return [palavras[0], palavras.slice(1).find((palavra) => !PARTICULAS.has(palavra.toLowerCase())) ?? palavras[1]].join(" ");
};

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

const TEXTO_STATUS: Record<string, string> = { sending: "Enviando", unknown: "Confirmação pendente", accepted: "Enviada", sent: "Enviada", delivered: "Entregue", read: "Lida", failed: "Não entregue" };
function Ticks({ status }: { status: string }) {
  if (status === "failed") return <WarningCircleIcon weight="fill" aria-label={TEXTO_STATUS.failed} className="failed" />;
  if (status === "sent" || status === "accepted") return <CheckIcon aria-label={TEXTO_STATUS.sent} />;
  if (status === "delivered" || status === "read") return <ChecksIcon aria-label={TEXTO_STATUS[status]} data-read={status === "read" || undefined} />;
  return <ClockIcon aria-label={TEXTO_STATUS.sending} />;
}

const ICONE_CITACAO: Partial<Record<string, typeof CameraIcon>> = { image: CameraIcon, sticker: CameraIcon, video: VideoCameraIcon, audio: MicrophoneIcon, document: FileTextIcon };
/** A citação de uma mensagem, no campo (ao responder) e dentro do balão: a barra e o nome na cor de quem falou. */
export function Citacao({ mensagem, nomeContato, noCampo, aoFechar, aoClicar }: { mensagem: Pick<WhatsAppMessage, "type" | "text" | "direction"> & { filename?: string }; nomeContato: string; noCampo?: boolean; aoFechar?: () => void; aoClicar?: () => void }) {
  const saida = mensagem.direction === "outbound", Icone = ICONE_CITACAO[mensagem.type];
  const texto = textoSimples(textoDaMensagem(mensagem));
  const miolo = (
    <span className="replyQuoteCopy">
      <strong>{mensagem.type === "note" ? "Nota interna" : saida ? "Você" : nomeContato}</strong>
      <span className="replyQuoteBody" data-kind={Icone ? mensagem.type : "text"}>{Icone && <Icone aria-hidden />}{texto || rotuloDoTipo(mensagem.type) || "Mensagem"}</span>
    </span>
  );
  const estilo = { "--quote": saida ? "var(--sys-blue)" : "var(--sys-green)" } as React.CSSProperties;
  if (noCampo) return <div className="replyQuote" data-in-field="" style={estilo}>{miolo}{aoFechar && <button type="button" className="replyQuoteClose" aria-label="Cancelar a resposta" onClick={aoFechar}><XIcon size={14} /></button>}</div>;
  return <button type="button" className="replyQuote" style={estilo} onClick={aoClicar}>{miolo}</button>;
}

type Props = {
  mensagem: WhatsAppMessage;
  /** As fotos seguidas do mesmo lado, em grade: a bolha mostra o álbum; `mensagem` é a última, com a hora e os ticks. */
  album?: WhatsAppMessage[];
  /** Primeira de um bloco do mesmo autor: leva o "rabinho" e o nome. */
  primeira: boolean;
  nomeContato: string;
  /** Quem da equipe escreveu (mensagens enviadas pelo ERP e notas). */
  autor?: string;
  /** Aceita pela Meta, sem confirmação de entrega, e o cliente escreveu depois. */
  parada?: boolean;
  /** Há oportunidade ligada: a mídia pode ser guardada nos arquivos dela. */
  podeSalvar?: boolean;
  aoResponder: (m: WhatsAppMessage) => void;
  aoReagir: (m: WhatsAppMessage, emoji: string) => void;
  aoAcoes: (m: WhatsAppMessage) => void;
  aoAbrirFoto: (m: WhatsAppMessage) => void;
  aoIrPara: (id: string) => void;
  aoDescartar: (m: WhatsAppMessage) => void;
  aoReenviar: (m: WhatsAppMessage) => void;
  aoSalvar: (m: WhatsAppMessage) => void;
};

export const Bolha = memo(function Bolha({ mensagem, album, primeira, nomeContato, autor, parada, podeSalvar, aoResponder, aoReagir, aoAcoes, aoAbrirFoto, aoIrPara, aoDescartar, aoReenviar, aoSalvar }: Props) {
  const toque = useRef(0);
  if (mensagem.type === "system") return <div className="system" id={`m-${mensagem.id}`}><span>{mensagem.text}</span></div>;

  const saida = mensagem.direction === "outbound", nota = mensagem.type === "note", modelo = mensagem.type === "template";
  const local = mensagem.id.startsWith("temp-");
  const tom = nota ? "note" : modelo ? "template" : saida ? "agent" : "contact";
  const pendente = saida && (mensagem.status === "sending" || mensagem.status === "unknown");
  const temMidia = Boolean(mensagem.hasMedia || mensagem.local?.previewUrl || (local && !["text", "note"].includes(mensagem.type)));
  const src = mensagem.local?.previewUrl ?? (temMidia && !local ? urlDaMidia(mensagem) : undefined);
  const visual = mensagem.type === "image" || mensagem.type === "sticker" || mensagem.type === "video";
  const bruto = textoDaMensagem(mensagem);
  const texto = visual || mensagem.type === "audio" || mensagem.type === "document" ? (/^(Foto|Vídeo|Figurinha|Áudio|Documento|Mensagem)$/.test(bruto) || bruto === mensagem.filename ? "" : bruto) : bruto || rotuloDoTipo(mensagem.type) || "Mensagem";
  // Pedido feito no site: a mensagem pronta da loja vira um cartão com as peças, os valores e o bebê.
  const pedidoSite = !saida && mensagem.type === "text" ? numeroDoPedidoDoSite(bruto) : null;
  const reacoes = mensagem.reactions ?? [];
  const minha = reacoes.find((r) => r.from === "me")?.emoji;
  const acoes = !local && !nota;
  const salvavel = Boolean(podeSalvar && acoes && mensagem.hasMedia && ["image", "video", "audio", "document"].includes(mensagem.type));
  const abrirAcoes = () => { if (!local) aoAcoes(mensagem); };

  return (
    <div className="row" id={`m-${mensagem.id}`} data-out={saida || undefined} data-first={primeira || undefined}
      onContextMenu={(e) => { if (local) return; e.preventDefault(); abrirAcoes(); }}
      onDoubleClick={() => acoes && aoResponder(mensagem)}
      onTouchStart={() => { window.clearTimeout(toque.current); toque.current = window.setTimeout(abrirAcoes, 550); }} onTouchEnd={() => window.clearTimeout(toque.current)} onTouchMove={() => window.clearTimeout(toque.current)}>
      <div className="passThrough">
        <div className="bubble" data-tone={tom} data-first={primeira || undefined} data-media={(visual && Boolean(src || pendente)) || undefined} data-reacted={reacoes.length ? "" : undefined} data-pedido={pedidoSite ? "" : undefined} data-pending={pendente || undefined} aria-busy={pendente || undefined}>
          {primeira && saida && (nota || modelo || autor) && (
            <span className="bubbleAuthor">
              {nota ? <><LockSimpleIcon weight="fill" aria-hidden /> Nota interna{autor ? ` / ${doisNomes(autor)}` : ""}</> : modelo ? <>Modelo{autor ? ` / ${doisNomes(autor)}` : ""}</> : doisNomes(autor)}
            </span>
          )}
          {mensagem.replyTo && <Citacao mensagem={mensagem.replyTo} nomeContato={nomeContato} aoClicar={() => aoIrPara(mensagem.replyTo!.id)} />}
          {album && album.length > 1 ? (
            <span className="album" data-odd={album.length % 2 === 1 || undefined}>
              {album.map((foto, i) => (
                <button key={foto.id} type="button" className="albumCell" aria-label={`Ampliar a foto ${i + 1} de ${album.length}`} onClick={() => aoAbrirFoto(foto)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={foto.local?.previewUrl ?? urlDaMidia(foto)} alt="" loading="lazy" decoding="async" />
                </button>
              ))}
            </span>
          ) : visual && (src ? (
            mensagem.type === "video" ? <video className="image" src={src} controls={!local} preload="metadata" playsInline muted={local} />
              : (
                <button type="button" className="mediaLink" aria-label={`Ampliar ${mensagem.filename || "a foto"}`} onClick={() => aoAbrirFoto(mensagem)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="image" src={src} alt={texto || "Foto"} loading="lazy" decoding="async" />
                </button>
              )
          ) : pendente ? <span className="imageSkeleton" role="img" aria-label="Enviando a foto" /> : <span className="imageMissing"><ImageIcon aria-hidden /> {rotuloDoTipo(mensagem.type) || "Foto"}</span>)}
          {mensagem.type === "audio" && <div className="audioBox">{src ? <AudioPlayer src={src} duration={mensagem.duration} /> : <span className="imageMissing"><MicrophoneIcon aria-hidden /> Áudio</span>}</div>}
          {mensagem.type === "document" && (
            <a className="document" href={local || !mensagem.hasMedia ? undefined : urlDaMidia(mensagem, true)} download={mensagem.filename}>
              <FileTextIcon weight="duotone" aria-hidden />
              <span>
                <strong>{mensagem.filename || "Documento"}</strong>
                <small>{[(mensagem.filename?.split(".").pop() ?? mensagem.mimeType?.split("/")[1] ?? "").toUpperCase().slice(0, 5), tamanhoArquivo(mensagem.size)].filter(Boolean).join(" / ") || "Documento"}</small>
              </span>
            </a>
          )}
          {pedidoSite ? <PedidoDoSite numero={pedidoSite} original={<p className="text"><FormatoWhatsApp texto={texto} /></p>} />
            : texto && <p className="text"><FormatoWhatsApp texto={texto} /><span className="spacer" aria-hidden /></p>}
          <span className="meta" data-overlay={visual && Boolean(src) && !texto ? "" : undefined}>
            {horaDaMensagem(mensagem.createdAt)}
            {saida && !nota && <Ticks status={mensagem.status} />}
          </span>
          {!local && (
            // Como no WhatsApp: ao passar o mouse, a barra com as reações rápidas, responder e mais opções sobre a bolha.
            <span className="hoverBar" role="toolbar" aria-label="Ações da mensagem">
              {acoes && REACOES_RAPIDAS.map((emoji) => (
                <button key={emoji} type="button" className="hbEmoji" data-on={minha === emoji || undefined} aria-pressed={minha === emoji} aria-label={minha === emoji ? `Tirar a reação ${emoji}` : `Reagir com ${emoji}`} onClick={() => aoReagir(mensagem, emoji)}>{emoji}</button>
              ))}
              {acoes && <span className="hbSep" aria-hidden />}
              {acoes && <button type="button" className="hbIcon" title="Responder" aria-label="Responder" onClick={() => aoResponder(mensagem)}><ArrowBendUpLeftIcon weight="bold" /></button>}
              {salvavel && <button type="button" className="hbIcon" title="Salvar na ficha" aria-label="Salvar na ficha" onClick={() => aoSalvar(mensagem)}><FolderSimplePlusIcon weight="bold" /></button>}
              <button type="button" className="hbIcon" title="Mais opções" aria-label="Mais opções da mensagem" onClick={abrirAcoes}><DotsThreeIcon weight="bold" /></button>
            </span>
          )}
          {reacoes.length > 0 && (
            <span className="pill" title={reacoes.map((r) => `${r.emoji} ${r.from === "me" ? "Equipe" : nomeContato}`).join(", ")} aria-label="Reações">
              {[...new Set(reacoes.map((r) => r.emoji))].join("")}{reacoes.length > 1 && <small>{reacoes.length}</small>}
            </span>
          )}
        </div>
      </div>
      {/* O passo do envio embaixo da bolha: "Preparando o vídeo…", "Enviando…", até o recibo trocar pelo tique. */}
      {local && mensagem.status === "sending" && mensagem.local?.progress && <span className="sendingLine" role="status" aria-live="polite">{mensagem.local.progress}</span>}
      {parada && mensagem.status === "sent" && (
        <span className="failedLine" role="status">
          Sem entrega: o cliente escreveu depois e a Meta não confirmou que esta mensagem chegou.
          {mensagem.type === "text" && mensagem.text.trim() && <> / <button type="button" onClick={() => aoReenviar(mensagem)}>Mandar de novo</button></>}
        </span>
      )}
      {mensagem.status === "failed" && (
        <span className="failedLine" role="status">
          {local ? "Não enviada" : "Não entregue"}{mensagem.error ? ` / ${mensagem.error}` : ""}
          {mensagem.local?.retry ? <> / <button type="button" onClick={mensagem.local.retry}>Tentar de novo</button></>
            : !local && mensagem.type === "text" && <> / <button type="button" onClick={() => aoReenviar(mensagem)}>Tentar de novo</button></>}
          {" / "}<button type="button" onClick={() => aoDescartar(mensagem)}>Descartar</button>
        </span>
      )}
    </div>
  );
});
