"use client";

import styled from "@emotion/styled";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowUpRightIcon, BabyIcon, CaretDownIcon, MapPinIcon, NoteIcon, ShoppingBagOpenIcon, TicketIcon, TruckIcon } from "@phosphor-icons/react";
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
const pecas = (quantidade: number) => `${quantidade} ${quantidade === 1 ? "peça" : "peças"}`;

const dataCurta = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).replace(/ de /g, " ").replace(".", "");

export function PedidoDoSite({ numero, original }: { numero: string; original: ReactNode }) {
  const [dados, setDados] = useState<Dados | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [verOriginal, setVerOriginal] = useState(false);
  const [recadoAberto, setRecadoAberto] = useState(false);
  const [semFoto, setSemFoto] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let ativo = true;
    buscar(numero).then((resposta) => { if (ativo) setDados(resposta); }).catch(() => { if (ativo) setFalhou(true); });
    return () => { ativo = false; };
  }, [numero]);

  // Sem o pedido (apagado, sem acesso, fora do ar): a mensagem como chegou.
  if (falhou) return <>{original}</>;

  const cabecalho = (situacao?: ReactNode, resumo?: string) => (
    <Topo>
      <span className="icone" aria-hidden><ShoppingBagOpenIcon weight="fill" /></span>
      <span className="titulo">
        <strong>Pedido do site</strong>
        <small>{[numero, resumo].filter(Boolean).join(" · ")}</small>
      </span>
      {situacao}
    </Topo>
  );

  // Carregando: o mesmo desenho do cartão pronto, para a conversa não pular quando o pedido chega.
  if (!dados) return <Cartao aria-busy>{cabecalho()}<div className="esqueleto" /><div className="esqueleto" /><div className="esqueleto curto" /></Cartao>;

  const { pedido, cliente } = dados;
  const bebe = cliente?.bebe;
  const entrega = [pedido.retirar ? "Retira no ateliê, em Fortaleza" : "Receber em casa (frete a combinar)", pedido.local].filter(Boolean).join(" · ");
  return (
    <Cartao aria-label={`Pedido ${pedido.numero} feito no site`} data-pronto="">
      {cabecalho(<Situacao data-tom={TOM_ETAPA[pedido.status]}>{ETAPA_CURTA[pedido.status] ?? pedido.statusRotulo}</Situacao>, pecas(pedido.quantidade))}

      <Itens>
        {pedido.itens.map((item, indice) => (
          <li key={`${item.slug ?? item.nome}-${indice}`}>
            {item.foto && !semFoto[indice] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.foto.src} alt={item.foto.alt || ""} loading="lazy" decoding="async" onError={() => setSemFoto((atual) => ({ ...atual, [indice]: true }))} />
            ) : <span className="semFoto" aria-hidden><ShoppingBagOpenIcon /></span>}
            <span className="texto">
              <strong>{item.nome}</strong>
              {escolhasDe(item).map((detalhe) => <span key={detalhe}>{detalhe}</span>)}
              {item.modulos && item.modulos.length > 0 && <span>{item.tipo === "personalizado" ? "Peças escolhidas" : "O que vem"}: {item.modulos.map((modulo) => modulo.nome).join(", ")}</span>}
              {(item.quantidade > 1 || item.codigo) && <span className="apoio">{[item.quantidade > 1 && `${item.quantidade} unidades`, item.codigo && `cód. ${item.codigo}`].filter(Boolean).join(" · ")}</span>}
            </span>
            <span className="preco">{dinheiro(item.precoCentavos * item.quantidade)}</span>
          </li>
        ))}
      </Itens>

      <Total>
        {pedido.cupom && pedido.descontoCentavos > 0 && (
          <div className="cupom"><span><TicketIcon aria-hidden />Cupom {pedido.cupom.codigo}</span><span>−{dinheiro(pedido.descontoCentavos)}</span></div>
        )}
        <div className="total"><span>Total a partir de</span><strong>{dinheiro(pedido.totalCentavos)}</strong></div>
      </Total>

      {/* O essencial num relance: bebê, entrega e cidade em etiquetas (o detalhe fica na dica); o recado da cliente em destaque. */}
      <Resumo>
        {bebe && (
          <span data-encolhe="" title={`${bebe.nome || "Bebê"}${bebe.data ? ` · ${jaNasceu(bebe.data) ? "nasceu em" : "previsão"} ${dataCurta(bebe.data)}` : ""}`}>
            <BabyIcon aria-hidden /><i><b>{bebe.nome || "Bebê"}</b>{bebe.data ? ` · ${quandoNasce(bebe.data)}` : ""}</i>
          </span>
        )}
        <span title={pedido.retirar ? "Prefere retirar no ateliê, em Fortaleza" : "Quer receber em casa: frete e prazo a combinar"}>
          <TruckIcon aria-hidden /><i>{pedido.retirar ? "Retirada" : "Entrega"}</i>
        </span>
        {(pedido.local || cliente?.cidade) && <span data-encolhe="" title={pedido.local || cliente?.cidade}><MapPinIcon aria-hidden /><i>{pedido.local || cliente?.cidade}</i></span>}
      </Resumo>
      {pedido.observacoes && (
        <Recado type="button" data-aberto={recadoAberto || undefined} aria-expanded={recadoAberto} title={recadoAberto ? undefined : "Ver o recado inteiro"} onClick={() => setRecadoAberto((atual) => !atual)}>
          <NoteIcon aria-hidden /><span>{pedido.observacoes}</span>
        </Recado>
      )}

      <Rodape>
        <Link href={`/ecommerce/pedidos?pedido=${encodeURIComponent(pedido.numero)}`}>Abrir pedido<ArrowUpRightIcon weight="bold" aria-hidden /></Link>
        <button type="button" aria-expanded={verOriginal} onClick={() => setVerOriginal((atual) => !atual)}>
          {verOriginal ? "Esconder mensagem" : "Ver mensagem"}<CaretDownIcon weight="bold" aria-hidden data-aberto={verOriginal || undefined} />
        </button>
      </Rodape>
      {verOriginal && <Original>{original}</Original>}
    </Cartao>
  );
}

