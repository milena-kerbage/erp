"use client";

import { useEffect, useState } from "react";
import { css, cx } from "styled-system/css";
import { adicionarAoCarrinho } from "@/loja/componentes/carrinho/estado";
import { Imagem } from "@/loja/componentes/inicio/blocos";
import { dataCurta, diaPorExtenso, type Pedido, type Status, situacao, type Tom } from "@/loja/lib/pedidos/status";

// Selo da situação do pedido: cor pelo tom (atenção = laranja da ação, sucesso = verde).
export function SeloStatus({ status }: { status: Status }) {
  const { rotulo, tom } = situacao(status);
  return (
    <span data-tom={tom} className={selo}>
      <span aria-hidden className={css({ w: "2", h: "2", borderRadius: "full", bg: "currentColor" })} />
      {rotulo}
    </span>
  );
}

// Até 4 miniaturas coladas; o resto vira "+N".
export function Miniaturas({ itens, tamanho = "16" }: { itens: Pedido["itens"]; tamanho?: "12" | "16" }) {
  const visiveis = itens.slice(0, 4);
  const resto = itens.length - visiveis.length;
  return (
    <ul aria-hidden className={css({ display: "flex", gap: "2" })}>
      {visiveis.map((item) => (
        <li key={`${item.slug}-${item.variacao ?? ""}`} className={css({ position: "relative" })}>
          <Imagem
            tom="claro"
            className={cx(css({ borderRadius: "sm" }), tamanho === "16" ? css({ w: "16", h: "16" }) : css({ w: "12", h: "12" }))}
          />
          <span className={contador}>{item.quantidade}</span>
        </li>
      ))}
      {resto > 0 && <li className={cx(maisItens, tamanho === "16" ? css({ w: "16", h: "16" }) : css({ w: "12", h: "12" }))}>+{resto}</li>}
    </ul>
  );
}

export function BarraProgresso({ valor, tom }: { valor: number; tom: Tom }) {
  return (
    <div aria-hidden className={css({ h: "1", borderRadius: "full", bg: "superficieSuave", overflow: "hidden" })}>
      <div data-tom={tom} className={preenchimento} style={{ width: `${Math.round(valor * 100)}%` }} />
    </div>
  );
}

// Frase principal do pedido ("Chega quinta, 5 de nov.", "Entregue em 19 out 2026"…).
export function mensagemPrincipal(pedido: Pedido): string {
  const ultimo = (status: Status) => pedido.historico.findLast((evento) => evento.status === status)?.em;
  switch (pedido.status) {
    case "aguardando_pagamento":
      return pedido.pagamento.forma === "pix" ? "Pague o Pix para confirmar o pedido" : "Pagamento em análise";
    case "entregue":
      return `Entregue em ${dataCurta(ultimo("entregue") ?? pedido.criadoEm)}`;
    case "retirado":
      return `Retirado em ${dataCurta(ultimo("retirado") ?? pedido.criadoEm)}`;
    case "cancelado":
      return `Cancelado em ${dataCurta(ultimo("cancelado") ?? pedido.criadoEm)}`;
    case "pronto_para_retirada":
      return pedido.entrega.tipo === "retirada" && pedido.entrega.retiraAte
        ? `Pronto para retirar até ${diaPorExtenso(pedido.entrega.retiraAte)}`
        : "Pronto para retirar";
    case "saiu_para_entrega":
      return "Chega hoje";
    case "em_separacao":
      return pedido.entrega.tipo === "retirada"
        ? `Em produção no ateliê · pronto a partir de ${diaPorExtenso(pedido.entrega.previsao)}`
        : `Em produção no ateliê · chega até ${diaPorExtenso(pedido.entrega.previsao)}`;
    default:
      if (pedido.entrega.tipo === "endereco" && pedido.entrega.agendamento)
        return `Entrega agendada para ${diaPorExtenso(pedido.entrega.agendamento.data)}, ${pedido.entrega.agendamento.periodo}`;
      return pedido.entrega.tipo === "retirada"
        ? `Pronto para retirar a partir de ${diaPorExtenso(pedido.entrega.previsao)}`
        : `Chega até ${diaPorExtenso(pedido.entrega.previsao)}`;
  }
}

// "Comprar de novo": põe os itens no carrinho e avisa com link para ele.
export function comprarDeNovo(itens: Pedido["itens"]) {
  for (const item of itens) adicionarAoCarrinho({ slug: item.slug, variacao: item.variacao, quantidade: item.quantidade });
}

// Hora atual só depois de montar (evita diferença entre o HTML do servidor e o navegador) e
// atualizada a cada `intervalo` ms (contagem do Pix).
export function useAgora(intervalo = 0): number | null {
  const [agora, setAgora] = useState<number | null>(null);
  useEffect(() => {
    setAgora(Date.now());
    if (!intervalo) return;
    const id = window.setInterval(() => setAgora(Date.now()), intervalo);
    return () => window.clearInterval(id);
  }, [intervalo]);
  return agora;
}

const selo = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1.5",
  h: "7",
  px: "3",
  borderRadius: "full",
  fontSize: "sm",
  fontWeight: "semibold",
  whiteSpace: "nowrap",
  "&[data-tom=atencao]": { bg: "alertaSuave", color: "alerta" },
  "&[data-tom=andamento]": { bg: "linkSuave", color: "link" },
  "&[data-tom=sucesso]": { bg: "sucessoSuave", color: "sucesso" },
  "&[data-tom=neutro]": { bg: "superficieSuave", color: "textoSuave" },
});

const preenchimento = css({
  h: "full",
  borderRadius: "full",
  "&[data-tom=atencao]": { bg: "alerta" },
  "&[data-tom=andamento]": { bg: "link" },
  "&[data-tom=sucesso]": { bg: "sucesso" },
  "&[data-tom=neutro]": { bg: "textoSuave" },
});

const contador = css({
  position: "absolute",
  top: "[-6px]",
  right: "[-6px]",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minW: "5",
  h: "5",
  px: "1",
  borderRadius: "full",
  bg: "escuro",
  color: "fundo",
  fontSize: "2xs",
  fontWeight: "bold",
});

const maisItens = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "sm",
  bg: "superficieSuave",
  fontSize: "sm",
  fontWeight: "semibold",
  color: "texto",
});
