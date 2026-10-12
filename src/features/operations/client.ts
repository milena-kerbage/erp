export class ErpRequestError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = "ErpRequestError";
  }
}

export async function erpRequest<T>(path: string, options: { method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const response = await fetch(`/api/erp/${path}`, {
    method: options.method ?? (options.body === undefined ? "GET" : "POST"),
    credentials: "same-origin",
    cache: "no-store",
    signal: options.signal,
    headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const result = await response.json().catch(() => null) as (T & { error?: string; code?: string }) | null;
  if (!response.ok) throw new ErpRequestError(response.status === 401 ? "Sua sessão expirou. Entre novamente para continuar." : result?.error || `Não foi possível concluir a solicitação (HTTP ${response.status}).`, response.status, result?.code);
  if (!result) throw new ErpRequestError("O servidor retornou uma resposta inválida.", response.status);
  if (options.body !== undefined || options.method === "DELETE") window.dispatchEvent(new Event("erp:changed"));
  return result;
}

export const requestError = (error: unknown) => error instanceof Error ? error.message : "Não foi possível concluir a operação.";
