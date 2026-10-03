"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useFunnels } from "@/features/settings/store";
import type {
  Attachment,
  ChatMessage,
  ConversationStatus,
  HistoryEvent,
  Lead,
  LeadDetails,
  Person,
} from "./types";

type LeadsContextValue = {
  leads: Lead[];
  details: Record<string, LeadDetails>;
  messages: Record<string, ChatMessage[]>;
  moveLead: (id: string, stage: string, by: string) => void;
  sendMessage: (
    id: string,
    message: { kind: ChatMessage["kind"]; text: string; attachments: Attachment[]; author: Person },
  ) => void;
  addAttachments: (id: string, files: Attachment[], by: string) => void;
  removeAttachment: (id: string, attachmentId: string) => void;
  setOwner: (id: string, owner: Person) => void;
  /** Edita campos do card (nome, telefone, orçamento, etiquetas...). */
  updateLead: (id: string, patch: Partial<Omit<Lead, "id" | "funnelId" | "stage">>) => void;
  /** Edita dados da ficha (e-mail, evento, origem, links, campanha...). Com `by`, a troca de responsável entra na atividade. */
  updateDetails: (id: string, patch: Partial<LeadDetails>, by?: string) => void;
  /** Leva o lead para outro funil (entra na primeira etapa). */
  changeFunnel: (id: string, funnelId: string, by: string) => void;
  /** Mensagens recebidas ainda não vistas, por lead. */
  unread: Record<string, number>;
  /** Marca a conversa como lida (ao abrir). */
  markRead: (id: string) => void;
  /** Andamento de cada conversa (aberta, em andamento, resolvida). */
  statuses: Record<string, ConversationStatus>;
  setConversationStatus: (id: string, status: ConversationStatus, by: string) => void;
};

const LeadsContext = createContext<LeadsContextValue | null>(null);

const uid = () => Math.random().toString(36).slice(2, 10);

/** Não lidas = mensagens recebidas depois da última resposta ou nota da equipe. */
function countUnread(list: ChatMessage[]) {
  let count = 0;
  for (let index = list.length - 1; index >= 0; index--) {
    const message = list[index];
    if (message.direction === "out") break;
    if (message.direction === "in") count++;
  }
  return count;
}

type LeadsProviderProps = {
  initialLeads: Lead[];
  initialDetails: Record<string, LeadDetails>;
  initialMessages: Record<string, ChatMessage[]>;
  initialStatuses?: Record<string, ConversationStatus>;
  children: ReactNode;
};

/**
 * Estado dos leads compartilhado entre o quadro, a oportunidade e as
 * conversas (fica no layout do app, então sobrevive à navegação entre elas).
 * TODO: trocar pela API quando o back-end existir.
 */
