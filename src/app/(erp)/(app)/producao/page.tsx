import type { Metadata } from "next";
import { OperationsView } from "@/features/operations/components/OperationsView";

export const metadata: Metadata = { title: "Produção" };
export default function Page() {
  return <OperationsView resource="producao" />;
}
