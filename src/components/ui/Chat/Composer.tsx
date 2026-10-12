"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import {
  LightningIcon,
  MicrophoneIcon,
  PaperPlaneRightIcon,
  PaperclipIcon,
  SmileyIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { FileItem } from "@/components/ui/FileItem";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { useDockActionsRegistration, type DockAction, type DockActions } from "@/lib/dock";
import { transientOptions } from "@/lib/emotion/transient";
import { useIsMobile } from "@/lib/useMediaQuery";
import { formatDuration } from "@/lib/waveform";
import { EmojiPicker } from "./EmojiPicker";
import { QuickReplies, type QuickReply } from "./QuickReplies";

export type { QuickReply };

export type ComposerSendPayload = {
  text: string;
  files: File[];
  /** Áudio gravado no próprio compositor. */
  audio?: { file: File; duration: number };
};

export type ComposerHandle = {
  focus: () => void;
  addFiles: (files: FileList | File[]) => void;
};

type ChatComposerProps = {
  /** Nome de quem recebe (respostas rápidas). */
  recipient: string;
  quickReplies?: readonly QuickReply[];
  /** Enter envia (padrão). Desligado, Enter quebra a linha e Ctrl/⌘+Enter envia. */
  enterSends?: boolean;
  onSend: (payload: ComposerSendPayload) => void | boolean | Promise<void | boolean>;
  sendLabel?: string;
  placeholder?: string;
  /**
   * Celular: as opções (anexar, respostas, áudio/enviar) vão para o
   * dock flutuante e aqui fica só a caixa de texto. Desligue quando o chat
   * não estiver à vista (ex.: aba de informações da oportunidade).
   */
  dock?: boolean;
  /** "Fechar" do dock enquanto o chat está à vista (ex.: voltar à lista). */
  onDockClose?: () => void;
  dockCloseLabel?: string;
};

/** Até 4 linhas de texto (20px cada + respiro); depois rola. */
const MAX_HEIGHT = 96;
const LIVE_BARS = 40;

/* ---------- Estilos ---------- */

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};
`;

/**
 * Pílula da mensagem. Borda (1px) + recuo (5px) + botões de 36px: com uma
 * linha, 24px de raio é a pílula completa; quando o texto cresce, os cantos
 * continuam concêntricos com os botões, que ficam embaixo.
 */
const Pill = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 2px;
  padding: 5px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 1.5rem;
  background-color: ${({ theme }) => theme.palette.neutral[0]};
  transition: border-color ${({ theme }) => theme.transitions.fast};

  &:focus-within {
    border-color: ${({ theme }) => theme.palette.sage[400]};
  }

  /* Todos os botões redondos, acompanhando a pílula */
  button,
  a {
    border-radius: 50%;
  }

  /* Celular: só a caixa de texto; as opções moram no dock flutuante */
  ${({ theme }) => theme.media.md} {
    padding: ${({ theme }) => theme.spacing(1, 1.5)};
    border-radius: 1.5rem;

    [data-tool] {
      display: none !important;
    }
  }
`;

const Textarea = styled.textarea`
  flex: 1;
  align-self: stretch;
  min-width: 0;
  min-height: 2.25rem;
  max-height: ${MAX_HEIGHT}px;

  padding: ${({ theme }) => theme.spacing(2, 2.5)};
  border: 0;
  outline: none;
  resize: none;
  background: transparent;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.25rem;
  color: ${({ theme }) => theme.colors.text.primary};
  /* Ao rolar, a linha cortada some suave nas bordas em vez de bater na pílula */
  mask-image: linear-gradient(to bottom, transparent 0, #000 8px, #000 calc(100% - 8px), transparent 100%);

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }

  /* Celular: 16px (o iOS não dá zoom ao focar), uma linha na altura do dock */
  ${({ theme }) => theme.media.md} {
    min-height: 2.5rem;
    padding: ${({ theme }) => theme.spacing(2.5, 3)};
    font-size: 1rem;
  }
`;

const ActionButton = styled("button", transientOptions)<{ $soft?: boolean }>`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  margin-left: 2px;
  background-color: ${({ theme, $soft }) => ($soft ? theme.palette.sage[100] : theme.colors.primary.main)};
  color: ${({ theme, $soft }) => ($soft ? theme.palette.sage[800] : theme.colors.primary.contrast)};
  transition:
    background-color ${({ theme }) => theme.transitions.fast},
    transform ${({ theme }) => theme.transitions.fast};

  &:hover:not(:disabled) {
    background-color: ${({ theme, $soft }) => ($soft ? theme.palette.sage[200] : theme.colors.primary.hover)};
  }

  &:active:not(:disabled) {
    transform: scale(0.92);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`;

