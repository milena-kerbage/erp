import type { Metadata } from "next";
import { PedidosEcommerce } from "@/features/ecommerce/vendas/Pedidos";

export const metadata: Metadata = { title: "Pedidos da loja" };
export default function Page() {
  return <PedidosEcommerce />;
}
