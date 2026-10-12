"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { defaultFunnels, funnelIcons, pickFunnel, type Funnel, type FunnelStage } from "@/features/leads/funnels";
import { erpRequest, errorMessage } from "@/features/erp/client";
import type { ApiKey, ApiScope, IntegrationId, IntegrationState, Member, Permission, Preferences, Webhook } from "./types";

type StoredFunnel = Omit<Funnel, "icon"> & { icon: string; revision: number };
type LiveFunnel = Funnel & { revision?: number };
type WorkspaceSnapshot = { funnels: StoredFunnel[]; preferences: Preferences; revision: number };
const deserializeFunnel = (funnel: StoredFunnel): LiveFunnel => ({ ...funnel, icon: funnelIcons.find(item => item.name === funnel.icon)?.icon ?? funnelIcons[0].icon });
const serializeFunnel = (funnel: Partial<Funnel>) => ({ ...funnel, ...(funnel.icon ? { icon: funnelIcons.find(item => item.icon === funnel.icon)?.name ?? funnelIcons[0].name } : {}) });
const uid = () => crypto.randomUUID();
const slugify = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || uid();
const initialPreferences: Preferences = {
  workspaceName: "Ateliê Milena Kerbage", businessPhone: "", businessEmail: "milenakerbageatelie@gmail.com", city: "Fortaleza, CE", timeZone: "America/Sao_Paulo", weekStart: "sunday", openingTime: "09:00", closingTime: "18:00", saturday: false, enterSends: true, signMessages: false, awayMessage: false, awayText: "", staleLeadDays: 3, autoAssign: false, notifyNewLead: true, notifyNewMessage: true, notifyStaleLead: true, dailySummary: false,
};
const initialIntegrations: Record<IntegrationId, IntegrationState> = { whatsapp: { connected: false }, instagram: { connected: false }, "meta-ads": { connected: false }, "google-calendar": { connected: false }, gmail: { connected: false }, "google-analytics": { connected: false } };

