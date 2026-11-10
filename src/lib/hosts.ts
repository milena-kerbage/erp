// Separação por domínio no mesmo deploy (Vercel):
// - loja (e-commerce): domínio principal, www. e loja. → rotas internas em /loja (src/app/(site)/loja);
// - ERP: app.<domínio> e qualquer outro host (localhost, 127.0.0.1, IP da rede, prévias da Vercel).
// Módulo puro (sem APIs do Next): usado pelo proxy, pelo next.config e pelo robots.txt.

export const DOMINIO = "ateliemilenakerbage.com.br";
export const ORIGEM_LOJA = `https://www.${DOMINIO}`;
export const ORIGEM_ERP = `https://app.${DOMINIO}`;

/** Prefixo interno das rotas da loja; o visitante nunca vê (o proxy reescreve). */
export const PREFIXO_LOJA = "/loja";
/** Pasta pública dos arquivos estáticos da loja (public/vitrine). */
export const PASTA_PUBLICA_LOJA = "/vitrine";

// Em desenvolvimento a loja abre em http://www.localhost:3000 (o navegador resolve *.localhost
// para a própria máquina) e o ERP continua em http://localhost:3000, origem do AUTH_ORIGIN.
const HOSTS_PADRAO = [DOMINIO, `www.${DOMINIO}`, `loja.${DOMINIO}`, "www.localhost", "loja.localhost"];

type Ambiente = Record<string, string | undefined>;

/** Hosts da loja: os padrões mais os de LOJA_HOSTS (lista separada por vírgula, ex.: prévia própria). */
export function hostsDaLoja(ambiente: Ambiente = process.env): string[] {
  const extras = (ambiente.LOJA_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...HOSTS_PADRAO, ...extras])];
}

/** Nome do host sem porta, em minúsculas. */
export function nomeDoHost(host: string | null | undefined): string {
  return (host ?? "").split(":")[0]?.trim().toLowerCase() ?? "";
}

export function ehHostDaLoja(host: string | null | undefined, ambiente: Ambiente = process.env): boolean {
  return hostsDaLoja(ambiente).includes(nomeDoHost(host));
}

/** Expressão para `has`/`missing` do next.config (o Next compara só o nome do host, sem porta). */
export function regexHostsDaLoja(ambiente: Ambiente = process.env): string {
  const escapados = hostsDaLoja(ambiente).map((host) => host.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return `^(${escapados.join("|")})$`;
}
