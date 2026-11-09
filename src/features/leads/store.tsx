"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFunnels } from "@/features/settings/store";
import { useWhatsAppUnread } from "@/features/whatsapp/unread";
import { erpRequest, errorMessage } from "@/features/erp/client";
import type { LeadQuery, LeadPage } from "./query";
import type { Attachment, ChatMessage, ConversationStatus, Lead, LeadDetails, Person } from "./types";

type Snapshot = { leads: Lead[]; details: Record<string, LeadDetails>; messages: Record<string, ChatMessage[]>; statuses: Record<string, ConversationStatus> };
type LeadInput = Omit<Lead, "id" | "createdAt" | "revision">;
type LeadsContextValue = Snapshot & {
  loading: boolean; error: string | null; refresh: () => Promise<void>;
  configureList: (query: LeadQuery) => void; loadMore: () => Promise<void>; listIds: string[]; pagination: LeadPage["pagination"]; byStage: LeadPage["byStage"]; hydrate: (id: string) => Promise<void>;
  createLead: (lead: LeadInput, details?: Partial<LeadDetails>) => Promise<Lead | null>;
  archiveLead: (id: string) => Promise<boolean>;
  moveLead: (id: string, stage: string, by: string) => Promise<boolean>;
  sendMessage: (id: string, message: { kind: ChatMessage["kind"]; text: string; attachments: File[]; author: Person }) => Promise<boolean>;
  addAttachments: (id: string, files: FileList | File[], by: string) => Promise<boolean>;
  removeAttachment: (id: string, attachmentId: string) => Promise<boolean>;
  setOwner: (id: string, owner: Person) => Promise<boolean>;
  updateLead: (id: string, patch: Partial<Omit<Lead, "id" | "funnelId" | "stage">>) => Promise<boolean>;
  updateDetails: (id: string, patch: Partial<LeadDetails>, by?: string) => Promise<boolean>;
  changeFunnel: (id: string, funnelId: string, by: string) => Promise<boolean>;
  unread: Record<string, number>; markRead: (id: string) => void;
  setConversationStatus: (id: string, status: ConversationStatus, by: string) => Promise<boolean>;
};
const LeadsContext = createContext<LeadsContextValue | null>(null);
const emptySnapshot: Snapshot = { leads: [], details: {}, messages: {}, statuses: {} };

