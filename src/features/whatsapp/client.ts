export class WhatsAppRequestError extends Error {
  readonly status: number;
  readonly code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "WhatsAppRequestError";
    this.status = status;
    this.code = code;
  }
}

/** Auth uses the same-origin HttpOnly session; Meta credentials stay on the server. */
export async function whatsappRequest<T>(path: string, options: { body?: unknown; signal?: AbortSignal; method?: "GET" | "POST" | "PUT" | "DELETE" } = {}): Promise<T> {
  const response = await fetch(`/api/whatsapp/${path}`, {
    method: options.method ?? (options.body === undefined ? "GET" : "POST"),
    credentials: "same-origin",
    cache: "no-store",
    signal: options.signal,
    headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const data = await response.json().catch(() => null) as T & { error?: string; code?: string } | null;
  if (!response.ok) {
    throw new WhatsAppRequestError(
      response.status === 401 ? "Sua sessão expirou. Entre novamente para continuar." : data?.error || `A solicitação falhou (HTTP ${response.status}).`,
      response.status,
      data?.code,
    );
  }
  if (!data) throw new WhatsAppRequestError("O servidor retornou uma resposta inválida.", response.status);
  if (options.body !== undefined && typeof window !== "undefined") window.dispatchEvent(new Event("whatsapp:changed"));
  return data;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível concluir a solicitação.";
}

export function normalizeWhatsAppPhone(value: string): string | null {
  const digits = value.replace(/[\s()+.-]/g, "");
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}
