"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import styled from "@emotion/styled";
import type { ClienteErp, ContaCliente, PedidoErp } from "@/lib/loja/contas";
import type { CarrinhoDaCliente, LeadVinculado } from "@/features/ecommerce/types";
import { useCurrentUser } from "@/features/settings/store";
import { ErpRequestError, erpRequest, requestError } from "@/features/operations/client";
import { Notice, Pill, Table, TableCard } from "@/features/operations/components/ui";
import { STATUS_PEDIDO, type CupomConta, type StatusPedido } from "@/loja/lib/contas/regras";
import type { Tone } from "@/styles/theme";

// Peças comuns das telas de vendas do módulo E-commerce (pedidos, clientes, cupons, carrinhos e painel).
// Valores sempre em centavos e "a partir de": o valor final, o frete e o pagamento são combinados pelo WhatsApp.

/** Pedido da loja como o ERP recebe (GET /api/erp/loja/pedidos). */
export type PedidoLoja = PedidoErp;
/** Cliente na listagem (GET /api/erp/loja/clientes), com o avatar posto pela rota. */
export type ClienteLoja = ClienteErp & { avatar?: string };
/** Detalhe da cliente (GET /api/erp/loja/clientes/:id). */
export type DetalheCliente = {
  cliente: ContaCliente & { status: string; ultimoAcesso: string | null; avatar?: string };
  cupom: CupomConta | null;
  pedidos: Omit<PedidoLoja, "clienteId" | "nome" | "email" | "whatsapp" | "whatsappFormatado" | "anonimizado" | "revisao" | "atualizadoEm">[];
  redefinicao: { criadaEm: string; expiraEm: string; usadaEm: string | null } | null;
  lead: LeadVinculado;
  carrinho: CarrinhoDaCliente;
};

/* ---------- Etapas do pedido ---------- */

export const ETAPAS = Object.keys(STATUS_PEDIDO) as StatusPedido[];
/** Etapas de avanço (sem o cancelado), na ordem da linha do tempo. */
export const ETAPAS_AVANCO = ETAPAS.filter((etapa) => etapa !== "cancelado");
export const TOM_ETAPA: Record<StatusPedido, Tone> = { enviado_whatsapp: "peach", pagamento_confirmado: "blue", despachado: "teal", entregue: "green", cancelado: "rose" };
/** Rótulo curto (abas e gráficos). */
export const ETAPA_CURTA: Record<StatusPedido, string> = { enviado_whatsapp: "Enviado no WhatsApp", pagamento_confirmado: "Pago", despachado: "Despachado", entregue: "Entregue", cancelado: "Cancelado" };

/** Etapa em pílula; `curta` nas listas (o nome completo fica no título). */
export function EtapaPill({ status, curta = false }: { status: StatusPedido; curta?: boolean }) {
  return <Pill $tone={TOM_ETAPA[status] ?? "neutral"} title={curta ? STATUS_PEDIDO[status] : undefined}>{(curta ? ETAPA_CURTA[status] : STATUS_PEDIDO[status]) ?? status}</Pill>;
}

/* ---------- Formatos ---------- */

const FUSO = "America/Fortaleza";
export const dinheiro = (centavos: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);
export const dinheiroCurto = (centavos: number) => {
  const reais = centavos / 100;
  if (reais >= 1000) return `R$ ${(reais / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return `R$ ${reais.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
};
export const dataHora = (valor: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: FUSO }).format(new Date(valor));
export const data = (valor: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: FUSO }).format(new Date(valor));
/** AAAA-MM-DD no horário de Brasília (filtros e campos de data). */
export const diaIso = (valor: Date | string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(valor));
export const plural = (quantidade: number, um: string, varios: string) => `${quantidade.toLocaleString("pt-BR")} ${quantidade === 1 ? um : varios}`;

/** "há 3 horas", "há 2 dias" (a partir de horas inteiras). */
export function haTempo(horas: number) {
  if (horas < 1) return "há menos de 1 hora";
  if (horas < 48) return `há ${plural(horas, "hora", "horas")}`;
  return `há ${plural(Math.floor(horas / 24), "dia", "dias")}`;
}