// As cores partem da cor do texto da própria bolha (currentColor): o cartão acompanha o tema claro, o escuro e
// qualquer tom de bolha sem depender de um fundo fixo.
const suave = (percentual: number) => `color-mix(in srgb, currentColor ${percentual}%, transparent)`;

const Cartao = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  padding: 4px 2px 2px;
  font-size: 0.8125rem;
  line-height: 1.4;
  &[data-pronto] > * { animation: pedido-entra 0.32s cubic-bezier(0.22, 1, 0.36, 1) backwards; }
  &[data-pronto] > *:nth-child(2) { animation-delay: 40ms; }
  &[data-pronto] > *:nth-child(3) { animation-delay: 80ms; }
  &[data-pronto] > *:nth-child(n + 4) { animation-delay: 120ms; }
  @keyframes pedido-entra { from { opacity: 0; transform: translateY(4px); } }
  .esqueleto { height: 2.75rem; margin-top: 10px; border-radius: 8px; background: ${suave(7)}; animation: pedido-pulsa 1.2s ease-in-out infinite; }
  .esqueleto.curto { height: 1rem; width: 55%; }
  @keyframes pedido-pulsa { 50% { opacity: 0.5; } }
  @media (prefers-reduced-motion: reduce) { &[data-pronto] > *, .esqueleto { animation: none; } }
`;

const Topo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  .icone { flex-shrink: 0; display: grid; place-items: center; width: 2rem; height: 2rem; border-radius: 9px; background: ${({ theme }) => theme.tones.peach.soft}; color: ${({ theme }) => theme.tones.peach.fg}; }
  .icone svg { width: 17px; height: 17px; }
  .titulo { display: flex; flex-direction: column; min-width: 0; margin-right: auto; }
  .titulo strong { font-size: 0.875rem; font-weight: 600; line-height: 1.25; }
  .titulo small { overflow: hidden; font-size: 0.75rem; color: ${suave(58)}; white-space: nowrap; text-overflow: ellipsis; }
`;

