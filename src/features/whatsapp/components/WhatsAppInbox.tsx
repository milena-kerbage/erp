"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styled from "@emotion/styled";
import { ArrowClockwiseIcon, CaretLeftIcon, CheckCircleIcon, CheckIcon, ChecksIcon, GearSixIcon, PlusIcon, TrashIcon, WhatsappLogoIcon } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { TextField } from "@/components/ui/TextField";
import { NarrowOnly } from "@/styles/responsive";
import { transientOptions } from "@/lib/emotion/transient";
import { Pill } from "@/features/settings/components/ui";
import { ChatColumn, Item, ItemName, ItemPreview, ItemRow, ItemTexts, ItemTime, List, ListColumn, ListEmpty, ListHeader, Placeholder, Root, UnreadBadge } from "@/features/conversations/components/Inbox/styles";
import { errorMessage, normalizeWhatsAppPhone, whatsappRequest } from "../client";
import type { WhatsAppConversation, WhatsAppMessage, WhatsAppStatus } from "../types";
import { ConsentPanel } from "./ConsentPanel";
import { SendForm } from "./SendForm";
import { DeleteContactDialog } from "./DeleteContactDialog";
import { MediaDownloadButton } from "./MediaDownloadButton";
import { Actions, formatWhatsAppDate, Note, Notice, Stack } from "./shared";

const InboxHeading = styled.h2`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;
const ChatHeader = styled.header`
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(2)};
  padding: ${({ theme }) => theme.spacing(4, 5)};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  h2 { font-size: ${({ theme }) => theme.fontSizes.md}; font-weight: ${({ theme }) => theme.fontWeights.semibold}; }
  ${({ theme }) => theme.media.md} { padding: ${({ theme }) => theme.spacing(4)}; }
`;
const Messages = styled.div`
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
  min-height: 12rem;
  padding: ${({ theme }) => theme.spacing(5)};
  overflow-y: auto;
  background: ${({ theme }) => theme.colors.background.surface};
  ${({ theme }) => theme.media.md} { padding: ${({ theme }) => theme.spacing(4)}; }
`;
const Message = styled("article", transientOptions)<{ $outbound: boolean; $failed: boolean }>`
  align-self: ${({ $outbound }) => $outbound ? "flex-end" : "flex-start"};
  max-width: min(85%, 38rem);
  padding: ${({ theme }) => theme.spacing(3, 4)};
  border: 1px solid ${({ theme, $failed }) => $failed ? theme.colors.danger : theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme, $outbound }) => $outbound ? theme.tones.green.bg : theme.palette.neutral[0]};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.8125rem;
  line-height: 1.6;
  overflow-wrap: anywhere;
  > p { white-space: pre-wrap; }
  footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: ${({ theme }) => theme.spacing(1.5)}; margin-top: ${({ theme }) => theme.spacing(1)}; font-size: 0.6875rem; color: ${({ theme }) => theme.colors.text.muted}; }
`;
const Footer = styled.div`
  flex-shrink: 0;
  max-height: 48%;
  padding: ${({ theme }) => theme.spacing(4, 5)};
  overflow-y: auto;
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
  ${({ theme }) => theme.media.md} { padding: ${({ theme }) => theme.spacing(4)}; padding-bottom: ${({ theme }) => theme.spacing(7)}; }
`;
const Details = styled.details`
  padding-bottom: ${({ theme }) => theme.spacing(4)};
  summary { margin-bottom: ${({ theme }) => theme.spacing(3)}; font-size: 0.8125rem; font-weight: ${({ theme }) => theme.fontWeights.medium}; cursor: pointer; }
