/** Public, non-secret responses exposed by the server-side WhatsApp integration. */
export type WhatsAppConsent = {
  status: "granted" | "revoked" | "unknown";
  source: string | null;
  updatedAt: string | null;
};

export type WhatsAppConversation = {
  phone: string;
  name: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  serviceWindowExpiresAt: string | null;
  consent: WhatsAppConsent;
  optedOut: boolean;
};

export type WhatsAppMessage = {
  id: string;
  phone: string;
  direction: "inbound" | "outbound";
  type: string;
  text: string;
  status: string;
  createdAt: string;
  isRead?: boolean;
  error?: string | null;
  mediaId?: string;
  mimeType?: string;
  filename?: string;
};

export type WhatsAppTemplateComponent = {
  type: string;
  format?: string;
  text?: string;
  buttons?: { type: string; text?: string; url?: string }[];
};

export type WhatsAppTemplate = {
  id?: string;
  name: string;
  language: string;
  status: string;
  category?: string;
  parameter_format?: "NAMED" | "POSITIONAL";
  components?: WhatsAppTemplateComponent[];
};

export type WhatsAppStatus = {
  ready: boolean;
  configured: boolean;
  checks: { key: string; label: string; configured: boolean; detail?: string }[];
  urls: Record<string, string | boolean | null | undefined>;
  phoneNumberId?: string;
  businessAccountId?: string;
  apiVersion?: string | null;
  authMode?: "development" | "session";
  retentionDays?: number;
  storage?: { backend: 'postgres' | 'sqlite'; configured: boolean; persistent: boolean };
  mediaMaximumBytes?: number;
  unreadConversations?: number;
  lastWebhookAt?: string | null;
  remote?: {
    ok: boolean;
    phoneNumber?: { displayPhoneNumber?: string; verifiedName?: string; qualityRating?: string };
    subscriptions?: unknown;
    error?: string;
  };
};

export type WhatsAppSendPayload = {
  phone: string;
  clientRequestId: string;
} & (
  | { type: "text"; text: string }
  | { type: "template"; template: { name: string; language: string; components?: { type: "body"; parameters: { type: "text"; text: string }[] }[] } }
);
