import type { Metadata } from "next";
import { ClientesEcommerce } from "@/features/ecommerce/vendas/Clientes";

export const metadata: Metadata = { title: "Clientes da loja" };
export default function Page() {
  return <ClientesEcommerce />;
}
