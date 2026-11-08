import type { Metadata } from "next";
import { Suspense } from "react";
import { css } from "styled-system/css";
import { DetalhePedido } from "@/loja/componentes/conta/DetalhePedido";
import { buscarPedidoDeExemplo, pedidosDeExemplo } from "@/loja/lib/pedidos/exemplos";

// Acompanhamento de um pedido (referencia.md §16). Os de exemplo saem prontos do build; um número
// fora da lista pode ser um pedido simulado no checkout, que só o navegador conhece.
export function generateStaticParams() {
  return pedidosDeExemplo().map((pedido) => ({ numero: pedido.numero }));
}

export async function generateMetadata({ params }: PageProps<"/loja/conta/pedidos/[numero]">): Promise<Metadata> {
  return { title: `Pedido ${(await params).numero.toUpperCase()}` };
}

export default function Pedido({ params }: PageProps<"/loja/conta/pedidos/[numero]">) {
  return (
    <Suspense fallback={<div aria-busy="true" className={css({ h: "[480px]", mt: "6", bg: "placeholder", borderRadius: "cartao" })} />}>
      <Conteudo params={params} />
    </Suspense>
  );
}

async function Conteudo({ params }: Pick<PageProps<"/loja/conta/pedidos/[numero]">, "params">) {
  const numero = decodeURIComponent((await params).numero).toUpperCase();
  return <DetalhePedido numero={numero} exemplo={buscarPedidoDeExemplo(numero)} />;
}
