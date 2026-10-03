/**
 * Copia um texto. Usa a API de área de transferência e, se o navegador negar
 * (sem permissão, página sem foco), cai para o método antigo. Devolve se deu
 * certo, para a interface só confirmar quando copiou de fato.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