const Situacao = styled.span`
  flex-shrink: 0;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 600;
  white-space: nowrap;
  background: ${suave(7)};
  ${({ theme }) => (["blue", "teal", "green", "rose", "peach"] as const).map((tom) => `&[data-tom="${tom}"] { background: ${theme.tones[tom].soft}; color: ${theme.tones[tom].fg}; }`).join("\n")}
`;

const Itens = styled.ul`
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  border-top: 1px solid ${suave(10)};
  li { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid ${suave(10)}; }
  img, .semFoto { flex-shrink: 0; width: 2.75rem; height: 2.75rem; border-radius: 8px; object-fit: cover; background: ${suave(6)}; }
  .semFoto { display: grid; place-items: center; color: ${suave(40)}; }
  .semFoto svg { width: 18px; height: 18px; }
  .texto { display: flex; flex: 1; flex-direction: column; gap: 1px; min-width: 0; font-size: 0.75rem; overflow-wrap: anywhere; }
  .texto strong { font-size: 0.8125rem; font-weight: 600; line-height: 1.3; }
  .texto > span { color: ${suave(62)}; }
  .texto > span.apoio { color: ${suave(45)}; }
  .preco { flex-shrink: 0; padding-top: 1px; font-weight: 600; white-space: nowrap; }
`;

const Total = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 0 2px;
  > div { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  .cupom { font-size: 0.75rem; color: ${({ theme }) => theme.tones.green.fg}; }
  .cupom span { display: inline-flex; align-items: center; gap: 5px; }
  .cupom svg { width: 13px; height: 13px; }
  .total span { color: ${suave(62)}; }
  .total strong { font-size: 1.0625rem; font-weight: 700; letter-spacing: -0.01em; }
`;

const Resumo = styled.div`
  display: flex;
  gap: 5px;
  min-width: 0;
  margin-top: 10px;
  /* Sempre numa linha só: quem tem mais texto (o bebê) cede espaço primeiro e termina em reticências. */
  > span {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 5px;
    min-width: 0;
    padding: 4px 9px 4px 7px;
    border-radius: 999px;
    background: ${suave(6)};
    font-size: 0.75rem;
    color: ${suave(78)};
    white-space: nowrap;
  }
  > span > i { min-width: 0; overflow: hidden; font-style: normal; text-overflow: ellipsis; }
  /* A entrega ("Entrega"/"Retirada") nunca encolhe; o bebê e a cidade cedem espaço quando o texto é longo. */
  > span[data-encolhe] { flex-shrink: 1; }
  svg { flex-shrink: 0; width: 13px; height: 13px; opacity: 0.75; }
  b { font-weight: 600; }
`;

/** Recado da cliente: duas linhas; um toque mostra inteiro. */
const Recado = styled.button`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  margin-top: 8px;
  padding: 8px 10px;
  border: 0;
  border-left: 2px solid ${({ theme }) => theme.tones.peach.fg};
  border-radius: 4px 10px 10px 4px;
  background: ${suave(4)};
  color: inherit;
  font: inherit;
  font-size: 0.75rem;
  line-height: 1.45;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s ease;
  &:hover { background: ${suave(7)}; }
  svg { flex-shrink: 0; width: 14px; height: 14px; margin-top: 2px; opacity: 0.7; }
  span { min-width: 0; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; white-space: pre-wrap; overflow-wrap: anywhere; }
  &[data-aberto] span { display: block; }
`;

const Rodape = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
  a, button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 1.875rem;
    padding: 0 11px;
    border: 0;
    border-radius: 8px;
    background: ${suave(7)};
    color: inherit;
    font: inherit;
    font-size: 0.75rem;
    font-weight: 600;
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  a:hover, button:hover { background: ${suave(12)}; }
  button { background: transparent; color: ${suave(62)}; font-weight: 500; }
  svg { width: 12px; height: 12px; transition: transform 0.2s ease; }
  svg[data-aberto] { transform: rotate(180deg); }
`;

const Original = styled.div`
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: ${suave(5)};
  font-size: 0.75rem;
  .text { margin: 0; }
`;