export function LeadsProvider({
  initialLeads,
  initialDetails,
  initialMessages,
  initialStatuses = {},
  children,
}: LeadsProviderProps) {
  const { findFunnel } = useFunnels();
  const [leads, setLeads] = useState(initialLeads);
  const [details, setDetails] = useState(initialDetails);
  const [messages, setMessages] = useState(initialMessages);
  const [unread, setUnread] = useState<Record<string, number>>(() =>
    Object.fromEntries(Object.entries(initialMessages).map(([id, list]) => [id, countUnread(list)])),
  );

  const [statuses, setStatuses] = useState(initialStatuses);

  /** Acrescenta um evento na atividade do lead. */
  const logEvent = useCallback((id: string, event: HistoryEvent) => {
    setDetails((current) => {
      const lead = current[id];
      if (!lead) return current;
      return { ...current, [id]: { ...lead, history: [...lead.history, event] } };
    });
  }, []);

  const setConversationStatus = useCallback<LeadsContextValue["setConversationStatus"]>(
    (id, status, by) => {
      const from = statuses[id] ?? "open";
      if (from === status) return;
      setStatuses((current) => ({ ...current, [id]: status }));
      logEvent(id, { id: uid(), type: "status", from, to: status, at: new Date().toISOString(), by });
    },
    [statuses, logEvent],
  );

  const markRead = useCallback((id: string) => {
    setUnread((current) => (current[id] ? { ...current, [id]: 0 } : current));
  }, []);

  const moveLead = useCallback((id: string, stage: string, by: string) => {
    setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, stage } : lead)));
    setDetails((current) => {
      const lead = current[id];
      if (!lead) return current;
      const event = { id: uid(), type: "stage" as const, stage, at: new Date().toISOString(), by };
      return { ...current, [id]: { ...lead, history: [...lead.history, event] } };
    });
  }, []);

  const sendMessage = useCallback<LeadsContextValue["sendMessage"]>((id, message) => {
    const now = new Date().toISOString();
    const entry: ChatMessage = {
      id: uid(),
      direction: "out",
      kind: message.kind,
      author: message.author,
      text: message.text,
      at: now,
      status: message.kind === "message" ? "sent" : undefined,
      attachments: message.attachments.length > 0 ? message.attachments : undefined,
    };

    setMessages((current) => ({ ...current, [id]: [...(current[id] ?? []), entry] }));
    // Respondeu: a conversa deixa de ter não lidas
    if (message.kind === "message") setUnread((current) => (current[id] ? { ...current, [id]: 0 } : current));
    setDetails((current) => {
      const lead = current[id];
      if (!lead) return current;
      const files = message.attachments.map((file) => ({
        id: uid(),
        type: "file" as const,
        fileName: file.name,
        at: now,
        by: message.author.name,
      }));
      return {
        ...current,
        [id]: {
          ...lead,
          lastContactAt: message.kind === "message" ? now : lead.lastContactAt,
          attachments: [...lead.attachments, ...message.attachments],
          history: [...lead.history, ...files],
        },
      };
    });
  }, []);

  const addAttachments = useCallback((id: string, files: Attachment[], by: string) => {
    setDetails((current) => {
      const lead = current[id];
      if (!lead) return current;
      const events = files.map((file) => ({
        id: uid(),
        type: "file" as const,
        fileName: file.name,
        at: file.addedAt,
        by,
      }));
      return {
        ...current,
        [id]: {
          ...lead,
          attachments: [...lead.attachments, ...files],
          history: [...lead.history, ...events],
        },
      };
    });
  }, []);

  const removeAttachment = useCallback((id: string, attachmentId: string) => {
    setDetails((current) => {
      const lead = current[id];
      if (!lead) return current;
      return {
        ...current,
        [id]: { ...lead, attachments: lead.attachments.filter((file) => file.id !== attachmentId) },
      };
    });
  }, []);

  const setOwner = useCallback((id: string, owner: Person) => {
    setDetails((current) => {
      const lead = current[id];
      if (!lead) return current;
      return { ...current, [id]: { ...lead, owner } };
    });
  }, []);

  const updateLead = useCallback<LeadsContextValue["updateLead"]>((id, patch) => {
    setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead)));
  }, []);

  const updateDetails = useCallback<LeadsContextValue["updateDetails"]>((id, patch, by) => {
    setDetails((current) => {
      const lead = current[id];
      if (!lead) return current;
      const assigned =
        by && patch.owner && patch.owner.seed !== lead.owner.seed
          ? [{ id: uid(), type: "owner" as const, owner: patch.owner.name, at: new Date().toISOString(), by }]
          : [];
      return { ...current, [id]: { ...lead, ...patch, history: [...lead.history, ...assigned] } };
    });
  }, []);

  const changeFunnel = useCallback((id: string, funnelId: string, by: string) => {
    const stage = findFunnel(funnelId).stages[0]?.id ?? "";
    setLeads((current) =>
      current.map((lead) => (lead.id === id ? { ...lead, funnelId, stage } : lead)),
    );
    setDetails((current) => {
      const lead = current[id];
      if (!lead) return current;
      const event = { id: uid(), type: "stage" as const, stage, at: new Date().toISOString(), by };
      return { ...current, [id]: { ...lead, history: [...lead.history, event] } };
    });
  }, [findFunnel]);

  const value = useMemo(
    () => ({
      leads,
      details,
      messages,
      moveLead,
      sendMessage,
      addAttachments,
      removeAttachment,
      setOwner,
      updateLead,
      updateDetails,
      changeFunnel,
      unread,
      markRead,
      statuses,
      setConversationStatus,
    }),
    [
      leads,
      details,
      messages,
      moveLead,
      sendMessage,
      addAttachments,
      removeAttachment,
      setOwner,
      updateLead,
      updateDetails,
      changeFunnel,
      unread,
      markRead,
      statuses,
      setConversationStatus,
    ],
  );

  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>;
}

export function useLeads() {
  const context = useContext(LeadsContext);
  if (!context) throw new Error("useLeads precisa estar dentro de <LeadsProvider>");
  return context;
}

/** Total de conversas com mensagens não lidas (0 fora do provider). */
export function useUnreadConversations() {
  const context = useContext(LeadsContext);
  if (!context) return 0;
  return Object.values(context.unread).filter((count) => count > 0).length;
}

/** Anexos de um envio do compositor (arquivos + áudio gravado, com duração). */
export function composerAttachments({
  files,
  audio,
}: {
  files: File[];
  audio?: { file: File; duration: number };
}): Attachment[] {
  return [
    ...filesToAttachments(files),
    ...(audio
      ? filesToAttachments([audio.file]).map((file) => ({ ...file, duration: audio.duration }))
      : []),
  ];
}

/** Converte arquivos escolhidos pelo usuário em anexos (URL local para abrir). */
export function filesToAttachments(files: FileList | File[]): Attachment[] {
  return Array.from(files).map((file) => ({
    id: uid(),
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
    addedAt: new Date().toISOString(),
    url: URL.createObjectURL(file),
  }));
}
