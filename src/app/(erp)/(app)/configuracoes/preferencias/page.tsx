import type { Metadata } from "next";
import { PreferencesSettings } from "@/features/settings/components/PreferencesSettings";

export const metadata: Metadata = { title: "Preferências" };

export default function PreferencesPage() {
  return <PreferencesSettings />;
}
