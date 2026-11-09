import type { Metadata } from "next";
import { PaginaPedido } from "@/loja/componentes/checkout/PaginaPedido";
import { catalogoDaLoja, catalogoDaSacola } from "@/lib/loja/catalogo";

// Pedido pelo WhatsApp (a loja é um catálogo com preço): revisão das peças e um formulário curto; ao
// enviar, abre a conversa com o ateliê com a mensagem pronta. Não há pagamento no site.
export const metadata: Metadata = {
  title: "Fazer pedido",
  robots: { index: false, follow: false },
};

export default async function Pedido() {
  const [catalogo, { cupons }] = await Promise.all([catalogoDaSacola(), catalogoDaLoja()]);
  return <PaginaPedido catalogo={catalogo} cupons={cupons} />;
}
