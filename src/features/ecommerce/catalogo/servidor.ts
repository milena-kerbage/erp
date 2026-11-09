import "server-only";
import { headers } from "next/headers";
import { ORIGEM_LOJA, nomeDoHost } from "@/lib/hosts";

/**
 * Origem pública da loja para os links "Ver na loja" (a mesma regra de origemLojaDoErp nas rotas da
 * gestão): LOJA_ORIGEM, se definida; em produção, o domínio da loja; em desenvolvimento, www.localhost
 * na mesma porta do ERP (http://localhost:3000 → http://www.localhost:3000).
 */
export async function origemDaLoja(): Promise<string> {
  const configurada = process.env.LOJA_ORIGEM;
  if (configurada) return new URL(configurada).origin;
  const cabecalhos = await headers();
  const host = cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host");
  if (process.env.NODE_ENV === "production" && !nomeDoHost(host).endsWith("localhost")) return ORIGEM_LOJA;
  const protocolo = (cabecalhos.get("x-forwarded-proto") ?? "http").split(",")[0].trim() === "https" ? "https" : "http";
  const porta = (host ?? "").split(":")[1];
  return `${protocolo}://www.localhost${porta ? `:${porta}` : ""}`;
}
