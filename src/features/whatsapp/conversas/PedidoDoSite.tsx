"use client";

import styled from "@emotion/styled";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowSquareOutIcon, BabyIcon, CaretDownIcon, MapPinIcon, NoteIcon, ShoppingBagOpenIcon, StorefrontIcon, TicketIcon, TruckIcon } from "@phosphor-icons/react";
import { erpRequest } from "@/features/operations/client";
import { dinheiro, ETAPA_CURTA, TOM_ETAPA } from "@/features/ecommerce/vendas/comum";
import { jaNasceu, quandoNasce } from "@/features/leads/bebe";
import type { PedidoNaConversa } from "@/lib/loja/contas";

// A mensagem que a loja abre no WhatsApp ("Quero fazer o pedido MK-251121-7Q3F, que montei no site: …") vira um
// cartão limpo na conversa: as peças com foto e escolhas, os valores "a partir de", a entrega e o bebê.
const PEDIDO_NA_MENSAGEM = /Quero fazer o pedido (MK-\d{6}-[2-9A-HJ-NP-Z]{4})/;

/** Número do pedido do site na mensagem da cliente (ou null). */
export function numeroDoPedidoDoSite(texto: string): string | null {
  return PEDIDO_NA_MENSAGEM.exec(texto)?.[1] ?? null;
}

type Item = PedidoNaConversa["pedido"]["itens"][number] & { foto?: { src: string; alt: string } | null };
type Dados = Omit<PedidoNaConversa, "pedido"> & { pedido: Omit<PedidoNaConversa["pedido"], "itens"> & { itens: Item[] } };

// Um pedido não muda de peças: guarda o que já veio para a conversa não piscar ao rolar ou trocar de tela.
const cache = new Map<string, Promise<Dados>>();
const buscar = (numero: string) => {
  let pedido = cache.get(numero);
  if (!pedido) {
    pedido = erpRequest<Dados>(`loja/pedidos/${encodeURIComponent(numero)}`);
    pedido.catch(() => cache.delete(numero));
    cache.set(numero, pedido);
  }
  return pedido;
};

// O que a cliente ESCOLHEU (cor, tamanho, tecido, bordado); "Vendido por kit" é da ficha, não é escolha.
const escolhasDe = (item: Item) => item.detalhes.filter((detalhe) => !/^Vendido por /i.test(detalhe));

const dataCurta = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).replace(/ de /g, " ").replace(".", "");

