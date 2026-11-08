import type { Metadata } from "next";
import { StoreCustomers } from "@/features/store/components/StoreCustomers";

export const metadata: Metadata = { title: "Clientes da loja" };
export default function Page() {
  return <StoreCustomers />;
}
