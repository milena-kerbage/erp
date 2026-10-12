import type { Metadata } from "next";
import { OperationsView } from "@/features/operations/components/OperationsView";

export const metadata: Metadata = { title: "Pedidos em andamento" };
export default function Page() {
  return <OperationsView resource="pedidos" section="active" />;
}
