import type { Metadata } from "next";
import { ReportsView } from "@/features/operations/components/ReportsView";

export const metadata: Metadata = { title: "Fluxo de caixa" };
export default function Page() { return <ReportsView cashOnly />; }