export function PedidoDoSite({ numero, original }: { numero: string; original: ReactNode }) {
  const [dados, setDados] = useState<Dados | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [verOriginal, setVerOriginal] = useState(false);

  useEffect(() => {
    let ativo = true;
    buscar(numero).then((resposta) => { if (ativo) setDados(resposta); }).catch(() => { if (ativo) setFalhou(true); });
    return () => { ativo = false; };
  }, [numero]);

  // Sem o pedido (apagado, sem acesso, fora do ar): a mensagem como chegou.
  if (falhou) return <>{original}</>;
  if (!dados) return <Cartao aria-busy><Topo><Selo><ShoppingBagOpenIcon weight="fill" aria-hidden />Pedido do site</Selo><code>{numero}</code></Topo><div className="esqueleto" /><div className="esqueleto curto" /></Cartao>;

  const { pedido, cliente } = dados;
  const bebe = cliente?.bebe;
  return (
    <Cartao aria-label={`Pedido ${pedido.numero} feito no site`}>
      <Topo>
        <Selo><ShoppingBagOpenIcon weight="fill" aria-hidden />Pedido do site</Selo>
        <code>{pedido.numero}</code>
        <Situacao data-tom={TOM_ETAPA[pedido.status]}>{ETAPA_CURTA[pedido.status] ?? pedido.statusRotulo}</Situacao>
      </Topo>

      <Itens>
        {pedido.itens.map((item, indice) => (
          <li key={`${item.slug ?? item.nome}-${indice}`}>
            {item.foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.foto.src} alt="" loading="lazy" decoding="async" />
            ) : <span className="semFoto" aria-hidden><StorefrontIcon /></span>}
            <div>
              <strong>{item.nome}</strong>
              <span className="linha">
                {item.quantidade > 1 && <b>{item.quantidade}×</b>}
                a partir de {dinheiro(item.precoCentavos * item.quantidade)}
                {item.codigo && <span className="cod">cód. {item.codigo}</span>}
              </span>
              {escolhasDe(item).length > 0 && (
                <span className="escolhas">{escolhasDe(item).map((detalhe) => <em key={detalhe}>{detalhe}</em>)}</span>
              )}
              {item.modulos && item.modulos.length > 0 && (
                <span className="modulos">{item.tipo === "personalizado" ? "Peças escolhidas" : "O que vem"}: {item.modulos.map((modulo) => modulo.nome).join(", ")}</span>
              )}
            </div>
          </li>
        ))}
      </Itens>

      <Total>
        {pedido.cupom && pedido.descontoCentavos > 0 && (
          <span className="cupom"><TicketIcon aria-hidden />Cupom {pedido.cupom.codigo} · −{dinheiro(pedido.descontoCentavos)}</span>
        )}
        <span className="valor">
          <small>{pedido.quantidade} {pedido.quantidade === 1 ? "peça" : "peças"} · a partir de</small>
          <strong>{dinheiro(pedido.totalCentavos)}</strong>
        </span>
      </Total>

      <Dados>
        {bebe && (
          <li><BabyIcon aria-hidden /><span>{[bebe.nome || "Bebê", bebe.data && (jaNasceu(bebe.data) ? `nasceu em ${dataCurta(bebe.data)}` : `previsão ${dataCurta(bebe.data)} · ${quandoNasce(bebe.data)}`)].filter(Boolean).join(" · ")}</span></li>
        )}
        <li><TruckIcon aria-hidden /><span>{pedido.retirar ? "Retira no ateliê, em Fortaleza" : "Receber em casa · frete a combinar"}{pedido.local ? ` · ${pedido.local}` : ""}</span></li>
        {!pedido.local && cliente?.cidade && <li><MapPinIcon aria-hidden /><span>{cliente.cidade}</span></li>}
        {pedido.observacoes && <li data-nota><NoteIcon aria-hidden /><span>{pedido.observacoes}</span></li>}
      </Dados>

      <Rodape>
        <Link href={`/ecommerce/pedidos?pedido=${encodeURIComponent(pedido.numero)}`}>Abrir pedido<ArrowSquareOutIcon aria-hidden /></Link>
        <button type="button" aria-expanded={verOriginal} onClick={() => setVerOriginal((atual) => !atual)}>
          {verOriginal ? "Esconder mensagem" : "Mensagem original"}<CaretDownIcon aria-hidden data-aberto={verOriginal || undefined} />
        </button>
      </Rodape>
      {verOriginal && <Original>{original}</Original>}
    </Cartao>
  );
}

const Cartao = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 24.5rem;
  max-width: 100%;
  padding: 2px 0 4px;
  color: ${({ theme }) => theme.colors.text.primary};
  .esqueleto { height: 3.25rem; border-radius: 10px; background: ${({ theme }) => theme.palette.neutral[100]}; animation: pulsar 1.2s ease-in-out infinite; }
  .esqueleto.curto { height: 1.25rem; width: 60%; }
  @keyframes pulsar { 50% { opacity: 0.55; } }
  @media (prefers-reduced-motion: reduce) { .esqueleto { animation: none; } }
`;

const Topo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  min-width: 0;
  code { overflow: hidden; text-overflow: ellipsis; font-family: inherit; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.02em; color: ${({ theme }) => theme.colors.text.secondary}; }
`;

const Selo = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px 3px 6px;
  border-radius: 999px;
  background: ${({ theme }) => theme.tones.peach.soft};
  color: ${({ theme }) => theme.tones.peach.fg};
  font-size: 0.75rem;
  font-weight: 700;
  svg { width: 14px; height: 14px; }
