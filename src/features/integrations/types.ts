import type { IntegrationEndpoint } from "./catalog";

export type ManagerSecretKey = "accessToken" | "appSecret" | "verifyToken" | "suppressionSecret";

export type ManagerValues = {
  graphVersion: string;
  appId: string;
  phoneNumberId: string;
  businessAccountId: string;
  publicBaseUrl: string;
  retentionDays: number;
  legalEntityName: string;
  legalCnpj: string;
  legalAddress: string;
  legalPrivacyEmail: string;
  legalSupportEmail: string;
  legalWhatsAppPhone: string;
};

export type ManagerConfiguration = {
  values: ManagerValues;
  secrets: Record<ManagerSecretKey, { configured: boolean; source: "database" | "environment" | "none"; updatedAt?: string | null }>;
  editable: boolean;
  storageReady: boolean;
  encryptionReady: boolean;
  configured: boolean;
  checks?: { key: string; label: string; configured: boolean; detail?: string }[];
};

export type ManagerStageStatus = "pending" | "in_progress" | "complete" | "blocked";
export type ManagerStage = {
  id: string;
  title: string;
  description: string;
  status: ManagerStageStatus;
  note?: string;
  required?: boolean;
  externalUrl?: string;
  automatic?: boolean;
  updatedAt?: string;
};

export type ManagerRoute = IntegrationEndpoint;

export type ManagerOverview = {
  canManage?: boolean;
  bootstrap: { key: string; label: string; ready: boolean; detail?: string }[];
  stages: ManagerStage[];
  routes: ManagerRoute[];
  progress: { complete: number; total: number };
  environment?: { production?: boolean; storage?: { backend: string; configured: boolean; persistent: boolean }; publicBaseUrl?: string; localBootstrapAvailable?: boolean; managementMode?: "development" | "session" };
  recentTests?: ManagerTestResult[];
  oauth?: { available: boolean; callbackUrl?: string; reason?: string };
};

export type ManagerTestName = "database" | "webhook" | "public-routes" | "meta" | "templates" | "token" | "retention";
export type ManagerTestResult = {
  id?: string;
  test: ManagerTestName;
  ok: boolean;
  summary: string;
  details?: string[];
  checkedAt: string;
};

export type ManagerEvent = { id: string; kind: string; level: "info" | "warning" | "error" | "success"; message: string; createdAt: string; actor?: string };
export type ManagerDeletion = { code: string; status: "pending_review" | "completed" | "no_matching_data"; requestedAt: string; completedAt?: string | null };
