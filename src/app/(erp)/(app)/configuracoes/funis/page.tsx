import type { Metadata } from "next";
import { FunnelsSettings } from "@/features/settings/components/FunnelsSettings";

export const metadata: Metadata = { title: "Funis e etapas" };

export default function FunnelsPage() {
  return <FunnelsSettings />;
}
