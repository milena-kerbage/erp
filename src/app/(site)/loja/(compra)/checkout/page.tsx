import type { Metadata } from "next";
import { PaginaPedido } from "@/loja/componentes/checkout/PaginaPedido";
import { catalogoParaCarrinho } from "@/loja/lib/carrinho/catalogo";

// Pedido pelo WhatsApp (a loja é um catálogo com preço): revisão das peças e um formulário curto; ao
// enviar, abre a conversa com o ateliê com a mensagem pronta. Não há pagamento no site.
export const metadata: Metadata = {
  title: "Fazer pedido",
  robots: { index: false, follow: false },
};

export default function Pedido() {
  return <PaginaPedido catalogo={catalogoParaCarrinho()} />;
}
