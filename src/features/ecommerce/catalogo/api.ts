"use client";

import { prepareImageUpload } from "@/lib/images/browser";
import { ErpRequestError, erpRequest, requestError } from "@/features/operations/client";
import { requestOnce } from "@/lib/request";
import { DESCONTO_PIX_PERCENTUAL, MAX_PARCELAS, PARCELA_MINIMA_CENTAVOS } from "@/loja/lib/carrinho/totais";
import type { RespostaImagensProduto, StatusProduto } from "@/features/ecommerce/types";

// Acesso às APIs do catálogo (src/app/api/erp/loja/**) e utilidades das telas: dinheiro em centavos,
// slug, regras de preço da loja ("a partir de", 5% OFF no Pix, parcelas) e o envio de fotos (multipart).

export { ErpRequestError, erpRequest, requestError };

/** Caminho das APIs do catálogo (o erpRequest já prefixa /api/erp/). */
export const loja = (caminho: string) => `loja/${caminho}`;

export const conflito = (erro: unknown) => erro instanceof ErpRequestError && erro.code === "REVISION_CONFLICT";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const reais = (centavos: number) => brl.format(centavos / 100);

/** "R$ 1.234,56" → 123456; vazio → null. */
export function centavosDe(texto: string): number | null {
  const digitos = texto.replace(/\D/g, "");
  return digitos ? Number(digitos) : null;
}
/** 123456 → "R$ 1.234,56" (valor do campo com máscara); null → "". */
export const campoReais = (centavos: number | null | undefined) => (centavos === null || centavos === undefined ? "" : brl.format(centavos / 100));

/** Slug como o backend aceita: minúsculas, números e hífens. */
export function slugificar(texto: string, maximo = 120) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maximo)
    .replace(/-+$/g, "");
}
export const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const normalizar = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Preço da página de produto: "a partir de", Pix com desconto e parcelas (mesma regra da loja). */
export function condicoesDaLoja(centavos: number) {
  const pix = Math.round((centavos * (100 - DESCONTO_PIX_PERCENTUAL)) / 100);
  const parcelas = Math.min(MAX_PARCELAS, Math.floor(centavos / PARCELA_MINIMA_CENTAVOS));
  return { pix, desconto: DESCONTO_PIX_PERCENTUAL, parcelas: Math.max(1, parcelas), valorParcela: parcelas >= 2 ? Math.ceil(centavos / parcelas) : centavos };
}

export const STATUS_PRODUTO: Record<StatusProduto, { rotulo: string; tom: "green" | "yellow" | "neutral"; descricao: string }> = {
  ativo: { rotulo: "Ativo", tom: "green", descricao: "Aparece na loja" },
  rascunho: { rotulo: "Rascunho", tom: "yellow", descricao: "Só no ERP, fora da loja" },
  arquivado: { rotulo: "Arquivado", tom: "neutral", descricao: "Fora da loja, guardado" },
};

export const DISPONIBILIDADE = { pronta_entrega: "Pronta entrega", sob_encomenda: "Sob encomenda" } as const;

const datador = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Fortaleza" });
export const dataHora = (iso: string) => datador.format(new Date(iso));

/** Limites das fotos (src/lib/loja/gestao/imagens.ts): até 12 por produto, 3 MB cada, JPEG/PNG/WebP. */
export const LIMITES_FOTO = { porProduto: 12, bytes: 3 * 1024 * 1024, tipos: ["image/jpeg", "image/png", "image/webp"] } as const;

/** Confere o tipo antes de enviar (o tamanho é conferido depois da redução; o servidor confere de novo pelos bytes). */
export function problemaDaFoto(arquivo: File): string | null {
  if (!LIMITES_FOTO.tipos.includes(arquivo.type as (typeof LIMITES_FOTO.tipos)[number])) return `${arquivo.name}: envie JPEG, PNG ou WebP.`;
  if (!arquivo.size) return `${arquivo.name}: o arquivo está vazio.`;
  return null;
}

/** POST multipart da foto (o erpRequest só manda JSON). Devolve as fotos e a revisão nova do produto. */
export async function enviarFoto(produtoId: string, arquivo: File, revisao: number, alt = ""): Promise<RespostaImagensProduto> {
  const corpo = new FormData();
  // Reduz no navegador antes de enviar (src/lib/images/browser.ts); o limite de 3 MB vale para o que sai daqui.
  const preparada = await prepareImageUpload(arquivo, "product");
  if (preparada.size > LIMITES_FOTO.bytes) throw new ErpRequestError(`${arquivo.name}: mesmo reduzida, a foto passa de 3 MB. Diminua a resolução e envie de novo.`, 413, "FOTO_GRANDE");
  corpo.set("arquivo", preparada);
  corpo.set("revisao", String(revisao));
  if (alt) corpo.set("alt", alt);
  const resposta = await requestOnce(`/api/erp/loja/produtos/${encodeURIComponent(produtoId)}/imagens`, { method: "POST", credentials: "same-origin", cache: "no-store", body: corpo });
  const resultado = (await resposta.json().catch(() => null)) as (RespostaImagensProduto & { error?: string; code?: string }) | null;
  if (!resposta.ok) {
    const mensagem = resposta.status === 401 ? "Sua sessão expirou. Entre novamente para continuar." : resposta.status === 413 && !resultado?.error ? "A foto passou do limite de 3 MB." : resultado?.error || `Não foi possível enviar a foto (HTTP ${resposta.status}).`;
    throw new ErpRequestError(mensagem, resposta.status, resultado?.code);
  }
  if (!resultado) throw new ErpRequestError("O servidor retornou uma resposta inválida.", resposta.status);
  window.dispatchEvent(new Event("erp:changed"));
  return resultado;
}

/** Contagem de caracteres como o backend conta (pontos de código). */
export const tamanho = (texto: string) => [...texto].length;

/** Nome com a trilha das mães ("Kit berço › Kits") para escolher categoria em listas planas. */
export function trilhasDeCategorias(categorias: ReadonlyArray<{ id: string; paiId: string | null; nome: string }>) {
  const porId = new Map(categorias.map((categoria) => [categoria.id, categoria]));
  const trilha = (id: string, limite = 6): string => {
    const categoria = porId.get(id);
    if (!categoria) return "";
    return categoria.paiId && limite > 0 && porId.has(categoria.paiId) ? `${trilha(categoria.paiId, limite - 1)} › ${categoria.nome}` : categoria.nome;
  };
  return new Map(categorias.map((categoria) => [categoria.id, trilha(categoria.id)]));
}
