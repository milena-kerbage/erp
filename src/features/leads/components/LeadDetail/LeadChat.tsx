"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  ArrowDownIcon,
  ChatsCircleIcon,
  CopyIcon,
  DotsThreeVerticalIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { AudioPlayer } from "@/components/ui/Chat/AudioPlayer";
import { ChatBubble, DateDivider } from "@/components/ui/Chat/Bubble";
import { ChatFile } from "@/components/ui/Chat/ChatFile";
import { ChatComposer, type ComposerHandle, type ComposerSendPayload } from "@/components/ui/Chat/Composer";
import { MediaGrid, type MediaImage } from "@/components/ui/Chat/MediaGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { Lightbox } from "@/components/ui/Lightbox";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { copyText } from "@/lib/clipboard";
import { formatDayLabel, formatTime } from "@/lib/format";
import { formatPhone } from "../../format";
import { useWorkspace } from "@/features/settings/store";
import { quickReplies } from "../../quick-replies";
import type { Attachment, ChatMessage, Lead } from "../../types";
import {
  ChatHeader,
  ChatName,
  ChatPhone,
  ChatTitle,
  Day,
  Dock,
  DropOverlay,
  JumpToLatest,
  Thread,
  ThreadWrap,
} from "./styles";

type LeadChatProps = {
  lead: Lead;
  messages: ChatMessage[];
  composerRef: RefObject<ComposerHandle | null>;
  onSend: (payload: ComposerSendPayload) => Promise<boolean>;
  /** Ações extras no cabeçalho (ex.: status e responsável nas Conversas). */
  actions?: ReactNode;
  /** Antes do avatar: o "voltar" da conversa em tela cheia no celular. */
  back?: ReactNode;
  /** Itens a mais no menu "⋮" (ex.: abrir a oportunidade). */
  menuItems?: ReactNode;
  /** Celular: opções do compositor no dock flutuante (desligue com o chat fora de vista). */
  dock?: boolean;
  /** "Fechar" do dock enquanto a conversa está à vista. */
  onDockClose?: () => void;
  dockCloseLabel?: string;
  /** Celular: sem o cabeçalho da conversa (quando o topo da tela já mostra o contato). */
  hideHeaderOnMobile?: boolean;
  /** Conteúdo no topo da conversa, antes das mensagens (ex.: atividade). */
  prelude?: ReactNode;
};

/** Mensagens da mesma pessoa, do mesmo tipo e em até 5 min formam uma sequência. */
const GROUP_WINDOW = 5 * 60 * 1000;
/** Distância do fim para considerar que a pessoa está "no fim" da conversa. */
const NEAR_BOTTOM = 80;
/** Folga entre a última mensagem e o início do degradê. */
const END_GAP = 12;

const dayKey = (iso: string) => new Date(iso).toDateString();

function sameGroup(a: ChatMessage | undefined, b: ChatMessage | undefined) {
  if (!a || !b) return false;
  return (
    a.direction === b.direction &&
    a.kind === b.kind &&
    a.author.seed === b.author.seed &&
    dayKey(a.at) === dayKey(b.at) &&
    Math.abs(new Date(b.at).getTime() - new Date(a.at).getTime()) <= GROUP_WINDOW
  );
}

const isImage = (file: Attachment) => file.type.startsWith("image/") && Boolean(file.url);
const isAudio = (file: Attachment) => file.type.startsWith("audio/") && Boolean(file.url);

