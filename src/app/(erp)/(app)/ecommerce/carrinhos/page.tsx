import type { Metadata } from "next";
import { CarrinhosEcommerce } from "@/features/ecommerce/vendas/Carrinhos";

export const metadata: Metadata = { title: "Carrinhos abandonados" };
export default function Page() {
  return <CarrinhosEcommerce />;
}