`;

const Situacao = styled.span`
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 600;
  background: ${({ theme }) => theme.palette.neutral[100]};
  color: ${({ theme }) => theme.colors.text.secondary};
  ${({ theme }) => (["blue", "teal", "green", "rose", "peach"] as const).map((tom) => `&[data-tom="${tom}"] { background: ${theme.tones[tom].bg}; color: ${theme.tones[tom].fg}; }`).join("\n")}
`;

const Itens = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.background.surface};
  overflow: hidden;
  li { display: flex; gap: 10px; padding: 9px 10px; }
  li + li { border-top: 1px solid ${({ theme }) => theme.colors.border.subtle}; }
  img, .semFoto { flex-shrink: 0; width: 3rem; height: 3rem; border-radius: 8px; object-fit: cover; background: ${({ theme }) => theme.palette.neutral[100]}; }
  .semFoto { display: grid; place-items: center; color: ${({ theme }) => theme.colors.text.muted}; svg { width: 20px; height: 20px; } }
  li > div { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  strong { font-size: 0.8125rem; font-weight: 600; line-height: 1.3; }
  .linha { display: flex; flex-wrap: wrap; align-items: baseline; gap: 5px; font-size: 0.75rem; color: ${({ theme }) => theme.colors.text.secondary}; }
  .linha b { color: ${({ theme }) => theme.colors.text.primary}; }
  .cod { color: ${({ theme }) => theme.colors.text.muted}; }
  .escolhas { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px; }
  em { font-style: normal; font-size: 0.6875rem; line-height: 1.35; padding: 2px 7px; border-radius: 6px; background: ${({ theme }) => theme.palette.neutral[100]}; color: ${({ theme }) => theme.colors.text.secondary}; }
  .modulos { font-size: 0.6875rem; line-height: 1.4; color: ${({ theme }) => theme.colors.text.muted}; }
`;

const Total = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  .cupom { display: inline-flex; align-items: center; gap: 4px; font-size: 0.6875rem; font-weight: 600; color: ${({ theme }) => theme.tones.green.fg}; svg { width: 13px; height: 13px; } }
  .valor { display: flex; flex-direction: column; align-items: flex-end; margin-left: auto; line-height: 1.2; }
  .valor small { font-size: 0.6875rem; color: ${({ theme }) => theme.colors.text.muted}; }
  .valor strong { font-size: 1rem; font-weight: 700; letter-spacing: -0.01em; }
`;

const Dados = styled.ul`
  list-style: none;
  margin: 0;
  padding: 8px 0 0;
  border-top: 1px dashed ${({ theme }) => theme.colors.border.default};
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  li { display: flex; gap: 7px; align-items: flex-start; line-height: 1.4; }
  li span { min-width: 0; overflow-wrap: anywhere; }
  svg { flex-shrink: 0; width: 14px; height: 14px; margin-top: 1px; color: ${({ theme }) => theme.colors.text.muted}; }
  li[data-nota] span { white-space: pre-wrap; color: ${({ theme }) => theme.colors.text.primary}; }
`;

const Rodape = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  a, button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 1.75rem;
    padding: 0 10px;
    border-radius: 8px;
    border: 1px solid ${({ theme }) => theme.colors.border.subtle};
    background: ${({ theme }) => theme.colors.background.surface};
    color: ${({ theme }) => theme.colors.text.primary};
    font: inherit;
    font-size: 0.75rem;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }
  a:hover, button:hover { background: ${({ theme }) => theme.colors.interactive.hover}; border-color: ${({ theme }) => theme.colors.border.default}; }
  button { border-color: transparent; background: transparent; color: ${({ theme }) => theme.colors.text.secondary}; }
  svg { width: 13px; height: 13px; transition: transform 0.15s ease; }
  svg[data-aberto] { transform: rotate(180deg); }
`;

const Original = styled.div`
  padding: 8px 10px;
  border-radius: 10px;
  background: ${({ theme }) => theme.palette.neutral[100]};
  font-size: 0.75rem;
  .text { margin: 0; }
`;
