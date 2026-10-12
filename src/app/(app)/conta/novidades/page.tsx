import type { Metadata } from "next";
import { NewsPage } from "@/features/operations/components/InformationalPages";
export const metadata: Metadata = { title: "Novidades" };
export default function Page() { return <NewsPage />; }