type WorkspaceContextValue = {
  loading: boolean; error: string | null; refresh: () => Promise<void>;
  funnels: readonly LiveFunnel[];
  addFunnel: (funnel: Pick<Funnel, "name" | "icon" | "tone">) => Promise<Funnel | null>;
  updateFunnel: (id: string, patch: Partial<Pick<Funnel, "name" | "icon" | "tone">>) => Promise<boolean>;
  removeFunnel: (id: string) => Promise<boolean>;
  moveFunnel: (id: string, direction: -1 | 1) => Promise<boolean>;
  addStage: (funnelId: string, label: string) => Promise<boolean>;
  updateStage: (funnelId: string, stageId: string, patch: Partial<Omit<FunnelStage, "id">>) => Promise<boolean>;
  removeStage: (funnelId: string, stageId: string) => Promise<boolean>;
  moveStage: (funnelId: string, stageId: string, to: number) => Promise<boolean>;
  members: readonly Member[]; currentUser: Member;
  inviteMember: (member: Pick<Member, "name" | "email" | "role" | "permission">) => Promise<string | null>;
  reissueInvitation: (id: string) => Promise<string | null>;
  updateMember: (id: string, patch: Partial<Omit<Member, "id">>) => Promise<boolean>;
  removeMember: (id: string) => Promise<boolean>;
  preferences: Preferences; updatePreferences: (patch: Partial<Preferences>) => Promise<boolean>;
  integrations: Record<IntegrationId, IntegrationState>;
  apiKeys: readonly ApiKey[];
  createApiKey: (name: string, scope: ApiScope) => Promise<string | null>;
  revokeApiKey: (id: string) => Promise<boolean>;
  webhooks: readonly Webhook[];
  addWebhook: (webhook: Pick<Webhook, "url" | "events">) => Promise<string | null>;
  updateWebhook: (id: string, patch: Pick<Partial<Webhook>, "url" | "events" | "active">) => Promise<boolean>;
  removeWebhook: (id: string) => Promise<boolean>;
  testWebhook: (id: string) => Promise<boolean>;
};
const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/** Configuration is refreshed from authenticated backend snapshots; client state never grants permissions. */
export function WorkspaceProvider({ children, authenticatedUser }: { children: ReactNode; authenticatedUser: { id: string; name: string; email: string } }) {
  const [funnels, setFunnels] = useState<readonly LiveFunnel[]>(defaultFunnels);
  const [members, setMembers] = useState<readonly Member[]>([]);
  const [currentUser, setCurrentUser] = useState<Member>({ ...authenticatedUser, seed: authenticatedUser.id, role: "", permission: "member", status: "active", joinedAt: "" });
  const [preferences, setPreferences] = useState(initialPreferences);
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [apiKeys, setApiKeys] = useState<readonly ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<readonly Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);

  const loadWorkspace = useCallback(async () => {
    const snapshot = await erpRequest<WorkspaceSnapshot>("/workspace");
    if (!snapshot.funnels?.length) throw new Error("O servidor não retornou os funis do ateliê.");
    setFunnels(snapshot.funnels.map(deserializeFunnel)); setPreferences(snapshot.preferences); revision.current = snapshot.revision;
  }, []);
  const loadTeam = useCallback(async () => {
    const snapshot = await erpRequest<{ members: Member[]; currentUser: Member }>("/team");
    setMembers(snapshot.members); setCurrentUser(snapshot.currentUser);
    return snapshot.currentUser;
  }, []);
  const loadTools = useCallback(async () => {
    const results = await Promise.allSettled([erpRequest<{ apiKeys: ApiKey[] }>("/api-keys"), erpRequest<{ webhooks: Webhook[] }>("/webhooks")]);
    if (results[0].status === "fulfilled") setApiKeys(results[0].value.apiKeys);
    if (results[1].status === "fulfilled") setWebhooks(results[1].value.webhooks);
    const failed = results.find(result => result.status === "rejected");
    if (failed?.status === "rejected") throw failed.reason;
  }, []);
  const refresh = useCallback(async () => {
    setError(null);
    try {
      const results = await Promise.allSettled([loadWorkspace(), loadTeam()]);
      const failed = results.find(result => result.status === "rejected");
      if (failed?.status === "rejected") throw failed.reason;
      if (results[1].status === "fulfilled" && results[1].value.permission === "admin") await loadTools();
      const response = await fetch("/api/whatsapp/status", { cache: "no-store" });
      if (response.ok) {
        const status = await response.json();
        setIntegrations({ ...initialIntegrations, whatsapp: { connected: Boolean(status.configured), account: status.phone?.display_phone_number } });
      }
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setLoading(false); }
  }, [loadWorkspace, loadTeam, loadTools]);
  useEffect(() => { void refresh(); }, [refresh]);

  const mutate = useCallback(async <T,>(action: () => Promise<T>): Promise<T | null> => {
    setError(null);
    try { return await action(); }
    catch (cause) { setError(errorMessage(cause)); return null; }
  }, []);
  const funnelPatch = useCallback(async (id: string, patch: Partial<Funnel>) => {
    const current = funnels.find(item => item.id === id);
    if (!current) return false;
    return (await mutate(async () => { await erpRequest(`/funnels/${encodeURIComponent(id)}`, "PATCH", { revision: current.revision, funnel: serializeFunnel(patch) }); await loadWorkspace(); return true; })) ?? false;
  }, [funnels, mutate, loadWorkspace]);
  const addFunnel = useCallback<WorkspaceContextValue["addFunnel"]>(input => mutate(async () => {
    const response = await erpRequest<{ funnel: StoredFunnel }>("/funnels", "POST", { funnel: { ...serializeFunnel(input), stages: [{ id: "novo", label: "Novo lead", tone: "blue" }, { id: "contato", label: "Em contato", tone: "lavender" }, { id: "fechado", label: "Fechado", tone: "green" }] } });
    await loadWorkspace(); return deserializeFunnel(response.funnel);
  }), [mutate, loadWorkspace]);
  const removeFunnel = useCallback(async (id: string) => (await mutate(async () => { await erpRequest(`/funnels/${encodeURIComponent(id)}?revision=${funnels.find(item => item.id === id)?.revision}`, "DELETE"); await loadWorkspace(); return true; })) ?? false, [funnels, mutate, loadWorkspace]);
  const moveFunnel = useCallback(async (id: string, direction: -1 | 1) => {
    const index = funnels.findIndex(item => item.id === id); const target = index + direction;
    if (index < 0 || target < 0 || target >= funnels.length) return false;
    const order = funnels.map(item => item.id); [order[index], order[target]] = [order[target], order[index]];
    return (await mutate(async () => { await erpRequest("/funnels/reorder", "POST", { revision: revision.current, ids: order }); await loadWorkspace(); return true; })) ?? false;
  }, [funnels, mutate, loadWorkspace]);
  const editStages = useCallback(async (id: string, edit: (stages: readonly FunnelStage[]) => readonly FunnelStage[]) => {
    const current = funnels.find(item => item.id === id); return current ? funnelPatch(id, { stages: edit(current.stages) }) : false;
  }, [funnels, funnelPatch]);
  const addStage = useCallback((id: string, label: string) => editStages(id, stages => [...stages, { id: `${slugify(label)}-${uid().slice(0, 6)}`, label, tone: "neutral" }]), [editStages]);
  const updateStage = useCallback<WorkspaceContextValue["updateStage"]>((id, stageId, patch) => editStages(id, stages => stages.map(stage => stage.id === stageId ? { ...stage, ...patch } : stage)), [editStages]);
  const removeStage = useCallback((id: string, stageId: string) => editStages(id, stages => stages.filter(stage => stage.id !== stageId)), [editStages]);
  const moveStage = useCallback((id: string, stageId: string, to: number) => editStages(id, stages => {
    const next = [...stages]; const from = next.findIndex(stage => stage.id === stageId);
    if (from < 0 || to < 0 || to >= stages.length) return stages;
    const [stage] = next.splice(from, 1); next.splice(to, 0, stage); return next;
  }), [editStages]);
  const inviteMember = useCallback<WorkspaceContextValue["inviteMember"]>(input => mutate(async () => {
    const response = await erpRequest<{ inviteUrl: string }>("/team", "POST", input);
    try { await loadTeam(); }
    catch (cause) { setError(`O convite foi criado. Copie o link de ativação agora; a listagem ainda precisa ser atualizada. ${errorMessage(cause)}`); }
    return response.inviteUrl;
  }), [mutate, loadTeam]);
  const reissueInvitation = useCallback((id: string) => mutate(async () => {
    const response = await erpRequest<{ inviteUrl: string }>(`/team/${encodeURIComponent(id)}/invite`, "POST", {});
    try { await loadTeam(); }
    catch (cause) { setError(`O convite foi reemitido. Copie o novo link agora; a listagem ainda precisa ser atualizada. ${errorMessage(cause)}`); }
    return response.inviteUrl;
  }), [mutate, loadTeam]);
  const updateMember = useCallback<WorkspaceContextValue["updateMember"]>((id, patch) => mutate(async () => {
    await erpRequest(id === authenticatedUser.id && patch.permission === undefined && patch.status === undefined ? "/profile" : `/team/${encodeURIComponent(id)}`, "PATCH", patch); await loadTeam(); return true;
  }).then(Boolean), [mutate, loadTeam, authenticatedUser.id]);
  const removeMember = useCallback((id: string) => mutate(async () => { await erpRequest(`/team/${encodeURIComponent(id)}`, "DELETE"); await loadTeam(); return true; }).then(Boolean), [mutate, loadTeam]);
  const updatePreferences = useCallback((patch: Partial<Preferences>) => mutate(async () => { await erpRequest("/preferences", "PATCH", { revision: revision.current, preferences: patch }); await loadWorkspace(); return true; }).then(Boolean), [mutate, loadWorkspace]);
  const createApiKey = useCallback((name: string, scope: ApiScope) => mutate(async () => {
    const value = await erpRequest<{ key: string }>("/api-keys", "POST", { name, scope });
    try { await loadTools(); }
    catch (cause) { setError(`A chave foi criada. Copie o segredo agora; a listagem ainda precisa ser atualizada. ${errorMessage(cause)}`); }
    return value.key;
  }), [mutate, loadTools]);
  const revokeApiKey = useCallback((id: string) => mutate(async () => { await erpRequest(`/api-keys/${encodeURIComponent(id)}`, "DELETE"); await loadTools(); return true; }).then(Boolean), [mutate, loadTools]);
  const addWebhook = useCallback<WorkspaceContextValue["addWebhook"]>(input => mutate(async () => {
    const value = await erpRequest<{ secret: string }>("/webhooks", "POST", input);
    try { await loadTools(); }
    catch (cause) { setError(`O webhook foi criado. Copie o segredo agora; a listagem ainda precisa ser atualizada. ${errorMessage(cause)}`); }
    return value.secret;
  }), [mutate, loadTools]);
  const updateWebhook = useCallback<WorkspaceContextValue["updateWebhook"]>((id, patch) => mutate(async () => { await erpRequest(`/webhooks/${encodeURIComponent(id)}`, "PATCH", patch); await loadTools(); return true; }).then(Boolean), [mutate, loadTools]);
  const removeWebhook = useCallback((id: string) => mutate(async () => { await erpRequest(`/webhooks/${encodeURIComponent(id)}`, "DELETE"); await loadTools(); return true; }).then(Boolean), [mutate, loadTools]);
  const testWebhook = useCallback((id: string) => mutate(async () => {
    const result = await erpRequest<{ ok: boolean; status: number | null; error?: string }>(`/webhooks/${encodeURIComponent(id)}/test`, "POST", { confirmation: "TESTAR" });
    await loadTools();
    if (!result.ok) throw new Error(typeof result.error === "string" ? result.error.slice(0, 500) : result.status ? `O destino recusou a entrega com HTTP ${result.status}.` : "O destino não confirmou a entrega do teste.");
    return true;
  }).then(Boolean), [mutate, loadTools]);
  const value: WorkspaceContextValue = { loading, error, refresh, funnels, addFunnel, updateFunnel: funnelPatch, removeFunnel, moveFunnel, addStage, updateStage, removeStage, moveStage, members, currentUser, inviteMember, reissueInvitation, updateMember, removeMember, preferences, updatePreferences, integrations, apiKeys, createApiKey, revokeApiKey, webhooks, addWebhook, updateWebhook, removeWebhook, testWebhook };
  return <WorkspaceContext.Provider value={value}>{error && <div role="alert" style={{ padding: "1rem", background: "#fff1ef", color: "#8b2920" }}>Dados do ateliê: {error} <button type="button" onClick={() => void refresh()}>Atualizar dados</button></div>}{children}</WorkspaceContext.Provider>;
}
export function useWorkspace() { const context = useContext(WorkspaceContext); if (!context) throw new Error("useWorkspace precisa estar dentro de <WorkspaceProvider>"); return context; }
export function useFunnels() { const { funnels } = useWorkspace(); const findFunnel = useCallback((id: string | undefined) => pickFunnel(funnels, id), [funnels]); return { funnels, findFunnel }; }
export function useTeam() { const { members } = useWorkspace(); return useMemo(() => members.filter(member => member.status === "active"), [members]); }
export function useCurrentUser() { return useContext(WorkspaceContext)?.currentUser ?? null; }
export const permissionLabels: Record<Permission, { label: string; description: string }> = {
  admin: { label: "Admin", description: "Acesso total, incluindo configurações" }, manager: { label: "Gestão", description: "Gestão operacional do ateliê" }, member: { label: "Equipe", description: "Leads, conversas e clientes do dia a dia" },
};
