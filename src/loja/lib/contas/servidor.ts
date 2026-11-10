import "server-only";
import {StorageError} from "@/lib/storage/r2";
import { createHmac } from "node:crypto";
import { digest, limited } from "@/lib/auth/core";
import { DatabaseConfigurationError, DatabaseOperationError } from "@/lib/database";
import { ApiError } from "@/lib/erp/access";
import { ehHostDaLoja, nomeDoHost, ORIGEM_LOJA } from "@/lib/hosts";
import { avatarDaCliente } from "@/lib/loja/avatar";
import { gravacaoLojaPermitida } from "@/lib/loja/gestao/esquema";
import { clienteDaSessao, type ContaCliente, ErroConta } from "@/lib/loja/contas";
import { COOKIE_DICA_SESSAO } from "@/loja/lib/contas/regras";

// Peças das rotas de conta da loja (/api/conta/* e /api/pedidos, no host da loja): cookie próprio,
// conferência de origem, limites por IP e por e-mail (o mesmo limitador do login da equipe, em
// erp_auth.attempts, com chaves "loja-conta:*"), leitura do corpo com teto, a trava de gravação em
// desenvolvimento e as respostas de erro sem detalhes internos.

/**
 * Cookie da sessão da cliente: httpOnly, SameSite=Lax, caminho /, sem Domain (vale só no host exato da
 * loja: nunca chega ao erp.). Em produção, Secure e prefixo __Host-. Nome diferente do cookie da equipe
 * (mk_session), e o token é conferido em outra tabela: um nunca autentica no lugar do outro.
 */
export const COOKIE_CLIENTE = process.env.NODE_ENV === "production" ? "__Host-mk_cliente" : "mk_cliente";
export const MAX_AGE_SESSAO = 30 * 24 * 60 * 60; // segundos (a validade real é conferida no servidor)
export const opcoesCookie = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };

export const SEM_CACHE = { "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } as const;

export function respostaDeErro(status: number, codigo: string, mensagem: string, campos?: Record<string, string>, extra: HeadersInit = {}) {
  return Response.json(
    { erro: { codigo, mensagem, ...(campos && Object.keys(campos).length ? { campos } : {}) } },
    { status, headers: { ...SEM_CACHE, ...extra } },
  );
}

/** Converte os erros do servidor em {erro:{codigo,mensagem,campos?}}, sem detalhes internos. */
export function erroDaApi(erro: unknown): Response {
  if(erro instanceof StorageError)return respostaDeErro(503,erro.code,erro.message);
  if (erro instanceof ErroConta) return respostaDeErro(erro.status, erro.code, erro.message, erro.erros, erro.status === 429 ? { "Retry-After": "900" } : {});
  if (erro instanceof ApiError) return respostaDeErro(erro.status, erro.code, erro.message);
  if (erro instanceof DatabaseConfigurationError || erro instanceof DatabaseOperationError)
    return respostaDeErro(503, "INDISPONIVEL", "As contas estão indisponíveis agora. Tente de novo em instantes ou faça o pedido direto pelo WhatsApp.");
  console.error("[contas]", erro instanceof Error ? erro.message : "erro");
  return respostaDeErro(500, "ERRO", "Não foi possível concluir agora. Tente de novo em instantes.");
}

/**
 * Só a própria loja: o host precisa ser da loja e o Origin igual a ele (https em produção); pedidos de
 * outro site (Sec-Fetch-Site: cross-site) são recusados. Vale para toda escrita e também para o login.
 */
export function conferirOrigem(request: Request) {
  const host = request.headers.get("host");
  if (!ehHostDaLoja(host)) throw new ErroConta(404, "Recurso não encontrado.", "NOT_FOUND");
  const origem = request.headers.get("origin");
  if (!origem || request.headers.get("sec-fetch-site") === "cross-site") throw new ErroConta(403, "Requisição não permitida.", "ORIGEM");
  let url: URL;
  try {
    url = new URL(origem);
  } catch {
    throw new ErroConta(403, "Requisição não permitida.", "ORIGEM");
  }
  if (url.host !== host || (process.env.NODE_ENV === "production" && url.protocol !== "https:" && !nomeDoHost(host).endsWith("localhost")))
    throw new ErroConta(403, "Requisição não permitida.", "ORIGEM");
}

/**
 * Desenvolvimento ligado a um DATABASE_URL remoto (que pode ser o de PRODUÇÃO): as rotas de escrita das
 * contas e do carrinho sincronizado recusam (503 GRAVACAO_DESLIGADA) para nada ser criado no banco real
 * por engano. Para gravar de propósito nesse cenário: LOJA_GRAVAR_EM_DESENVOLVIMENTO=true (ou o antigo
 * CONTAS_GRAVAR_EM_DESENVOLVIMENTO=true). Teste o fluxo com SQLite local (DATABASE_URL vazio e
 * ALLOW_LOCAL_SQLITE=true). A mesma regra vale para a gestão do e-commerce no ERP (gestao/esquema.ts).
 */
export const gravacaoPermitida = gravacaoLojaPermitida;
export function exigirGravacao() {
  if (!gravacaoPermitida())
    throw new ErroConta(
      503,
      "Ambiente de desenvolvimento ligado ao banco remoto: as contas não gravam aqui. Use o SQLite local ou CONTAS_GRAVAR_EM_DESENVOLVIMENTO=true.",
      "GRAVACAO_DESLIGADA",
    );
}

/** IP do visitante (na Vercel, x-vercel-forwarded-for/x-forwarded-for são escritos pela borda). Só vira HMAC. */
export function ipDaRequisicao(request: Request): string {
  const primeiro = (valor: string | null) => valor?.split(",")[0]?.trim() || "";
  return primeiro(request.headers.get("x-vercel-forwarded-for")) || primeiro(request.headers.get("x-real-ip")) || primeiro(request.headers.get("x-forwarded-for")) || "desconhecido";
}
const hmacIp = (ip: string) =>
  createHmac("sha256", process.env.INTEGRATION_ENCRYPTION_KEY || process.env.AVALIACOES_IP_SEGREDO || "loja-contas").update(`loja-contas:${ip}`).digest("hex");

/** Limite persistente (mesmo limitador do login da equipe). Estourou: 429. */
export async function limitar(chave: string, maximo: number, janelaMs = 15 * 60 * 1000) {
  if (await limited(`loja-conta:${chave}`, maximo, janelaMs)) throw new ErroConta(429, "Muitas tentativas. Aguarde alguns minutos e tente de novo.", "RATE_LIMITED");
}
export const chaveIp = (request: Request) => `ip:${hmacIp(ipDaRequisicao(request))}`;
export const chaveEmail = (email: string) => `email:${digest(email.trim().toLowerCase())}`;

/** Corpo JSON com teto de tamanho (Content-Length pode faltar ou mentir). */
export async function lerJson(request: Request, maximo = 4096): Promise<Record<string, unknown>> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") || "")) throw new ErroConta(415, "Formato inválido.", "FORMATO");
  if (Number(request.headers.get("content-length")) > maximo) throw new ErroConta(413, "Dados grandes demais.", "REQUISICAO_GRANDE");
  const leitor = request.body?.getReader();
  if (!leitor) throw new ErroConta(400, "Dados inválidos.", "INVALID_JSON");
  const partes: Uint8Array[] = [];
  let tamanho = 0;
  try {
    while (true) {
      const { done, value } = await leitor.read();
      if (done) break;
      tamanho += value.byteLength;
      if (tamanho > maximo) {
        await leitor.cancel();
        throw new ErroConta(413, "Dados grandes demais.", "REQUISICAO_GRANDE");
      }
      partes.push(value);
    }
  } finally {
    leitor.releaseLock();
  }
  try {
    const valor = JSON.parse(Buffer.concat(partes).toString("utf8"));
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new Error();
    return valor as Record<string, unknown>;
  } catch {
    throw new ErroConta(400, "Dados inválidos.", "INVALID_JSON");
  }
}

