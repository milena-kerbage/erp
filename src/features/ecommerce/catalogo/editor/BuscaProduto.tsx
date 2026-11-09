"use client";

import { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { ImageIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { IconButton } from "@/components/ui/IconButton";
import { SearchField } from "@/components/ui/SearchField";
import { Pill, Toolbar } from "@/features/operations/components/ui";
import type { ProdutoResumoGestao, ReferenciaProduto, RespostaProdutos } from "@/features/ecommerce/types";
import { erpRequest, loja, reais, requestError, STATUS_PRODUTO } from "../api";
import { Alca, Sub, useArrastar } from "../comum";

/**
 * Busca de produtos no servidor (nome, SKU ou slug) para montar listas: relacionados do produto e
 * produtos de uma coleção. `excluir` tira da busca o que já está na lista (e o próprio produto).
 */
export function BuscaProduto({ excluir, onEscolher, disabled, rotulo = "Buscar produto para adicionar" }: { excluir: readonly string[]; onEscolher: (produto: ProdutoResumoGestao) => void; disabled?: boolean; rotulo?: string }) {
  const [busca, setBusca] = useState("");
  const [resultado, setResultado] = useState<ProdutoResumoGestao[] | null>(null);
  const [erro, setErro] = useState("");
  useEffect(() => {
    const termo = busca.trim();
    if (termo.length < 2) { setResultado(null); setErro(""); return; }
    const controle = new AbortController();
    const timer = window.setTimeout(() => {
      erpRequest<RespostaProdutos>(loja(`produtos?status=todos&limit=12&ordenar=nome&busca=${encodeURIComponent(termo)}`), { signal: controle.signal })
        .then((resposta) => { setResultado(resposta.produtos); setErro(""); })
        .catch((caught) => { if (!controle.signal.aborted) setErro(requestError(caught)); });
    }, 250);
    return () => { controle.abort(); window.clearTimeout(timer); };
  }, [busca]);
  const visiveis = (resultado ?? []).filter((produto) => !excluir.includes(produto.id));
  return <Busca>
    <Toolbar><SearchField label={rotulo} placeholder="Buscar por nome, SKU ou slug (2 letras ou mais)" value={busca} disabled={disabled} onChange={(event) => setBusca(event.target.value)} /></Toolbar>
    {erro && <Sub role="alert">{erro}</Sub>}
    {resultado && <Resultados aria-label="Resultados da busca">
      {!visiveis.length ? <Sub>{resultado.length ? "Os produtos encontrados já estão na lista." : "Nenhum produto encontrado."}</Sub> : visiveis.map((produto) => <li key={produto.id}>
        <button type="button" disabled={disabled} onClick={() => { onEscolher(produto); setBusca(""); }}>
          <Mini aria-hidden>{produto.imagem ? <img src={produto.imagem} alt="" /> : <ImageIcon size={14} />}</Mini>
          <span><strong>{produto.nome}</strong><Sub>{produto.sku} · a partir de {reais(produto.precoCentavos)}</Sub></span>
          {produto.status !== "ativo" && <Pill $tone={STATUS_PRODUTO[produto.status].tom}>{STATUS_PRODUTO[produto.status].rotulo}</Pill>}
          <PlusIcon size={16} aria-hidden />
        </button>
      </li>)}
    </Resultados>}
  </Busca>;
}

/** Lista ordenável de produtos escolhidos (arrastar, setas e remover), com a busca para adicionar. */
export function ListaProdutos({ itens, onChange, maximo, proprio, vazio, disabled, status }: {
  itens: ReferenciaProduto[]; onChange: (itens: ReferenciaProduto[]) => void; maximo: number; proprio?: string; vazio: string; disabled?: boolean;
  /** Situação conhecida de cada produto (avisa quando um item não está ativo). */
  status?: Record<string, ProdutoResumoGestao["status"]>;
}) {
  const { linha, alca } = useArrastar(itens, onChange, undefined, !disabled);
  return <Bloco>
    {itens.length ? <Ordenada>{itens.map((item, posicao) => <li key={item.id} {...linha(item, posicao)}>
      <Alca rotulo={`${item.nome}, posição ${posicao + 1}`} {...alca(item, posicao)} disabled={disabled} />
      <Posicao aria-hidden>{posicao + 1}</Posicao>
      <span><strong>{item.nome}</strong><Sub>/produto/{item.slug}</Sub></span>
      {status?.[item.id] && status[item.id] !== "ativo" ? <Pill $tone="neutral" title="Só aparece na loja quando estiver ativo">{STATUS_PRODUTO[status[item.id]].rotulo}</Pill> : <span />}
      <IconButton icon={TrashIcon} label={`Tirar ${item.nome}`} variant="ghost" size="sm" tooltip="left" disabled={disabled} onClick={() => onChange(itens.filter((outro) => outro.id !== item.id))} />
    </li>)}</Ordenada> : <Sub>{vazio}</Sub>}
    {itens.length < maximo
      ? <BuscaProduto disabled={disabled} excluir={[...itens.map((item) => item.id), ...(proprio ? [proprio] : [])]} onEscolher={(produto) => onChange([...itens, { id: produto.id, slug: produto.slug, nome: produto.nome }])} />
      : <Sub>Limite de {maximo} produtos.</Sub>}
  </Bloco>;
}

const Busca = styled.div`display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(2)}; min-width: 0;`;
const Bloco = styled.div`display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(3)}; min-width: 0;`;

const Resultados = styled.ul`
  display: flex;
  flex-direction: column;
  max-height: 16rem;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  list-style: none;

  > p, > span { padding: ${({ theme }) => theme.spacing(3)}; }

  button {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    gap: ${({ theme }) => theme.spacing(2.5)};
    align-items: center;
    width: 100%;
    padding: ${({ theme }) => theme.spacing(2, 3)};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.faint};
    font-size: 0.8125rem;
    text-align: left;
    color: ${({ theme }) => theme.colors.text.primary};

    &:hover { background-color: ${({ theme }) => theme.colors.interactive.hover}; }
    strong { font-weight: ${({ theme }) => theme.fontWeights.medium}; overflow-wrap: anywhere; }
    > svg { color: ${({ theme }) => theme.colors.text.muted}; }
  }
  li:last-of-type button { border-bottom: 0; }
`;

export const Mini = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2.25rem;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radii.sm};
  background-color: ${({ theme }) => theme.colors.background.surface};
  color: ${({ theme }) => theme.colors.text.muted};

  img { width: 100%; height: 100%; object-fit: cover; }
`;

const Ordenada = styled.ol`
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  list-style: none;

  li {
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr) auto auto;
    gap: ${({ theme }) => theme.spacing(2)};
    align-items: center;
    padding: ${({ theme }) => theme.spacing(1.5, 2)};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.faint};
    font-size: 0.8125rem;
    background-color: ${({ theme }) => theme.palette.neutral[0]};

    &:last-of-type { border-bottom: 0; }
    &[data-arrastando] { opacity: 0.45; }
    strong { font-weight: ${({ theme }) => theme.fontWeights.medium}; overflow-wrap: anywhere; }
  }
`;

const Posicao = styled.span`
  min-width: 1.25rem;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.muted};
  text-align: center;
`;
