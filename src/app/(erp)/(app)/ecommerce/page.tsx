import type { Metadata } from "next";
import { PainelEcommerce } from "@/features/ecommerce/vendas/Painel";

export const metadata: Metadata = { title: "E-commerce" };

/** Visão geral da loja online: pedidos, valor "a partir de", contas, carrinhos e rankings do período. */
export default function Page() {
  return <PainelEcommerce />;
}