/** Anexos escolhidos: bandeja acima da pílula (na pílula ficariam cortados). */
const Tray = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-self: flex-start;
  gap: ${({ theme }) => theme.spacing(2)};
  max-width: 100%;
  padding: ${({ theme }) => theme.spacing(2)};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radii["2xl"]};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
`;

const Thumb = styled.div`
  position: relative;
  width: 3.5rem;
  height: 3.5rem;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  /* Concêntrico com a bandeja (16px de raio, 8px de recuo) */
  border-radius: ${({ theme }) => theme.radii.md};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ThumbRemove = styled.button`
  position: absolute;
  top: 3px;
  right: 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 50%;
  background-color: rgba(18, 20, 17, 0.6);
  color: ${({ theme }) => theme.palette.neutral[0]};
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(0.8); }
`;

const Recording = styled.div`
  display: flex;
  flex: 1;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
  min-width: 0;
  height: 2.25rem;
  padding: ${({ theme }) => theme.spacing(0, 2)};
`;

const RecDot = styled.span`
  width: 9px;
  height: 9px;
  flex-shrink: 0;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.danger};
  animation: ${pulse} 1.2s ease-in-out infinite;
`;

const RecTime = styled.span`
  flex-shrink: 0;
  min-width: 2.25rem;
  font-size: 0.8125rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const LiveWave = styled.div`
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  height: 1.5rem;
  overflow: hidden;
`;

const LiveBar = styled.span`
  width: 2px;
  flex-shrink: 0;
  border-radius: 2px;
  background-color: ${({ theme }) => theme.colors.text.secondary};
`;

const ErrorText = styled.span`
  padding: ${({ theme }) => theme.spacing(0, 4)};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.danger};
