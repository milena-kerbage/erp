"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { defaultFunnels, pickFunnel, type Funnel, type FunnelStage } from "@/features/leads/funnels";
import {
  currentUserId,
  defaultIntegrations,
  defaultPreferences,
  mockApiKeys,
  mockMembers,
  mockWebhooks,
} from "./mock";
import type {
  ApiKey,
  ApiScope,
  IntegrationId,
  IntegrationState,
  Member,
  Permission,
  Preferences,
  Webhook,
} from "./types";

const uid = () => Math.random().toString(36).slice(2, 10);

/** "Pós-venda VIP" → "pos-venda-vip" (id estável e legível). */
const slugify = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || uid();

/** Segredo aleatório gerado no navegador (hex). */
function randomSecret(bytes: number) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}

type WorkspaceContextValue = {
  /* Funis e etapas */
  funnels: readonly Funnel[];
  addFunnel: (funnel: Pick<Funnel, "name" | "icon" | "tone">) => Funnel;
  updateFunnel: (id: string, patch: Partial<Pick<Funnel, "name" | "icon" | "tone">>) => void;
  removeFunnel: (id: string) => void;
  moveFunnel: (id: string, direction: -1 | 1) => void;
  addStage: (funnelId: string, label: string) => void;
  updateStage: (funnelId: string, stageId: string, patch: Partial<Omit<FunnelStage, "id">>) => void;
  removeStage: (funnelId: string, stageId: string) => void;
  /** Move a etapa para a posição `to` (arrastar ou setas). */
  moveStage: (funnelId: string, stageId: string, to: number) => void;

  /* Equipe */
  members: readonly Member[];
  currentUser: Member;
  inviteMember: (member: Pick<Member, "name" | "email" | "role" | "permission">) => void;
  updateMember: (id: string, patch: Partial<Omit<Member, "id">>) => void;
  removeMember: (id: string) => void;

  /* Preferências */
  preferences: Preferences;
  updatePreferences: (patch: Partial<Preferences>) => void;

  /* Integrações */
  integrations: Record<IntegrationId, IntegrationState>;
  setIntegration: (id: IntegrationId, state: IntegrationState) => void;

  /* API e webhooks */
  apiKeys: readonly ApiKey[];
  /** Cria a chave e devolve o valor completo (mostrado uma única vez). */
  createApiKey: (name: string, scope: ApiScope) => string;
  revokeApiKey: (id: string) => void;
  webhooks: readonly Webhook[];
  addWebhook: (webhook: Pick<Webhook, "url" | "events">) => void;
  updateWebhook: (id: string, patch: Partial<Omit<Webhook, "id">>) => void;
  removeWebhook: (id: string) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/**
 * Estado do ateliê editado em Configurações: funis e etapas, equipe,
 * preferências, integrações, chaves de API e webhooks. Fica no layout do
 * app, então as mudanças aparecem na hora no quadro, nas conversas etc.
 * TODO: trocar pela API quando o back-end existir.
 */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [funnels, setFunnels] = useState<readonly Funnel[]>(defaultFunnels);
  const [members, setMembers] = useState<readonly Member[]>(mockMembers);
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [integrations, setIntegrations] = useState(defaultIntegrations);
  const [apiKeys, setApiKeys] = useState<readonly ApiKey[]>(mockApiKeys);
  const [webhooks, setWebhooks] = useState<readonly Webhook[]>(mockWebhooks);

  const currentUser = members.find((member) => member.id === currentUserId) ?? members[0];

  /* Funis */

  const editFunnel = useCallback((id: string, edit: (funnel: Funnel) => Funnel) => {
    setFunnels((current) => current.map((funnel) => (funnel.id === id ? edit(funnel) : funnel)));
  }, []);

  const addFunnel = useCallback<WorkspaceContextValue["addFunnel"]>(
    (input) => {
      let id = slugify(input.name);
      if (funnels.some((funnel) => funnel.id === id)) id = `${id}-${uid().slice(0, 4)}`;
      const funnel: Funnel = {
        ...input,
        id,
        stages: [
          { id: "novo", label: "Novo lead", tone: "blue" },
          { id: "contato", label: "Em contato", tone: "lavender" },
          { id: "fechado", label: "Fechado", tone: "green" },
        ],
      };
      setFunnels((current) => [...current, funnel]);
      return funnel;
    },
    [funnels],
  );

  const updateFunnel = useCallback<WorkspaceContextValue["updateFunnel"]>(
    (id, patch) => editFunnel(id, (funnel) => ({ ...funnel, ...patch })),
    [editFunnel],
  );

  const removeFunnel = useCallback((id: string) => {
    setFunnels((current) => (current.length > 1 ? current.filter((funnel) => funnel.id !== id) : current));
  }, []);

  const moveFunnel = useCallback((id: string, direction: -1 | 1) => {
    setFunnels((current) => {
      const index = current.findIndex((funnel) => funnel.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const addStage = useCallback(
    (funnelId: string, label: string) =>
      editFunnel(funnelId, (funnel) => {
        let id = slugify(label);
        if (funnel.stages.some((stage) => stage.id === id)) id = `${id}-${uid().slice(0, 4)}`;
        return { ...funnel, stages: [...funnel.stages, { id, label, tone: "neutral" }] };
      }),
    [editFunnel],
  );

  const updateStage = useCallback<WorkspaceContextValue["updateStage"]>(
    (funnelId, stageId, patch) =>
      editFunnel(funnelId, (funnel) => ({
        ...funnel,
        stages: funnel.stages.map((stage) => (stage.id === stageId ? { ...stage, ...patch } : stage)),
      })),
    [editFunnel],
  );

  const removeStage = useCallback(
    (funnelId: string, stageId: string) =>
      editFunnel(funnelId, (funnel) =>
        funnel.stages.length > 1
          ? { ...funnel, stages: funnel.stages.filter((stage) => stage.id !== stageId) }
          : funnel,
      ),
    [editFunnel],
  );

  const moveStage = useCallback(
    (funnelId: string, stageId: string, to: number) =>
      editFunnel(funnelId, (funnel) => {
        const from = funnel.stages.findIndex((stage) => stage.id === stageId);
        if (from < 0 || to < 0 || to >= funnel.stages.length || from === to) return funnel;
        const stages = [...funnel.stages];
        const [stage] = stages.splice(from, 1);
        stages.splice(to, 0, stage);
        return { ...funnel, stages };
      }),
    [editFunnel],
  );

  /* Equipe */

  const inviteMember = useCallback<WorkspaceContextValue["inviteMember"]>((input) => {
    const id = `user-${uid()}`;
    setMembers((current) => [
      ...current,
      { ...input, id, seed: id, status: "invited", joinedAt: new Date().toISOString().slice(0, 10) },
    ]);
  }, []);

  const updateMember = useCallback<WorkspaceContextValue["updateMember"]>((id, patch) => {
    setMembers((current) => current.map((member) => (member.id === id ? { ...member, ...patch } : member)));
  }, []);

  const removeMember = useCallback((id: string) => {
    setMembers((current) => (id === currentUserId ? current : current.filter((member) => member.id !== id)));
  }, []);

  /* Preferências e integrações */

  const updatePreferences = useCallback((patch: Partial<Preferences>) => {
    setPreferences((current) => ({ ...current, ...patch }));
  }, []);

  const setIntegration = useCallback((id: IntegrationId, state: IntegrationState) => {
    setIntegrations((current) => ({ ...current, [id]: state }));
  }, []);

  /* API e webhooks */

  const createApiKey = useCallback(
    (name: string, scope: ApiScope) => {
      const secret = `mk_live_${randomSecret(20)}`;
      setApiKeys((current) => [
        ...current,
        {
          id: uid(),
          name,
          scope,
          prefix: "mk_live_",
          last4: secret.slice(-4),
          createdAt: new Date().toISOString(),
          createdBy: currentUser.name,
        },
      ]);
      return secret;
    },
    [currentUser.name],
  );

  const revokeApiKey = useCallback((id: string) => {
    setApiKeys((current) => current.filter((key) => key.id !== id));
  }, []);

  const addWebhook = useCallback((input: Pick<Webhook, "url" | "events">) => {
    setWebhooks((current) => [
      ...current,
      { ...input, id: uid(), active: true, secret: `whsec_${randomSecret(12)}`, createdAt: new Date().toISOString() },
    ]);
  }, []);

  const updateWebhook = useCallback((id: string, patch: Partial<Omit<Webhook, "id">>) => {
    setWebhooks((current) => current.map((webhook) => (webhook.id === id ? { ...webhook, ...patch } : webhook)));
  }, []);

  const removeWebhook = useCallback((id: string) => {
    setWebhooks((current) => current.filter((webhook) => webhook.id !== id));
  }, []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      funnels,
      addFunnel,
      updateFunnel,
      removeFunnel,
      moveFunnel,
      addStage,
      updateStage,
      removeStage,
      moveStage,
      members,
      currentUser,
      inviteMember,
      updateMember,
      removeMember,
      preferences,
      updatePreferences,
      integrations,
      setIntegration,
      apiKeys,
      createApiKey,
      revokeApiKey,
      webhooks,
      addWebhook,
      updateWebhook,
      removeWebhook,
    }),
    [
      funnels,
      addFunnel,
      updateFunnel,
      removeFunnel,
      moveFunnel,
      addStage,
      updateStage,
      removeStage,
      moveStage,
      members,
      currentUser,
      inviteMember,
      updateMember,
      removeMember,
      preferences,
      updatePreferences,
      integrations,
      setIntegration,
      apiKeys,
      createApiKey,
      revokeApiKey,
      webhooks,
      addWebhook,
      updateWebhook,
      removeWebhook,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace precisa estar dentro de <WorkspaceProvider>");
  return context;
}

/** Funis atuais e a busca por id (cai no primeiro se não existir). */
export function useFunnels() {
  const { funnels } = useWorkspace();
  const findFunnel = useCallback((id: string | undefined) => pickFunnel(funnels, id), [funnels]);
  return { funnels, findFunnel };
}

/** Quem pode ser responsável: equipe ativa (convites pendentes ficam de fora). */
export function useTeam() {
  const { members } = useWorkspace();
  return useMemo(() => members.filter((member) => member.status === "active"), [members]);
}

/** Usuária logada (null fora do provider, ex.: telas sem o app). */
export function useCurrentUser() {
  return useContext(WorkspaceContext)?.currentUser ?? null;
}

export const permissionLabels: Record<Permission, { label: string; description: string }> = {
  admin: { label: "Admin", description: "Acesso total, incluindo configurações" },
  manager: { label: "Gestão", description: "Tudo, menos as configurações do ateliê" },
  member: { label: "Equipe", description: "Leads, conversas e clientes do dia a dia" },
};
