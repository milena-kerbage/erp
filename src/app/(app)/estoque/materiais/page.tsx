import type { Metadata } from "next";
import { OperationsView } from "@/features/operations/components/OperationsView";

export const metadata: Metadata = { title: "Materiais" };
export default function Page() {
  return <OperationsView resource="materiais" />;
}
