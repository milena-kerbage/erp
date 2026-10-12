"use client";

/** Requests always wait for the server's persisted result. */
export async function erpRequest<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api/erp${path}`, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });
  const value = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof value?.error === "string" ? value.error : typeof value?.message === "string" ? value.message : "Não foi possível concluir a operação.";
    throw new Error(response.status === 409 ? `${message} Atualize os dados antes de tentar novamente.` : message);
  }
  if (method !== "GET") window.dispatchEvent(new Event("erp:changed"));
  return value as T;
}

export const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Não foi possível concluir a operação.";