/** CRM data comes from the database; notes and attachment uploads remain internal to the atelier. */
export function LeadsProvider({ children }: { children: ReactNode }) {
  const { findFunnel } = useFunnels();
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const live = useRef(snapshot);
  const queues = useRef(new Map<string, Promise<unknown>>());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryRef = useRef<LeadQuery>({});
  const listing = useRef(false);
  const generation = useRef(0);
  const hydrated = useRef(new Set<string>());
  const inflight = useRef(new Map<string, Promise<void>>());
  const [listIds, setListIds] = useState<string[]>([]);
  const [pagination, setPagination] = useState<LeadPage["pagination"]>({limit:50,offset:0,total:0,hasMore:false});
  const [byStage,setByStage] = useState<LeadPage["byStage"]>([]);
  const pageRef = useRef(pagination); pageRef.current = pagination;
  const listRef = useRef(listIds); listRef.current = listIds;
  const load = useCallback(async (append = false) => {
    const version = ++generation.current;
    setLoading(true);
    const offset = append ? listRef.current.length : 0;
    try {
      const params = new URLSearchParams({summary:"1",limit:"50",offset:String(offset),filter:JSON.stringify(queryRef.current)});
      if(append){params.set("totals","0");if(pageRef.current.nextCursor)params.set("cursor",pageRef.current.nextCursor);}
      const page = await erpRequest<LeadPage>(`/leads?${params}`);
      if (version !== generation.current) return;
      const previous = live.current;
      const ids = append ? [...new Set([...listRef.current,...page.leads.map(lead=>lead.id)])] : page.leads.map(lead=>lead.id);
      // Somente fichas abertas preservam histórico; listagens mantêm resumos pequenos.
      const keep = append ? previous.leads : previous.leads.filter(lead=>hydrated.current.has(lead.id));
      const leads = new Map(keep.map(lead=>[lead.id,lead]));
      for(const lead of page.leads) leads.set(lead.id,lead);
      const next: Snapshot = {leads:[...leads.values()],details:{...(append?previous.details:{}),...page.details},messages:{...(append?previous.messages:{}),...page.messages},statuses:{...(append?previous.statuses:{}),...page.statuses}};
      for(const id of hydrated.current) if(previous.details[id]) {next.details[id]=previous.details[id];next.messages[id]=previous.messages[id];next.statuses[id]=previous.statuses[id];}
      live.current=next;setSnapshot(next);listRef.current=ids;setListIds(ids);setPagination({...page.pagination,total:page.pagination.total??pageRef.current.total});if(!append)setByStage(page.byStage);
    } finally { if(version===generation.current)setLoading(false); }
  }, []);
  const refresh = useCallback(async () => {
    setError(null);
    try { await load(); } catch (cause) { setError(errorMessage(cause)); }
  }, [load]);
  const configureList = useCallback((query: LeadQuery) => {queryRef.current=query;listing.current=true;void refresh();},[refresh]);
  const loadMore = useCallback(async()=>{if(loading||!pageRef.current.hasMore)return;setError(null);try{await load(true);}catch(cause){setError(errorMessage(cause));}},[load,loading]);
  const hydrate = useCallback(async(id:string)=>{
    if(hydrated.current.has(id)) return;
    const pending=inflight.current.get(id);if(pending)return pending;
    const task=(async()=>{
      setLoading(true);setError(null);
      try{
        const entry=await erpRequest<{lead:Lead;details:LeadDetails;messages:ChatMessage[];status:ConversationStatus}>(`/leads/${encodeURIComponent(id)}`);
        hydrated.current.add(id);if(hydrated.current.size>10)hydrated.current.delete(hydrated.current.values().next().value!);
        const current=live.current;
        const next={leads:[...current.leads.filter(lead=>lead.id!==id),entry.lead],details:{...current.details,[id]:entry.details},messages:{...current.messages,[id]:entry.messages},statuses:{...current.statuses,[id]:entry.status}};
        live.current=next;setSnapshot(next);
      }catch(cause){setError(errorMessage(cause));}finally{inflight.current.delete(id);setLoading(false);}
    })();inflight.current.set(id,task);return task;
  },[]);
  const mutate = useCallback(async <T,>(key: string, action: () => Promise<T>, archived = false): Promise<T | null> => {
    const before = queues.current.get(key) ?? Promise.resolve();
    const task = before.catch(() => undefined).then(async () => {
      setError(null);
      try {
        const value = await action();
        if (key === "create") await load();
        else if (archived) {
          const next = { ...live.current, leads: live.current.leads.filter(lead => lead.id !== key), details: {...live.current.details}, messages: {...live.current.messages}, statuses: {...live.current.statuses} };
          delete next.details[key]; delete next.messages[key]; delete next.statuses[key]; hydrated.current.delete(key);
          setListIds(ids=>ids.filter(id=>id!==key)); setPagination(page=>({...page,total:Math.max(0,(page.total??0)-1)}));
          live.current = next; setSnapshot(next);
        } else {
          // O servidor retorna a ficha canônica completa. Atualizar uma etapa/nota/anexo não
          // precisa transferir novamente os clientes e históricos de todo o CRM.
          const entry = await erpRequest<{lead: Lead; details: LeadDetails; messages: ChatMessage[]; status: ConversationStatus}>(`/leads/${encodeURIComponent(key)}`);
          hydrated.current.add(key);if(hydrated.current.size>10)hydrated.current.delete(hydrated.current.values().next().value!);
          const current = live.current;
          const next = {leads: [entry.lead, ...current.leads.filter(lead => lead.id !== key)], details: {...current.details, [key]: entry.details}, messages: {...current.messages, [key]: entry.messages}, statuses: {...current.statuses, [key]: entry.status}};
          live.current = next; setSnapshot(next);
        }
        if(key!=="create"&&listing.current)await load();
        return value;
      }
      catch (cause) { setError(errorMessage(cause)); return null; }
    });
    queues.current.set(key, task);
    try { return await task; } finally { if (queues.current.get(key) === task) queues.current.delete(key); }
  }, [load]);
  const patchLead = useCallback((id: string, patch: unknown) => mutate(id, async () => {
    const current = live.current.leads.find(item => item.id === id);
    if (!current) throw new Error("O lead não está disponível. Atualize os dados.");
    await erpRequest(`/leads/${encodeURIComponent(id)}`, "PATCH", { revision: current.revision, ...patch as object }); return true;
  }).then(Boolean), [mutate]);
  const createLead = useCallback<LeadsContextValue["createLead"]>((lead, details) => mutate("create", async () => {
    const value = await erpRequest<{ lead: Lead }>("/leads", "POST", { lead, details }); return value.lead;
  }), [mutate]);
  const archiveLead = useCallback((id: string) => mutate(id, async () => {
    const current = live.current.leads.find(item => item.id === id);
    await erpRequest(`/leads/${encodeURIComponent(id)}?revision=${current?.revision}`, "DELETE"); return true;
  }, true).then(Boolean), [mutate]);
  const moveLead = useCallback((id: string, stage: string) => patchLead(id, { lead: { stage } }), [patchLead]);
  const updateLead = useCallback<LeadsContextValue["updateLead"]>((id, lead) => patchLead(id, { lead }), [patchLead]);
  const updateDetails = useCallback<LeadsContextValue["updateDetails"]>((id, details) => patchLead(id, { details }), [patchLead]);
  const setOwner = useCallback((id: string, owner: Person) => patchLead(id, { details: { owner } }), [patchLead]);
  const changeFunnel = useCallback((id: string, funnelId: string) => patchLead(id, { lead: { funnelId, stage: findFunnel(funnelId).stages[0]?.id } }), [patchLead, findFunnel]);
  const setConversationStatus = useCallback((id: string, status: ConversationStatus) => patchLead(id, { status }), [patchLead]);
  const upload = useCallback(async (id: string, files: File[]) => {
    if (files.length > 10) throw new Error("Selecione até 10 arquivos por envio.");
    const attachments: Attachment[] = [];
    for (const file of files) {
      if (file.size > 3 * 1024 * 1024) throw new Error(`${file.name}: limite de 3 MB por arquivo.`);
      const body = new FormData(); body.append("file", file);
      const response = await erpRequest<{ attachment: Attachment }>(`/leads/${encodeURIComponent(id)}/attachments`, "POST", body);
      attachments.push(response.attachment);
    }
    return attachments;
  }, []);
  const addAttachments = useCallback<LeadsContextValue["addAttachments"]>((id, files) => mutate(id, async () => { await upload(id, Array.from(files)); return true; }).then(Boolean), [mutate, upload]);
  const removeAttachment = useCallback((id: string, attachmentId: string) => mutate(id, async () => { await erpRequest(`/leads/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachmentId)}`, "DELETE"); return true; }).then(Boolean), [mutate]);
  const sendMessage = useCallback<LeadsContextValue["sendMessage"]>((id, input) => mutate(id, async () => {
    if (input.kind !== "note") throw new Error("Para enviar ao WhatsApp, abra o atendimento em Conversas. Este campo registra notas internas.");
    if (input.text.length > 10_000) throw new Error("A nota precisa ter até 10.000 caracteres.");
    const attachments = await upload(id, input.attachments);
    await erpRequest(`/leads/${encodeURIComponent(id)}/notes`, "POST", { text: input.text, attachmentIds: attachments.map(item => item.id) }); return true;
  }).then(Boolean), [mutate, upload]);
  const markRead = useCallback(() => {}, []);
  const unread = useMemo<Record<string, number>>(() => ({}), []);
  const value: LeadsContextValue = { ...snapshot, loading, error, refresh, configureList, loadMore, listIds, pagination, byStage, hydrate, createLead, archiveLead, moveLead, sendMessage, addAttachments, removeAttachment, setOwner, updateLead, updateDetails, changeFunnel, unread, markRead, setConversationStatus };
  return <LeadsContext.Provider value={value}>{error && <div role="alert" style={{ padding: "1rem", background: "#fff1ef", color: "#8b2920" }}>CRM: {error} <button type="button" onClick={() => void refresh()}>Atualizar dados</button></div>}{children}</LeadsContext.Provider>;
}
export function useLeads() { const context = useContext(LeadsContext); if (!context) throw new Error("useLeads precisa estar dentro de <LeadsProvider>"); return context; }
export function useUnreadConversations() { return useWhatsAppUnread(); }
/** Files are uploaded by the provider before they are attached to the saved note. */
export function composerAttachments({ files, audio }: { files: File[]; audio?: { file: File; duration: number } }): File[] { return [...files, ...(audio ? [audio.file] : [])]; }
