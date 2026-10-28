/** Permissões reais de gestão; não utiliza o perfil demonstrativo da interface. */
export function managerEmails() {
  return new Set((process.env.INTEGRATION_MANAGER_EMAILS || '').split(',').map(value => value.trim().toLowerCase()).filter(value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)));
}
export function allowedManager(email: string) { return managerEmails().has(email.trim().toLowerCase()); }
/** Administração do ERP gerencia pelo papel persistido; a allowlist do ambiente estende a gestão a perfis de gestão. */
export function managerDenial(permission: string, email: string) {
  if (permission === 'admin') return null;
  if (permission !== 'manager') return 'A gestão de integrações exige perfil de administração ou gestão.';
  return allowedManager(email) ? null : 'Seu perfil de gestão não foi autorizado para integrações. Um administrador deve incluir seu e-mail em INTEGRATION_MANAGER_EMAILS.';
}
export function loopbackOrigin(url: string) {
  try { return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname); } catch { return false; }
}
