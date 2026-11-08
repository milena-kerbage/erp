import type { Metadata } from "next";
import { StoreOrders } from "@/features/store/components/StoreOrders";

export const metadata: Metadata = { title: "Pedidos da loja" };
export default function Page() {
  return <StoreOrders />;
}
