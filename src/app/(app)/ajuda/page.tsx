import type { Metadata } from "next";
import { HelpPage } from "@/features/operations/components/InformationalPages";
export const metadata: Metadata = { title: "Central de ajuda" };
export default function Page() { return <HelpPage />; }
