"use client";

import { useEffect, useState } from "react";
import type { PedidoLoja } from "@/lib/loja/contas";
import type { PedidoEnviado } from "@/loja/lib/pedidos/historico";
import { chamarConta, useCliente } from "./estadoConta";

// Pedido do servidor (conta) no formato do histórico deste aparelho (cache) e dos cards de Minha conta.
export type PedidoDaConta = PedidoEnviado & { statusRotulo?: string; status?: string };

export function paraPedidoEnviado(pedido: PedidoLoja): PedidoDaConta {
  return {
    numero: pedido.numero,
    enviadoEm: pedido.criadoEm,
    itens: pedido.itens.map((item) => ({
      ...(item.slug ? { slug: item.slug } : {}),
      ...(item.href ? { href: item.href } : {}),
      nome: item.nome,
      ...(item.codigo ? { codigo: item.codigo } : {}),
      quantidade: item.quantidade,
      detalhes: item.detalhes,
      precoCentavos: item.precoCentavos,
    })),
    subtotalCentavos: pedido.subtotalCentavos,
    ...(pedido.cupom && pedido.descontoCentavos > 0 ? { cupom: { codigo: pedido.cupom.codigo, descontoCentavos: pedido.descontoCentavos } } : {}),
    totalCentavos: pedido.totalCentavos,
    retirar: pedido.retirar,
    ...(pedido.local ? { local: pedido.local } : {}),
    mensagem: pedido.mensagem,
    status: pedido.status,
    statusRotulo: pedido.statusRotulo,
  };
}

// ---------------------------------------------------------------- Pedidos do servidor (logada)

export type ListaDaConta = { situacao: "carregando" } | { situacao: "pronta"; pedidos: PedidoDaConta[] } | { situacao: "erro"; mensagem: string } | { situacao: "deslogada" };

/** Pedidos da conta logada, do servidor (mais novo primeiro). Deslogada: "deslogada". */
export function usePedidosDaConta(): ListaDaConta {
  const cliente = useCliente();
  const [lista, setLista] = useState<ListaDaConta>({ situacao: "carregando" });
  useEffect(() => {
    if (cliente === undefined) return;
    if (cliente === null) {
      setLista({ situacao: "deslogada" });
      return;
    }
    let ativo = true;
    setLista({ situacao: "carregando" });
    chamarConta<{ pedidos: PedidoLoja[] }>("conta/pedidos")
      .then((dados) => ativo && setLista({ situacao: "pronta", pedidos: dados.pedidos.map(paraPedidoEnviado) }))
      .catch((erro: unknown) => ativo && setLista({ situacao: "erro", mensagem: erro instanceof Error ? erro.message : "Não foi possível carregar os pedidos." }));
    return () => {
      ativo = false;
    };
  }, [cliente]);
  return lista;
}
