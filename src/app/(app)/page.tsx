import type { Metadata } from "next";
import { Dashboard } from "@/features/dashboard/components/Dashboard";

export const metadata: Metadata = {
  title: "Painel",
};

/** Painel: resumo do ateliê (indicadores, funil, conversas e atendimentos). */
export default function DashboardPage() {
  return <Dashboard />;
}