function lerCookie(request: Request, nome: string): string | undefined {
  for (const parte of (request.headers.get("cookie") ?? "").split(";")) {
    const [chave, ...valor] = parte.trim().split("=");
    if (chave === nome) return valor.join("=");
  }
  return undefined;
}
export const tokenDaRequisicao = (request: Request) => lerCookie(request, COOKIE_CLIENTE);

/** Cliente logada (sessão da loja). Fora do host da loja, sempre null: a sessão da cliente não vale no ERP. */
export async function clienteDaRequisicao(request: Request) {
  if (!ehHostDaLoja(request.headers.get("host"))) return null;
  return clienteDaSessao(tokenDaRequisicao(request));
}
export async function exigirCliente(request: Request) {
  const cliente = await clienteDaRequisicao(request);
  if (!cliente) throw new ErroConta(401, "Entre na sua conta para continuar.", "SESSAO_ENCERRADA");
  return cliente;
}

/** Dica legível pelo navegador de que há sessão (sem o token). Ver COOKIE_DICA_SESSAO. */
export function cookieDicaSessao(ativa: boolean) {
  return `${COOKIE_DICA_SESSAO}=${ativa ? "1" : ""}; Path=/; SameSite=Lax${opcoesCookie.secure ? "; Secure" : ""}; Max-Age=${ativa ? MAX_AGE_SESSAO : 0}`;
}

/** Resposta JSON sem cache, com o cookie da sessão gravado (token) ou apagado (null). */
export function comSessao(corpo: unknown, token: string | null | undefined, status = 200): Response {
  const headers = new Headers(SEM_CACHE);
  const atributos = `Path=/; HttpOnly; SameSite=Lax${opcoesCookie.secure ? "; Secure" : ""}`;
  if (token) headers.append("Set-Cookie", `${COOKIE_CLIENTE}=${token}; ${atributos}; Max-Age=${MAX_AGE_SESSAO}`);
  else if (token === null) headers.append("Set-Cookie", `${COOKIE_CLIENTE}=; ${atributos}; Max-Age=0`);
  if (token !== undefined) headers.append("Set-Cookie", cookieDicaSessao(Boolean(token)));
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(corpo), { status, headers });
}

/**
 * Origem da loja para montar links (redefinição de senha gerada no ERP). Produção: LOJA_ORIGEM ou
 * https://www.ateliemilenakerbage.com.br. Desenvolvimento: o mesmo servidor em www.localhost.
 */
export function origemDaLoja(request: Request): string {
  const configurada = process.env.LOJA_ORIGEM;
  if (configurada) return new URL(configurada).origin;
  if (process.env.NODE_ENV === "production" && !nomeDoHost(request.headers.get("host")).endsWith("localhost")) return ORIGEM_LOJA;
  const url = new URL(request.url);
  const porta = (request.headers.get("host") ?? "").split(":")[1] ?? url.port;
  return `${url.protocol}//www.localhost${porta ? `:${porta}` : ""}`;
}

/** Acrescenta o avatar ilustrado (DiceBear, gerado aqui no servidor) à conta devolvida à loja. */
export function comAvatar<T extends { cliente: ContaCliente | null }>(resposta: T): T {
  return resposta.cliente ? { ...resposta, cliente: { ...resposta.cliente, avatar: avatarDaCliente(resposta.cliente.id) } } : resposta;
}