`;

const statusLabel: Record<string, string> = {
  received: "Recebida", accepted: "Aceita pela API", sending: "Enviando", sent: "Enviada", delivered: "Entregue", read: "Lida", failed: "Falha", unknown: "Aguardando status",
};

function MessageStatus({ status }: { status: string }) {
  const icon = status === "read" || status === "delivered" ? <ChecksIcon size={14} aria-hidden /> : status === "sent" ? <CheckIcon size={14} aria-hidden /> : null;
  return <>{icon}<span>{statusLabel[status] ?? status}</span></>;
}

export function WhatsAppInbox({ selectedPhone, invalidPhone = false }: { selectedPhone?: string; invalidPhone?: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [conversation, setConversation] = useState<WhatsAppConversation>();
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [query, setQuery] = useState("");
  const [newConversation, setNewConversation] = useState(false);
  const [deletionOpen, setDeletionOpen] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [revision, setRevision] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string>();
  const [olderLoading, setOlderLoading] = useState(false);
  const [readLoading, setReadLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [readResult, setReadResult] = useState("");
  const [offset, setOffset] = useState(0);
  const [listHasMore, setListHasMore] = useState(false);
  const messagesElement = useRef<HTMLDivElement>(null);
  const phoneRef = useRef(selectedPhone);
  const loadedOlderRef = useRef(false);
  phoneRef.current = selectedPhone;
  const refresh = () => setRevision((value) => value + 1);

  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    async function poll() {
      if (busy || controller.signal.aborted) return;
      busy = true;
      try {
        const [configuration, data] = await Promise.all([
          whatsappRequest<WhatsAppStatus>("status", { signal: controller.signal }),
          whatsappRequest<{ conversations: WhatsAppConversation[] }>(`conversations?limit=100&offset=${offset}`, { signal: controller.signal }),
        ]);
        if (controller.signal.aborted) return;
        setStatus(configuration);
        setConversations(data.conversations);
        setListHasMore(data.conversations.length === 100);
        setLastUpdated(new Date().toISOString());
        setError("");
      } catch (cause) {
        if (!controller.signal.aborted) setError(errorMessage(cause));
      } finally {
        busy = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void poll();
    const timer = window.setInterval(() => void poll(), 10000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [revision, offset]);

  useEffect(() => {
    setMessages([]);
    setConversation(undefined);
    setNextBefore(null);
    setMessageError("");
    setActionError("");
    setReadResult("");
    setDeletionOpen(false);
    loadedOlderRef.current = false;
  }, [selectedPhone]);

  useEffect(() => {
    if (!selectedPhone) return;
    const controller = new AbortController();
    let busy = false;
    let first = true;
    async function poll() {
      if (busy || controller.signal.aborted) return;
      busy = true;
      if (first) setMessagesLoading(true);
      try {
        const data = await whatsappRequest<{ messages: WhatsAppMessage[]; conversation?: WhatsAppConversation; nextBefore?: string | null }>(`messages?phone=${encodeURIComponent(selectedPhone!)}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setMessages((current) => {
          const latest = new Map(data.messages.map((message) => [message.id, message]));
          const earlier = current.filter((message) => !latest.has(message.id) && message.createdAt < (data.messages[0]?.createdAt ?? ""));
          return [...earlier, ...data.messages];
        });
        if (first && !loadedOlderRef.current) setNextBefore(data.nextBefore ?? null);
        setConversation(data.conversation);
        setMessageError("");
      } catch (cause) {
        if (!controller.signal.aborted) setMessageError(errorMessage(cause));
      } finally {
        busy = false;
        first = false;
        if (!controller.signal.aborted) setMessagesLoading(false);
      }
    }
    void poll();
    const timer = window.setInterval(() => void poll(), 5000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [selectedPhone, revision]);

  const lastMessageId = messages[messages.length - 1]?.id;
  useEffect(() => {
    const element = messagesElement.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [lastMessageId, selectedPhone]);

  async function loadOlder() {
    if (!selectedPhone || !nextBefore || olderLoading) return;
    const phone = selectedPhone;
    setOlderLoading(true);
    try {
      const data = await whatsappRequest<{ messages: WhatsAppMessage[]; nextBefore?: string | null }>(`messages?phone=${encodeURIComponent(phone)}&before=${encodeURIComponent(nextBefore)}`);
      if (phoneRef.current !== phone) return;
      loadedOlderRef.current = true;
      setMessages((current) => {
        if (current.some((message) => message.phone !== phone)) return current;
        return [...new Map([...data.messages, ...current].map((message) => [message.id, message])).values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      });
      setNextBefore(data.nextBefore ?? null);
      setActionError("");
    } catch (cause) { setActionError(errorMessage(cause)); }
    finally { setOlderLoading(false); }
  }

  async function markRead(id?: string) {
    const latest = id ? messages.find((message) => message.id === id && message.direction === "inbound") : [...messages].reverse().find((message) => message.direction === "inbound" && !message.isRead);
    if (!latest || readLoading) return;
    setReadLoading(true);
    setActionError("");
    setReadResult("");
    try {
      await whatsappRequest("read", { body: { messageId: latest.id } });
      setReadResult("Confirmação enviada à Meta para a mensagem selecionada. O histórico recebido até essa mensagem foi marcado como lido no sistema.");
      refresh();
    } catch (cause) { setActionError(errorMessage(cause)); }
    finally { setReadLoading(false); }
  }

  const visible = conversations.filter((item) => `${item.name || ""} ${item.phone} ${item.lastMessage || ""}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));
  const selected = conversation ?? conversations.find((item) => item.phone === selectedPhone);

  return (
    <Root data-flush data-open={selectedPhone ? "" : undefined} data-chat-open={selectedPhone ? "" : undefined}>
      <ListColumn aria-label="Conversas reais do WhatsApp" data-pane="list">
        <ListHeader>
          <Actions><InboxHeading><WhatsappLogoIcon size={22} aria-hidden />WhatsApp</InboxHeading><IconButton icon={GearSixIcon} label="Configurar WhatsApp" variant="ghost" size="sm" onClick={() => router.push("/configuracoes/whatsapp")} /><IconButton icon={PlusIcon} label="Abrir conversa por telefone" variant="ghost" size="sm" onClick={() => setNewConversation(true)} /><IconButton icon={ArrowClockwiseIcon} label="Atualizar conversas" variant="ghost" size="sm" onClick={refresh} /></Actions>
          <TextField label="Buscar conversas" hideLabel placeholder="Nome, telefone ou mensagem" value={query} onChange={(event) => setQuery(event.target.value)} />
          <Note>Mensagens recebidas e enviadas pela API oficial. Atualização a cada 10 segundos.</Note>
          {invalidPhone && <Notice $error role="alert">O telefone da URL é inválido. Abra uma conversa com país e DDD.</Notice>}
          {error && <Notice $error role="alert">{error}{lastUpdated ? ` Dados exibidos desde ${formatWhatsAppDate(lastUpdated)}.` : ""}</Notice>}
          {status && !status.ready && <Notice><a href="/configuracoes/whatsapp">Conclua a configuração do WhatsApp</a> para enviar mensagens e validar o webhook.</Notice>}
        </ListHeader>
        <List aria-label="Lista de contatos">
          {visible.map((item) => <li key={item.phone}><Item href={`/conversas?phone=${encodeURIComponent(item.phone)}`} $selected={item.phone === selectedPhone} aria-current={item.phone === selectedPhone ? "page" : undefined}>
            <Avatar name={item.name || item.phone} seed={`whatsapp-${item.phone}`} size="md" />
            <ItemTexts><ItemRow><ItemName $unread={item.unreadCount > 0}>{item.name || `+${item.phone}`}</ItemName><ItemTime $unread={item.unreadCount > 0}>{item.lastMessageAt ? formatWhatsAppDate(item.lastMessageAt, false) : ""}</ItemTime></ItemRow><ItemRow><ItemPreview $unread={item.unreadCount > 0}><span>{item.lastMessage || "Sem mensagens"}</span></ItemPreview>{item.unreadCount > 0 && <UnreadBadge aria-label={`${item.unreadCount} mensagens não lidas`}>{item.unreadCount}</UnreadBadge>}</ItemRow>{item.optedOut && <Note>Pedido de parada registrado</Note>}</ItemTexts>
          </Item></li>)}
          {!visible.length && <ListEmpty>{loading ? "Carregando conversas…" : query ? "Nenhuma conversa nesta página corresponde à busca." : "Ainda não há conversas nesta página. Envie uma mensagem ao número Business para testar o recebimento ou abra um número autorizado."}</ListEmpty>}
          {(offset > 0 || listHasMore) && <li><Actions><Button variant="ghost" size="sm" disabled={offset === 0} onClick={() => { setOffset((value) => Math.max(0, value - 100)); setLoading(true); }}>Anteriores</Button><Note>Página {offset / 100 + 1}</Note><Button variant="ghost" size="sm" disabled={!listHasMore} onClick={() => { setOffset((value) => value + 100); setLoading(true); }}>Próximas</Button></Actions></li>}
        </List>
      </ListColumn>
      <ChatColumn data-pane="chat" aria-label="Atendimento WhatsApp">
        {selectedPhone ? <>
          <ChatHeader>
            <Actions><NarrowOnly><IconButton icon={CaretLeftIcon} label="Voltar às conversas" variant="ghost" onClick={() => router.push("/conversas")} /></NarrowOnly><Avatar name={selected?.name || selectedPhone} seed={`whatsapp-${selectedPhone}`} /><div><h2>{selected?.name || `+${selectedPhone}`}</h2>{selected?.name && <Note>+{selectedPhone}</Note>}</div></Actions>
            <Actions><Pill $tone={selected?.consent.status === "granted" && !selected.optedOut ? "green" : "neutral"}>{selected?.consent.status === "granted" && !selected.optedOut ? "Autorizado" : "Envio bloqueado"}</Pill><Button size="sm" variant="ghost" icon={CheckCircleIcon} disabled={!messages.some((message) => message.direction === "inbound" && !message.isRead) || !status?.ready} loading={readLoading} onClick={() => void markRead()}>Confirmar leitura do histórico</Button></Actions>
            {selected && <IconButton icon={TrashIcon} label="Excluir dados WhatsApp do contato" variant="ghost" size="sm" onClick={() => setDeletionOpen(true)} />}
          </ChatHeader>
          <Messages ref={messagesElement} aria-label="Histórico de mensagens" aria-busy={messagesLoading}>
            {messageError && <Notice $error role="alert">{messageError} O histórico pode estar desatualizado.</Notice>}
            {actionError && <Notice $error role="alert">{actionError}</Notice>}
            {readResult && <Notice role="status">{readResult}</Notice>}
            {nextBefore && <Actions><Button size="sm" variant="secondary" loading={olderLoading} onClick={() => void loadOlder()}>Carregar mensagens anteriores</Button></Actions>}
            {messages.map((message) => <Message key={message.id} $outbound={message.direction === "outbound"} $failed={message.status === "failed"} aria-label={`${message.direction === "outbound" ? "Equipe" : "Cliente"}, ${statusLabel[message.status] ?? message.status}`}>
              <p>{message.text || `[${message.type}]`}</p>
              {message.mediaId && <><Note>Mensagem de mídia · {message.filename || message.mimeType || message.type}. Envio de mídia pela interface ainda não está disponível.</Note><MediaDownloadButton message={message} /></>}
              {message.error && <Note>{message.error}</Note>}
              <footer><time dateTime={message.createdAt}>{formatWhatsAppDate(message.createdAt)}</time><MessageStatus status={message.status} />{message.direction === "inbound" && message.isRead && <span>Leitura confirmada pela equipe</span>}</footer>
              {message.direction === "inbound" && !message.isRead && <Button size="sm" variant="ghost" disabled={!status?.ready || readLoading} onClick={() => void markRead(message.id)}>Confirmar leitura até esta mensagem</Button>}
            </Message>)}
            {!messages.length && <EmptyState title={messagesLoading ? "Carregando histórico…" : "Conversa sem mensagens"} description="Para iniciar o contato, registre a autorização recebida e envie um modelo aprovado. Texto livre exige uma mensagem da pessoa nas últimas 24 horas." />}
          </Messages>
          <Footer key={selectedPhone}>
            <Details><summary>Autorização e pedidos de parada</summary><ConsentPanel phone={selectedPhone} consent={selected?.consent} onSaved={refresh} /></Details>
            <SendForm phone={selectedPhone} conversation={selected} ready={status?.ready ?? false} onSent={refresh} />
          </Footer>
        </> : <Placeholder><EmptyState title="Conversas do WhatsApp" icon={<WhatsappLogoIcon size={30} />} description="Selecione uma conversa real recebida pelo webhook ou abra um número autorizado para iniciar o atendimento."><Button icon={PlusIcon} onClick={() => setNewConversation(true)}>Abrir por telefone</Button><Button href="/configuracoes/whatsapp" variant="secondary">Configurar integração</Button></EmptyState></Placeholder>}
      </ChatColumn>
      <Dialog open={newConversation} onClose={() => setNewConversation(false)} title="Abrir conversa WhatsApp" description="Use o número real de uma pessoa que autorizou o contato, com código do país e DDD." footer={<><Button variant="ghost" onClick={() => setNewConversation(false)}>Cancelar</Button><Button disabled={!normalizeWhatsAppPhone(phoneDraft)} onClick={() => { const phone = normalizeWhatsAppPhone(phoneDraft); if (!phone) return; setNewConversation(false); setPhoneDraft(""); router.push(`/conversas?phone=${encodeURIComponent(phone)}`); }}>Abrir conversa</Button></>}>
        <TextField label="Número internacional" placeholder="5511999999999" inputMode="tel" value={phoneDraft} maxLength={24} onChange={(event) => setPhoneDraft(event.target.value)} error={phoneDraft && !normalizeWhatsAppPhone(phoneDraft) ? "Use de 8 a 15 dígitos, incluindo país e DDD." : undefined} />
        <Note>Abrir a conversa não envia mensagem. A autorização, a janela de atendimento e a aprovação do modelo são verificadas antes do envio.</Note>
      </Dialog>
      {selectedPhone && <DeleteContactDialog key={selectedPhone} phone={selectedPhone} open={deletionOpen} onClose={() => setDeletionOpen(false)} onDeleted={() => { setDeletionOpen(false); setMessages([]); setConversation(undefined); setConversations((current) => current.filter((item) => item.phone !== selectedPhone)); refresh(); router.push("/conversas"); }} />}
    </Root>
  );
}
