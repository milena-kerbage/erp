import type { Metadata } from "next";
import { OperationsView } from "@/features/operations/components/OperationsView";

export const metadata: Metadata = { title: "Contas a pagar" };
export default function Page() {
  return <OperationsView resource="financeiro" section="expense" />;
}
