import type { Metadata } from "next";
import { CuponsEcommerce } from "@/features/ecommerce/vendas/Cupons";

export const metadata: Metadata = { title: "Cupons" };
export default function Page() {
  return <CuponsEcommerce />;
}
