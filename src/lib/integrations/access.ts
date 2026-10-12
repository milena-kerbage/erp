/** Permissões reais de gestão; não utiliza o perfil demonstrativo da interface. */
export function managerEmails() {
  return new Set((process.env.INTEGRATION_MANAGER_EMAILS || '').split(',').map(value => value.trim().toLowerCase()).filter(value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)));
}
export function allowedManager(email: string) { return managerEmails().has(email.trim().toLowerCase()); }
export function loopbackOrigin(url: string) {
  try { return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname); } catch { return false; }
}