`;

/* ---------- Gravação de áudio ---------- */

type RecorderState = {
  recorder: MediaRecorder;
  stream: MediaStream;
  context: AudioContext;
  chunks: Blob[];
  startedAt: number;
  frame: number;
};

const firstName = (name: string) => name.split(" ")[0] ?? name;

/**
 * Caixa de mensagem do WhatsApp em pílula: anexos
 * (botão, arrastar ou colar), respostas rápidas, emojis e áudio. Enter envia;
 * Shift+Enter quebra a linha.
 */
export const ChatComposer = forwardRef<ComposerHandle, ChatComposerProps>(function ChatComposer(
  { recipient, quickReplies = [], enterSends = true, onSend, dock = false, onDockClose, dockCloseLabel, sendLabel = "Enviar mensagem", placeholder = "Escreva uma mensagem" },
  ref,
) {
  const mobile = useIsMobile();
  const quickRef = useRef<HTMLElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef({ start: 0, end: 0 });
  const recorderRef = useRef<RecorderState | null>(null);
  const pillRef = useRef<HTMLDivElement>(null);

  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const canSend = text.trim().length > 0 || files.length > 0;

  const addFiles = (list: FileList | File[] | null) => {
    if (!list || list.length === 0) return;
    setFiles((current) => [...current, ...Array.from(list)]);
    textareaRef.current?.focus();
  };

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    addFiles,
  }));

  // Miniaturas das imagens escolhidas (URLs liberadas ao remover/enviar).
  const previews = useMemo(
    () =>
      files.map((file) => ({
        file,
        url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      })),
    [files],
  );
  useEffect(() => () => previews.forEach((preview) => preview.url && URL.revokeObjectURL(preview.url)), [previews]);

  // Cresce com o texto até o limite; depois rola.
  useLayoutEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT)}px`;
  }, [text, recording]);

  // Dropdowns devolvem o foco ao gatilho ao fechar; depois disso, volta ao texto.
  const refocus = () => window.requestAnimationFrame(() => textareaRef.current?.focus());

  const focusEnd = () =>
    window.requestAnimationFrame(() => {
      const element = textareaRef.current;
      if (!element) return;
      element.focus();
      element.setSelectionRange(element.value.length, element.value.length);
    });

  const rememberSelection = () => {
    const element = textareaRef.current;
    if (element) selectionRef.current = { start: element.selectionStart, end: element.selectionEnd };
  };

  const insertAtCursor = (value: string) => {
    // O campo guarda a seleção mesmo sem foco; a ref cobre o caso de ele ter sido recriado.
    const element = textareaRef.current;
    const start = element ? element.selectionStart : selectionRef.current.start;
    const end = element ? element.selectionEnd : selectionRef.current.end;
    setText((current) => current.slice(0, start) + value + current.slice(end));
    const caret = start + value.length;
    selectionRef.current = { start: caret, end: caret };
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(caret, caret);
    });
  };

  const send = async () => {
    if (!canSend || sendingRef.current) return;
    sendingRef.current = true; setSending(true); setError(null);
    try {
      const result = await onSend({ text: text.trim(), files });
      if (result === false) { setError("Não foi possível salvar. O texto e os arquivos foram mantidos para tentar novamente."); return; }
      setText(""); setFiles([]); textareaRef.current?.focus();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar. Tente novamente."); }
    finally { sendingRef.current = false; setSending(false); }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter envia (ou Ctrl/⌘+Enter, conforme a preferência); Shift+Enter quebra a
    // linha. Ignora durante composição (IME).
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    const shortcut = event.ctrlKey || event.metaKey;
    if (enterSends || shortcut) {
      event.preventDefault();
      send();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (event.clipboardData.files.length > 0) {
      event.preventDefault();
      addFiles(event.clipboardData.files);
    }
  };

  const insertQuickReply = (content: string) => {
    setText((current) => (current.trim() ? `${current.trimEnd()}\n${content}` : content));
    focusEnd();
  };

  /* Áudio */

  const cleanupRecorder = () => {
    const state = recorderRef.current;
    if (!state) return;
    cancelAnimationFrame(state.frame);
    state.stream.getTracks().forEach((track) => track.stop());
    void state.context.close();
    recorderRef.current = null;
    setRecording(false);
    setLevels([]);
    setElapsed(0);
  };

  useEffect(() => cleanupRecorder, []);

  const startRecording = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Este navegador não permite gravar áudio.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      context.createMediaStreamSource(stream).connect(analyser);

      const state: RecorderState = {
        recorder,
        stream,
        context,
        chunks: [],
        startedAt: Date.now(),
        frame: 0,
      };
      recorder.ondataavailable = (event) => event.data.size > 0 && state.chunks.push(event.data);
      recorder.start();
      recorderRef.current = state;
      setRecording(true);

      // Nível do microfone para as ondas ao vivo.
      const samples = new Uint8Array(analyser.fftSize);
      let lastPush = 0;
      const tick = (now: number) => {
        analyser.getByteTimeDomainData(samples);
        if (now - lastPush > 70) {
          let sum = 0;
          for (const sample of samples) sum += ((sample - 128) / 128) ** 2;
          const level = Math.min(1, Math.sqrt(sum / samples.length) * 4);
          setLevels((current) => [...current.slice(-(LIVE_BARS - 1)), level]);
          setElapsed((Date.now() - state.startedAt) / 1000);
          lastPush = now;
        }
        state.frame = requestAnimationFrame(tick);
      };
      state.frame = requestAnimationFrame(tick);
    } catch {
      setError("Não foi possível acessar o microfone. Verifique a permissão do navegador.");
    }
  };

  const stopRecording = (shouldSend: boolean) => {
    const state = recorderRef.current;
    if (!state) return;
    const duration = (Date.now() - state.startedAt) / 1000;

    state.recorder.onstop = async () => {
      const payload = shouldSend && state.chunks.length > 0 ? (() => {
        const type = state.recorder.mimeType || "audio/webm";
        const extension = type.includes("ogg") ? "ogg" : type.includes("mp4") ? "m4a" : "webm";
        return { text: "", files: [], audio: { file: new File(state.chunks, `audio-${Date.now()}.${extension}`, { type }), duration } };
      })() : null;
      cleanupRecorder(); refocus();
      if (!payload) return;
      sendingRef.current = true; setSending(true);
      try {
        const result = await onSend(payload);
        if (result === false) { addFiles([payload.audio.file]); setError("Não foi possível salvar o áudio. Ele foi mantido nos anexos para tentar novamente."); }
      } catch (cause) { addFiles([payload.audio.file]); setError(cause instanceof Error ? cause.message : "Não foi possível salvar o áudio."); }
      finally { sendingRef.current = false; setSending(false); }
    };
    state.recorder.stop();
  };

  const removeFile = (index: number) => setFiles((current) => current.filter((_, i) => i !== index));

  /* Celular: as opções vão para o dock (handlers sempre atuais via ref) */
  const handlers = useRef({ send, startRecording, stopRecording });
  handlers.current = { send, startRecording, stopRecording };
  const hasQuick = quickReplies.length > 0;
  const dockActions = useMemo<DockActions | null>(() => {
    if (!mobile || !dock) return null;
    const items: DockAction[] = recording
      ? [
          {
            id: "discard",
            icon: TrashIcon,
            label: "Descartar áudio",
            onClick: () => handlers.current.stopRecording(false),
          },
          {
            id: "send-audio",
            icon: PaperPlaneRightIcon,
            label: "Enviar áudio",
            primary: true,
            onClick: () => handlers.current.stopRecording(true),
          },
        ]
      : [
          { id: "attach", icon: PaperclipIcon, label: "Anexar arquivos", disabled: sending, onClick: () => fileRef.current?.click() },
          ...(hasQuick
            ? [
                {
                  id: "quick",
                  icon: LightningIcon,
                  label: "Respostas rápidas",
                  onClick: () => quickRef.current?.click(),
                },
              ]
            : []),
          canSend
            ? {
                id: "send",
                icon: PaperPlaneRightIcon,
                label: sendLabel,
                disabled: sending,
                primary: true,
                onClick: () => handlers.current.send(),
              }
            : {
                id: "mic",
                icon: MicrophoneIcon,
                label: "Gravar áudio",
                disabled: sending,
                primary: true,
                onClick: () => void handlers.current.startRecording(),
              },
        ];
    return { items, onClose: onDockClose, closeLabel: dockCloseLabel };
  }, [mobile, dock, recording, canSend, hasQuick, onDockClose, dockCloseLabel, sending, sendLabel]);
  useDockActionsRegistration(dockActions);

  return (
    <Root>
      {previews.length > 0 && (
        <Tray aria-label="Anexos">
          {previews.map(({ file, url }, index) =>
            url ? (
              <Thumb key={url}>
                <img src={url} alt={file.name} />
                <ThumbRemove type="button" aria-label={`Remover ${file.name}`} onClick={() => removeFile(index)}>
                  <XIcon size={10} weight="bold" aria-hidden />
                </ThumbRemove>
              </Thumb>
            ) : (
              <FileItem
                key={`${file.name}-${index}`}
                variant="compact"
                name={file.name}
                size={file.size}
                type={file.type}
                onRemove={() => removeFile(index)}
              />
            ),
          )}
        </Tray>
      )}

      {error && <ErrorText role="alert">{error}</ErrorText>}

      <Pill ref={pillRef}>
        {recording ? (
          <>
            <IconButton
              icon={TrashIcon}
              label="Descartar áudio"
              variant="ghost"
              tooltip="top"
              data-tool=""
              onClick={() => stopRecording(false)}
            />
            <Recording aria-live="polite">
              <RecDot aria-hidden />
              <RecTime>{formatDuration(elapsed)}</RecTime>
              <LiveWave aria-hidden>
                {levels.map((level, index) => (
                  <LiveBar key={index} style={{ height: `${Math.max(12, level * 100)}%` }} />
                ))}
              </LiveWave>
            </Recording>
            <Tooltip label="Enviar áudio" side="top">
              <ActionButton type="button" aria-label="Enviar áudio" data-tool="" onClick={() => stopRecording(true)}>
                <PaperPlaneRightIcon size={16} weight="fill" aria-hidden />
              </ActionButton>
            </Tooltip>
          </>
        ) : (
          <>
            <IconButton
              icon={PaperclipIcon}
              label="Anexar arquivos"
              variant="ghost"
              tooltip="top"
              data-tool=""
              onClick={() => fileRef.current?.click()}
            />

            <Textarea
              ref={textareaRef}
              rows={1}
              value={text}
              aria-label={placeholder}
              disabled={sending}
              placeholder={placeholder}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onSelect={rememberSelection}
              onBlur={rememberSelection}
            />

            {quickReplies.length > 0 && (
              <QuickReplies
                replies={quickReplies}
                recipientName={firstName(recipient)}
                anchorRef={pillRef}
                onInsert={insertQuickReply}
                trigger={({ open, ...props }) => (
                  <IconButton
                    {...{
                      ...props,
                      // Guarda o gatilho: no celular, o botão do dock abre as respostas por ele
                      ref: (element: HTMLElement | null) => {
                        props.ref(element);
                        quickRef.current = element;
                      },
                    }}
                    icon={LightningIcon}
                    label="Respostas rápidas"
                    variant="ghost"
                    data-tool=""
                    tooltip={open ? false : "top"}
                  />
                )}
              />
            )}

            <EmojiPicker
              anchorRef={pillRef}
              onSelect={insertAtCursor}
              trigger={({ open, ...props }) => (
                <IconButton
                  {...props}
                  icon={SmileyIcon}
                  label="Emojis"
                  variant="ghost"
                  data-tool=""
                  tooltip={open ? false : "top"}
                />
              )}
            />

            {canSend ? (
              <Tooltip label="Enviar" side="top">
                <ActionButton type="button" aria-label={sendLabel} disabled={sending} data-tool="" onClick={() => void send()}>
                  <PaperPlaneRightIcon size={16} weight="fill" aria-hidden />
                </ActionButton>
              </Tooltip>
            ) : (
              <Tooltip label="Gravar áudio" side="top">
                <ActionButton type="button" $soft aria-label="Gravar áudio" disabled={sending} data-tool="" onClick={startRecording}>
                  <MicrophoneIcon size={17} weight="fill" aria-hidden />
                </ActionButton>
              </Tooltip>
            )}
          </>
        )}
      </Pill>

      <input
        ref={fileRef}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </Root>
  );
});
