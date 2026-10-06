'use client';
export async function authRequest(action: string, body: Record<string, unknown> = {}) {
  const response = await fetch(`/api/auth/${action}`, {method: 'POST', headers: {'Content-Type': 'application/json'}, credentials: 'same-origin', cache: 'no-store', body: JSON.stringify(body)});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Não foi possível concluir. Tente novamente.');
  return result;
}
export async function logout() {
  try { await authRequest('logout'); window.location.replace('/login'); }
  catch { window.alert('Não foi possível encerrar a sessão. Tente novamente.'); }
}