export function LeadChat({
  lead,
  messages,
  composerRef,
  onSend,
  actions,
  back,
  menuItems,
  dock,
  onDockClose,
  dockCloseLabel,
  hideHeaderOnMobile,
  prelude,
}: LeadChatProps) {
  const threadRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  // Espelho em ref para os eventos de carregamento lerem o valor atual.
  const atBottomRef = useRef(true);
  const [dockHeight, setDockHeight] = useState(108);
  // Altura do degradê acima do compositor (padding-top do Dock, menor no celular)
  const [dockFade, setDockFade] = useState(40);
  const [dragging, setDragging] = useState(false);
  const [lightbox, setLightbox] = useState<{ images: MediaImage[]; index: number } | null>(null);
  const phone = formatPhone(lead.phone);
  const { preferences } = useWorkspace();

  // Agrupa por dia para a data ficar fixa no topo daquele trecho.
  const days = useMemo(() => {
    const groups: { key: string; label: string; items: ChatMessage[] }[] = [];
    for (const message of messages) {
      const key = dayKey(message.at);
      const last = groups[groups.length - 1];
      if (last?.key === key) last.items.push(message);
      else groups.push({ key, label: formatDayLabel(message.at), items: [message] });
    }
    return groups;
  }, [messages]);

  const scrollToBottom = (behavior: ScrollBehavior) => {
    const element = threadRef.current;
    if (element) element.scrollTo({ top: element.scrollHeight, behavior });
  };

  // Espaço no fim da conversa = altura total do dock (degradê + compositor, que
  // cresce com o texto). contentRect ignoraria o padding do degradê.
  useLayoutEffect(() => {
    const element = dockRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setDockHeight(entry.borderBoxSize?.[0]?.blockSize ?? entry.target.getBoundingClientRect().height);
      setDockFade(parseFloat(getComputedStyle(element).paddingTop) || 0);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Abre já no fim da conversa.
  useLayoutEffect(() => {
    scrollToBottom("auto");
  }, []);

  // Nova mensagem: acompanha se a pessoa estava no fim (ou se foi ela que enviou).
  const lastMessage = messages[messages.length - 1];
  useEffect(() => {
    if (atBottom || lastMessage?.direction === "out") scrollToBottom("smooth");
    // Reage só à chegada de uma nova última mensagem.
  }, [lastMessage?.id]);

  const hasFiles = (event: DragEvent) => event.dataTransfer.types.includes("Files");

  return (
    <>
      <ChatHeader data-hide-mobile={hideHeaderOnMobile || undefined}>
        {back}
        <Avatar name={lead.name} src={lead.photoUrl} seed={lead.id} size="sm" shape="circle" />
        <ChatTitle>
          <ChatName>{lead.name}</ChatName>
          <ChatPhone>{phone}</ChatPhone>
        </ChatTitle>
        {actions}
        <Menu
          label="Opções da conversa"
          align="end"
          width="13rem"
          trigger={(props) => (
            <IconButton {...props} icon={DotsThreeVerticalIcon} label="Mais opções" variant="ghost" tooltip="bottom" />
          )}
        >
          {menuItems}
          <MenuItem icon={CopyIcon} onSelect={() => void copyText(phone)}>
            Copiar telefone
          </MenuItem>
        </Menu>
      </ChatHeader>

      <ThreadWrap
        onDragOver={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          setDragging(false);
          composerRef.current?.addFiles(event.dataTransfer.files);
        }}
      >
        <Thread
          ref={threadRef}
          role="log"
          aria-label={`Conversa com ${lead.name}`}
          aria-live="polite"
          style={{ paddingBottom: dockHeight + END_GAP }}
          onScroll={(event) => {
            const element = event.currentTarget;
            const bottom = element.scrollHeight - element.scrollTop - element.clientHeight < NEAR_BOTTOM;
            atBottomRef.current = bottom;
            setAtBottom(bottom);
          }}
          // Imagens/áudios mudam a altura ao carregar: se estava no fim, continua no fim.
          onLoadCapture={() => atBottomRef.current && scrollToBottom("auto")}
          onLoadedMetadataCapture={() => atBottomRef.current && scrollToBottom("auto")}
        >
          <aside style={{ padding: '1rem', border: '1px solid currentColor', borderRadius: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Notas internas da oportunidade, salvas no banco de dados e visíveis apenas para a equipe.
            {' '}<a href={`/conversas?phone=${encodeURIComponent(lead.phone.replace(/\D/g, ''))}`}>Abrir atendimento real pelo WhatsApp</a>.
          </aside>
          {prelude}
          {messages.length === 0 ? (
            <EmptyState
              icon={<ChatsCircleIcon size={24} />}
              title="Nenhuma nota interna ainda"
              description="Registre o atendimento e as decisões da equipe abaixo. Para mensagens ao cliente, abra o WhatsApp pelo link acima."
            />
          ) : (
            days.map((day) => (
              <Day key={day.key} aria-label={day.label}>
                <DateDivider>{day.label}</DateDivider>

                {day.items.map((message, index) => {
                  const attachments = message.attachments ?? [];
                  const images = attachments.filter(isImage);
                  const audios = attachments.filter(isAudio);
                  const others = attachments.filter((file) => !isImage(file) && !isAudio(file));

                  const gallery = images.map((file) => ({ url: file.url!, name: file.name }));

                  return (
                    <ChatBubble
                      key={message.id}
                      direction={message.direction}
                      note={message.kind === "note"}
                      noteAuthor={message.author.name}
                      first={!sameGroup(day.items[index - 1], message)}
                      time={formatTime(message.at)}
                      status={message.kind === "message" ? message.status : undefined}
                      media={
                        images.length > 0 ? (
                          <MediaGrid
                            images={gallery}
                            onOpen={(imageIndex) => setLightbox({ images: gallery, index: imageIndex })}
                          />
                        ) : undefined
                      }
                      files={
                        others.length > 0
                          ? others.map((file) => (
                              <ChatFile
                                key={file.id}
                                name={file.name}
                                size={file.size}
                                type={file.type}
                                url={file.url}
                              />
                            ))
                          : undefined
                      }
                      audio={
                        audios.length > 0
                          ? audios.map((file) => <AudioPlayer key={file.id} src={file.url!} duration={file.duration} />)
                          : undefined
                      }
                      text={message.text}
                    />
                  );
                })}
              </Day>
            ))
          )}
        </Thread>

        {!atBottom && (
          <JumpToLatest style={{ bottom: dockHeight - dockFade + 12 }}>
            <Button variant="secondary" size="sm" icon={ArrowDownIcon} onClick={() => scrollToBottom("smooth")}>
              Novas mensagens
            </Button>
          </JumpToLatest>
        )}

        <Dock ref={dockRef}>
          <ChatComposer
            ref={composerRef}
            recipient="Nota interna da oportunidade"
            sendLabel="Salvar nota interna"
            placeholder="Escreva uma nota interna"
            quickReplies={quickReplies}
            enterSends={preferences.enterSends}
            onSend={onSend}
            dock={dock}
            onDockClose={onDockClose}
            dockCloseLabel={dockCloseLabel}
          />
        </Dock>

        {dragging && (
          <DropOverlay>
            <UploadSimpleIcon size={22} aria-hidden />
            Solte para anexar à mensagem
          </DropOverlay>
        )}
      </ThreadWrap>

      <Lightbox images={lightbox?.images ?? []} index={lightbox?.index ?? null} onClose={() => setLightbox(null)} />
    </>
  );
}
