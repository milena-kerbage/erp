/** Endereço público, sem credenciais. Vazio mantém os arquivos locais. */
export function origemDaMidia(value = process.env.NEXT_PUBLIC_LOJA_MEDIA_ORIGIN ?? ''): string {
  if (!value.trim()) return '';
  const url = new URL(value.trim());
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('NEXT_PUBLIC_LOJA_MEDIA_ORIGIN deve ser uma origem HTTPS, sem caminho, credenciais ou parâmetros.');
  }
  return url.origin;
}
