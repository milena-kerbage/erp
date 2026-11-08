import type { Metadata } from "next";
import { OperationsView } from "@/features/operations/components/OperationsView";

export const metadata: Metadata = { title: "Pedidos finalizados" };
export default function Page() {
  return <OperationsView resource="pedidos" section="finished" />;
}