/** Conversa no WhatsApp com a cliente (número salvo só com DDD: entra o 55 do Brasil). */
export const whatsappHref = (digitos: string, texto?: string) => `https://wa.me/55${digitos.replace(/\D/g, "")}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
export const abrirJanela = (href: string) => window.open(href, "_blank", "noopener,noreferrer");

/** Parâmetro da URL lido só no navegador (abre um detalhe vindo de um link: ?pedido=, ?cliente=, ?novo=1). */
export function parametroDaUrl(nome: string) {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(nome);
}

/** Tira o parâmetro da URL ao fechar o detalhe (sem recarregar nem empilhar histórico). */
export function limparParametro(nome: string) {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(nome)) return;
  url.searchParams.delete(nome);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

/* ---------- Dados ---------- */

/**
 * Lê uma rota de /api/erp (GET) com cancelamento, erro e o 403 de quem não tem acesso. `caminho` null
 * espera (ex.: até ler a URL).
 */
export function useDadosErp<T>(caminho: string | null) {
  const [dados, setDados] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [negado, setNegado] = useState(false);
  const carregar = useCallback(async (signal?: AbortSignal) => {
    if (!caminho) return;
    setCarregando(true); setErro(""); setNegado(false);
    try { setDados(await erpRequest<T>(caminho, { signal })); }
    catch (caught) { if (!signal?.aborted) { setErro(requestError(caught)); setNegado(caught instanceof ErpRequestError && caught.status === 403); } }
    finally { if (!signal?.aborted) setCarregando(false); }
  }, [caminho]);
  useEffect(() => { const controller = new AbortController(); void carregar(controller.signal); return () => controller.abort(); }, [carregar]);
  return { dados, setDados, carregando, setCarregando, erro, setErro, negado, recarregar: carregar };
}

/** Clientes, pedidos, cupons, carrinhos e painel: só administração e gestão. */
export function useRestrito(negado: boolean) {
  const usuario = useCurrentUser();
  return usuario?.permission === "member" || negado;
}

export function AvisoRestrito({ area }: { area: string }) {
  return <Notice role="alert">{area} {area.endsWith("s") ? "são acompanhados" : "é acompanhada"} pela administração e pela gestão do ateliê. Seu perfil não tem acesso a esta área.</Notice>;
}

/* ---------- Estilos ---------- */

/** Caixa da tabela: mede a própria largura (a tabela vira lista quando o espaço é curto, com ou sem a sidebar aberta). */
export const CaixaTabela = styled(TableCard)`container-type: inline-size;`;

/**
 * Tabela que, em espaço curto (celular, tablet, sidebar aberta), vira uma lista de cartões: cada célula
 * mostra o próprio título (data-label), sem rolagem lateral. Use dentro de <CaixaTabela>.
 */
export const TabelaResponsiva = styled(Table)`
  tbody tr { cursor: default; }
  tbody tr[data-clicavel] { cursor: pointer; }
  tbody tr[data-clicavel]:hover td { background-color: ${({ theme }) => theme.colors.interactive.hover}; }
  td { transition: background-color ${({ theme }) => theme.transitions.fast}; }

  @container (max-width: 58rem) {
    display: block;
    thead { display: none; }
    tbody, tr, td { display: block; }
    tr { padding: ${({ theme }) => theme.spacing(3, 3.5)}; border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle}; }
    tr:last-of-type { border-bottom: 0; }
    td, td:first-of-type, td:last-of-type, td:not(:last-of-type) { display: flex; align-items: center; justify-content: space-between; gap: ${({ theme }) => theme.spacing(3)}; height: auto; min-height: 1.75rem; padding: ${({ theme }) => theme.spacing(1, 0)}; border: 0; white-space: normal; text-align: right; }
    td > * { min-width: 0; }
    td[data-label]::before { content: attr(data-label); flex-shrink: 0; color: ${({ theme }) => theme.colors.text.muted}; font-size: 0.75rem; text-align: left; }
    td[data-principal] { justify-content: flex-start; text-align: left; padding-bottom: ${({ theme }) => theme.spacing(2)}; }
    td[data-acoes] { justify-content: flex-end; padding-top: ${({ theme }) => theme.spacing(2)}; }
    td[data-acoes]:empty { display: none; }
  }
`;

export const Quem = styled.div`display: flex; align-items: center; gap: ${({ theme }) => theme.spacing(3)}; min-width: 0; > span { min-width: 0; }`;
export const Nome = styled.span`display: block; font-weight: ${({ theme }) => theme.fontWeights.medium}; color: ${({ theme }) => theme.colors.text.primary}; overflow: hidden; text-overflow: ellipsis;`;
export const Sub = styled.span`display: block; color: ${({ theme }) => theme.colors.text.muted}; font-size: 0.75rem; overflow-wrap: anywhere;`;
export const Fatos = styled.dl`display: grid; grid-template-columns: minmax(7rem, auto) 1fr; gap: ${({ theme }) => theme.spacing(2, 4)}; font-size: 0.8125rem; dt { color: ${({ theme }) => theme.colors.text.muted}; } dd { color: ${({ theme }) => theme.colors.text.primary}; overflow-wrap: anywhere; } a { color: inherit; text-decoration: underline; text-underline-offset: 2px; } ${({ theme }) => theme.media.sm} { grid-template-columns: 1fr; gap: ${({ theme }) => theme.spacing(0.5)}; dd { margin-bottom: ${({ theme }) => theme.spacing(2)}; } }`;
export const TituloSecao = styled.h3`display: flex; align-items: center; justify-content: space-between; gap: ${({ theme }) => theme.spacing(2)}; font-size: 0.875rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; color: ${({ theme }) => theme.colors.text.primary}; margin-bottom: ${({ theme }) => theme.spacing(2)};`;
export const Rodape = styled.small`color: ${({ theme }) => theme.colors.text.muted}; font-size: 0.75rem;`;
export const Linha = styled.div`display: flex; flex-wrap: wrap; align-items: center; gap: ${({ theme }) => theme.spacing(2)};`;
/** Link de texto dentro das telas (lead, cliente, pedido). */
export const LinkTexto = styled(Link)`color: ${({ theme }) => theme.colors.text.primary}; text-decoration: underline; text-underline-offset: 2px; text-decoration-color: ${({ theme }) => theme.colors.border.default}; &:hover { text-decoration-color: currentColor; }`;
