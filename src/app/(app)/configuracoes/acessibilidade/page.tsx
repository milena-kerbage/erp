import type { Metadata } from "next";
import { AccessibilitySettings } from "@/features/settings/components/AccessibilitySettings";

export const metadata: Metadata = { title: "Acessibilidade" };

export default function AccessibilityPage() {
  return <AccessibilitySettings />;
}
